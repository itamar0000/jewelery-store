import type { Prisma } from '@/generated/prisma/client';
import type { ResolvedLine } from '@/lib/cart/line';
import { SHIPPING, includedVat } from '@/lib/cart/pricing';
import { loadCart, toCartView } from '@/lib/cart/store';
import { evaluateCartCoupon } from '@/lib/coupons/cart-coupon';
import { hashToken, newToken } from '@/lib/cart/token';
import type { FieldProblem } from '@/lib/cart/types';
import { prisma } from '@/lib/db';
import { InsufficientStockError, reserveInventory } from '@/lib/inventory/reservation';
import { toAgorot } from '@/lib/money';
import { buildPersonalizationSnapshot, toStorableSnapshot } from '@/lib/personalization/snapshot';
import { checkoutSchema, orderTotalsSchema, type CheckoutInput } from '@/lib/validation/commerce';
import { normalizeEmail } from '@/lib/validation/common';

/**
 * Placing an order: the end of the checkout, and the start of payment.
 *
 * WHAT THIS DOES (IMPLEMENTATION_PLAN 6a). In one transaction: find or create
 * the guest's customer record, write the order AS AWAITING PAYMENT with every
 * line frozen, hold the stock, and empty the cart. Then it stops. Charging is
 * a payment provider's job (src/lib/payments/provider.ts), and no provider is
 * configured (TBD.md B1) - so an order placed today stays PENDING_PAYMENT, its
 * holds lapse after RESERVATION_TTL_MS, and nothing is ever charged.
 *
 * NOTHING THE BROWSER SENDS IS A PRICE. The input is contact and delivery
 * details; the lines and every figure come from the cart, resolved against
 * the catalogue at this moment (src/lib/cart/line.ts) - the same resolution
 * the shopper just reviewed. A cart that changed underneath them (a piece
 * withdrawn, a stocked variant sold out) is refused rather than silently
 * trimmed, so the order is always exactly what they were shown.
 *
 * EVERY LINE IS A SNAPSHOT (principles 9-11). Names, labels, the SKU, the
 * personalisation with its labels, the diamond and its certificate, the price
 * and the promised lead time are copied onto the order, so editing or
 * archiving a product later cannot rewrite what was bought.
 */

export type PlaceOrderResult =
  | { readonly ok: true; readonly orderNumber: number; readonly accessToken: string }
  | { readonly ok: false; readonly error: 'invalid'; readonly problems: readonly FieldProblem[] }
  /** No cart, or nothing in it. */
  | { readonly ok: false; readonly error: 'empty' }
  /** A line can no longer be ordered as configured; the cart page says which. */
  | { readonly ok: false; readonly error: 'changed' }
  /** Stock went between the review and the hold. */
  | { readonly ok: false; readonly error: 'stock' }
  /** The coupon on the bag stopped applying between the bag and the order (D4D.33). */
  | { readonly ok: false; readonly error: 'coupon' };

