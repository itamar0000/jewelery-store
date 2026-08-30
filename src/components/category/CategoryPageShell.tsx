import type { ProductCardData } from '@/components/product/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Container } from '@/components/ui/Container';
import type { NavLink } from '@/lib/navigation/taxonomy';

import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { FilterPanel } from './FilterPanel';
import { SortControl } from './SortControl';
import { SubcategoryNav } from './SubcategoryNav';
import { filtersForCategory } from './filter-config';

/**
 * The category page layout.
 *
 * Composes the elements MASTER_SPECIFICATION section 9 requires. Of its ten
 * items, eight are here:
 *
 *   1 breadcrumbs · 2 title · 3 introduction · 4 subcategory navigation
 *   5 filters · 6 sort · 7 product count · 8 product grid
 *
 * Items 9 (pagination / infinite loading) and 10 (SEO content) are deliberately
 * absent. Both are meaningless against a fixed fixture array - paginating eight
 * hard-coded products would be a fake control, and SEO copy is a content task.
 * They arrive in Phase 3B with the real queries.
 *
 * TAKES DATA, NEVER FETCHES IT. Products and copy are props, so the same shell
 * serves the fixture route today and a database-backed route later without
 * modification. This is what keeps the fixture boundary in ./src/lib/fixtures
 * from leaking into components.
 *
 * The product count is rendered as a live region: once filtering is real, the
 * count changes without a page load, and a screen-reader user needs to hear it.
 * Wiring that now costs one attribute and avoids a retrofit.
 */
export function CategoryPageShell({
  categorySlug,
  title,
  description,
  products,
  productCount,
  trail,
  subcategories,
  activeSubcategoryId,
}: {
  categorySlug: string;
  title: string;
  description?: string;
  products: readonly ProductCardData[];
  productCount: number;
  trail: readonly Crumb[];
  subcategories: readonly NavLink[];
  activeSubcategoryId?: string;
}) {
  const filters = filtersForCategory(categorySlug);

  return (
    <Container className="py-8 md:py-10">
      <Breadcrumbs trail={trail} />

      <header className="mt-6">
        <h1 className="text-3xl tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-3 max-w-(--container-prose) text-sm text-pretty">
            {description}
          </p>
        )}
      </header>

      <div className="mt-8">
        <SubcategoryNav links={subcategories} activeId={activeSubcategoryId} />
      </div>

      {/*
       * Sidebar from `lg`, single column below. The filter panel renders its
       * own mobile drawer, so the same child works in both layouts.
       */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside aria-label="סינון" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3 lg:hidden">
            <FilterPanel filters={filters} />
            <SortControl />
          </div>

          <div className="hidden lg:block">
            <FilterPanel filters={filters} />
          </div>
        </aside>

        <div>
          <div className="border-border mb-6 flex items-center justify-between gap-4 border-b pb-4">
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {productCount} מוצרים
            </p>

            <div className="hidden lg:block">
              <SortControl />
            </div>
          </div>

          <ProductGrid products={products} />
        </div>
      </div>
    </Container>
  );
}
