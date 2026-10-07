import type { Metadata } from 'next';

import { PageHero } from '@/components/storefront/PageHero';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { contactAvailable } from '@/lib/contact';
import { CUSTOM_STEPS } from '@/lib/content/custom-process';

export const metadata: Metadata = {
  title: 'עיצוב אישי',
  description: 'הזמנת תכשיט בעיצוב אישי, או דגם מהקטלוג בגוון, בקראט או במידה אחרים.',
};

/**
 * Custom jewellery: how it works, and where to start.
 *
 * STEP ONE IS NOW SOMETHING TO DO. The page used to explain a process whose
 * first step, "פנייה", had no action while no contact channel existed - the
 * product pages, the menu and the home page all invited custom work and
 * arrived here at a wall (critique 2026-10-06, P0). The request form
 * (/custom/request) saves the request to the database with a number, so the
 * page ends on it as the one primary action.
 *
 * THE WORKSHOP IS SHOWN, not only described: the atelier photograph - hands at
 * the bench - sits beside the steps at the editorial panel's 4:5, the shape
 * DESIGN.md gives a picture beside a column of copy. It is the same photograph
 * that closes the home page, which is the point: that band leads here.
 */
export default function CustomPage() {
  return (
    <>
      <PageHero
        title="עיצוב אישי"
        description="אפשר להזמין תכשיט שנבנה מהתחלה, לשנות דגם קיים או להוסיף חריטה ושמות."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'עיצוב אישי' }]}
      />

      <Container className="md:py-feature py-12">
        <section
          aria-labelledby="process-heading"
          className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16"
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            <EditorialImage
              id="atelier"
              sizes="(max-width: 767px) 100vw, 45vw"
              placeholderLabel="עבודת צורף"
            />
          </div>

          <div>
            <h2
              id="process-heading"
              className="font-display text-2xl font-normal tracking-tight md:text-3xl"
            >
              איך זה עובד
            </h2>

            {/*
             * Three steps under hairlines, not three bordered cards: a rule
             * with the step beneath it is the shape of a process described in
             * a catalogue, which is what this is.
             */}
            <ol className="mt-8 space-y-6">
              {CUSTOM_STEPS.map((step, index) => (
                <li key={step.id} className="border-border border-t pt-5">
                  <h3 className="text-base font-medium">
                    <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="text-soft-foreground mt-1.5 text-base text-pretty">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/custom/request" variant="primary" size="lg">
                לשליחת בקשה
              </Button>
              {contactAvailable && (
                <Button href="/contact" variant="secondary" size="lg">
                  יצירת קשר
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mt-4 text-sm">הבקשה לא מחייבת ואין בה תשלום.</p>
          </div>
        </section>
      </Container>
    </>
  );
}
