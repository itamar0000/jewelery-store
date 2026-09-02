import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { Bidi } from '@/lib/rtl/bidi';

export const metadata: Metadata = {
  title: 'שאלות ותשובות',
  description: 'תשובות על יהלומים טבעיים ויהלומי מעבדה, מידות, קראט וגווני זהב, משלוחים והחזרות.',
};

/**
 * Frequently asked questions.
 *
 * Replaces the earlier "מדריכים" page. The section 33 educational ARTICLES are
 * a content deliverable that has not happened, and shipping invented jewellery
 * advice under the store's name has a real cost - getting ring sizing or
 * diamond grading wrong misleads a buyer. A question-and-answer page is the
 * honest shape for what can actually be stated today.
 *
 * WHAT IS ANSWERED AND WHAT IS NOT. Questions with a factual, checkable answer
 * - what a lab-grown diamond is, what the karat numbers mean - are answered.
 * Questions whose answer is a business policy nobody has set - shipping price,
 * delivery time, return window, warranty length - are listed with the answer
 * marked as pending, because those are TBD items (L2, L3, L4, B4, B5) and an
 * invented "14 days" would be a false consumer-facing commitment.
 *
 * The prose exercises the section 49 RTL edge case: Latin runs inside Hebrew
 * sentences, wrapped in <Bidi> so trailing punctuation does not drift.
 */
interface Faq {
  readonly id: string;
  readonly question: string;
  readonly answer: ReactNode;
  /** True when the answer depends on a business decision not yet made. */
  readonly pending?: boolean;
}

const FAQS: readonly Faq[] = [
  /**
   * FIRST, because it is now the question the catalog raises.
   *
   * The store carries BOTH natural and lab-grown stones, so "which kind is
   * this?" has to be answerable before the explanatory questions below it mean
   * anything. The answer deliberately points at the product page rather than
   * stating a store-wide fact: the stone type is a per-product column
   * (DiamondSpec.isLabGrown) and this page must not contradict it.
   */
  {
    id: 'natural-or-lab',
    question: 'היהלומים בחנות טבעיים או יהלומי מעבדה?',
    answer: (
      <>
        גם וגם. בקטלוג יש תכשיטים המשובצים ביהלומים טבעיים ותכשיטים המשובצים ביהלומי מעבדה. סוג האבן
        מצוין במפורש בעמוד כל מוצר, תחת פרטי היהלום.
      </>
    ),
  },
  {
    id: 'lab-grown',
    question: 'מה זה יהלום מעבדה?',
    answer: (
      <>
        יהלום שנוצר בתנאים מבוקרים במעבדה במקום בקרקע. מבחינה כימית, פיזיקלית ואופטית הוא יהלום לכל
        דבר — אותו פחמן, אותו מבנה גבישי, אותה קשיות. ההבדל הוא במקור ההיווצרות, ובמחיר.
      </>
    ),
  },
  {
    id: 'lab-vs-mined',
    question: 'איך אפשר להבדיל בין יהלום מעבדה ליהלום כרוי?',
    answer: (
      <>
        לא בעין ולא בבדיקה רגילה. ההבחנה נעשית בציוד מעבדתי ייעודי, ולכן כל אבן מעל משקל מסוים מגיעה
        עם תעודה שמציינת במפורש את מקורה.
      </>
    ),
  },
  {
    id: 'karat',
    question: 'מה ההבדל בין 14K ל-18K?',
    answer: (
      <>
        המספר מציין את אחוז הזהב הטהור בסגסוגת. <Bidi>14K</Bidi> הוא כ-58% זהב ו-<Bidi>18K</Bidi>{' '}
        הוא 75%. זהב <Bidi>18K</Bidi> עשיר יותר בגוון ויקר יותר; <Bidi>14K</Bidi> עמיד יותר לשריטות
        ומתאים לתכשיט יומיומי.
      </>
    ),
  },
  {
    id: 'gold-color',
    question: 'מה ההבדל בין זהב צהוב, לבן ואדום?',
    answer: (
      <>
        כולם זהב באותו קראט, עם מתכות מסגסגות שונות שקובעות את הגוון. זהב לבן (
        <Bidi>White Gold</Bidi>) בדרך כלל מצופה רודיום, וציפוי זה מתחדש מעת לעת כחלק מתחזוקה שוטפת.
      </>
    ),
  },
  {
    id: 'ring-size',
    question: 'איך יודעים מידת טבעת?',
    answer: (
      <>
        הדרך המדויקת היא מדידה אצל צורף. אפשר גם למדוד טבעת קיימת שמתאימה לאותה אצבע. מומלץ למדוד
        בסוף היום ולא בקור, כי היקף האצבע משתנה במהלך היום.
      </>
    ),
  },
  {
    id: 'clarity',
    question: 'מה המשמעות של הסימונים בתעודה?',
    answer: (
      <>
        התעודה מציינת משקל בקראט, צורת ליטוש כמו <Bidi>Round</Bidi> או <Bidi>Oval</Bidi>, דירוג
        ניקיון כמו <Bidi>VS1</Bidi>, דירוג צבע ודירוג ליטוש. יחד הם קובעים את המחיר.
      </>
    ),
  },
  {
    id: 'custom',
    question: 'אפשר להזמין תכשיט בעיצוב אישי?',
    answer: (
      <>
        כן. אפשר לבנות תכשיט מהתחלה, לשנות דגם קיים או להוסיף חריטה. התהליך מתחיל בפנייה, וממשיך
        בהצעת עיצוב ומחיר לאישור לפני תחילת העבודה.
      </>
    ),
  },
  {
    id: 'shipping',
    question: 'כמה עולה המשלוח וכמה זמן הוא לוקח?',
    answer: <>מדיניות המשלוחים טרם נקבעה ותפורסם כאן לפני פתיחת החנות.</>,
    pending: true,
  },
  {
    id: 'returns',
    question: 'מה מדיניות ההחזרות?',
    answer: (
      <>מדיניות ההחזרות טרם נקבעה. היא תעמוד לפחות בדרישות חוק הגנת הצרכן, ותפורסם כאן במלואה.</>
    ),
    pending: true,
  },
  {
    id: 'warranty',
    question: 'יש אחריות על התכשיטים?',
    answer: <>תנאי האחריות טרם נקבעו ויפורסמו כאן.</>,
    pending: true,
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="שאלות ותשובות"
        description="מה שכדאי לדעת לפני קנייה — על יהלומים, זהב, מידות והזמנה אישית."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'שאלות ותשובות' }]}
        imageLabel="שאלות ותשובות"
      />

      <Container className="py-12 md:py-16">
        <dl className="border-border mx-auto max-w-(--container-narrow) divide-y border-y">
          {FAQS.map((faq) => (
            <div key={faq.id} className="py-6">
              <dt className="text-base font-medium">{faq.question}</dt>
              <dd className="text-muted-foreground mt-2 text-sm text-pretty">
                {faq.answer}
                {faq.pending && (
                  <span className="text-muted-foreground/70 text-2xs mt-2 block">
                    טרם נקבע — יעודכן לפני ההשקה.
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-muted-foreground mt-10 text-center text-sm">
          לא מצאתם תשובה?{' '}
          <Link href="/contact" className="text-accent underline underline-offset-4">
            אפשר לפנות אלינו
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