export async function placeOrder(
  token: string | null | undefined,
  raw: unknown,
  options: {
    /** VAT_RATE_BPS, read by the caller from the environment; null when unset. */
    vatRateBps: number | null;
  },
): Promise<PlaceOrderResult> {
  const submitted = normalizeCheckoutInput(raw);
  const parsed = checkoutSchema.safeParse(submitted);

  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid',
      problems: parsed.error.issues.map((issue) => {
        const field = issue.path.join('.');
        return { field, reason: isBlank(readPath(submitted, issue.path)) ? 'missing' : 'invalid' };
      }),
    };
  }

  const input = parsed.data;
  const cart = await loadCart(token);

  if (!cart || cart.lines.length === 0) return { ok: false, error: 'empty' };
  if (cart.lines.some((line) => !line.orderable)) return { ok: false, error: 'changed' };

  // The coupon is checked once more, now that the buyer's email is known, so
  // a per-customer limit holds (D4D.33). One that no longer applies comes off
  // the bag and the buyer is told, rather than charged without it.
  const emailNormalized = input.email.trim().toLowerCase();
  if (cart.coupon) {
    const customerRedemptions = await prisma.couponRedemption.count({
      where: { couponId: cart.coupon.id, customerEmailNormalized: emailNormalized },
    });
    const outcome = evaluateCartCoupon(cart.coupon, cart.lines, customerRedemptions);
    if (!outcome.ok) {
      await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
      return { ok: false, error: 'coupon' };
    }
  }

  const view = toCartView(cart.lines, cart.coupon);
  const vat = includedVat(view.total, options.vatRateBps);

  // Validated before writing: an arithmetic bug fails here, at the boundary,
  // as well as at the `Order_total_consistent` CHECK constraint.
  const totals = orderTotalsSchema.parse({
    subtotalAgorot: toAgorot(view.subtotal),
    discountAgorot: toAgorot(view.discount),
    shippingAgorot: toAgorot(view.shipping),
    totalAgorot: toAgorot(view.total),
    vatRateBps: vat === null ? null : options.vatRateBps,
    vatAmountAgorot: vat === null ? null : toAgorot(vat),
  });

  const accessToken = newToken();

  try {
    const order = await prisma.$transaction(async (tx) => {
      const customerId = await findOrCreateCustomer(tx, input);

      const created = await tx.order.create({
        data: {
          accessTokenHash: hashToken(accessToken),
          customerId,
          email: input.email,
          phone: input.phone,
          customerName: input.customerName,
          subtotalAgorot: totals.subtotalAgorot,
          discountAgorot: totals.discountAgorot,
          ...(cart.coupon && totals.discountAgorot > 0
            ? { couponId: cart.coupon.id, couponCodeUsed: cart.coupon.code }
            : {}),
          shippingAgorot: totals.shippingAgorot,
          totalAgorot: totals.totalAgorot,
          vatRateBps: totals.vatRateBps ?? null,
          vatAmountAgorot: totals.vatAmountAgorot ?? null,
          shippingMethodLabel: SHIPPING.methodLabelHe,
          items: { create: cart.lines.map(toOrderItem) },
          addresses: {
            create: {
              type: 'SHIPPING',
              fullName: input.shippingAddress.fullName,
              phone: input.shippingAddress.phone,
              street: input.shippingAddress.street,
              houseNumber: input.shippingAddress.houseNumber,
              apartment: input.shippingAddress.apartment ?? null,
              city: input.shippingAddress.city,
              postalCode: input.shippingAddress.postalCode ?? null,
              instructions: input.shippingAddress.instructions ?? null,
              country: input.shippingAddress.country,
            },
          },
          statusEvents: {
            create: {
              toStatus: 'PENDING_PAYMENT',
              note: 'ההזמנה נשמרה באתר וממתינה לתשלום.',
            },
          },
        },
        select: { id: true, orderNumber: true },
      });

      if (cart.coupon && totals.discountAgorot > 0) {
        await tx.couponRedemption.create({
          data: {
            couponId: cart.coupon.id,
            orderId: created.id,
            customerId,
            customerEmailNormalized: emailNormalized,
            amountAgorot: totals.discountAgorot,
          },
        });
        await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });
      }

      // Holds inside the same transaction: if any line cannot be held, the
      // order, its lines and every earlier hold roll back together.
      for (const line of cart.lines) {
        await reserveInventory(
          prisma,
          { variantId: line.row.variant.id, quantity: line.row.quantity, orderId: created.id },
          tx,
        );
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return { ok: true, orderNumber: order.orderNumber, accessToken };
  } catch (error) {
    if (error instanceof InsufficientStockError) return { ok: false, error: 'stock' };
    throw error;
  }
}

/**
 * The guest's customer record, matched on the normalised email.
 *
 * Consent only ever moves toward yes here: ticking the box records the
 * opt-in, and leaving it clear on a later order does not withdraw one given
 * before - withdrawal is its own act (an unsubscribe), not the absence of a
 * tick. The address is not verified, so nothing may be SENT on the strength of
 * this flag until the email provider (TBD.md I2) confirms it.
 */
async function findOrCreateCustomer(
  tx: Prisma.TransactionClient,
  input: CheckoutInput,
): Promise<string> {
  const emailNormalized = normalizeEmail(input.email);

  const existing = await tx.customer.findFirst({
    where: { emailNormalized },
    orderBy: { createdAt: 'asc' },
    select: { id: true, phone: true, marketingOptIn: true },
  });

  if (!existing) {
    const created = await tx.customer.create({
      data: {
        email: input.email,
        emailNormalized,
        phone: input.phone,
        marketingOptIn: input.marketingOptIn,
      },
      select: { id: true },
    });
    return created.id;
  }

  const update: Prisma.CustomerUpdateInput = {};
  if (input.marketingOptIn && !existing.marketingOptIn) update.marketingOptIn = true;
  if (!existing.phone) update.phone = input.phone;

  if (Object.keys(update).length > 0) {
    await tx.customer.update({ where: { id: existing.id }, data: update });
  }

  return existing.id;
}

