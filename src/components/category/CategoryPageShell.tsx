import { ProductGrid } from '@/components/product/ProductGrid';
import type { ProductCardData } from '@/components/product/types';
import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import type { NavLink } from '@/lib/navigation/taxonomy';

import { FilterBar } from './FilterPanel';
import { SubcategoryNav } from './SubcategoryNav';
import { filtersForCategory } from './filter-config';
import type { Crumb } from './Breadcrumbs';

/**
 * The category page layout.
 *
 * Composes the elements MASTER_SPECIFICATION section 9 requires. Of its ten
 * items, eight are here:
 *
 *   1 breadcrumbs · 2 title · 3 introduction · 4 subcategory navigation
 *   5 filters · 6 sort · 7 product count · 8 product grid
 *
 * Items 9 (pagination) and 10 (SEO content) are deliberately absent: both are
 * meaningless against a fixed fixture array, and a paginator over eight
 * hard-coded products would be a fake control. They arrive in Phase 3B.
 *
 * LAYOUT. Breadcrumbs, title and introduction live in a centred `PageHero`
 * band; subcategory chips are centred beneath it; the product grid runs the
 * full page width. There is no filter sidebar - filters open from the toolbar
 * on demand (see FilterBar), which is what frees the grid to use the whole
 * width.
 *
 * TAKES DATA, NEVER FETCHES IT. Products and copy are props, so the same shell
 * serves the fixture route today and a database-backed route later without
 * modification.
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
    <>
      <PageHero title={title} description={description} trail={trail} imageLabel={title} />

      <Container className="py-8 md:py-10">
        <SubcategoryNav links={subcategories} activeId={activeSubcategoryId} />

        <div className="mt-8">
          <FilterBar filters={filters} productCount={productCount} />
        </div>

        <div className="mt-8">
          <ProductGrid products={products} />
        </div>
      </Container>
    </>
  );
}
