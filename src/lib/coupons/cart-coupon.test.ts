import { describe, expect, it } from 'vitest';

import type { ResolvedLine } from '@/lib/cart/line';
import { fromAgorot, toAgorot, ZERO } from '@/lib/money';

import { evaluateCartCoupon, type CartCoupon } from './cart-coupon';

const NOW = new Date('2026-10-08T10:00:00Z');

function coupon(over: Partial<CartCoupon> = {}): CartCoupon {
  return {
    id: 'c1',
    code: 'GIFT10',
    descriptionHe: null,
    discountType: 'PERCENTAGE',
    discountValue: 1_000,
    maxDiscountAgorot: null,
    minOrderAgorot: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    archivedAt: null,
    usageLimitTotal: null,
    usageLimitPerCustomer: null,
    appliesTo: 'ENTIRE_ORDER',
    targets: [],
    _count: { redemptions: 0 },
    ...over,
  };
}

/** Just the parts of a resolved line a coupon reads. */
function line(
  productId: string,
  unitAgorot: number,
  quantity = 1,
  category = { id: 'rings', parentId: null as string | null },
): ResolvedLine {
  return {
    orderable: true,
    unitPrice: fromAgorot(unitAgorot),
    personalizationPrice: ZERO,
    row: {
      quantity,
      product: { id: productId, primaryCategory: category, categories: [], collections: [] },
    },
  } as unknown as ResolvedLine;
}

const amount = (outcome: ReturnType<typeof evaluateCartCoupon>) =>
  outcome.ok ? toAgorot(outcome.discount) : outcome.reason;

describe('evaluateCartCoupon', () => {
  it('discounts the whole bag for a whole-order code', () => {
    expect(
      amount(evaluateCartCoupon(coupon(), [line('a', 100_000), line('b', 50_000, 2)], 0, NOW)),
    ).toBe(20_000);
  });

  it('rounds the discount to a whole shekel', () => {
    expect(amount(evaluateCartCoupon(coupon(), [line('a', 206_400)], 0, NOW))).toBe(20_600);
  });

  it('discounts only the lines a scoped code covers', () => {
    const scoped = coupon({
      appliesTo: 'CATEGORY',
      targets: [{ productId: null, categoryId: 'earrings', collectionId: null }],
    });
    const lines = [line('a', 100_000), line('b', 50_000, 1, { id: 'hoops', parentId: 'earrings' })];
    expect(amount(evaluateCartCoupon(scoped, lines, 0, NOW))).toBe(5_000);
    expect(amount(evaluateCartCoupon(scoped, [line('a', 100_000)], 0, NOW))).toBe('NOT_APPLICABLE');
  });

  it('measures the minimum on the whole bag', () => {
    const min = coupon({
      minOrderAgorot: 120_000,
      appliesTo: 'PRODUCT',
      targets: [{ productId: 'b', categoryId: null, collectionId: null }],
    });
    expect(amount(evaluateCartCoupon(min, [line('a', 100_000), line('b', 30_000)], 0, NOW))).toBe(
      3_000,
    );
    expect(amount(evaluateCartCoupon(min, [line('b', 30_000)], 0, NOW))).toBe('BELOW_MINIMUM');
  });

  it('says expired, not minimum, for an expired code under the minimum', () => {
    const old = coupon({ minOrderAgorot: 500_000, endsAt: new Date('2026-01-01T00:00:00Z') });
    expect(amount(evaluateCartCoupon(old, [line('a', 100_000)], 0, NOW))).toBe('EXPIRED');
  });

  it('honours the total and per-customer limits', () => {
    expect(
      amount(
        evaluateCartCoupon(
          coupon({ usageLimitTotal: 3, _count: { redemptions: 3 } }),
          [line('a', 100_000)],
          0,
          NOW,
        ),
      ),
    ).toBe('USAGE_LIMIT_REACHED');
    expect(
      amount(
        evaluateCartCoupon(coupon({ usageLimitPerCustomer: 1 }), [line('a', 100_000)], 1, NOW),
      ),
    ).toBe('CUSTOMER_LIMIT_REACHED');
  });
});
