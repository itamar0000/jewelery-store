import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Suspense } from 'react';

import { CategoryPageShell } from '@/components/category/CategoryPageShell';
import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { getCategoryBySlug } from '@/lib/catalog/queries';

/**
 * Subcategory page - /rings/engagement-rings.
 *
 * The mega menu and the subcategory chips both link here, so without this route
 * every one of those links would 404. It reuses `CategoryPageShell` unchanged;
 * a subcategory is just a category with a parent.
 *
 * THE PARENT IS VERIFIED, not assumed. `/necklaces/engagement-rings` must not
 * render the rings page under a necklaces breadcrumb: the child's real parent
 * has to match the first URL segment, otherwise the same content would be
 * reachable at several URLs, which is precisely the duplicate-canonical problem
 * the schema's single primary category is designed to prevent.
 *
 * Subcategory slugs are globally unique (`Category.slug` is unique table-wide),
 * which is why they are qualified - `diamond-rings`, not `diamond`, since
 * "diamond" would otherwise collide across four categories.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { subcategory } = await params;
  const found = await getCategoryBySlug(subcategory);

  if (!found) return {};

  return {
    title: found.seoTitle ?? found.nameHe,
    description: found.seoDescription ?? found.descriptionHe ?? undefined,
  };
}

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category: parentSlug, subcategory: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const parent = category.ancestors[0];
  if (!parent || parent.slug !== parentSlug) notFound();

  // Sibling chips, so a visitor can move across the parent's children without
  // going back up first.
  const parentCategory = await getCategoryBySlug(parent.slug);
  const siblings = parentCategory?.children ?? [];

  return (
    <CategoryPageShell
      title={category.nameHe}
      description={category.descriptionHe ?? undefined}
      trail={[
        { label: 'דף הבית', href: '/' },
        { label: parent.nameHe, href: parent.href },
        { label: category.nameHe },
      ]}
      subcategories={[
        {
          id: `${parent.slug}-all`,
          label: `כל ה${parentCategory?.nameHe ?? parent.nameHe}`,
          href: parent.href,
        },
        ...siblings.map((sibling) => ({
          id: sibling.id,
          label: sibling.nameHe,
          href: sibling.href,
        })),
      ]}
      activeSubcategoryId={category.id}
    >
      <Suspense fallback={<CategoryResultsSkeleton />}>
        <CategoryResults categoryId={category.id} categorySlug={parent.slug} />
      </Suspense>
    </CategoryPageShell>
  );
}
