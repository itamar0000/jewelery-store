import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductGrid } from '@/components/product/ProductGrid';
import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import {
  countProductsByCollection,
  getCollection,
  getProductsByCollection,
} from '@/lib/catalog/queries';

/**
 * Collection page - /collections/best-sellers.
 *
 * MASTER_SPECIFICATION section 28: collections exist INDEPENDENTLY of the
 * category tree, so they get their own route rather than a query parameter on a
 * category. The mega menu discovery column and the homepage both link here.
 *
 * No filters or sort: this phase connects the data, and URL-driven filter state
 * is Phase 3B-2. Products come back in the curator's `position` order.
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

  if (!collection) return {};

  return {
    title: collection.nameHe,
    description: collection.descriptionHe ?? undefined,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) notFound();

  const [products, productCount] = await Promise.all([
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
      />

      <Container className="py-8 md:py-10">
        <p aria-live="polite" className="text-muted-foreground border-border border-b pb-4 text-sm">
          {productCount} מוצרים
        </p>

        <div className="mt-8">
          <ProductGrid products={products} />
        </div>
      </Container>
    </>
  );
}
