import type { Metadata } from 'next';

import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { notFoundMetadata } from '@/lib/seo/not-found';

/**
 * Storefront 404, for `notFound()` raised by a route inside the storefront -
 * a missing product, category, subcategory or collection, and the withheld
 * account and wishlist pages. It renders inside the storefront layout, so the
 * header and footer stay: a customer who follows a dead link can still
 * navigate. An address that matches no route at all is handled one level up,
 * by src/app/not-found.tsx, with the same content in the same frame.
 *
 * The tab says what happened. Each route that can 404 also returns this title
 * from its own metadata (src/lib/seo/not-found.ts), or the tab switches to the
 * homepage's title once the page hydrates.
 */
export const metadata: Metadata = notFoundMetadata;

export default function StorefrontNotFound() {
  return <NotFoundContent />;
}
