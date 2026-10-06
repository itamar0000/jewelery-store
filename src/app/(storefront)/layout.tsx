import { cookies } from 'next/headers';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { getCartCount } from '@/lib/cart/store';
import { CART_COOKIE } from '@/lib/cart/token';
import { contactAvailable } from '@/lib/contact';

/**
 * The storefront chrome.
 *
 * A ROUTE GROUP, not a path segment: `(storefront)` wraps every customer-facing
 * page in the header and footer without appearing in any URL, so the homepage
 * stays at `/`. The admin area (ARCHITECTURE section 3.2, and the `(admin)`
 * exemption already present in eslint.config.mjs) will sit in its own group
 * with different chrome and no storefront header.
 *
 * `dir` and `lang` are NOT set here. They are declared once on <html> in the
 * root layout, which is the only correct place for them.
 *
 * `<main id="main-content">` is the skip link's target and the single main
 * landmark on the page.
 *
 * THE CART COUNT IS READ HERE, per request, from the cart cookie. That makes
 * every storefront page request-time rendered - which the catalogue pages
 * already were (they read the database per request, see the homepage's note
 * on `dynamic`) - and costs nothing for a visitor with no cart: no cookie, no
 * query. The alternative, a count fetched after load, would paint every page
 * without it first.
 */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const cartCount = await getCartCount((await cookies()).get(CART_COOKIE)?.value);

  return (
    <>
      <SkipLink />
      {/* The Header is a client component; the server tells it what exists. */}
      <Header contactAvailable={contactAvailable} cartCount={cartCount} />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
