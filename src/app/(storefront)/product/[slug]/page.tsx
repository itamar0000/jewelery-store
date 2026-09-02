import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs, type Crumb } from '@/components/category/Breadcrumbs';
import { ProductDetailView } from '@/components/product/ProductDetailView';
import { Container } from '@/components/ui/Container';
import { getProductBySlug } from '@/lib/catalog/queries';

/**
 * Product page, backed by the database.
 *
 * ALL DATA IS FETCHED ON THE SERVER, in this component, and passed down. The
 * interactive part - choosing a gold colour or karat - is the client component
 * `ProductDetailView`, which receives a fully-resolved object and queries
 * nothing. Prices and stock therefore cannot be influenced from the browser.
 *
 * A MISSING PRODUCT IS A 404, not an empty page: an unknown or unpublished
 * slug must not return 200 to a crawler. `getProductBySlug` already filters on
 * active, published and not-archived, so an unpublished draft 404s exactly like
 * a nonexistent one - which is the behaviour you want while a product is being
 * prepared.
 *
 * No `generateStaticParams`: the catalog changes when the owner edits it, and
 * prerendering a fixed product list at build time would serve stale pages until
 * the next deploy. Incremental revalidation is a Phase 3B-2 decision.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  // Metadata comes from the database, preferring the explicit SEO fields and
  // falling back to the product's own copy.
  return {
    title: product.seoTitle ?? product.nameHe,
    description: product.seoDescription ?? product.shortDescriptionHe ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const trail: Crumb[] = [
    { label: 'דף הבית', href: '/' },
    ...product.ancestors.map((ancestor) => ({ label: ancestor.nameHe, href: ancestor.href })),
    { label: product.category.nameHe, href: product.category.href },
    { label: product.nameHe },
  ];

  return (
    <Container className="py-8 md:py-tight">
      <Breadcrumbs trail={trail} />

      <div className="mt-8">
        <ProductDetailView product={product} />
      </div>
    </Container>
  );
}
