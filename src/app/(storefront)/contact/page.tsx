import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { contactAvailable, contactChannels } from '@/lib/contact';
import { notFoundMetadata } from '@/lib/seo/not-found';

// With no channel configured the page is a 404 (below), and its tab says so
// rather than "צור קשר" (src/lib/seo/not-found.ts).
export const metadata: Metadata = contactAvailable
  ? { title: 'צור קשר', description: 'דרכי יצירת קשר עם החנות.' }
  : notFoundMetadata;

/** One column per channel, so one or two channels do not leave empty cells. */
const COLUMNS = ['', 'sm:grid-cols-2', 'sm:grid-cols-3'] as const;

/**
 * Contact page.
 *
 * IT EXISTS ONLY WHEN A CHANNEL DOES. The channels are configuration
 * (src/lib/contact, from the CONTACT_* environment variables) and nothing here
 * supplies one. With none configured the page is a 404 and nothing on the site
 * links to it: it used to list three channels reading "יעודכן" above a form
 * that "has not been built yet", which told a visitor who wanted to reach the
 * shop that they could not.
 *
 * NO CONTACT FORM, still. A form here would collect a name, a phone number and
 * a message with no inbox behind it - worse than no form, because the customer
 * believes they have been in touch. The same reasoning governs /custom.
 */
export default function ContactPage() {
  if (!contactAvailable) notFound();

  return (
    <>
      <PageHero
        title="צור קשר"
        description="שאלה על דגם, על מידה או על הזמנה אישית — אפשר לפנות אלינו."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'צור קשר' }]}
        imageLabel="צור קשר"
      />

      <Container className="py-12 md:py-16">
        <div className="mx-auto max-w-(--container-narrow)">
          <section aria-labelledby="channels-heading">
            <h2
              id="channels-heading"
              className="font-display text-2xl font-normal tracking-tight md:text-3xl"
            >
              דרכי יצירת קשר
            </h2>

            <ul className={cn('mt-8 grid gap-4', COLUMNS[Math.min(contactChannels.length, 3) - 1])}>
              {contactChannels.map((channel) => (
                // Under a hairline, not in a box - the shape of the custom
                // page's steps, and of everything else on the site.
                <li key={channel.id} className="border-border border-t pt-5">
                  <span className="block text-sm font-medium">{channel.label}</span>
                  <a
                    href={channel.href}
                    className="text-accent mt-1 inline-block text-sm underline underline-offset-4"
                  >
                    <bdi>{channel.display}</bdi>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="elsewhere-heading" className="mt-12">
            <h2 id="elsewhere-heading" className="text-muted-foreground text-xs font-medium">
              אולי תמצאו תשובה כבר עכשיו
            </h2>

            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/faq" className="text-accent underline underline-offset-4">
                שאלות ותשובות
              </Link>
              <Link href="/custom" className="text-accent underline underline-offset-4">
                עיצוב אישי
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
