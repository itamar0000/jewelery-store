import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { countProductsByCategory, getProductsByCategory } from '@/lib/catalog/queries';

import { FilterBar } from './FilterPanel';
import { filtersForCategory } from './filter-config';

/**
 * The product half of a category page: toolbar, count and grid.
 *
 * SPLIT OUT SO IT CAN STREAM. This is the slow part of the page - two queries -
 * while the hero and the subcategory chips depend only on the category row the
 * route has already loaded. Wrapping this in `<Suspense>` lets the page paint
 * its heading immediately and fill the grid in when the products land.
 *
 * WHY NOT A `loading.tsx`. That was the first implementation and it was wrong.
 * A `loading.tsx` puts a Suspense boundary around the WHOLE segment, so Next
 * starts streaming - and commits HTTP 200 - before the route body runs. A later
 * `notFound()` then renders the not-found UI under a 200 status: a soft 404,
 * which is exactly what a crawler must not see for a category or product that
 * does not exist. Verified against a production build: with `loading.tsx`,
 * /product/nope returned 200; without it, 404.
 *
 * Streaming from HERE keeps both properties. The route awaits the category
 * first, so a missing one still 404s before anything is sent; only this subtree
 * streams.
 */
export async function CategoryResults({
  categoryId,
  categorySlug,
}: {
  categoryId: string;
  /** Drives which facets render. Filters are category-aware (section 10). */
  categorySlug: string;
}) {
  const [products, productCount] = await Promise.all([
    getProductsByCategory(categoryId),
    countProductsByCategory(categoryId),
  ]);

  return (
    <>
      <FilterBar filters={filtersForCategory(categorySlug)} productCount={productCount} />

      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
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
