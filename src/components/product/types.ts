import type { Money } from '@/lib/money';

/**
 * What a product card needs in order to render.
 *
 * A VIEW MODEL, not a database row. The card is given exactly this and nothing
 * else, so the component never learns the shape of the Prisma schema and later
 * phases can map a real query onto it without touching the card.
 *
 * The important field is `stockNotice`.
 *
 * MASTER_SPECIFICATION and the Phase 3A brief both require that low-stock
 * messaging never appears by default and is never invented. It is therefore an
 * OPTIONAL field with no default: a card shows scarcity only when a caller
 * holding real inventory data passes it. There is deliberately no
 * `lowStockThreshold` prop and no client-side "if quantity < 3" rule - that
 * decision belongs to `src/lib/inventory`, against real stock, not to a
 * presentation component.
 */
export interface ProductCardData {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly price: Money;
  /**
   * Original price, when the product is genuinely discounted. Rendered struck
   * through beside the current price. Omit when there is no real comparison.
   */
  readonly compareAtPrice?: Money;
  readonly badges?: readonly ProductBadge[];
  /**
   * Scarcity message, supplied only from real inventory. Absent means the card
   * says nothing about stock, which is the default and the safe state.
   */
  readonly stockNotice?: string;
  /** Alt text for the photograph, delivered or not. */
  readonly imageAlt?: string;
  /**
   * Resolved public URL for the card image, or absent while the photograph has
   * not been delivered. The card renders a captioned stand-in in that case -
   * it never shows a broken image.
   */
  readonly imageUrl?: string;
  /**
   * The SECOND product image, which the card crossfades to on hover.
   *
   * Optional, and absent for any product with only one photograph - the card
   * then simply has no hover state, rather than faking one by re-showing the
   * first image.
   *
   * The convention this exists to serve is that a jewellery card's two frames
   * are a PAIR: the product alone, then the product worn. That doubles how
   * much of the catalog a shopper can actually judge without opening anything,
   * which on this category matters more than it does on most - scale is
   * impossible to read from a cut-out packshot, and scale is the first thing
   * anyone wants to know about a ring.
   *
   * It is alt text rather than a URL for the same reason `imageAlt` is: no
   * storage provider is provisioned yet (TBD.md I1), so the card renders a
   * tonal placeholder. The image ROW is real, its ordering is real, and the
   * caption visibly changes on hover - which demonstrates the wiring without
   * inventing photography.
   */
  readonly hoverImageAlt?: string;
  /** Resolved URL for the hover frame. Absent behaves exactly like `hoverImageAlt` absent. */
  readonly hoverImageUrl?: string;
  /**
   * The gold colours this product is made in.
   *
   * Shown as small metal chips under the price, which is the convention every
   * store in this category follows: a shopper scanning a grid learns that a
   * piece comes in rose gold without opening it, and the grid stops looking
   * like a list of single objects.
   *
   * Absent when the product has no gold-colour axis - a pearl strand, a plain
   * silver chain - and the card then shows nothing, rather than a single
   * pointless chip.
   */
  readonly swatches?: readonly ProductSwatch[];
}

/**
 * One gold colour, for the chips on a card.
 *
 * `hexColor` is nullable in the schema, so it is optional here too. A value
 * without one falls back to a neutral chip rather than to an invented colour:
 * guessing what "champagne gold" looks like in hex is exactly the kind of
 * fabrication the placeholder discipline exists to prevent.
 */
export interface ProductSwatch {
  readonly value: string;
  readonly labelHe: string;
  readonly hexColor?: string;
}

/**
 * Merchandising labels.
 *
 * `made-to-order` is a lead-time statement rather than a promotion, which is
 * why it is toned differently on the card.
 */
export type ProductBadge = 'new' | 'best-seller' | 'made-to-order';
