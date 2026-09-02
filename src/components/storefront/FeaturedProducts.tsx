import { ProductGrid } from '@/components/product/ProductGrid';
import type { ProductCardData } from '@/components/product/types';
import { Container } from '@/components/ui/Container';

import { SectionHeading } from './SectionHeading';

/**
 * A titled band of products.
 *
 * Used for best sellers and for any other homepage product rail. Products are
 * passed in, never fetched here - the component stays a server-renderable pure
 * function, and the route decides whether they come from fixtures (now) or the
 * database (Phase 3B).
 *
 * Shows a bounded slice rather than everything it is given: a homepage rail is
 * a taste of the catalog, and the "see all" link carries the rest.
 */
export function FeaturedProducts({
  id,
  title,
  description,
  href,
  products,
  limit = 4,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  products: readonly ProductCardData[];
  limit?: number;
}) {
  if (products.length === 0) return null;

  return (
    <Container as="section" aria-labelledby={id} className="py-section">
      <SectionHeading id={id} title={title} description={description} href={href} />
      <ProductGrid products={products.slice(0, limit)} compact />
    </Container>
  );
}
