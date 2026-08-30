import { describe, expect, it } from 'vitest';

import {
  MAX_AGOROT,
  MoneyError,
  ZERO,
  add,
  applyPercentageDiscount,
  compare,
  equals,
  fromAgorot,
  fromShekels,
  isNegative,
  isZero,
  multiply,
  percent,
  percentageOf,
  subtract,
  toAgorot,
  toShekelString,
} from './money';

describe('fromAgorot', () => {
  it('accepts whole agorot', () => {
    expect(toAgorot(fromAgorot(0))).toBe(0);
    expect(toAgorot(fromAgorot(1))).toBe(1);
    expect(toAgorot(fromAgorot(129_990))).toBe(129_990);
  });

  it('accepts negative amounts, which refunds and adjustments need', () => {
    expect(toAgorot(fromAgorot(-2_500))).toBe(-2_500);
  });

  it('accepts the range boundary', () => {
    expect(toAgorot(fromAgorot(MAX_AGOROT))).toBe(MAX_AGOROT);
    expect(toAgorot(fromAgorot(-MAX_AGOROT))).toBe(-MAX_AGOROT);
  });

  it('rejects a fractional agora rather than rounding it', () => {
    expect(() => fromAgorot(10.5)).toThrow(MoneyError);
    expect(() => fromAgorot(0.1)).toThrow(MoneyError);
  });

  it('rejects non-finite input', () => {
    expect(() => fromAgorot(Number.NaN)).toThrow(MoneyError);
    expect(() => fromAgorot(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });

  it('rejects amounts beyond the range bound', () => {
    expect(() => fromAgorot(MAX_AGOROT + 1)).toThrow(MoneyError);
    expect(() => fromAgorot(-MAX_AGOROT - 1)).toThrow(MoneyError);
  });
});

describe('fromShekels', () => {
  it('reads whole shekels', () => {
    expect(toAgorot(fromShekels('0'))).toBe(0);
    expect(toAgorot(fromShekels('1'))).toBe(100);
    expect(toAgorot(fromShekels('1299'))).toBe(129_900);
  });

  it('reads agorot, padding a single decimal place', () => {
    expect(toAgorot(fromShekels('0.01'))).toBe(1);
    expect(toAgorot(fromShekels('0.1'))).toBe(10);
    expect(toAgorot(fromShekels('0.10'))).toBe(10);
    expect(toAgorot(fromShekels('1299.90'))).toBe(129_990);
    expect(toAgorot(fromShekels('1299.9'))).toBe(129_990);
    expect(toAgorot(fromShekels('1299.99'))).toBe(129_999);
  });

  it('reads negative amounts', () => {
    expect(toAgorot(fromShekels('-0.50'))).toBe(-50);
    expect(toAgorot(fromShekels('-1299.90'))).toBe(-129_990);
  });

  it('trims surrounding whitespace', () => {
    expect(toAgorot(fromShekels('  1299.90  '))).toBe(129_990);
  });

  it('accepts a number without multiplying in floating point', () => {
    expect(toAgorot(fromShekels(1299.9))).toBe(129_990);
    expect(toAgorot(fromShekels(0.07))).toBe(7);
    // 4.35 * 100 is 434.99999999999994 in IEEE 754, so the naive
    // `Math.trunc(value * 100)` yields 434 - one agora short. Parsing the
    // decimal string instead is exact.
    expect(Math.trunc(4.35 * 100)).toBe(434);
    expect(toAgorot(fromShekels(4.35))).toBe(435);
  });

  it('rejects a value that already lost precision before arriving', () => {
    // 0.1 + 0.2 === 0.30000000000000004, which is not a representable price.
    expect(() => fromShekels(0.1 + 0.2)).toThrow(MoneyError);
    // 1.005 * 1000 === 1004.9999999999999, likewise.
    expect(() => fromShekels(1.005 * 1000)).toThrow(MoneyError);
  });

  it('rejects more precision than an agora can hold', () => {
    expect(() => fromShekels('1.005')).toThrow(MoneyError);
    expect(() => fromShekels('0.001')).toThrow(MoneyError);
  });

  it('rejects malformed input', () => {
    expect(() => fromShekels('')).toThrow(MoneyError);
    expect(() => fromShekels('   ')).toThrow(MoneyError);
    expect(() => fromShekels('abc')).toThrow(MoneyError);
    expect(() => fromShekels('12abc')).toThrow(MoneyError);
    expect(() => fromShekels('1,299.90')).toThrow(MoneyError);
    expect(() => fromShekels('.5')).toThrow(MoneyError);
    expect(() => fromShekels('1.')).toThrow(MoneyError);
    expect(() => fromShekels('₪1299')).toThrow(MoneyError);
    expect(() => fromShekels('1e3')).toThrow(MoneyError);
    expect(() => fromShekels(Number.NaN)).toThrow(MoneyError);
  });

  it('rejects amounts beyond the range bound', () => {
    expect(() => fromShekels('100000001')).toThrow(MoneyError);
  });
});

describe('percent', () => {
  it('reads whole and fractional rates exactly', () => {
    expect(percent(0)).toBe(0);
    expect(percent(10)).toBe(1_000);
    expect(percent(12.5)).toBe(1_250);
    expect(percent('7.25')).toBe(725);
    expect(percent(100)).toBe(10_000);
  });

  it('rejects rates outside 0-100', () => {
    expect(() => percent(-1)).toThrow(MoneyError);
    expect(() => percent(100.01)).toThrow(MoneyError);
    expect(() => percent(150)).toThrow(MoneyError);
  });

  it('rejects malformed rates', () => {
    expect(() => percent('ten')).toThrow(MoneyError);
    expect(() => percent('12.345')).toThrow(MoneyError);
    expect(() => percent(Number.NaN)).toThrow(MoneyError);
  });
});

describe('toShekelString', () => {
  it('always emits two decimal places', () => {
    expect(toShekelString(ZERO)).toBe('0.00');
    expect(toShekelString(fromAgorot(1))).toBe('0.01');
    expect(toShekelString(fromAgorot(10))).toBe('0.10');
    expect(toShekelString(fromAgorot(100))).toBe('1.00');
    expect(toShekelString(fromAgorot(129_990))).toBe('1299.90');
    expect(toShekelString(fromAgorot(129_999))).toBe('1299.99');
  });

  it('emits negative amounts with a leading sign', () => {
    expect(toShekelString(fromAgorot(-50))).toBe('-0.50');
    expect(toShekelString(fromAgorot(-129_990))).toBe('-1299.90');
  });

  it('round-trips through fromShekels', () => {
    for (const agorot of [0, 1, 7, 99, 100, 101, 129_990, MAX_AGOROT]) {
      const money = fromAgorot(agorot);
      expect(toAgorot(fromShekels(toShekelString(money)))).toBe(agorot);
    }
  });
});

describe('add and subtract', () => {
  it('sums exactly', () => {
    expect(toAgorot(add(fromShekels('0.1'), fromShekels('0.2')))).toBe(30);
    expect(toAgorot(add(fromShekels('1299.90'), fromShekels('249.50')))).toBe(154_940);
  });

  it('treats zero as an identity', () => {
    const price = fromShekels('1299.90');
    expect(toAgorot(add(price, ZERO))).toBe(129_990);
    expect(toAgorot(subtract(price, ZERO))).toBe(129_990);
  });

  it('subtracts, including past zero', () => {
    expect(toAgorot(subtract(fromShekels('100'), fromShekels('40.50')))).toBe(5_950);
    expect(toAgorot(subtract(fromShekels('40'), fromShekels('100')))).toBe(-6_000);
  });

  it('rejects a sum that overflows the range bound', () => {
    const nearLimit = fromAgorot(MAX_AGOROT);
    expect(() => add(nearLimit, fromAgorot(1))).toThrow(MoneyError);
  });
});

describe('multiply', () => {
  it('scales by a whole quantity', () => {
    expect(toAgorot(multiply(fromShekels('1299.90'), 3))).toBe(389_970);
    expect(toAgorot(multiply(fromShekels('1299.90'), 0))).toBe(0);
    expect(toAgorot(multiply(fromShekels('0.01'), 7))).toBe(7);
  });

  it('stays exact at a scale that would drift in floating point', () => {
    // 0.07 * 3 is 0.21000000000000002 in IEEE 754.
    expect(toAgorot(multiply(fromShekels('0.07'), 3))).toBe(21);
  });

  it('rejects a fractional multiplier, which would need an unstated rounding rule', () => {
    expect(() => multiply(fromShekels('100'), 1.5)).toThrow(MoneyError);
    expect(() => multiply(fromShekels('100'), 0.5)).toThrow(MoneyError);
  });

  it('rejects a product beyond the range bound', () => {
    expect(() => multiply(fromAgorot(MAX_AGOROT), 2)).toThrow(MoneyError);
  });
});

describe('percentageOf', () => {
  it('computes clean percentages exactly', () => {
    expect(toAgorot(percentageOf(fromShekels('100'), percent(10)))).toBe(1_000);
    expect(toAgorot(percentageOf(fromShekels('1299.90'), percent(20)))).toBe(25_998);
  });

  it('handles a fractional rate', () => {
    // 12.5% of 100.00 is exactly 12.50.
    expect(toAgorot(percentageOf(fromShekels('100'), percent(12.5)))).toBe(1_250);
  });

  it('returns zero for a zero rate or a zero amount', () => {
    expect(toAgorot(percentageOf(fromShekels('1299.90'), percent(0)))).toBe(0);
    expect(toAgorot(percentageOf(ZERO, percent(20)))).toBe(0);
  });

  it('returns the whole amount at 100%', () => {
    expect(toAgorot(percentageOf(fromShekels('1299.90'), percent(100)))).toBe(129_990);
  });

  describe('rounding edges', () => {
    it('rounds an exact half up', () => {
      // 50% of 0.05 is 0.025 -> 2.5 agorot -> 3.
      expect(toAgorot(percentageOf(fromShekels('0.05'), percent(50)))).toBe(3);
      // 10% of 0.15 is 1.5 agorot -> 2.
      expect(toAgorot(percentageOf(fromShekels('0.15'), percent(10)))).toBe(2);
      // 50% of 0.01 is 0.5 agorot -> 1.
      expect(toAgorot(percentageOf(fromShekels('0.01'), percent(50)))).toBe(1);
    });

    it('rounds below a half down', () => {
      // 10% of 0.14 is 1.4 agorot -> 1.
      expect(toAgorot(percentageOf(fromShekels('0.14'), percent(10)))).toBe(1);
      // 33% of 1.00 is 33 agorot exactly.
      expect(toAgorot(percentageOf(fromShekels('1'), percent(33)))).toBe(33);
      // 15% of 0.03 is 0.45 agorot -> 0.
      expect(toAgorot(percentageOf(fromShekels('0.03'), percent(15)))).toBe(0);
    });

    it('rounds above a half up', () => {
      // 10% of 0.16 is 1.6 agorot -> 2.
      expect(toAgorot(percentageOf(fromShekels('0.16'), percent(10)))).toBe(2);
    });

    it('rounds ties toward positive infinity for negative amounts', () => {
      // ARCHITECTURE section 6.1 fixes "round half up", not "half away from
      // zero": -2.5 agorot becomes -2.
      expect(toAgorot(percentageOf(fromAgorot(-5), percent(50)))).toBe(-2);
      // -2.6 agorot is not a tie and becomes -3.
      expect(toAgorot(percentageOf(fromAgorot(-13), percent(20)))).toBe(-3);
    });

    it('rounds the line total, not each unit', () => {
      // The rule from ARCHITECTURE section 6.1, and the reason it exists.
      const unit = fromShekels('33.33');
      const rate = percent(15);

      const perLine = percentageOf(multiply(unit, 3), rate);
      const perUnitThenSummed = multiply(percentageOf(unit, rate), 3);

      // 15% of 99.99 is 14.9985 -> 1500 agorot.
      expect(toAgorot(perLine)).toBe(1_500);
      // 15% of 33.33 is 4.9995 -> 500 agorot each, 1500 summed. Here the two
      // agree; the point is that only the first is the defined rule.
      expect(toAgorot(perUnitThenSummed)).toBe(1_500);

      // A case where they genuinely diverge: 33% of 0.05, three times.
      const small = fromShekels('0.05');
      const third = percent(33);
      expect(toAgorot(percentageOf(multiply(small, 3), third))).toBe(5); // 4.95 -> 5
      expect(toAgorot(multiply(percentageOf(small, third), 3))).toBe(6); // 2 each -> 6
    });
  });
});

describe('applyPercentageDiscount', () => {
  it('returns the net amount', () => {
    expect(toAgorot(applyPercentageDiscount(fromShekels('100'), percent(10)))).toBe(9_000);
    expect(toAgorot(applyPercentageDiscount(fromShekels('1299.90'), percent(20)))).toBe(103_992);
  });

  it('is a no-op at 0% and reaches zero at 100%', () => {
    const price = fromShekels('1299.90');
    expect(toAgorot(applyPercentageDiscount(price, percent(0)))).toBe(129_990);
    expect(toAgorot(applyPercentageDiscount(price, percent(100)))).toBe(0);
  });

  it('always agrees with percentageOf', () => {
    const price = fromShekels('349.95');
    const rate = percent(17.5);
    expect(toAgorot(add(applyPercentageDiscount(price, rate), percentageOf(price, rate)))).toBe(
      toAgorot(price),
    );
  });
});

describe('comparison', () => {
  it('orders amounts', () => {
    expect(compare(fromShekels('10'), fromShekels('20'))).toBe(-1);
    expect(compare(fromShekels('20'), fromShekels('10'))).toBe(1);
    expect(compare(fromShekels('10'), fromShekels('10.00'))).toBe(0);
    expect(compare(fromShekels('-10'), ZERO)).toBe(-1);
  });

  it('sorts with compare directly', () => {
    const prices = [fromShekels('99.90'), fromShekels('12.50'), fromShekels('1299')];
    const sorted = [...prices].sort(compare).map(toShekelString);
    expect(sorted).toEqual(['12.50', '99.90', '1299.00']);
  });

  it('reports equality and sign', () => {
    expect(equals(fromShekels('10'), fromShekels('10.00'))).toBe(true);
    expect(equals(fromShekels('10'), fromShekels('10.01'))).toBe(false);
    expect(isZero(ZERO)).toBe(true);
    expect(isZero(fromAgorot(1))).toBe(false);
    expect(isNegative(fromAgorot(-1))).toBe(true);
    expect(isNegative(ZERO)).toBe(false);
  });
});

describe('large values', () => {
  it('stays exact at the top of the range', () => {
    const large = fromAgorot(MAX_AGOROT);
    expect(toShekelString(large)).toBe('100000000.00');
    expect(toAgorot(percentageOf(large, percent(10)))).toBe(1_000_000_000);
    expect(toAgorot(subtract(large, fromAgorot(1)))).toBe(MAX_AGOROT - 1);
  });

  it('keeps every intermediate product inside exact integer range', () => {
    // The widest intermediate is agorot x basis points: 1e10 x 1e4 = 1e14,
    // which exceeds Number.MAX_SAFE_INTEGER only if computed as a number.
    // It is computed as a bigint, so this is exact.
    expect(toAgorot(percentageOf(fromAgorot(MAX_AGOROT), percent(99.99)))).toBe(9_999_000_000);
  });
});
