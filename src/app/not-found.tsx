import type { Metadata } from 'next';

import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { notFoundMetadata } from '@/lib/seo/not-found';

/**
 * The 404 for an address that matches no route - `/a/b/c`, `/product/x/y`.
 *
 * Such a URL never enters the `(storefront)` group, so its not-found page and
 * layout do not apply, and Next fell back to its own bare error page: unstyled,
 * without the header or the footer, and with two competing titles. This puts
 * the same 404 in the same frame as every other one.
 */
export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <StorefrontShell>
      <NotFoundContent />
    </StorefrontShell>
  );
}
