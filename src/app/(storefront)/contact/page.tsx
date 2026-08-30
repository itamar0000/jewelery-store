import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { FOOTER_CONTACT } from '@/lib/navigation/taxonomy';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

export const metadata: Metadata = {
  title: 'צור קשר',
  description: 'דרכי יצירת קשר עם החנות.',
};

/**
 * Contact page.
 *
 * TWO THINGS ARE DELIBERATELY MISSING, and both would be easy to fake.
 *
 * 1. NO CONTACT DETAILS ARE INVENTED. The phone number, email address and
 *    WhatsApp channel are outstanding business details (section 52, TBD.md), so
 *    each channel renders its label with "יעודכן" and no `href`. A plausible
 *    placeholder number is worse than an empty slot: it looks finished, so
 *    nobody fixes it, and a customer eventually dials it.
 *
 * 2. NO CONTACT FORM. A form here would collect a name, a phone number and a
 *    message, and then discard them - there is no inbox, no persistence and no
 *    notification behind it. A contact form that silently drops enquiries is
 *    worse than no form, because the customer believes they have been in touch.
 *    The same reasoning governs the custom-request form on /custom.
 *
 * The channels are read from the same FOOTER_CONTACT constant the footer uses,
 * so when the real details land they appear in both places from one edit.
 */
export default function ContactPage() {
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
            <h2 id="channels-heading" className="text-center text-xl tracking-tight">
              דרכי יצירת קשר
            </h2>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3" {...PLACEHOLDER_ATTR}>
              {FOOTER_CONTACT.map((channel) => (
                <li
                  key={channel.id}
                  className="border-border bg-card rounded-sm border p-6 text-center"
                >
                  <span className="block text-sm font-medium">{channel.label}</span>
                  <span className="text-muted-foreground/70 mt-1 block text-sm">
                    {channel.value}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground/70 text-2xs mt-4 text-center">
              פרטי הקשר טרם נקבעו ויעודכנו לפני ההשקה.
            </p>
          </section>

          <section
            aria-labelledby="form-heading"
            className="border-border mt-12 rounded-sm border border-dashed p-8 text-center"
            {...PLACEHOLDER_ATTR}
          >
            <h2 id="form-heading" className="text-base font-medium">
              טופס פנייה
            </h2>
            <p className="text-muted-foreground mt-3 text-sm text-pretty">
              הטופס עדיין לא נבנה, ולכן לא נאספים כאן פרטים אישיים. הוא ייבנה יחד עם מערכת הפניות,
              כדי שכל פנייה אכן תגיע ליעד ולא תיעלם.
            </p>
          </section>

          <section aria-labelledby="elsewhere-heading" className="mt-12 text-center">
            <h2 id="elsewhere-heading" className="text-muted-foreground text-2xs font-medium">
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
