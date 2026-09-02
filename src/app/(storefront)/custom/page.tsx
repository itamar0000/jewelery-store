import type { Metadata } from 'next';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

export const metadata: Metadata = {
  title: 'עיצוב אישי',
  description: 'הזמנת תכשיט בעיצוב אישי.',
};

/**
 * Custom jewelry landing page.
 *
 * The REQUEST FORM is not built here. MASTER_SPECIFICATION section 17 describes
 * a custom request flow with file upload and a request record; that is a real
 * feature with storage, validation and an admin queue behind it, and a form
 * that collects a customer name, phone and reference photo and then discards
 * them would be worse than no form at all.
 *
 * So this page explains the process and stops at the point where the form
 * belongs, with that slot clearly marked.
 *
 * The three steps below are process description, not marketing claims - no
 * turnaround time or price is stated, because neither has been decided.
 */
const STEPS: readonly { id: string; title: string; body: string }[] = [
  { id: 'brief', title: 'פנייה', body: 'תיאור הרעיון, דגם להשראה או תכשיט קיים לשינוי.' },
  { id: 'design', title: 'שרטוט ואישור', body: 'הצעת עיצוב והצעת מחיר לאישור לפני תחילת העבודה.' },
  { id: 'craft', title: 'ייצור', body: 'הכנת התכשיט לאחר אישור, כולל חריטה והתאמות מידה.' },
];

export default function CustomPage() {
  return (
    <>
      <PageHero
        title="עיצוב אישי"
        description="ניתן להזמין תכשיט שנבנה מהתחלה, לשנות דגם קיים או להוסיף חריטה ושמות."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'עיצוב אישי' }]}
        imageLabel="עבודת צורף"
      />

      <Container className="py-12 md:py-16">
        <section aria-labelledby="process-heading">
          <h2 id="process-heading" className="text-center text-2xl tracking-tight md:text-3xl">
            איך זה עובד
          </h2>

          {/*
           * Three unframed columns under a hairline, not three bordered cards.
           *
           * Section 17 calls custom work a differentiator and the visual brief
           * asks this page to feel bespoke rather than transactional. A row of
           * outlined boxes is the shape of a pricing table; a rule with the
           * step set beneath it is the shape of a process described in a
           * catalogue, which is what this actually is.
           */}
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map((step, index) => (
              <li key={step.id} className="border-border border-t pt-6">
                <span className="text-accent text-2xs font-medium">שלב {index + 1}</span>
                <h3 className="mt-3 text-base font-medium">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm text-pretty">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div
          className="border-border mt-12 rounded-sm border border-dashed p-8 text-center"
          {...PLACEHOLDER_ATTR}
        >
          <p className="text-muted-foreground text-sm">
            כאן ייכנס טופס הפנייה, כולל העלאת תמונת השראה. הטופס לא נבנה בשלב זה, ולכן לא נאספים כאן
            פרטים אישיים.
          </p>
          <p className="text-muted-foreground/70 text-2xs mt-3">ייבנה בשלב מאוחר יותר.</p>
        </div>
      </Container>
    </>
  );
}
