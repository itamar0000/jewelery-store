/**
 * Money.
 *
 * Every monetary value in this system is an integer count of agorot
 * (1 ILS = 100 agorot). This is confirmed in docs/DECISIONS.md D0.1 and is the
 * least reversible decision in the project.
 *
 * Two properties this module is built to guarantee:
 *
 * 1. NO FLOATING-POINT ARITHMETIC. Every operation that could lose precision -
 *    percentage discounts, decimal parsing, decimal rendering - goes through
 *    `bigint`. `number` is used only to hold an already-exact integer count of
 *    agorot, which is always well inside the safe-integer range.
 *
 * 2. ACCIDENTAL MONEY ARITHMETIC DOES NOT TYPE-CHECK. `Money` is a branded
 *    number: `a + b` on two `Money` values yields a plain `number`, which no
 *    function here accepts. To add money you must call `add`. Likewise a raw
 *    number cannot be passed where `Money` is expected without going through
 *    `fromAgorot` or `fromShekels`, both of which validate.
 *
 * The brand is a compile-time construct only. At runtime a `Money` is just a
 * number, so it stores directly into a Prisma `Int` column and crosses the
 * server/client boundary as JSON with no serialisation ceremony.
 */

declare const MONEY_BRAND: unique symbol;
declare const PERCENT_BRAND: unique symbol;

/** An exact, integer number of agorot. Construct with `fromAgorot`/`fromShekels`. */
export type Money = number & { readonly [MONEY_BRAND]: 'agorot' };

/**
 * A percentage held as an integer number of basis points (1% = 100 bp), so
 * that a fractional rate like 12.5% is exact. Construct with `percent`.
 */
export type Percent = number & { readonly [PERCENT_BRAND]: 'basisPoints' };

/** Thrown for any input that cannot be represented exactly, or is out of range. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const AGOROT_PER_SHEKEL = 100n;
const BASIS_POINTS_PER_100_PERCENT = 10_000n;

/**
 * Sanity bound: ten billion agorot, i.e. 100,000,000 ILS.
 *
 * This is not a business rule about prices - it is a guard that turns a
 * mistyped or overflowed value into a loud error instead of a silently absurd
 * order total. It also keeps every intermediate `bigint` product far inside
 * exact range.
 */
export const MAX_AGOROT = 10_000_000_000;

const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** Zero shekels. */
export const ZERO = 0 as Money;

/* ------------------------------------------------------------------ *
 * Internal helpers
 * ------------------------------------------------------------------ */

/**
 * Integer division rounding halves UP, i.e. ties go toward positive infinity.
 *
 * This is the rounding rule fixed by ARCHITECTURE section 6.1. It matters only
 * at exact halves; -2.5 rounds to -2, not -3. Discounts are applied to
 * non-negative amounts, so the negative branch exists for completeness rather
 * than for a live case.
 *
 * `denominator` is always a positive constant in this module.
 */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator; // bigint division truncates toward zero
  const remainder = numerator % denominator;

  if (remainder === 0n) return quotient;

  const twiceRemainder = remainder < 0n ? -remainder * 2n : remainder * 2n;

  if (numerator > 0n) {
    // Truncation rounded down; step up on a tie or past it.
    return twiceRemainder >= denominator ? quotient + 1n : quotient;
  }

  // Truncation already rounded toward +infinity, so a tie needs no correction.
  return twiceRemainder > denominator ? quotient - 1n : quotient;
}

function assertInRange(agorot: bigint, context: string): void {
  const limit = BigInt(MAX_AGOROT);
  if (agorot > limit || agorot < -limit) {
    throw new MoneyError(
      `${context}: ${agorot} agorot is outside the supported range of +/-${MAX_AGOROT} agorot.`,
    );
  }
}

function toMoney(agorot: bigint, context: string): Money {
  assertInRange(agorot, context);
  return Number(agorot) as Money;
}

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

/**
 * Build `Money` from a whole number of agorot.
 *
 * This is the constructor for values that are already integral - database
 * columns, provider webhooks, arithmetic results. Rejects fractional agorot
 * rather than rounding them, because a fractional agora always means the
 * caller lost precision somewhere upstream and hiding that is how rounding
 * bugs survive.
 */
export function fromAgorot(value: number): Money {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MoneyError(`Expected a finite number of agorot, received ${String(value)}.`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(
      `Expected a whole number of agorot, received ${value}. ` +
        'A fractional agora means precision was already lost - fix the caller rather than rounding here.',
    );
  }
  return toMoney(BigInt(value), 'fromAgorot');
}

/**
 * Build `Money` from a shekel amount written in decimal - an admin price
 * field, a coupon threshold, a fixture.
 *
 * Prefer the string form. A `number` argument is converted through its decimal
 * string representation, so no multiplication by 100 ever happens in floating
 * point, but a literal such as `0.1 + 0.2` has already lost precision before
 * this function sees it and will be rejected rather than quietly rounded.
 *
 * At most two decimal places are accepted. Anything finer cannot be
 * represented in agorot; rounding it silently would be a decision this module
 * has no business making.
 */
export function fromShekels(value: string | number): Money {
  let text: string;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new MoneyError(`Expected a finite shekel amount, received ${String(value)}.`);
    }
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    throw new MoneyError(`Expected a string or number shekel amount, received ${typeof value}.`);
  }

  const match = DECIMAL_PATTERN.exec(text);
  if (!match) {
    throw new MoneyError(
      `"${text}" is not a valid shekel amount. ` +
        'Expected digits with at most two decimal places, for example "1299" or "1299.90".',
    );
  }

  // Defaults keep the types clean: the capture groups are guaranteed by the
  // pattern, but indexing a match is `string | undefined` under
  // noUncheckedIndexedAccess.
  const [, sign, whole = '0', fraction = ''] = match;
  const agorot = BigInt(whole) * AGOROT_PER_SHEKEL + BigInt(fraction.padEnd(2, '0'));

  return toMoney(sign === '-' ? -agorot : agorot, 'fromShekels');
}

