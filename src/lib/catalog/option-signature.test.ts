import { describe, expect, it } from 'vitest';

import {
  EMPTY_OPTION_SIGNATURE,
  computeOptionSignature,
  isSameOptionCombination,
  parseOptionSignature,
} from './option-signature';

describe('computeOptionSignature', () => {
  it('is independent of the order values arrive in', () => {
    // This is the whole point: without sorting, "14K + Yellow" and
    // "Yellow + 14K" would produce two different signatures and the unique
    // constraint would let both variants exist.
    expect(computeOptionSignature(['b', 'a'])).toBe(computeOptionSignature(['a', 'b']));
  });

  it('produces different signatures for different combinations', () => {
    expect(computeOptionSignature(['14k', 'yellow'])).not.toBe(
      computeOptionSignature(['14k', 'white']),
    );
    expect(computeOptionSignature(['14k', 'yellow'])).not.toBe(
      computeOptionSignature(['18k', 'yellow']),
    );
  });

  it('ignores duplicate ids, which describe the same combination', () => {
    expect(computeOptionSignature(['a', 'a', 'b'])).toBe(computeOptionSignature(['a', 'b']));
  });

  it('gives a product with no variant axes an empty signature', () => {
    expect(computeOptionSignature([])).toBe(EMPTY_OPTION_SIGNATURE);
  });

  it('is stable across repeated calls', () => {
    const ids = ['c9d', 'a1b', 'z0x'];
    expect(computeOptionSignature(ids)).toBe(computeOptionSignature(ids));
  });

  it('does not confuse a longer id with two shorter ones', () => {
    // The separator must not be reachable by concatenation.
    expect(computeOptionSignature(['ab', 'c'])).not.toBe(computeOptionSignature(['abc']));
  });
});

describe('isSameOptionCombination', () => {
  it('compares sets, not sequences', () => {
    expect(isSameOptionCombination(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(isSameOptionCombination(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(isSameOptionCombination([], [])).toBe(true);
  });
});

describe('parseOptionSignature', () => {
  it('round-trips', () => {
    const ids = ['a1', 'b2', 'c3'];
    expect(parseOptionSignature(computeOptionSignature(ids))).toEqual(ids);
  });

  it('reads an empty signature as no values', () => {
    expect(parseOptionSignature(EMPTY_OPTION_SIGNATURE)).toEqual([]);
  });
});
