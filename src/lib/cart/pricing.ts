import { add, fromAgorot, multiply, toAgorot, ZERO, type Money } from '@/lib/money';

/**
 * Cart and order arithmetic.
 *
 * PURE, AND THE ONLY PLACE A LINE OR AN ORDER IS PRICED. The cart page, the
 * checkout summary and order creation all call these functions with prices read
 * from the database on the server; nothing here accepts a price from a browser
 * (MASTER_SPECIFICATION section 48). The order's own database constraint
 * (`OrderItem_line_total_consistent`) states the same formula, so an order
 * written from these numbers cannot disagree with itself.
 */

/** Most units of one configuration a single line may hold. */
export const MAX_LINE_QUANTITY = 10;

/**
 * SHIPPING IS FREE - the owner's decision (TBD.md B4, 2026-10-05).
 *
 * Configuration rather than a literal at the call sites, so a fee or a
 * free-shipping threshold later is a change here and nowhere else. The method
 * label is generic on purpose: the carrier is not chosen yet (TBD.md B3).
 */
export const SHIPPING = {
  feeAgorot: 0,
  methodLabelHe: 'משלוח',
} as const;

export interface PricedLineInput {
  /** The variant's effective price, from the database. */
  readonly unitPrice: Money;
  /** Per-unit personalisation surcharge, from the product's own fields. */
  readonly personalizationPrice: Money;
  readonly quantity: number;
}

/** `(unit + personalisation) x quantity` - the formula the order table enforces. */
export function lineTotal(line: PricedLineInput): Money {
  return multiply(add(line.unitPrice, line.personalizationPrice), line.quantity);
}

export interface Totals {
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly total: Money;
  /** Units, not lines: two of one ring count as two. */
  readonly itemCount: number;
}

/** Totals over the lines that can actually be ordered. */
export function computeTotals(lines: readonly PricedLineInput[]): Totals {
  const subtotal = lines.reduce<Money>((sum, line) => add(sum, lineTotal(line)), ZERO);
  const shipping = fromAgorot(SHIPPING.feeAgorot);

  return {
    subtotal,
    shipping,
    total: add(subtotal, shipping),
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
  };
}

/**
 * VAT included in a VAT-inclusive amount, for a rate in basis points.
 *
 * Catalogue prices already include VAT, so this states the part of the total
 * that is tax rather than adding anything. Rounded to the agora; `null` when
 * no rate is configured (TBD.md B21), because a VAT line built on a guessed
 * rate is a statement the business never made.
 */
export function includedVat(total: Money, rateBps: number | null | undefined): Money | null {
  if (rateBps === null || rateBps === undefined) return null;

  const agorot = toAgorot(total);
  return fromAgorot(Math.round((agorot * rateBps) / (10_000 + rateBps)));
}

/** Clamp a requested quantity into what a line may hold. */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}
