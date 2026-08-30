import type { Metadata, Viewport } from 'next';

import { SITE_DIR, SITE_LANG, SITE_LOCALE } from '@/lib/config/site';
import { hebrewSans } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  // Brand name, description and canonical domain are TBD
  // (MASTER_SPECIFICATION section 2 and 57, TBD.md). Placeholders are marked
  // as such rather than invented, so nothing here reads as a settled brand
  // decision.
  title: 'חנות תכשיטים',
  description: 'תכשיטי זהב ויהלומי מעבדה.',
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
    // `hebrewSans.variable` puts --font-hebrew-sans on <html>, which is what
    // --font-sans in the token layer resolves through.
    <html lang={SITE_LANG} dir={SITE_DIR} className={hebrewSans.variable}>
      <body>{children}</body>
    </html>
  );
}
