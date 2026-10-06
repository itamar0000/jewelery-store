import { describe, expect, it } from 'vitest';

import { fromShekels, toAgorot } from '@/lib/money';

import {
  MAX_LINE_QUANTITY,
  SHIPPING,
  clampQuantity,
  computeTotals,
  includedVat,
  lineTotal,
} from './pricing';

describe('lineTotal', () => {
  it('is (unit + personalisation) x quantity, the formula the order table enforces', () => {
    const total = lineTotal({
      unitPrice: fromShekels(1290),
      personalizationPrice: fromShekels(90),
      quantity: 2,
    });

    expect(toAgorot(total)).toBe(276_000);
  });
});

describe('computeTotals', () => {
  it('adds the lines, counts units, and charges the configured shipping', () => {
    const totals = computeTotals([
      { unitPrice: fromShekels(4890), personalizationPrice: fromShekels(0), quantity: 1 },
      { unitPrice: fromShekels(1290), personalizationPrice: fromShekels(90), quantity: 2 },
    ]);

    expect(toAgorot(totals.subtotal)).toBe(765_000);
    expect(toAgorot(totals.shipping)).toBe(SHIPPING.feeAgorot);
    expect(toAgorot(totals.total)).toBe(765_000 + SHIPPING.feeAgorot);
    expect(totals.itemCount).toBe(3);
  });

  it("ships free, by the owner's decision", () => {
    expect(SHIPPING.feeAgorot).toBe(0);
  });

  it('totals nothing to zero', () => {
    const totals = computeTotals([]);

    expect(toAgorot(totals.total)).toBe(0);
    expect(totals.itemCount).toBe(0);
  });
});

describe('includedVat', () => {
  it('states the VAT inside a VAT-inclusive total', () => {
    // 1,180 including 18% VAT is 1,000 + 180.
    expect(toAgorot(includedVat(fromShekels(1180), 1800)!)).toBe(18_000);
  });

  it('states nothing when no rate is configured', () => {
    expect(includedVat(fromShekels(1180), null)).toBeNull();
    expect(includedVat(fromShekels(1180), undefined)).toBeNull();
  });
});

describe('clampQuantity', () => {
  it('keeps a line between one unit and the line maximum', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(3.7)).toBe(3);
    expect(clampQuantity(500)).toBe(MAX_LINE_QUANTITY);
    expect(clampQuantity(Number.NaN)).toBe(1);
  });
});
