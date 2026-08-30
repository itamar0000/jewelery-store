/**
 * The money module. Import from `@/lib/money`, never from the files inside it.
 *
 * Every monetary value in the application is an integer count of agorot
 * (docs/DECISIONS.md D0.1). All arithmetic, rounding and formatting lives
 * here, so that rounding behaviour is defined in exactly one place and is
 * covered by exactly one set of tests.
 */

export {
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
  type Money,
  type Percent,
} from './money';

export { formatPrice, type AgorotDisplay, type FormatPriceOptions } from './format';
