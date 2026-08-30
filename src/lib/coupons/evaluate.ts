import { ZERO, compare, fromAgorot, fromBasisPoints, percentageOf, type Money } from '@/lib/money';

/**
 * Coupon evaluation.
 *
 * MVP RULE: ONE COUPON PER ORDER. Stacking is not supported (docs/DECISIONS.md
 * D2.3), and the schema enforces it — `Cart.couponId` and `Order.couponId` are
 * single nullable FKs, and `CouponRedemption.orderId` is UNIQUE, so the
 * database refuses a second redemption against the same order.
 *
 * This module is pure. It takes a coupon, a subtotal and a usage picture, and
 * returns a decision. Everything it needs is passed in, so every rule is
 * testable without a database, and the caller stays responsible for reading
 * usage inside the same transaction that creates the order.
 *
 * All money is integer agorot and all arithmetic goes through `@/lib/money`.
 * Nothing here multiplies or rounds by hand.
 */

export type DiscountTypeValue = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

export interface EvaluableCoupon {
  discountType: DiscountTypeValue;
  /** Basis points when PERCENTAGE, agorot when FIXED_AMOUNT, ignored for FREE_SHIPPING. */
  discountValue: number;
  maxDiscountAgorot: number | null;
  minOrderAgorot: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  archivedAt: Date | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
}

export interface CouponUsage {
  /** Redemptions of this coupon by anyone. */
  totalRedemptions: number;
  /**
   * Redemptions attributable to this shopper. Matched on normalised email as
   * well as customer id, because every guest checkout creates a fresh
   * `Customer` row — see D2.4 for why this is a deterrent, not a guarantee.
   */
  customerRedemptions: number;
}

export interface EvaluationContext {
  subtotalAgorot: number;
  shippingAgorot: number;
  usage: CouponUsage;
  now: Date;
}

export type CouponRejectionReason =
  | 'INACTIVE'
  | 'ARCHIVED'
  | 'NOT_YET_VALID'
  | 'EXPIRED'
  | 'BELOW_MINIMUM'
  | 'USAGE_LIMIT_REACHED'
  | 'CUSTOMER_LIMIT_REACHED';

export type CouponEvaluation =
  | { ok: true; discount: Money; freeShipping: boolean }
  | { ok: false; reason: CouponRejectionReason };

/**
 * Decide whether a coupon applies, and for how much.
 *
 * Checks run cheapest-and-most-explanatory first, so the customer is told the
 * most useful thing: "this code has expired" beats "this code is not valid".
 */
export function evaluateCoupon(
  coupon: EvaluableCoupon,
  context: EvaluationContext,
): CouponEvaluation {
  if (coupon.archivedAt !== null) return { ok: false, reason: 'ARCHIVED' };
  if (!coupon.isActive) return { ok: false, reason: 'INACTIVE' };

  if (coupon.startsAt !== null && context.now < coupon.startsAt) {
    return { ok: false, reason: 'NOT_YET_VALID' };
  }
  if (coupon.endsAt !== null && context.now >= coupon.endsAt) {
    return { ok: false, reason: 'EXPIRED' };
  }

  if (coupon.minOrderAgorot !== null && context.subtotalAgorot < coupon.minOrderAgorot) {
    return { ok: false, reason: 'BELOW_MINIMUM' };
  }

  if (coupon.usageLimitTotal !== null && context.usage.totalRedemptions >= coupon.usageLimitTotal) {
    return { ok: false, reason: 'USAGE_LIMIT_REACHED' };
  }

  if (
    coupon.usageLimitPerCustomer !== null &&
    context.usage.customerRedemptions >= coupon.usageLimitPerCustomer
  ) {
    return { ok: false, reason: 'CUSTOMER_LIMIT_REACHED' };
  }

  return {
    ok: true,
    discount: computeDiscount(coupon, context.subtotalAgorot),
    freeShipping: coupon.discountType === 'FREE_SHIPPING',
  };
}

/**
 * The discount amount for an already-validated coupon.
 *
 * Applied to the SUBTOTAL and rounded once, per ARCHITECTURE 6.1 — never per
 * line and never per unit, because rounding repeatedly and summing gives a
 * different answer.
 *
 * Never exceeds the subtotal: the `Order_discount_not_above_subtotal` CHECK
 * would reject that, and a discount larger than the goods is always a bug.
 */
export function computeDiscount(coupon: EvaluableCoupon, subtotalAgorot: number): Money {
  const subtotal = fromAgorot(subtotalAgorot);

  if (coupon.discountType === 'FREE_SHIPPING') {
    // The benefit is applied to shipping, not to the goods.
    return ZERO;
  }

  const raw =
    coupon.discountType === 'PERCENTAGE'
      ? percentageOf(subtotal, fromBasisPoints(coupon.discountValue))
      : fromAgorot(coupon.discountValue);

  const capped =
    coupon.maxDiscountAgorot !== null && compare(raw, fromAgorot(coupon.maxDiscountAgorot)) > 0
      ? fromAgorot(coupon.maxDiscountAgorot)
      : raw;

  return compare(capped, subtotal) > 0 ? subtotal : capped;
}

/** Uppercased and trimmed, for the indexed `codeNormalized` column (F20). */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
