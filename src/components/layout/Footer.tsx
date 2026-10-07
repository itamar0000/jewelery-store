import { SITE_NAME } from '@/lib/config/site';
import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { pricesAreEstimates } from '@/lib/catalog/price-disclosure';
import { contactAvailable, contactChannels } from '@/lib/contact';
import { FOOTER_COLUMNS } from '@/lib/navigation/taxonomy';

/**
 * Storefront footer.
 *
 * Columns follow MASTER_SPECIFICATION section 51: Shop, Services, About, Legal,
 * Contact. Structure comes from the taxonomy module, so the footer and the
 * header cannot drift apart.
 *
 * CONTACT IS RENDERED FROM WHAT EXISTS (src/lib/contact). Each configured
 * channel is a working link; with none configured the column is not there at
 * all. It used to list WhatsApp, email and phone, each "יעודכן" - honest, but
 * it closed every page on the line "this shop cannot be reached yet". A link
 * to /contact goes with it, since that page only exists when a channel does.
 *
 * The legal column links to routes that do not exist yet. Those pages are a
 * legal deliverable, not a UI one.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const columns = FOOTER_COLUMNS.map((column) => ({
    ...column,
    links: column.links.filter((link) => contactAvailable || link.href !== '/contact'),
  })).filter((column) => column.links.length > 0);

  return (
    /*
     * THE NIGHT FOOTER (D4D.26): the atelier closes on its green-black, with
     * the name set large in the serif. Every colour on it is named for this
     * ground (night-foreground at full or muted strength, the focus ring in
     * ivory), because the page's own ink would vanish here.
     */
    <footer className="bg-night text-night-foreground mt-24 [--focus-ring:var(--color-background)]">
      <Container width="wide" className="py-feature">
        <div className="mb-14 max-w-sm">
          <p className="font-display text-background text-[2rem] leading-none tracking-[0.02em]">
            <bdi>{SITE_NAME}</bdi>
          </p>
          <p className="mt-4 text-[0.9375rem] font-light">תכשיטי זהב ויהלומים, ישירות מהסדנה.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <nav key={column.id} aria-labelledby={`footer-${column.id}`}>
              <h2 id={`footer-${column.id}`} className="text-background mb-4 text-sm font-medium">
                {column.title}
              </h2>

              {/*
               * 44px rows under a finger. At 18px with 10px between them the
               * links were the smallest targets on the site, and too close for
               * an invisible tap area to grow into without overlapping the next
               * one - so on touch screens the rows themselves grow. Under a
               * mouse the list keeps its compact rhythm.
               */}
              <ul className="space-y-2.5 pointer-coarse:space-y-0">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-night-foreground/80 hover:text-background text-sm transition-colors pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {contactAvailable && (
            <section aria-labelledby="footer-contact">
              <h2 id="footer-contact" className="text-background mb-4 text-sm font-medium">
                יצירת קשר
              </h2>

              <ul className="space-y-2.5 pointer-coarse:space-y-0">
                {contactChannels.map((channel) => (
                  <li key={channel.id} className="text-sm">
                    {channel.label}:{' '}
                    <a
                      href={channel.href}
                      className="hover:text-background underline-offset-4 transition-colors hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                    >
                      <bdi>{channel.display}</bdi>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-night-foreground/20 mt-14 flex flex-col gap-2 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between">
          {/* Isolated for the same reason as the masthead: a Latin name in an
              RTL line reorders without it, and "© 2026 Jewelry for Less" is
              exactly the mix of digits, symbol and Latin that goes wrong. */}
          <p>
            © {year} <bdi>{SITE_NAME}</bdi>
          </p>
          {/*
           * The old line asserted "prices include VAT", which is a fact about
           * numbers that are not yet real. While the catalog carries
           * placeholder pricing (PRODUCT.md principle 1) the honest statement
           * is that they are not settled - and once PRICES_FINAL says they are,
           * the line goes, rather than lingering as a disclaimer nobody needs.
           */}
          {pricesAreEstimates && <p>המחירים באתר הם הערכה ראשונית ואינם סופיים.</p>}
        </div>
      </Container>
    </footer>
  );
}
