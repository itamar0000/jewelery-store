import Link from 'next/link';

import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { getCatalogPage, getCategoryFacets } from '@/lib/catalog/browse';
import {
  buildCatalogHref,
  hasActiveFilters,
  normalizeCatalogQuery,
  type RawCatalogQuery,
} from '@/lib/catalog/filters';

import { ActiveFilters } from './ActiveFilters';
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
 */
export async function CategoryResults({
  categoryIds,
  filterConfig,
  basePath,
  rawQuery,
}: {
  /** The category and its descendants. */
  categoryIds: readonly string[];
  /** `Category.filterConfig`, which decides the facets on offer. */
  filterConfig: unknown;
  /** Path without query string, used to build every filter link. */
  basePath: string;
  rawQuery: RawCatalogQuery;
}) {
  const facets = await getCategoryFacets(categoryIds, filterConfig);
  const query = normalizeCatalogQuery(rawQuery, facets);
  const { products, total, page, totalPages, pageSize } = await getCatalogPage(categoryIds, query);

  const filtered = hasActiveFilters(query);

  return (
    <>
      <FilterBar facets={facets} query={query} basePath={basePath} productCount={total} />

      <ActiveFilters facets={facets} query={query} basePath={basePath} />

      <div className="mt-8">
        <ProductGrid
          products={products}
          emptyTitle={filtered ? 'אין מוצרים שתואמים לסינון.' : 'אין כרגע מוצרים בקטגוריה הזו.'}
          emptyBody={
            filtered
              ? 'אפשר להסיר חלק מהמסננים ולנסות שוב.'
              : 'הקטלוג מתעדכן. אפשר לעבור לקטגוריה אחרת דרך התפריט.'
          }
          emptyAction={
            filtered ? (
              // The one-click escape from a zero-result filter. Without it the
              // only way back is editing the address bar.
              <Link
                href={buildCatalogHref(basePath, query, { clearAll: true, sort: query.sort })}
                scroll={false}
                className="border-border-strong hover:bg-muted mt-6 inline-flex h-11 items-center rounded-sm border px-5 text-sm transition-colors"
              >
                נקה סינון
              </Link>
            ) : undefined
          }
        />
      </div>

      <Pagination query={query} basePath={basePath} page={page} totalPages={totalPages} />

      {totalPages > 1 && (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          עמוד {page} מתוך {totalPages} · {total} מוצרים · {pageSize} בעמוד
        </p>
      )}
    </>
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
