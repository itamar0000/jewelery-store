import type { ReactNode } from 'react';

import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { getCatalogPage, getCategoryFacets, getFacetCounts } from '@/lib/catalog/browse';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import {
  buildCatalogHref,
  hasActiveFilters,
  normalizeCatalogQuery,
  type RawCatalogQuery,
} from '@/lib/catalog/filters';
import { PRODUCTS, countOf } from '@/lib/i18n/count';

import { ActiveFilters } from './ActiveFilters';
import { CatalogTransition, PendingResults } from './CatalogTransition';
import { FilterBar } from './FilterPanel';
import { Pagination } from './Pagination';

/**
 * The product half of a category page: toolbar, filters, count, grid, paging.
 *
 * SPLIT OUT SO IT CAN STREAM. This is the slow part - facets, a count and a
 * page of products - while the hero and the subcategory chips depend only on
 * the category row the route already loaded. Wrapping this in `<Suspense>` lets
 * the heading paint immediately.
 *
 * WHY NOT A `loading.tsx`. That was tried in 3B-1 and was wrong. A `loading.tsx`
 * puts a Suspense boundary around the WHOLE segment, so Next starts streaming -
 * and commits HTTP 200 - before the route body runs, and a later `notFound()`
 * renders the not-found UI under a 200. A soft 404. Measured: with
 * `loading.tsx`, /product/nope returned 200; without it, 404. Streaming from
 * HERE keeps both properties, because the route has already awaited the
 * category and 404'd before anything is sent.
 *
 * THE FACETS ARE FETCHED BEFORE THE QUERY IS NORMALIZED, and that order is
 * required rather than incidental: normalization drops any value that does not
 * exist in this category, so it cannot run until the real values are known.
 * That is what makes `?ringSize=52` inert on a necklace page.
 *
 * THE PAGE AND THE COUNTS ARE ASKED TOGETHER. Both depend on the normalized
 * query and on nothing else, so neither waits for the other.
 *
 * ONE TRANSITION FOR THE WHOLE LISTING (./CatalogTransition.tsx): a filter,
 * sort or page change keeps this tree mounted - so the filter drawer stays open
 * as the shopper left it - and the results dim while the next set arrives.
 */
export async function CategoryResults({
  categoryIds,
  filterConfig,
  basePath,
  rawQuery,
  rankedIds,
  emptyState,
}: {
  /** The category and its descendants. */
  categoryIds: readonly string[];
  /** `Category.filterConfig`, which decides the facets on offer. */
  filterConfig: unknown;
  /** Path without query string, used to build every filter link. */
  basePath: string;
  rawQuery: RawCatalogQuery;
  /**
   * Search results in relevance order. Present only on /search - the same
   * component then serves both surfaces, which is what keeps search from
   * growing a parallel listing implementation.
   */
  rankedIds?: readonly string[];
  /** Replaces the empty state entirely, for search's "no results" copy. */
  emptyState?: ReactNode;
}) {
  const facets = await getCategoryFacets(categoryIds, filterConfig);
  const query = normalizeCatalogQuery(rawQuery, facets);
  const [{ products, total, page, totalPages, pageSize }, counts] = await Promise.all([
    getCatalogPage(categoryIds, query, rankedIds),
    getFacetCounts(categoryIds, query, facets, rankedIds),
  ]);

  const filtered = hasActiveFilters(query);

  return (
    <CatalogTransition>
      <FilterBar
        facets={facets}
        query={query}
        basePath={basePath}
        productCount={total}
        priceNote={estimatedPricesNote}
        counts={counts}
      />

      <ActiveFilters facets={facets} query={query} basePath={basePath} />

      <PendingResults>
        <div className="mt-8">
          {products.length === 0 && emptyState !== undefined ? (
            emptyState
          ) : (
            <ProductGrid
              products={products}
              headingLevel={2}
              emptyTitle={
                filtered
                  ? 'אין בקטלוג דגם שמתאים לכל הבחירות האלה.'
                  : 'אין כרגע מוצרים בקטגוריה הזו.'
              }
              emptyBody={
                filtered
                  ? 'אפשר להסיר חלק מהמסננים, או להזמין תכשיט בעיצוב אישי: אבן, גוון זהב ומידה לפי בחירה.'
                  : 'הקטלוג מתעדכן. אפשר לעבור לקטגוריה אחרת דרך התפריט.'
              }
              emptyAction={
                filtered ? (
                  /*
                   * Two ways on. Clearing the filters is the one-click escape -
                   * without it the only way back is the address bar. Custom
                   * design is the honest answer to "not in the catalogue":
                   * the workshop makes pieces to order (PRODUCT.md), so an
                   * empty filter result is not the end of the search.
                   */
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                    <Button
                      href={buildCatalogHref(basePath, query, { clearAll: true, sort: query.sort })}
                      scroll={false}
                      variant="secondary"
                    >
                      נקה סינון
                    </Button>
                    <Button href="/custom" variant="link">
                      לעיצוב אישי
                    </Button>
                  </div>
                ) : undefined
              }
            />
          )}
        </div>

        <Pagination query={query} basePath={basePath} page={page} totalPages={totalPages} />

        {totalPages > 1 && (
          <p className="text-muted-foreground mt-4 text-xs">
            עמוד {page} מתוך {totalPages} · {countOf(total, PRODUCTS)} · {pageSize} בעמוד
          </p>
        )}
      </PendingResults>
    </CatalogTransition>
  );
}

/** Matches the layout above, so nothing jumps when the products arrive. */
export function CategoryResultsSkeleton() {
  return (
    <>
      <div className="border-border flex items-center justify-between border-b pb-4">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </>
  );
}