/**
 * Build a `Percent` from a percentage rate: `percent(12.5)` is 12.5%.
 *
 * Held as basis points, so fractional rates stay exact. Bounded to 0-100: a
 * negative discount is a surcharge and a discount above 100% is a refund, and
 * neither should arrive here disguised as a coupon.
 */
export function percent(value: string | number): Percent {
  let text: string;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new MoneyError(`Expected a finite percentage, received ${String(value)}.`);
    }
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    throw new MoneyError(`Expected a string or number percentage, received ${typeof value}.`);
  }

  const match = DECIMAL_PATTERN.exec(text);
  if (!match) {
    throw new MoneyError(
      `"${text}" is not a valid percentage. Expected digits with at most two decimal places.`,
    );
  }

  const [, sign, whole = '0', fraction = ''] = match;
  if (sign === '-') {
    throw new MoneyError(`Percentage may not be negative, received "${text}".`);
  }

  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));

  if (basisPoints > BASIS_POINTS_PER_100_PERCENT) {
    throw new MoneyError(`Percentage may not exceed 100%, received "${text}".`);
  }

  return Number(basisPoints) as Percent;
}

/**
 * Build a `Percent` directly from basis points: `fromBasisPoints(1250)` is
 * 12.5%.
 *
 * This is the constructor to use when the rate already comes from storage.
 * Database columns hold basis points (`Coupon.discountValue`,
 * `Order.vatRateBps`), and routing those through `percent(value / 100)` would
 * put a floating-point division in the middle of a money pipeline built
 * specifically to avoid one.
 */
export function fromBasisPoints(basisPoints: number): Percent {
  if (!Number.isInteger(basisPoints)) {
    throw new MoneyError(
      `Basis points must be a whole number, received ${basisPoints}. ` +
        'A fractional basis point cannot be represented.',
    );
  }
  if (basisPoints < 0) {
    throw new MoneyError(`Percentage may not be negative, received ${basisPoints} basis points.`);
  }
  if (basisPoints > Number(BASIS_POINTS_PER_100_PERCENT)) {
    throw new MoneyError(`Percentage may not exceed 100%, received ${basisPoints} basis points.`);
  }
  return basisPoints as Percent;
}

/* ------------------------------------------------------------------ *
 * Conversion out
 * ------------------------------------------------------------------ */

/** The underlying integer agorot. Use when writing to storage or a provider API. */
export function toAgorot(money: Money): number {
  return money;
}

/**
 * The exact decimal shekel string, e.g. `"1299.90"`, always with two decimal
 * places.
 *
 * This is the machine-readable form: `<input type="number">` values,
 * schema.org `price`, payment-provider fields. It is NOT for display to
 * customers - use `formatPrice`, which localises.
 */
export function toShekelString(money: Money): string {
  const agorot = BigInt(money);
  const negative = agorot < 0n;
  const absolute = negative ? -agorot : agorot;

  const shekels = absolute / AGOROT_PER_SHEKEL;
  const remainder = absolute % AGOROT_PER_SHEKEL;

  return `${negative ? '-' : ''}${shekels}.${String(remainder).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

/** Sum. */
export function add(a: Money, b: Money): Money {
  return toMoney(BigInt(a) + BigInt(b), 'add');
}

/** Difference. May be negative - refunds and adjustments are legitimate. */
export function subtract(a: Money, b: Money): Money {
  return toMoney(BigInt(a) - BigInt(b), 'subtract');
}

/**
 * Multiply by a whole quantity - a line total from a unit price.
 *
 * The multiplier is deliberately restricted to integers. Multiplying money by
 * a fraction is how rounding bugs get in; for a proportion, use
 * `percentageOf`, which rounds explicitly and testably.
 */
export function multiply(money: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw new MoneyError(
      `Quantity must be a whole number, received ${quantity}. ` +
        'For a fractional proportion use percentageOf, which rounds explicitly.',
    );
  }
  return toMoney(BigInt(money) * BigInt(quantity), 'multiply');
}

/**
 * The portion of `money` represented by `rate`, rounded half up to the nearest
 * agora - i.e. the discount amount itself.
 *
 * ARCHITECTURE section 6.1 requires this to be applied to the LINE TOTAL, not
 * per unit: rounding once on 3 x 33.33 is not the same as rounding three times
 * and summing. Callers must multiply first, then discount.
 */
export function percentageOf(money: Money, rate: Percent): Money {
  const result = divideRoundHalfUp(BigInt(money) * BigInt(rate), BASIS_POINTS_PER_100_PERCENT);
  return toMoney(result, 'percentageOf');
}

/** `money` less `percentageOf(money, rate)` - the net amount after a discount. */
export function applyPercentageDiscount(money: Money, rate: Percent): Money {
  return subtract(money, percentageOf(money, rate));
}

/* ------------------------------------------------------------------ *
 * Comparison
 * ------------------------------------------------------------------ */

/** -1 if `a` is less than `b`, 0 if equal, 1 if greater. Sorts naturally. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Exact equality. */
export function equals(a: Money, b: Money): boolean {
  return a === b;
}

/** True for exactly zero. */
export function isZero(money: Money): boolean {
  return money === 0;
}

/** True below zero. */
export function isNegative(money: Money): boolean {
  return money < 0;
}
