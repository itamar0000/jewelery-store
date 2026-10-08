import { activeProduct, activeVariant } from '@/lib/catalog/queries';
import {
  COUPON_MESSAGES,
  couponSelect,
  evaluateCartCoupon,
  type CartCoupon,
} from '@/lib/coupons/cart-coupon';
import { normalizeCouponCode } from '@/lib/coupons/evaluate';
import { prisma } from '@/lib/db';
import { subtract, ZERO } from '@/lib/money';
import { getActivePromotions } from '@/lib/promotions/active';
import { addToCartSchema, updateCartItemSchema } from '@/lib/validation/commerce';
import { id as idSchema } from '@/lib/validation/common';

import {
  canSupply,
  cartItemSelect,
  checkPersonalization,
  checkSelections,
  configurationKey,
  customFieldsSelect,
  parseStoredPersonalization,
  parseStoredSelections,
  resolveLine,
  selectionOptionsSelect,
  type ResolvedLine,
} from './line';
import { clampQuantity, computeTotals } from './pricing';
import { CART_TTL_MS, isWellFormedToken, newToken } from './token';
import type { CartMutationResult, CartView } from './types';

/**
 * The guest cart, server side.
 *
 * A cart is a row found by an opaque token the browser holds in an httpOnly
 * cookie (./token.ts). Reading it never creates anything; the first add does,
 * and hands the new token back for the caller to set. Every function takes the
 * token rather than reading cookies itself, so this module runs the same in a
 * server action and in a test.
 *
 * MONEY IS NEVER AN INPUT. A mutation carries a variant, a quantity and the
 * shopper's choices; every figure on a view is computed here from the
 * catalogue (./line.ts, ./pricing.ts).
 */

const EMPTY_VIEW: CartView = (() => {
  const totals = computeTotals([]);
  return { lines: [], hasUnavailable: false, ...totals, discount: ZERO, coupon: null };
})();

/** A live cart for this token, or null. An expired cart is no cart. */
async function findCart(token: string | null | undefined) {
  if (!isWellFormedToken(token)) return null;

  const cart = await prisma.cart.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      items: { orderBy: { addedAt: 'asc' }, select: cartItemSelect },
      coupon: { select: couponSelect },
    },
  });

  if (!cart || (cart.expiresAt !== null && cart.expiresAt <= new Date())) return null;
  return cart;
}

/** The cart's lines resolved against the catalogue, for the view and for ordering. */
export async function loadCart(
  token: string | null | undefined,
): Promise<{ id: string; lines: ResolvedLine[]; coupon: CartCoupon | null } | null> {
  const cart = await findCart(token);
  if (!cart) return null;

  const promotions = await getActivePromotions();
  return {
    id: cart.id,
    lines: cart.items.map((item) => resolveLine(item, promotions)),
    coupon: cart.coupon,
  };
}

/**
 * The bag's figures. A coupon on the cart is re-checked every time the bag is
 * read (D4D.33): a code that has expired or no longer covers anything in the
 * bag stays named, with the reason, and takes nothing off.
 */
export function toCartView(
  lines: readonly ResolvedLine[],
  coupon: CartCoupon | null = null,
): CartView {
  const orderable = lines.filter((line) => line.orderable);
  const totals = computeTotals(
    orderable.map((line) => ({
      unitPrice: line.unitPrice,
      personalizationPrice: line.personalizationPrice,
      quantity: line.row.quantity,
    })),
  );

  const outcome = coupon ? evaluateCartCoupon(coupon, lines) : null;
  const discount = outcome?.ok ? outcome.discount : ZERO;

  return {
    lines: lines.map((line) => line.view),
    hasUnavailable: orderable.length < lines.length,
    ...totals,
    discount,
    total: subtract(totals.total, discount),
    coupon: coupon
      ? {
          code: coupon.code,
          applied: outcome?.ok ?? false,
          message: outcome && !outcome.ok ? COUPON_MESSAGES[outcome.reason] : null,
        }
      : null,
  };
}

export async function getCartView(token: string | null | undefined): Promise<CartView> {
  const cart = await loadCart(token);
  return cart ? toCartView(cart.lines, cart.coupon) : EMPTY_VIEW;
}

/**
 * Units in the bag, for the header.
 *
 * Every line counts, including one that has become unavailable: the badge says
 * what is in the bag, and the cart page says what can be ordered.
 */
