import type { Metadata } from 'next';

import { SITE_DIR, SITE_LANG, SITE_LOCALE } from '@/lib/config/site';

import './globals.css';

export const metadata: Metadata = {
  // Brand name, description and canonical domain are TBD
  // (MASTER_SPECIFICATION §2, TBD.md B?/§57). Placeholders are marked as such
  // rather than invented, so nothing here reads as a settled brand decision.
  title: 'חנות תכשיטים',
  description: 'תכשיטי זהב ויהלומי מעבדה.',
  openGraph: {
    locale: SITE_LOCALE,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE_LANG} dir={SITE_DIR}>
      <body>{children}</body>
    </html>
  );
}
