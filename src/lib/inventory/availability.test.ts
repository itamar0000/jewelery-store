import { describe, expect, it } from 'vitest';

import { availableToSell, canFulfill, resolveAvailability } from './availability';

const deny = { policy: 'DENY' } as const;
const madeToOrder = { policy: 'MADE_TO_ORDER' } as const;

describe('availableToSell', () => {
  it('subtracts reserved units from stock', () => {
    expect(availableToSell(10, 3)).toBe(7);
    expect(availableToSell(3, 3)).toBe(0);
  });

  it('never reports a negative figure', () => {
    // The CHECK constraints make this impossible for DENY variants, but a
    // made-to-order variant can legitimately hold more than it stocks.
    expect(availableToSell(0, 5)).toBe(0);
  });
});

describe('resolveAvailability', () => {
  it('reports IN_STOCK while uncommitted stock remains', () => {
    const result = resolveAvailability({ onHand: 5, reserved: 2, ...deny });

    expect(result.state).toBe('IN_STOCK');
    expect(result.available).toBe(3);
    expect(result.isPurchasable).toBe(true);
    expect(result.prepDays).toBeNull();
  });

  it('reports OUT_OF_STOCK for a DENY variant with nothing left', () => {
    const result = resolveAvailability({ onHand: 2, reserved: 2, ...deny });

    expect(result.state).toBe('OUT_OF_STOCK');
    expect(result.available).toBe(0);
    expect(result.isPurchasable).toBe(false);
  });

  it('falls back to MADE_TO_ORDER instead of going out of stock', () => {
    // Spec section 14: a variant may be out of stock and still sellable.
    const result = resolveAvailability({ onHand: 0, reserved: 0, ...madeToOrder, prepDays: 14 });

    expect(result.state).toBe('MADE_TO_ORDER');
    expect(result.isPurchasable).toBe(true);
    expect(result.prepDays).toBe(14);
  });

  it('prefers stock over made-to-order when both are possible', () => {
    const result = resolveAvailability({ onHand: 3, reserved: 0, ...madeToOrder, prepDays: 14 });

    expect(result.state).toBe('IN_STOCK');
    // No preparation time is promised for something shipping from stock.
    expect(result.prepDays).toBeNull();
  });

  describe('low-stock messaging', () => {
    it('stays silent when no threshold is configured', () => {
      // Spec section 13: the threshold is TBD, and silence is the correct
      // behaviour while the rule is undefined - not an arbitrary default.
      expect(resolveAvailability({ onHand: 1, reserved: 0, ...deny }).isLowStock).toBe(false);
      expect(
        resolveAvailability({ onHand: 1, reserved: 0, ...deny, lowStockThreshold: null })
          .isLowStock,
      ).toBe(false);
    });

    it('fires at and below a configured threshold', () => {
      const at = resolveAvailability({ onHand: 2, reserved: 0, ...deny, lowStockThreshold: 2 });
      const below = resolveAvailability({ onHand: 1, reserved: 0, ...deny, lowStockThreshold: 2 });
      const above = resolveAvailability({ onHand: 3, reserved: 0, ...deny, lowStockThreshold: 2 });

      expect(at.isLowStock).toBe(true);
      expect(below.isLowStock).toBe(true);
      expect(above.isLowStock).toBe(false);
    });

    it('counts reserved units as gone', () => {
      const result = resolveAvailability({
        onHand: 5,
        reserved: 4,
        ...deny,
        lowStockThreshold: 2,
      });

      expect(result.available).toBe(1);
      expect(result.isLowStock).toBe(true);
    });

    it('never says "only 2 left" about a made-to-order piece', () => {
      // "Made to order" and "only 2 left" together are incoherent.
      const result = resolveAvailability({
        onHand: 0,
        reserved: 0,
        ...madeToOrder,
        lowStockThreshold: 5,
      });

      expect(result.state).toBe('MADE_TO_ORDER');
      expect(result.isLowStock).toBe(false);
    });
  });
});

describe('canFulfill', () => {
  it('accepts a quantity covered by stock', () => {
    expect(canFulfill({ onHand: 5, reserved: 1, ...deny }, 4)).toBe(true);
    expect(canFulfill({ onHand: 5, reserved: 1, ...deny }, 5)).toBe(false);
  });

  it('always accepts made-to-order, which has no finite stock to check', () => {
    expect(canFulfill({ onHand: 0, reserved: 0, ...madeToOrder }, 99)).toBe(true);
  });

  it('rejects a non-positive quantity', () => {
    expect(canFulfill({ onHand: 5, reserved: 0, ...deny }, 0)).toBe(false);
    expect(canFulfill({ onHand: 5, reserved: 0, ...deny }, -1)).toBe(false);
  });
});
