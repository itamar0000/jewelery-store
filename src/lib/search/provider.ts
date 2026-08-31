/**
 * The `SearchProvider` port.
 *
 * ARCHITECTURE section 9 puts search behind a port from day one, because the
 * specification anticipates semantic search later (section 27) and swapping the
 * implementation must not touch a route or a component. Today there is one
 * implementation, `postgres.ts`, using pg_trgm.
 *
 * THE PORT RETURNS IDS, NOT PRODUCTS, and that is the design decision that
 * keeps search from becoming a second catalog. Ranked ids flow back into the
 * EXISTING catalog layer, which already knows how to apply filters, sorting and
 * pagination and how to shape a product card. Search contributes relevance;
 * everything else is the machinery Phase 3B-2 already built and tested.
 *
 * A future provider - a vector index, a hosted engine - implements this same
 * interface and inherits filters, sort and paging unchanged.
 */

/** One product, with the relevance score that ordered it. */
export interface RankedProduct {
  readonly productId: string;
  /** Higher is more relevant. Comparable only within one result set. */
  readonly score: number;
}

/** A category surfaced alongside product hits in the overlay. */
export interface CategorySuggestion {
  readonly id: string;
  readonly slug: string;
  readonly nameHe: string;
  readonly href: string;
}

export interface SearchOptions {
  /** Hard cap on ids returned. Relevance beyond this is not worth ranking. */
  readonly limit?: number;
}

export interface SearchProvider {
  /**
   * Ranked product ids for a query, most relevant first.
   *
   * Returns an empty array for an empty or unsearchable query rather than the
   * whole catalog: "no query" and "query matched nothing" must not be the same
   * result, or an empty search box silently becomes a catalog listing.
   */
  searchProductIds(query: string, options?: SearchOptions): Promise<readonly RankedProduct[]>;

  /** Categories whose name matches the query, for the overlay. */
  suggestCategories(query: string, limit?: number): Promise<readonly CategorySuggestion[]>;

  /**
   * Rebuilds `searchDocument` for the given products, or all of them.
   *
   * Returns how many rows were written. See document.ts for why this exists
   * alongside write-path generation.
   */
  reindex(productIds?: readonly string[]): Promise<number>;
}
