import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductGrid } from '@/components/product/ProductGrid';
import { PageHero } from '@/components/storefront/PageHero';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import { BEST_SELLERS_SLUG, getBestSellers } from '@/lib/catalog/best-sellers';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import { PRODUCTS, countOf } from '@/lib/i18n/count';
import { Container } from '@/components/ui/Container';
import {
  countProductsByCollection,
  getCollection,
  getProductsByCollection,
} from '@/lib/catalog/queries';
import { notFoundMetadata } from '@/lib/seo/not-found';

/**
 * Collection page - /collections/best-sellers.
 *
 * MASTER_SPECIFICATION section 28: collections exist INDEPENDENTLY of the
 * category tree, so they get their own route rather than a query parameter on a
 * category. The mega menu discovery column and the homepage both link here.
 *
 * No filters or sort: this phase connects the data, and URL-driven filter state
 * is Phase 3B-2. Products come back in the curator's `position` order - except
 * on best sellers, which reads the same ranking as the homepage band (units
 * sold, then the curated picks; src/lib/catalog/best-sellers.ts), so the page
 * behind the band's "לצפייה בהכל" continues the list the band began.
 *
 * An unknown collection is a 404; an empty one renders its heading with an
 * empty state, because a collection between merchandising cycles is a normal
 * state rather than an error.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);

  // Missing: say so in the tab too (src/lib/seo/not-found.ts).
  if (!collection) return notFoundMetadata;

  return {
    title: collection.nameHe,
    description: collection.descriptionHe ?? undefined,
  };
}

/** Which collections have a photograph. See the same map in CollectionsSection. */
const COLLECTION_IMAGE: Readonly<Record<string, EditorialAssetId>> = {
  'new-arrivals': 'collection-new-arrivals',
  'best-sellers': 'collection-best-sellers',
  bridal: 'collection-bridal',
  personalized: 'collection-personalized',
};

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) notFound();

  const [products, productCount] =
    collection.slug === BEST_SELLERS_SLUG
      ? await getBestSellers().then((ranked) => [ranked, ranked.length] as const)
      : await Promise.all([
          getProductsByCollection(collection.id),
          countProductsByCollection(collection.id),
        ]);

  return (
    <>
      <PageHero
        title={collection.nameHe}
        description={collection.descriptionHe ?? undefined}
        trail={[{ label: 'דף הבית', href: '/' }, { label: collection.nameHe }]}
        imageLabel={collection.nameHe}
        /*
         * The four collections that have a still life open on it. Keyed by
         * SLUG rather than by position, so reordering them in the admin cannot
         * hand the bridal photograph to a different collection. A collection
         * without one simply opens on its title, which is a finished state.
         */
        assetId={COLLECTION_IMAGE[collection.slug]}
      />

      <Container className="py-8 md:py-10">
        <p className="text-muted-foreground border-border border-b pb-4 text-sm">
          <span aria-live="polite">{countOf(productCount, PRODUCTS)}</span>
          {estimatedPricesNote && <> · {estimatedPricesNote}</>}
        </p>

        <div className="mt-8">
          <ProductGrid products={products} headingLevel={2} />
        </div>
      </Container>
    </>
  );
}
