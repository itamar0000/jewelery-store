import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/category/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
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
    <Container className="py-8 md:py-10">
      <Breadcrumbs trail={[{ label: 'דף הבית', href: '/' }, { label: 'עיצוב אישי' }]} />

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
        <PlaceholderImage ratio="landscape" label="עבודת צורף" className="rounded-sm" />

        <div>
          <h1 className="text-3xl tracking-tight">עיצוב אישי</h1>
          <p className="text-muted-foreground mt-4 text-sm text-pretty">
            ניתן להזמין תכשיט שנבנה מהתחלה, לשנות דגם קיים או להוסיף חריטה ושמות.
          </p>
        </div>
      </div>

      <section aria-labelledby="process-heading" className="mt-16">
        <h2 id="process-heading" className="text-xl tracking-tight">
          איך זה עובד
        </h2>

        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.id} className="border-border bg-card rounded-sm border p-6">
              <span className="text-accent text-2xs font-medium">שלב {index + 1}</span>
              <h3 className="mt-2 text-sm font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{step.body}</p>
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
  );
}
