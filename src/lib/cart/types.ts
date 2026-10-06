import type { Money } from '@/lib/money';

/**
 * What the cart, the checkout and the header are given.
 *
 * View models, not rows: every money value was computed on the server from the
 * catalogue at the moment the view was built, and nothing here travels back to
 * the server as a price.
 */
export interface CartLineView {
  /** The cart line's id - the handle for changing or removing it. */
  readonly id: string;
  readonly productSlug: string;
  readonly productName: string;
  readonly imageUrl: string | null;
  readonly imageAlt: string;
  /** The variant's axis values in reading order: "18 קראט · זהב לבן". */
  readonly variantLabel: string;
  /** Selections recorded on the line - ring size, chain length. */
  readonly selections: readonly { readonly label: string; readonly value: string }[];
  /** Personalisation as entered, with the field's current label. */
  readonly personalization: readonly { readonly label: string; readonly value: string }[];
  readonly quantity: number;
  readonly unitPrice: Money;
  /** Per-unit surcharge for the personalisation on this line. */
  readonly personalizationPrice: Money;
  readonly lineTotal: Money;
  /** Preparation days when the line is made to order; null otherwise. */
  readonly leadTimeDays: number | null;
  /**
   * False when the piece can no longer be ordered as configured - withdrawn
   * from the catalogue, or a stocked variant that has run out. Such a line is
   * shown, marked, and left out of the totals.
   */
  readonly available: boolean;
}

export interface CartView {
  readonly lines: readonly CartLineView[];
  /** Units across the lines that can be ordered. */
  readonly itemCount: number;
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly total: Money;
  readonly hasUnavailable: boolean;
}

/**
 * What the product page sends to put a piece in the bag: choices, never
 * money. Labels ride along because the shared schema asks for them; the
 * server replaces them with the catalogue's own.
 */
export interface AddToCartRequest {
  readonly variantId: string;
  readonly quantity: number;
  readonly selections: readonly {
    readonly optionCode: string;
    readonly optionLabelHe: string;
    readonly value: string;
    readonly valueLabelHe: string;
  }[];
  readonly personalization: Readonly<Record<string, string>>;
}

/** A field the shopper must correct, keyed the way the form names it. */
export interface FieldProblem {
  /** An option code (`ring_size`) or a personalisation key (`name`). */
  readonly field: string;
  readonly reason: 'missing' | 'invalid';
}

export type CartMutationResult =
  | { readonly ok: true; readonly itemCount: number }
  | {
      readonly ok: false;
      readonly error: 'invalid' | 'unavailable' | 'needs-choices' | 'not-found';
      readonly problems?: readonly FieldProblem[];
    };
