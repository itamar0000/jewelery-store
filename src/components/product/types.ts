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
  /** Alt text for the eventual photograph. */
  readonly imageAlt?: string;
}

/**
 * Merchandising labels.
 *
 * `made-to-order` is a lead-time statement rather than a promotion, which is
 * why it is toned differently on the card.
 */
export type ProductBadge = 'new' | 'best-seller' | 'made-to-order';
