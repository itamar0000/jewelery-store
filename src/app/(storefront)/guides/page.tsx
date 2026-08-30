import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/category/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { Bidi } from '@/lib/rtl/bidi';

export const metadata: Metadata = {
  title: 'מדריכים ושאלות נפוצות',
  description: 'מידע על יהלומי מעבדה, מידות, קראט וגווני זהב.',
};

/**
 * Guides index.
 *
 * The guide ARTICLES are a content deliverable that has not happened
 * (MASTER_SPECIFICATION section 33 lists the topics, not the copy), so this
 * page lists the planned topics and says so, rather than shipping invented
 * jewellery advice under the store's name. Getting "how to measure a ring size"
 * wrong has a real cost for a customer.
 *
 * The prose deliberately exercises the RTL edge case from section 49: Latin
 * runs inside Hebrew sentences, wrapped in <Bidi> so trailing punctuation does
 * not drift. This page is the visible regression check for that behaviour.
 */
const TOPICS: readonly { id: string; title: string; summary: string }[] = [
  {
    id: 'lab-grown',
    title: 'יהלומי מעבדה',
    summary: 'מה זה יהלום מעבדה, במה הוא זהה ליהלום כרוי, ואיפה ההבדל.',
  },
  {
    id: 'ring-size',
    title: 'איך יודעים מידת טבעת',
    summary: 'שיטות מדידה והתאמת מידה לאחר קנייה.',
  },
  { id: 'gold', title: 'קראט וגווני זהב', summary: 'ההבדל בין הסגסוגות ומה מתאים לשימוש יומיומי.' },
  { id: 'care', title: 'תחזוקה וניקוי', summary: 'שמירה על תכשיט לאורך זמן.' },
  { id: 'certificate', title: 'תעודות יהלום', summary: 'מה כתוב בתעודה ואיך קוראים אותה.' },
];

export default function GuidesPage() {
  return (
    <Container className="py-8 md:py-10">
      <Breadcrumbs trail={[{ label: 'דף הבית', href: '/' }, { label: 'מדריכים' }]} />

      <header className="mt-6 max-w-(--container-prose)">
        <h1 className="text-3xl tracking-tight">מדריכים ושאלות נפוצות</h1>

        <p className="text-muted-foreground mt-4 text-sm text-pretty">
          מונחים מקצועיים מופיעים באנגלית כפי שהם מופיעים בתעודה — ניקיון <Bidi>VS1</Bidi>, צורה{' '}
          <Bidi>Oval</Bidi>, סגסוגת <Bidi>14K</Bidi> וגוון <Bidi>Rose Gold</Bidi>.
        </p>
      </header>

      <ul className="border-border mt-10 grid gap-px border-y md:grid-cols-2">
        {TOPICS.map((topic) => (
          <li key={topic.id} className="py-5">
            <h2 className="text-sm font-medium">{topic.title}</h2>
            <p className="text-muted-foreground mt-1 text-xs">{topic.summary}</p>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground/70 text-2xs mt-10">
        תוכן המדריכים ייכתב בנפרד. הרשימה מציגה את הנושאים המתוכננים בלבד.
      </p>
    </Container>
  );
}
