import type { ResolvedLine } from '@/lib/cart/line';
import { fromAgorot, toAgorot, type Money } from '@/lib/money';
import { categoryIdsOf } from '@/lib/promotions/pricing';

import { evaluateCoupon, type CouponRejectionReason, type DiscountTypeValue } from './evaluate';

/**
 * A coupon against a bag (D4D.33).
 *
 * THE CODE TAKES ITS DISCOUNT FROM THE PIECES IT COVERS. A coupon for the whole
 * order discounts the whole bag; one scoped to products, categories or
 * collections discounts only the lines that belong to them, at their current
 * (sale) price - a coupon adds to a sale, it does not replace it. The minimum
 * order is measured on the whole bag.
 *
 * Usage limits are counted from recorded redemptions: the total here, the
 * per-customer one at the moment of ordering, when the email is known.
 */

export const couponSelect = {
  id: true,
  code: true,
  descriptionHe: true,
  discountType: true,
  discountValue: true,
  maxDiscountAgorot: true,
  minOrderAgorot: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  archivedAt: true,
  usageLimitTotal: true,
  usageLimitPerCustomer: true,
  appliesTo: true,
  targets: { select: { productId: true, categoryId: true, collectionId: true } },
  _count: { select: { redemptions: true } },
} as const;

export interface CartCoupon {
  id: string;
  code: string;
  descriptionHe: string | null;
  discountType: string;
  discountValue: number;
  maxDiscountAgorot: number | null;
  minOrderAgorot: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  archivedAt: Date | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  appliesTo: string;
  targets: { productId: string | null; categoryId: string | null; collectionId: string | null }[];
  _count: { redemptions: number };
}

export type CouponOutcome =
  | { readonly ok: true; readonly discount: Money }
  | { readonly ok: false; readonly reason: CouponRejectionReason | 'NOT_APPLICABLE' };

export const COUPON_MESSAGES: Readonly<
  Record<CouponRejectionReason | 'NOT_APPLICABLE' | 'UNKNOWN', string>
> = {
  UNKNOWN: 'הקוד הזה לא מוכר. כדאי לבדוק את האיות.',
  INACTIVE: 'הקוד הזה אינו פעיל.',
  ARCHIVED: 'הקוד הזה אינו פעיל.',
  NOT_YET_VALID: 'הקוד הזה עוד לא בתוקף.',
  EXPIRED: 'תוקף הקוד הסתיים.',
  BELOW_MINIMUM: 'הקוד תקף מסכום הזמנה מינימלי שעוד לא הגעתם אליו.',
  USAGE_LIMIT_REACHED: 'הקוד הזה כבר נוצל עד הסוף.',
  CUSTOMER_LIMIT_REACHED: 'כבר השתמשתם בקוד הזה.',
  NOT_APPLICABLE: 'הקוד לא חל על אף פריט שבסל.',
};

function lineReached(coupon: CartCoupon, line: ResolvedLine): boolean {
  if (coupon.appliesTo === 'ENTIRE_ORDER') return true;
  const product = line.row.product;
  const categories = categoryIdsOf([
    ...(product.primaryCategory ? [product.primaryCategory] : []),
    ...(product.categories ?? []).map((link) => link.category),
  ]);
  const collections = (product.collections ?? []).map((link) => link.collectionId);
  return coupon.targets.some(
    (target) =>
      (target.productId !== null && target.productId === product.id) ||
      (target.categoryId !== null && categories.includes(target.categoryId)) ||
      (target.collectionId !== null && collections.includes(target.collectionId)),
  );
}

const lineAmount = (line: ResolvedLine) =>
  (toAgorot(line.unitPrice) + toAgorot(line.personalizationPrice)) * line.row.quantity;

export function evaluateCartCoupon(
  coupon: CartCoupon,
  lines: readonly ResolvedLine[],
  customerRedemptions = 0,
  now = new Date(),
): CouponOutcome {
  const orderable = lines.filter((line) => line.orderable);
  const wholeAgorot = orderable.reduce((sum, line) => sum + lineAmount(line), 0);
  if (coupon.minOrderAgorot !== null && wholeAgorot < coupon.minOrderAgorot) {
    // Date and activity checks first, so an expired code does not say "minimum".
    const early = evaluateCoupon(
      { ...coupon, discountType: coupon.discountType as DiscountTypeValue, minOrderAgorot: null },
      {
        subtotalAgorot: wholeAgorot,
        shippingAgorot: 0,
        usage: { totalRedemptions: coupon._count.redemptions, customerRedemptions },
        now,
      },
    );
    return early.ok ? { ok: false, reason: 'BELOW_MINIMUM' } : early;
  }

  const eligibleAgorot = orderable
    .filter((line) => lineReached(coupon, line))
    .reduce((sum, line) => sum + lineAmount(line), 0);

  const result = evaluateCoupon(
    { ...coupon, discountType: coupon.discountType as DiscountTypeValue, minOrderAgorot: null },
    {
      subtotalAgorot: eligibleAgorot,
      shippingAgorot: 0,
      usage: { totalRedemptions: coupon._count.redemptions, customerRedemptions },
      now,
    },
  );
  if (!result.ok) return result;
  if (eligibleAgorot === 0) return { ok: false, reason: 'NOT_APPLICABLE' };
  // A whole shekel, like a sale price, and never more than the pieces it covers.
  const wholeShekels = Math.min(eligibleAgorot, Math.round(toAgorot(result.discount) / 100) * 100);
  return { ok: true, discount: fromAgorot(wholeShekels) };
}
