import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

/**
 * robots.txt.
 *
 * WHAT IS DISALLOWED, AND WHY EACH ONE. `/cart`, `/wishlist` and `/account` are
 * per-visitor surfaces with nothing to index and no stable content. `/search`
 * is a query surface: every distinct `?q=` is a separate URL serving a slice of
 * pages that are already indexed on their own, which is how a catalog of fifty
 * products turns into thousands of thin duplicates. `/api/` serves data, not
 * documents.
 *
 * THE SITEMAP IS ADVERTISED HERE rather than only submitted in Search Console,
 * because robots.txt is the one file every crawler fetches first and the only
 * discovery path that does not depend on someone remembering a dashboard.
 *
 * Both values resolve from NEXT_PUBLIC_SITE_URL. If that variable is not set to
 * the real production origin, this file will advertise a sitemap nobody can
 * fetch - the same variable the canonical tags depend on.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/wishlist', '/account', '/search', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