export async function getCartCount(token: string | null | undefined): Promise<number> {
  if (!isWellFormedToken(token)) return 0;

  const result = await prisma.cartItem.aggregate({
    where: { cart: { token, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

/**
 * Put a piece in the bag.
 *
 * The same piece configured the same way - variant, selections and
 * personalisation all equal - adds to the line already there rather than
 * opening a second one.
 *
 * Returns the token the browser should hold afterwards: the one it sent, or a
 * new one when there was no live cart to add to.
 */
export async function addItem(
  token: string | null | undefined,
  raw: unknown,
): Promise<{ result: CartMutationResult; token: string | null }> {
  const keep = isWellFormedToken(token) ? token : null;
  const parsed = addToCartSchema.safeParse(raw);
  if (!parsed.success) return { result: { ok: false, error: 'invalid' }, token: keep };

  const input = parsed.data;

  const variant = await prisma.productVariant.findFirst({
    where: { id: input.variantId, ...activeVariant, product: activeProduct },
    select: {
      id: true,
      productId: true,
      inventory: { select: { onHand: true, reserved: true, policy: true } },
      product: {
        select: { options: selectionOptionsSelect, customFields: customFieldsSelect },
      },
    },
  });

  if (!variant) return { result: { ok: false, error: 'unavailable' }, token: keep };

  const selections = checkSelections(variant.product.options, input.selections);
  const personalization = checkPersonalization(variant.product.customFields, input.personalization);

  if (!selections.ok || !personalization.ok) {
    const foreign =
      (!selections.ok && selections.foreign) || (!personalization.ok && personalization.foreign);
    const problems = [
      ...(selections.ok ? [] : selections.problems),
      ...(personalization.ok ? [] : personalization.problems),
    ];

    return {
      result: foreign
        ? { ok: false, error: 'invalid' }
        : { ok: false, error: 'needs-choices', problems },
      token: keep,
    };
  }

  const existingCart = await findCart(token);
  const key = configurationKey(variant.id, selections.value, personalization.value);
  const match = existingCart?.items.find(
    (item) =>
      configurationKey(
        item.variant.id,
        parseStoredSelections(item.selections),
        parseStoredPersonalization(item.customization),
      ) === key,
  );

  const quantity = clampQuantity((match?.quantity ?? 0) + input.quantity);
  if (!canSupply(variant.inventory, quantity)) {
    return { result: { ok: false, error: 'unavailable' }, token: keep };
  }

  const expiresAt = new Date(Date.now() + CART_TTL_MS);
  let cartToken: string;
  let cartId: string;

  if (existingCart) {
    cartToken = token as string;
    cartId = existingCart.id;
    await prisma.cart.update({ where: { id: cartId }, data: { expiresAt } });
  } else {
    cartToken = newToken();
    const created = await prisma.cart.create({
      data: { token: cartToken, expiresAt },
      select: { id: true },
    });
    cartId = created.id;
  }

  if (match) {
    await prisma.cartItem.update({ where: { id: match.id }, data: { quantity } });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        variantId: variant.id,
        productId: variant.productId,
        quantity,
        selections: selections.value.map((choice) => ({ ...choice })),
        customization: personalization.value,
      },
    });
  }

  return { result: { ok: true, itemCount: await getCartCount(cartToken) }, token: cartToken };
}

/** Change how many of one line. Clamped to what a line may hold. */
export async function setItemQuantity(
  token: string | null | undefined,
  raw: unknown,
): Promise<CartMutationResult> {
  const parsed = updateCartItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  if (!isWellFormedToken(token)) return { ok: false, error: 'not-found' };

  const item = await prisma.cartItem.findFirst({
    where: { id: parsed.data.cartItemId, cart: { token } },
    select: {
      id: true,
      cartId: true,
      variant: {
        select: { inventory: { select: { onHand: true, reserved: true, policy: true } } },
      },
    },
  });

  if (!item) return { ok: false, error: 'not-found' };

  const quantity = clampQuantity(parsed.data.quantity);
  if (!canSupply(item.variant.inventory, quantity)) return { ok: false, error: 'unavailable' };

  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  await prisma.cart.update({
    where: { id: item.cartId },
    data: { expiresAt: new Date(Date.now() + CART_TTL_MS) },
  });

  return { ok: true, itemCount: await getCartCount(token) };
}

export async function removeItem(
  token: string | null | undefined,
  rawItemId: unknown,
): Promise<CartMutationResult> {
  const parsed = idSchema.safeParse(rawItemId);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  if (!isWellFormedToken(token)) return { ok: false, error: 'not-found' };

  // Read before deleting, so the bag can offer to put it back (CartLines).
  const item = await prisma.cartItem.findFirst({
    where: { id: parsed.data, cart: { token } },
    select: { variantId: true, quantity: true, selections: true, customization: true },
  });
  if (!item) return { ok: false, error: 'not-found' };

  const removed = await prisma.cartItem.deleteMany({
    where: { id: parsed.data, cart: { token } },
  });

  if (removed.count === 0) return { ok: false, error: 'not-found' };
  return {
    ok: true,
    itemCount: await getCartCount(token),
    restore: {
      variantId: item.variantId,
      quantity: item.quantity,
      selections: parseStoredSelections(item.selections),
      personalization: parseStoredPersonalization(item.customization),
    },
  };
}

export type CouponResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

/**
 * Put a coupon on the bag (D4D.33). Checked against the bag as it stands, so
 * a code that cannot apply is refused with its reason rather than kept. A bag
 * holds one code; a new one replaces it.
 */
export async function applyCoupon(
  token: string | null | undefined,
  rawCode: unknown,
): Promise<CouponResult> {
  const code = normalizeCouponCode(String(rawCode ?? '')).slice(0, 64);
  if (!code) return { ok: false, message: 'יש להקליד קוד קופון.' };

  const cart = await loadCart(token);
  if (!cart || cart.lines.length === 0) return { ok: false, message: 'הסל ריק.' };

  const coupon = await prisma.coupon.findUnique({
    where: { codeNormalized: code },
    select: couponSelect,
  });
  if (!coupon) return { ok: false, message: COUPON_MESSAGES.UNKNOWN };

  const outcome = evaluateCartCoupon(coupon, cart.lines);
  if (!outcome.ok) return { ok: false, message: COUPON_MESSAGES[outcome.reason] };

  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
  return { ok: true };
}

export async function removeCoupon(token: string | null | undefined): Promise<void> {
  if (!isWellFormedToken(token)) return;
  await prisma.cart.updateMany({ where: { token }, data: { couponId: null } });
}
