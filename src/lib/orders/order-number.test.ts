import { describe, expect, it } from 'vitest';

import {
  FIRST_CUSTOM_REQUEST_NUMBER,
  FIRST_ORDER_NUMBER,
  formatCustomRequestNumber,
  formatOrderNumber,
  parseOrderNumber,
} from './order-number';

/**
 * Formatting only. That the numbers are unique and concurrency-safe is a
 * property of the PostgreSQL sequence, asserted in
 * `src/lib/db/constraints.integration.test.ts` against a real database.
 */

describe('formatOrderNumber', () => {
  it('renders the sequence value plainly', () => {
    expect(formatOrderNumber(100_001)).toBe('100001');
    expect(formatOrderNumber(123_456)).toBe('123456');
  });

  it('starts well above 1, so the first order does not read as "order 1"', () => {
    expect(FIRST_ORDER_NUMBER).toBe(100_001);
    expect(FIRST_CUSTOM_REQUEST_NUMBER).toBe(500_001);
  });

  it('keeps orders and custom requests in separate number spaces', () => {
    expect(formatCustomRequestNumber(500_001)).toBe('500001');
    expect(FIRST_CUSTOM_REQUEST_NUMBER).toBeGreaterThan(FIRST_ORDER_NUMBER);
  });

  it('rejects a value that cannot have come from the sequence', () => {
    expect(() => formatOrderNumber(0)).toThrow(RangeError);
    expect(() => formatOrderNumber(-1)).toThrow(RangeError);
    expect(() => formatOrderNumber(1.5)).toThrow(RangeError);
  });
});

describe('parseOrderNumber', () => {
  it('reads a reference a customer typed', () => {
    expect(parseOrderNumber('100001')).toBe(100_001);
    expect(parseOrderNumber('  100001  ')).toBe(100_001);
  });

  it('returns null instead of throwing on bad input', () => {
    // A customer typing a wrong reference is an expected case, not an
    // exception.
    expect(parseOrderNumber('')).toBeNull();
    expect(parseOrderNumber('abc')).toBeNull();
    expect(parseOrderNumber('100001x')).toBeNull();
    expect(parseOrderNumber('-1')).toBeNull();
    expect(parseOrderNumber('1e5')).toBeNull();
  });

  it('rejects a number below the first issued order', () => {
    // Guards against someone probing with low integers hoping to hit an id.
    expect(parseOrderNumber('1')).toBeNull();
    expect(parseOrderNumber('99999')).toBeNull();
  });
});
