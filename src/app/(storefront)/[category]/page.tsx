import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryPageShell } from '@/components/category/CategoryPageShell';
import { FIXTURE_CATEGORIES, FIXTURE_PRODUCTS } from '@/lib/fixtures/catalog';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

/**
 * Category page.
 *
 * DEMONSTRATION ROUTE. It serves the five product categories from fixtures so
 * the layout can be reviewed at real proportions; an unrecognised slug is a
 * genuine 404 rather than an empty page, because a category that does not exist
 * should not return 200 to a crawler.
 *
 * Subcategory chips are read from the navigation taxonomy, so the category page
 * and the mega menu cannot disagree about what lives under a category. Only the
 * first column is used - the second is the discovery column (New / Best
 * Sellers), which is merchandising rather than subcategory navigation
 * (section 8).
 *
 * Fixtures are read here, in the route, and passed down. See
 * src/lib/fixtures/README.md.
 */
export function generateStaticParams() {
  return Object.keys(FIXTURE_CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const fixture = FIXTURE_CATEGORIES[category];

  if (!fixture) return {};

  return { title: fixture.title, description: fixture.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const fixture = FIXTURE_CATEGORIES[category];

  if (!fixture) notFound();

  const navItem = PRIMARY_NAV.find((item) => item.id === category);
  const subcategories = navItem?.columns?.[0]?.links ?? [];

  return (
    <CategoryPageShell
      categorySlug={fixture.slug}
      title={fixture.title}
      description={fixture.description}
      products={FIXTURE_PRODUCTS}
      productCount={fixture.productCount}
      trail={[{ label: 'דף הבית', href: '/' }, { label: fixture.title }]}
      subcategories={subcategories}
      activeSubcategoryId={`${category}-all`}
    />
  );
}
