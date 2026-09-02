import type { ReactNode } from 'react';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import type { NavLink } from '@/lib/navigation/taxonomy';

import type { Crumb } from './Breadcrumbs';
import { SubcategoryNav } from './SubcategoryNav';

/**
 * The category page layout.
 *
 * Composes the elements MASTER_SPECIFICATION section 9 requires. Of its ten
 * items, eight are here:
 *
 *   1 breadcrumbs · 2 title · 3 introduction · 4 subcategory navigation
 *   5 filters · 6 sort · 7 product count · 8 product grid
 *
 * Items 9 (pagination) and 10 (SEO content) are deliberately absent and belong
 * to Phase 3B-2 with the rest of the URL-state work.
 *
 * PRESENTATION ONLY. It takes a heading, chips and a `children` slot; it does
 * not know what a product is and it does not query anything. Items 5-8 arrive
 * through `children` as `CategoryResults`, which is what lets the heading paint
 * while the products stream in - see that file for why this is not a
 * `loading.tsx`.
 */
export function CategoryPageShell({
  title,
  description,
  trail,
  subcategories,
  activeSubcategoryId,
  children,
}: {
  title: string;
  description?: string;
  trail: readonly Crumb[];
  subcategories: readonly NavLink[];
  activeSubcategoryId?: string;
  /** The product results: toolbar, count and grid. */
  children: ReactNode;
}) {
  return (
    <>
      <PageHero title={title} description={description} trail={trail} imageLabel={title} />

      <Container className="py-8 md:py-tight">
        <SubcategoryNav links={subcategories} activeId={activeSubcategoryId} />

        <div className="mt-8">{children}</div>
      </Container>
    </>
  );
}
