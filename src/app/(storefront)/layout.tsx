import { StorefrontShell } from '@/components/layout/StorefrontShell';

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
 * The frame itself - skip link, masthead, the single `<main>` landmark, footer
 * - is `StorefrontShell`, shared with the site-wide 404 so an address that
 * matches no route still arrives inside the shop.
 *
 * THE CART COUNT IS READ per request, from the cart cookie (inside the shell).
 * That makes every storefront page request-time rendered - which the catalogue
 * pages already were (they read the database per request, see the homepage's
 * note on `dynamic`) - and costs nothing for a visitor with no cart: no cookie,
 * no query. The alternative, a count fetched after load, would paint every page
 * without it first.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
