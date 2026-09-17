import type { Metadata, Viewport } from 'next';

import { SITE_DIR, SITE_LANG, SITE_LOCALE } from '@/lib/config/site';
import { env } from '@/lib/env';
import { hebrewSans, latinDisplay } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  /**
   * The origin every relative URL in metadata resolves against.
   *
   * WITHOUT THIS, canonical tags are emitted RELATIVE - `<link rel="canonical"
   * href="/rings">` - which defeats the point of having them. A canonical
   * exists to say "this content lives at ONE address"; a relative one resolves
   * against whatever host served the page, so every preview deployment
   * self-canonicalises and can be indexed as a duplicate of production.
   *
   * Sourced from NEXT_PUBLIC_SITE_URL, which is why that variable must be the
   * STABLE production origin rather than a per-deployment URL.
   */
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),

  // Brand name, description and canonical domain are TBD
  // (MASTER_SPECIFICATION section 2 and 57, TBD.md). Placeholders are marked
  // as such rather than invented, so nothing here reads as a settled brand
  // decision.
  title: 'חנות תכשיטים',
  // The catalog carries BOTH natural and lab-grown diamonds, so no site-level
  // string may position the store as exclusively one or the other. The stone
  // type is a per-product fact and is stated on the product page from
  // DiamondSpec.isLabGrown, never here.
  description: 'תכשיטי זהב ויהלומים, בעיצוב אישי ובהתאמה מלאה.',

  /*
   * Keep the shop out of search results until its prices are real.
   *
   * The catalog shows representative pieces - every one of them can actually
   * be made - but the prices attached to them are not yet the prices anyone
   * would be charged, and a price is the single fact a shopper is entitled to
   * act on. A page that ranks is a page someone finds without context.
   *
   * THIS IS THE HALF THAT WORKS. robots.txt can only ask a crawler not to
   * fetch a page; a link from anywhere else still gets the bare URL listed.
   * `noindex` is what actually keeps it out, and it is honoured by every
   * engine that matters. Both are set, from the same flag.
   *
   * Flipping SITE_INDEXABLE to true is the deliberate act of opening the shop.
   */
  robots: env.SITE_INDEXABLE
    ? undefined
    : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },

  openGraph: {
    locale: SITE_LOCALE,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays available. Capping it is a common accessibility failure
  // (section 47) and buys nothing.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Direction and language are declared once, here, on the document root.
    // Nothing downstream sets `dir` except a genuinely LTR island (section 49:
    // "VS1", "14K", "Rose Gold" inside Hebrew copy), which Phase 2's <Bidi>
    // component owns.
    //
    // BOTH font variables are bound here, and neither sets a font-family by
    // itself. `hebrewSans.variable` puts --font-hebrew-sans on <html> and
    // `latinDisplay.variable` puts --font-latin-display beside it; the token
    // layer composes them into --font-sans and --font-display. Which face
    // actually renders a given glyph is decided by the fallback order in
    // tokens.css, per glyph - see src/lib/fonts.ts.
    <html
      lang={SITE_LANG}
      dir={SITE_DIR}
      className={`${hebrewSans.variable} ${latinDisplay.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
