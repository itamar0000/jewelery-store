/**
 * Availability resolution.
 *
 * Availability is DERIVED, never stored as a display string
 * (MASTER_SPECIFICATION section 13, 14; ARCHITECTURE 6.4). Storing "In Stock"
 * as text guarantees it eventually disagrees with the numbers.
 *
 * This module is pure — it takes the numbers and returns a decision — so the
 * full matrix is testable without a database.
 */

/** Mirrors the Prisma `InventoryPolicy` enum, kept structural so this module has no Prisma import. */
export type InventoryPolicyValue = 'DENY' | 'MADE_TO_ORDER';

export type AvailabilityState = 'IN_STOCK' | 'MADE_TO_ORDER' | 'OUT_OF_STOCK';

export interface AvailabilityInput {
  onHand: number;
  /** Units held by ACTIVE reservations. */
  reserved: number;
  policy: InventoryPolicyValue;
  /**
   * Variant threshold, falling back to the product's. `null`/`undefined` at
   * both levels means NO low-stock messaging at all — which is the correct
   * behaviour while the threshold is undecided (section 13, TBD). Silence beats
   * an invented rule.
   */
  lowStockThreshold?: number | null;
  /** Variant preparation days, falling back to the product's (section 14). */
  prepDays?: number | null;
}

export interface Availability {
  state: AvailabilityState;
  /** Units sellable from stock right now. Never negative in a report. */
  available: number;
  /**
   * True only when a threshold is configured AND stock is at or below it AND
   * there is still stock to sell. False whenever no threshold is set.
   */
  isLowStock: boolean;
  /** Preparation days to show alongside MADE_TO_ORDER; null otherwise. */
  prepDays: number | null;
  /** Whether this variant can be added to a cart at all. */
  isPurchasable: boolean;
}

/**
 * Units sellable from stock.
 *
 * Clamped at zero for reporting: a negative figure is meaningless to a
 * customer, and the database CHECK constraints make a genuinely negative
 * balance impossible for DENY variants anyway.
 */
export function availableToSell(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

/**
 * Resolve availability for one variant.
 *
 *   available > 0                            -> IN_STOCK
 *   available <= 0, policy = MADE_TO_ORDER   -> MADE_TO_ORDER (show prep time)
 *   available <= 0, policy = DENY            -> OUT_OF_STOCK
 *
 * Made-to-order is a FALLBACK, exactly as section 14 describes: a variant may
 * be out of stock and still sellable, with a preparation time.
 */
export function resolveAvailability(input: AvailabilityInput): Availability {
  const available = availableToSell(input.onHand, input.reserved);
  const threshold = input.lowStockThreshold ?? null;
  const prepDays = input.prepDays ?? null;

  if (available > 0) {
    return {
      state: 'IN_STOCK',
      available,
      isLowStock: threshold !== null && available <= threshold,
      prepDays: null,
      isPurchasable: true,
    };
  }

  if (input.policy === 'MADE_TO_ORDER') {
    return {
      state: 'MADE_TO_ORDER',
      available: 0,
      // Made-to-order has no stock to run low on; a "only 2 left" message
      // alongside "made to order" would be incoherent.
      isLowStock: false,
      prepDays,
      isPurchasable: true,
    };
  }

  return {
    state: 'OUT_OF_STOCK',
    available: 0,
    isLowStock: false,
    prepDays: null,
    isPurchasable: false,
  };
}

/**
 * Whether `quantity` units can be committed right now.
 *
 * This is an ADVISORY check for rendering — it is deliberately not what
 * protects stock. The authoritative check is the atomic conditional UPDATE in
 * `reservation.ts`, because anything that reads and then writes in two steps
 * races (DATA_MODEL_REVIEW F7).
 */
export function canFulfill(input: AvailabilityInput, quantity: number): boolean {
  if (quantity <= 0) return false;
  if (input.policy === 'MADE_TO_ORDER') return true;
  return availableToSell(input.onHand, input.reserved) >= quantity;
}
