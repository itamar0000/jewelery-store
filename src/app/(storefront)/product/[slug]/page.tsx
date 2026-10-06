import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs, type Crumb } from '@/components/category/Breadcrumbs';
import { ProductDetailView } from '@/components/product/ProductDetailView';
import { Container } from '@/components/ui/Container';
import { addToCartAction } from '@/lib/cart/actions';
import { estimatedPriceLabel } from '@/lib/catalog/price-disclosure';
import { choicesFromParams } from '@/lib/catalog/choice-params';
import { getProductBySlug } from '@/lib/catalog/queries';
import { contactAvailable } from '@/lib/contact';
import { STOCK_LEVELS_ARE_LIVE } from '@/lib/inventory/disclosure';
import { notFoundMetadata } from '@/lib/seo/not-found';

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

  // Missing: say so in the tab too (src/lib/seo/not-found.ts).
  if (!product) return notFoundMetadata;

  // Metadata comes from the database, preferring the explicit SEO fields and
  // falling back to the product's own copy.
  // THE TAB SAYS WHAT THE HEADING SAYS. The SEO title read "טבעת סוליטר
  // יהלום מעבדה" over an h1 of "טבעת אורורה סוליטר" - two names for one
  // page (critique 2026-10-06). The product's name titles the tab; the
  // owner's SEO title still describes the page where it is shared.
  return {
    title: product.nameHe,
    openGraph: { title: product.seoTitle ?? product.nameHe },
    description: product.seoDescription ?? product.shortDescriptionHe ?? undefined,
    // One page however it is made: `?karat=18k&color=rose` is a view of it.
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  // The choices in the address, matched against this product's own options.
  const initialChoices = choicesFromParams(product.options, await searchParams);

  const trail: Crumb[] = [
    { label: 'דף הבית', href: '/' },
    ...product.ancestors.map((ancestor) => ({ label: ancestor.nameHe, href: ancestor.href })),
    { label: product.category.nameHe, href: product.category.href },
    { label: product.nameHe },
  ];

  return (
    <Container className="md:py-tight py-8">
      <Breadcrumbs trail={trail} />

      <div className="mt-8">
        {/*
         * Server-side facts the client view cannot read for itself: whether
         * prices are still estimates, whether any contact channel exists, and
         * whether stock levels are real - and the cart's server action, which
         * the view calls to put the configured piece in the bag.
         */}
        <ProductDetailView
          product={product}
          priceLabel={estimatedPriceLabel}
          contactAvailable={contactAvailable}
          stockLevelsLive={STOCK_LEVELS_ARE_LIVE}
          addToCart={addToCartAction}
          initialChoices={initialChoices}
        />
      </div>
    </Container>
  );
}
