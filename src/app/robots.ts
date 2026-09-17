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

  /*
   * While the shop is not open, refuse everything.
   *
   * This alone would not be enough. `Disallow` asks a crawler not to FETCH a
   * page; it does not stop the URL itself being listed, because a link from
   * anywhere else is sufficient for that. The matching `noindex` lives in the
   * root layout's metadata, and the two together are what actually keep the
   * site out of results. Neither is a substitute for the other.
   *
   * No sitemap is advertised either: publishing a map of every page while
   * asking not to be crawled is a contradiction, and some crawlers resolve it
   * in favour of the sitemap.
   */
  if (!env.SITE_INDEXABLE) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/wishlist', '/account', '/search', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
