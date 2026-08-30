import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';

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
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