/** One cart line, frozen as an order line. */
function toOrderItem(line: ResolvedLine): Prisma.OrderItemCreateWithoutOrderInput {
  const { product, variant } = line.row;
  const quantity = line.row.quantity;
  const unitPriceAgorot = toAgorot(line.unitPrice);
  const personalizationAgorot = toAgorot(line.personalizationPrice);

  /** A value code by option code, from the variant's axes or the line's selections. */
  const valueOf = (code: string): string | null =>
    line.axisValues.find((value) => value.code === code)?.value ??
    line.selections.find((choice) => choice.optionCode === code)?.value ??
    null;

  const personalization = buildPersonalizationSnapshot(line.fieldDefinitions, line.personalization);

  const diamond = variant.diamondSpec ?? product.diamondSpec;
  const madeToOrder = line.availability.state === 'MADE_TO_ORDER';

  return {
    product: { connect: { id: product.id } },
    variant: { connect: { id: variant.id } },
    productNameHe: product.nameHe,
    variantLabelHe: line.view.variantLabel,
    sku: variant.sku,
    goldKarat: valueOf('gold_karat'),
    goldColor: valueOf('gold_color'),
    sizeValue: valueOf('ring_size'),
    lengthValue: valueOf('length'),
    imageKey: line.imageKey,
    ...(personalization.length > 0 && { customization: toStorableSnapshot(personalization) }),
    ...(line.selections.length > 0 && {
      selections: line.selections.map((choice) => ({ ...choice })),
    }),
    ...(diamond && {
      diamondSnapshot: {
        isLabGrown: diamond.isLabGrown,
        totalCaratWeight: diamond.totalCaratWeight?.toString() ?? null,
        stoneCount: diamond.stoneCount,
        color: diamond.color,
        clarity: diamond.clarity,
        cut: diamond.cut,
        shape: diamond.shape,
        certificate: diamond.certificate
          ? { issuer: diamond.certificate.issuer, number: diamond.certificate.number }
          : null,
      },
    }),
    productSnapshot: {
      slug: product.slug,
      nameHe: product.nameHe,
      productType: product.productType,
      sku: variant.sku,
      variantLabelHe: line.view.variantLabel,
      axes: line.axisValues.map((value) => ({ ...value })),
      basePriceAgorot: product.basePriceAgorot,
      unitPriceAgorot,
      // The regular price and the sale that lowered it, if one did (D4D.33).
      regularUnitPriceAgorot: toAgorot(line.regularUnitPrice),
      promotion: line.promotion ? { ...line.promotion } : null,
      personalizationAgorot,
      availability: { state: line.availability.state, prepDays: line.availability.prepDays },
    },
    quantity,
    unitPriceAgorot,
    personalizationAgorot,
    lineDiscountAgorot: 0,
    lineTotalAgorot: toAgorot(line.view.lineTotal),
    fulfillment: madeToOrder ? 'MADE_TO_ORDER' : 'IN_STOCK',
    prepDays: madeToOrder ? line.availability.prepDays : null,
  };
}

// ------------------------------------------------------------------- input

/**
 * Trim every text field and turn blank optionals into null, before
 * validation - so " a@b.co " is an address, and an empty apartment is no
 * apartment rather than a one-character-short one.
 */
function normalizeCheckoutInput(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;

  const source = raw as Record<string, unknown>;
  const address =
    typeof source.shippingAddress === 'object' && source.shippingAddress !== null
      ? (source.shippingAddress as Record<string, unknown>)
      : {};

  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : value);
  const optional = (value: unknown) => {
    const trimmed = text(value);
    return trimmed === '' ? null : trimmed;
  };

  return {
    email: text(source.email),
    phone: text(source.phone),
    customerName: text(source.customerName),
    marketingOptIn: source.marketingOptIn === true,
    shippingAddress: {
      fullName: text(address.fullName),
      phone: text(address.phone),
      street: text(address.street),
      houseNumber: text(address.houseNumber),
      apartment: optional(address.apartment),
      city: text(address.city),
      postalCode:
        typeof address.postalCode === 'string'
          ? optional(address.postalCode.replace(/\s/g, ''))
          : null,
      instructions: optional(address.instructions),
      country: 'IL',
    },
  };
}

function readPath(value: unknown, path: readonly PropertyKey[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value === '');
}
