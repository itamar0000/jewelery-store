import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Suspense } from 'react';

import { CategoryPageShell } from '@/components/category/CategoryPageShell';
import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { descendantCategoryIds, getCategoryBySlug } from '@/lib/catalog/queries';
import { canonicalFor, parseCatalogSearchParams, type SearchParams } from '@/lib/catalog/filters';

/**
 * Category page, backed by the database.
 *
 * The fixture import is gone: title, description, subcategories, product count
 * and products all come from PostgreSQL. `CategoryPageShell` is unchanged and
 * remains the presentation layer - it still only receives props.
 *
 * A CATEGORY WITH NO PRODUCTS IS NOT AN ERROR. It renders its heading,
 * subcategories and an empty state, because a genuinely empty category is a
 * normal thing for a shop to have. Only an UNKNOWN slug is a 404.
 *
 * The existence check happens BEFORE anything streams, so a missing category
 * still produces a real 404 rather than a soft one. The products then stream in
 * behind a Suspense boundary - see CategoryResults for why that is not a
 * `loading.tsx`.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { category } = await params;
  const found = await getCategoryBySlug(category);

  if (!found) return {};

  return {
    title: found.seoTitle ?? found.nameHe,
    description: found.seoDescription ?? found.descriptionHe ?? undefined,
    // CANONICAL STRATEGY. Filters are refinements of one page, not pages of
    // their own, so every filtered URL points its canonical at the unfiltered
    // category. Pagination is different: page 3 holds different products, so it
    // is self-canonical and keeps its `?page=`. This is the whole strategy -
    // no per-filter metadata, nothing generated from the query string.
    alternates: { canonical: canonicalFor(found.href, await searchParams) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ category: slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  // A subcategory reached at its root path would duplicate the nested route and
  // split the canonical URL, which is the SEO hazard the schema's single
  // primary category exists to avoid.
  if (category.ancestors.length > 0) notFound();

  return (
    <CategoryPageShell
      title={category.nameHe}
      description={category.descriptionHe ?? undefined}
      trail={[{ label: 'דף הבית', href: '/' }, { label: category.nameHe }]}
      subcategories={[
        { id: `${category.slug}-all`, label: `כל ה${category.nameHe}`, href: category.href },
        ...category.children.map((child) => ({
          id: child.id,
          label: child.nameHe,
          href: child.href,
        })),
      ]}
      activeSubcategoryId={`${category.slug}-all`}
    >
      {/*
       * Keyed on the query string so a filter change remounts the boundary and
       * shows the skeleton again, instead of leaving the previous results on
       * screen with no indication that anything is loading.
       */}
      <Suspense key={JSON.stringify(rawSearchParams)} fallback={<CategoryResultsSkeleton />}>
        <CategoryResults
          categoryIds={await descendantCategoryIds(category.id)}
          filterConfig={category.filterConfig}
          basePath={category.href}
          rawQuery={parseCatalogSearchParams(rawSearchParams)}
        />
      </Suspense>
    </CategoryPageShell>
  );
}
