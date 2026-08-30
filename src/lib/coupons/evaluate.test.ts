import { describe, expect, it } from 'vitest';

import { toAgorot } from '@/lib/money';

import {
  computeDiscount,
  evaluateCoupon,
  normalizeCouponCode,
  type EvaluableCoupon,
} from './evaluate';

const NOW = new Date('2026-06-15T12:00:00Z');

const baseCoupon: EvaluableCoupon = {
  discountType: 'PERCENTAGE',
  discountValue: 1_000, // 10% in basis points
  maxDiscountAgorot: null,
  minOrderAgorot: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  archivedAt: null,
  usageLimitTotal: null,
  usageLimitPerCustomer: null,
};

const noUsage = { totalRedemptions: 0, customerRedemptions: 0 };

function evaluate(overrides: Partial<EvaluableCoupon>, subtotalAgorot = 100_000, usage = noUsage) {
  return evaluateCoupon(
    { ...baseCoupon, ...overrides },
    { subtotalAgorot, shippingAgorot: 3_000, usage, now: NOW },
  );
}

describe('discount calculation', () => {
  it('computes a percentage discount', () => {
    // 10% of 1,000.00 ILS
    expect(toAgorot(computeDiscount(baseCoupon, 100_000))).toBe(10_000);
  });

  it('computes a fixed-amount discount', () => {
    const coupon: EvaluableCoupon = {
      ...baseCoupon,
      discountType: 'FIXED_AMOUNT',
      discountValue: 5_000,
    };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(5_000);
  });

  it('reads a fractional rate exactly, without floating point', () => {
    // 12.5% is 1250 basis points. Routing this through `value / 100` would put
    // a float in the middle of a money pipeline.
    const coupon: EvaluableCoupon = { ...baseCoupon, discountValue: 1_250 };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(12_500);
  });

  it('rounds half up, once, on the subtotal', () => {
    // 10% of 0.15 ILS is 1.5 agorot, which rounds to 2 (ARCHITECTURE 6.1).
    expect(toAgorot(computeDiscount(baseCoupon, 15))).toBe(2);
  });

  it('applies a maximum discount cap', () => {
    const coupon: EvaluableCoupon = { ...baseCoupon, maxDiscountAgorot: 5_000 };
    // 10% of 1,000.00 would be 100.00, capped to 50.00.
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(5_000);
  });

  it('does not apply the cap when the discount is already below it', () => {
    const coupon: EvaluableCoupon = { ...baseCoupon, maxDiscountAgorot: 50_000 };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(10_000);
  });

  it('never discounts more than the goods are worth', () => {
    // Otherwise `Order_discount_not_above_subtotal` would reject the order.
    const coupon: EvaluableCoupon = {
      ...baseCoupon,
      discountType: 'FIXED_AMOUNT',
      discountValue: 500_000,
    };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(100_000);
  });

  it('discounts the goods by nothing for a free-shipping coupon', () => {
    const coupon: EvaluableCoupon = { ...baseCoupon, discountType: 'FREE_SHIPPING' };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(0);
  });

  it('handles 100% without going negative', () => {
    const coupon: EvaluableCoupon = { ...baseCoupon, discountValue: 10_000 };
    expect(toAgorot(computeDiscount(coupon, 100_000))).toBe(100_000);
  });
});

describe('validity', () => {
  it('accepts an active coupon inside its window', () => {
    const result = evaluate({
      startsAt: new Date('2026-06-01T00:00:00Z'),
      endsAt: new Date('2026-07-01T00:00:00Z'),
    });

    expect(result.ok).toBe(true);
  });

  it('rejects a coupon that has not started', () => {
    const result = evaluate({ startsAt: new Date('2026-07-01T00:00:00Z') });
    expect(result).toEqual({ ok: false, reason: 'NOT_YET_VALID' });
  });

  it('rejects an expired coupon', () => {
    const result = evaluate({ endsAt: new Date('2026-06-01T00:00:00Z') });
    expect(result).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('treats the end instant as already expired', () => {
    // An end date is exclusive; a coupon "until 1 July" is not valid at
    // exactly 00:00 on 1 July.
    const result = evaluate({ endsAt: NOW });
    expect(result).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('rejects a deactivated coupon', () => {
    expect(evaluate({ isActive: false })).toEqual({ ok: false, reason: 'INACTIVE' });
  });

  it('rejects an archived coupon even if still flagged active', () => {
    const result = evaluate({ archivedAt: new Date('2026-01-01T00:00:00Z'), isActive: true });
    expect(result).toEqual({ ok: false, reason: 'ARCHIVED' });
  });
});

describe('minimum order amount', () => {
  it('rejects an order below the minimum', () => {
    expect(evaluate({ minOrderAgorot: 200_000 }, 100_000)).toEqual({
      ok: false,
      reason: 'BELOW_MINIMUM',
    });
  });

  it('accepts an order exactly at the minimum', () => {
    expect(evaluate({ minOrderAgorot: 100_000 }, 100_000).ok).toBe(true);
  });
});

describe('usage limits', () => {
  it('rejects once the total limit is reached', () => {
    const result = evaluate({ usageLimitTotal: 5 }, 100_000, {
      totalRedemptions: 5,
      customerRedemptions: 0,
    });
    expect(result).toEqual({ ok: false, reason: 'USAGE_LIMIT_REACHED' });
  });

  it('accepts while the total limit has room', () => {
    const result = evaluate({ usageLimitTotal: 5 }, 100_000, {
      totalRedemptions: 4,
      customerRedemptions: 0,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects once this customer has reached their limit', () => {
    const result = evaluate({ usageLimitPerCustomer: 1 }, 100_000, {
      totalRedemptions: 12,
      customerRedemptions: 1,
    });
    expect(result).toEqual({ ok: false, reason: 'CUSTOMER_LIMIT_REACHED' });
  });

  it('ignores usage entirely when no limit is set', () => {
    const result = evaluate({}, 100_000, { totalRedemptions: 999, customerRedemptions: 999 });
    expect(result.ok).toBe(true);
  });
});

describe('evaluation result', () => {
  it('returns the discount and the shipping flag together', () => {
    const result = evaluate({});
    expect(result).toEqual({ ok: true, discount: 10_000, freeShipping: false });
  });

  it('flags free shipping without discounting the goods', () => {
    const result = evaluate({ discountType: 'FREE_SHIPPING' });
    expect(result).toEqual({ ok: true, discount: 0, freeShipping: true });
  });

  it('reports the most useful reason first', () => {
    // Expired AND below minimum: "expired" is the more actionable message.
    const result = evaluate({ endsAt: new Date('2026-01-01T00:00:00Z'), minOrderAgorot: 999_999 });
    expect(result).toEqual({ ok: false, reason: 'EXPIRED' });
  });
});

describe('normalizeCouponCode', () => {
  it('uppercases and trims for the indexed lookup column', () => {
    expect(normalizeCouponCode('  spring10 ')).toBe('SPRING10');
    expect(normalizeCouponCode('Spring10')).toBe('SPRING10');
  });
});
