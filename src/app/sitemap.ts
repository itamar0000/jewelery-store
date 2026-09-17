import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * The sitemap, built from the catalog rather than from a hand-kept list.
 *
 * WHY IT IS GENERATED AND NOT WRITTEN. A static list of URLs is correct on the
 * day it is written and wrong on every day a product is added, renamed or
 * archived - and wrong silently, because a sitemap that omits a page still
 * validates. Reading the same tables the pages read means the sitemap cannot
 * disagree with the site.
 *
 * WHAT IS EXCLUDED, AND WHY. Only pages that are useful to a search engine and
 * stable under a URL appear here. The cart, the wishlist and the account are
 * per-visitor and have nothing to index. `/search` is a query surface, not a
 * document. Archived and unpublished products are excluded by the same filters
 * the storefront applies, so an unlisted product cannot be discovered through
 * the sitemap after being pulled from the catalog.
 *
 * `lastModified` comes from the row's own `updatedAt`, not from the build
 * clock. Stamping every URL with the deploy time tells a crawler that the whole
 * catalog changed whenever anything did, which teaches it to ignore the field.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  const [categories, collections, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, archivedAt: null },
      select: { slug: true, updatedAt: true, parent: { select: { slug: true } } },
    }),
    prisma.collection.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, archivedAt: null, publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  /* Editorial and service pages. `/` leads; the rest are equal to each other. */
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/custom`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: `${base}${category.parent ? `/${category.parent.slug}` : ''}/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...collections.map((collection) => ({
      url: `${base}/collections/${collection.slug}`,
      lastModified: collection.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
