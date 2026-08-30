import { SITE_LOCALE } from '@/lib/config/site';

import { toShekelString, type Money } from './money';

/**
 * Money presentation.
 *
 * Formatting happens here and nowhere else (ARCHITECTURE section 3.2 and 6.1).
 * A component that builds a price string by hand will drift from the rest of
 * the site the first time the convention changes.
 *
 * `Intl.NumberFormat` is given the exact decimal STRING from
 * `toShekelString`, not a JavaScript number. Number input would reintroduce
 * floating point at the last possible moment, which is exactly the class of
 * bug the agorot representation exists to prevent.
 *
 * The output carries Unicode directional marks. That is correct and must not
 * be stripped: without them a shekel sign next to a Latin-digit price inside
 * Hebrew copy lands on the wrong side (section 49, "proper prices and currency
 * formatting").
 */

const CURRENCY = 'ILS';

/**
 * How to render the agorot part.
 *
 * - `auto` (default): two decimals only when the amount has agorot, so a round
 *   price reads as "1,299 ₪" rather than "1,299.00 ₪".
 * - `always`: two decimals unconditionally. Use where amounts are compared
 *   column-wise - order totals, invoices, admin tables - and a ragged decimal
 *   point is harder to scan.
 *
 * This is a presentation convention, not a business rule. The specification
 * does not fix one, and changing it later touches this file only.
 */
export type AgorotDisplay = 'auto' | 'always';

export interface FormatPriceOptions {
  agorot?: AgorotDisplay;
}

// Formatters are expensive to construct and are reused across every render.
const formatterCache = new Map<number, Intl.NumberFormat>();

function formatter(fractionDigits: number): Intl.NumberFormat {
  const cached = formatterCache.get(fractionDigits);
  if (cached) return cached;

  const created = new Intl.NumberFormat(SITE_LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  formatterCache.set(fractionDigits, created);
  return created;
}

/**
 * The customer-facing price string, localised for Hebrew/Israel.
 *
 * Never use this for machine-readable output - `<input value>`, schema.org
 * `price`, a payment provider payload. Use `toShekelString` for those.
 */
export function formatPrice(money: Money, options: FormatPriceOptions = {}): string {
  const decimal = toShekelString(money);
  const showAgorot = options.agorot === 'always' || !decimal.endsWith('.00');

  // Intl V3 accepts a decimal string, but its type is the template literal
  // `${number}`, which no computed string is assignable to. `toShekelString`
  // is the only producer of this value and always emits a plain decimal, so
  // the assertion is safe and is confined to this one line.
  const exact = decimal as Intl.StringNumericLiteral;

  return formatter(showAgorot ? 2 : 0).format(exact);
}
