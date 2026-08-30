import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';
import { ZERO, fromAgorot, fromShekels } from './money';

/**
 * Intl output for he-IL carries Unicode directional marks (U+200F RIGHT-TO-LEFT
 * MARK), which is correct and deliberate - see format.ts. Assertions strip them
 * so the tests describe the visible text rather than pinning bidi control
 * characters that ICU is entitled to move between versions. One test below
 * asserts the marks are present, because their absence would be a real bug.
 */
const visible = (value: string): string =>
  value
    .replace(/[‎‏؜]/g, '') // LRM, RLM, ALM
    .replace(/[  ]/g, ' ') // NBSP / narrow NBSP -> ordinary space
    .trim();

describe('formatPrice', () => {
  it('formats in Israeli shekels', () => {
    expect(visible(formatPrice(fromShekels('1299')))).toBe('1,299 ₪');
  });

  it('groups thousands', () => {
    expect(visible(formatPrice(fromShekels('1234567')))).toBe('1,234,567 ₪');
  });

  it('hides the agorot on a round amount', () => {
    expect(visible(formatPrice(fromShekels('1299.00')))).toBe('1,299 ₪');
    expect(visible(formatPrice(ZERO))).toBe('0 ₪');
  });

  it('shows the agorot when the amount has them', () => {
    expect(visible(formatPrice(fromShekels('1299.90')))).toBe('1,299.90 ₪');
    expect(visible(formatPrice(fromAgorot(1)))).toBe('0.01 ₪');
    expect(visible(formatPrice(fromAgorot(10)))).toBe('0.10 ₪');
  });

  it('shows the agorot unconditionally when asked', () => {
    expect(visible(formatPrice(fromShekels('1299'), { agorot: 'always' }))).toBe('1,299.00 ₪');
    expect(visible(formatPrice(ZERO, { agorot: 'always' }))).toBe('0.00 ₪');
  });

  it('never rounds away agorot when hiding them', () => {
    // The 0-decimal formatter is only ever reached for amounts that have no
    // agorot, so no visible amount is ever silently rounded.
    expect(visible(formatPrice(fromShekels('1299.50')))).toBe('1,299.50 ₪');
    expect(visible(formatPrice(fromShekels('0.99')))).toBe('0.99 ₪');
  });

  it('formats negative amounts', () => {
    expect(visible(formatPrice(fromShekels('-50.25')))).toBe('-50.25 ₪');
  });

  it('emits the directional marks that keep the currency sign on the correct side', () => {
    // Without these, a price embedded in Hebrew copy renders with the shekel
    // sign adrift (MASTER_SPECIFICATION section 49).
    expect(formatPrice(fromShekels('1299.90'))).toContain('‏');
  });

  it('stays exact at large values, where a float would have drifted', () => {
    expect(visible(formatPrice(fromAgorot(9_999_999_999)))).toBe('99,999,999.99 ₪');
  });
});
