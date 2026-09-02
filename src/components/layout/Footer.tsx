import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { FOOTER_COLUMNS, FOOTER_CONTACT } from '@/lib/navigation/taxonomy';

/**
 * Storefront footer.
 *
 * Columns follow MASTER_SPECIFICATION section 51: Shop, Services, About, Legal,
 * Contact. Structure comes from the taxonomy module, so the footer and the
 * header cannot drift apart.
 *
 * CONTACT DETAILS ARE HONEST PLACEHOLDERS. The phone number, address, email and
 * WhatsApp channel are outstanding business details (section 52, TBD.md).
 * Rather than invent them or render dead `tel:` links, each channel shows its
 * label with "יעודכן" and no href - a customer cannot mistake it for a working
 * contact route, and the slot is visibly waiting to be filled.
 *
 * The legal column links to routes that do not exist yet. Those pages are a
 * legal deliverable, not a UI one.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-muted/40 mt-24 border-t">
      <Container className="py-section">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.id} aria-labelledby={`footer-${column.id}`}>
              <h2 id={`footer-${column.id}`} className="mb-4 text-sm font-medium">
                {column.title}
              </h2>

              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="mb-4 text-sm font-medium">
              יצירת קשר
            </h2>

            <ul className="space-y-2.5">
              {FOOTER_CONTACT.map((channel) => (
                <li key={channel.id} className="text-muted-foreground text-sm">
                  {channel.label}: <span className="text-muted-foreground/70">{channel.value}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-border text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between">
          {/* Brand name is TBD; this is a neutral descriptor, not a wordmark. */}
          <p>© {year} חנות תכשיטים</p>
          <p>המחירים כוללים מע״מ.</p>
        </div>
      </Container>
    </footer>
  );
}
