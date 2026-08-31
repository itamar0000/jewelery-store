import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Suspense } from 'react';

import { CategoryPageShell } from '@/components/category/CategoryPageShell';
import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { getCategoryBySlug } from '@/lib/catalog/queries';

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
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const found = await getCategoryBySlug(category);

  if (!found) return {};

  return {
    title: found.seoTitle ?? found.nameHe,
    description: found.seoDescription ?? found.descriptionHe ?? undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
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
      <Suspense fallback={<CategoryResultsSkeleton />}>
        <CategoryResults categoryId={category.id} categorySlug={category.slug} />
      </Suspense>
    </CategoryPageShell>
  );
}
