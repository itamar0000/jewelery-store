import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { contactAvailable } from '@/lib/contact';
import { Bidi } from '@/lib/rtl/bidi';

export const metadata: Metadata = {
  title: 'שאלות ותשובות',
  description: 'תשובות על יהלומים טבעיים ויהלומי מעבדה, מידות, קראט, גווני זהב ועיצוב אישי.',
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
 * delivery time, return window, warranty length - are kept below, marked
 * `pending`, and NOT RENDERED until the policy exists: TBD items L2, L3, L4,
 * B4 and B5. An invented "14 days" would be a false consumer-facing
 * commitment; a published "not decided yet" told every visitor the shop was
 * not ready to sell. Setting the real answer and dropping `pending` publishes
 * each one.
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
        רוב התכשיטים בקטלוג משובצים ביהלומי מעבדה, ומעטים ביהלומים טבעיים. סוג היהלום כתוב על כל
        דגם, וגם בעמוד המוצר, ואפשר לסנן לפיו. כל דגם אפשר לבקש גם עם יהלום טבעי, דרך{' '}
        <Link href="/custom/request" className="text-accent underline underline-offset-4">
          בקשת התאמה
        </Link>
        .
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
    answer: <>לא בעין ולא בבדיקה רגילה. ההבחנה נעשית בציוד מעבדתי ייעודי.</>,
  },
  {
    id: 'karat',
    question: 'באיזה זהב מיוצרים התכשיטים?',
    answer: (
      <>
        כל התכשיטים באתר מיוצרים בזהב <Bidi>14K</Bidi>, וזה הסטנדרט שלנו: כ-58% זהב טהור, עמיד
        לשריטות ומתאים לתכשיט שעונדים כל יום. רוצים דגם בקראט אחר, למשל <Bidi>18K</Bidi> (75% זהב,
        עשיר יותר בגוון ויקר יותר)?{' '}
        <Link href="/custom" className="underline underline-offset-[0.35em]">
          אפשר להזמין אותו כעיצוב אישי
        </Link>
        .
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
        המידות באתר הן מידות אירופיות: ההיקף הפנימי של הטבעת במילימטרים. הדרך המדויקת היא מדידה אצל
        צורף. אפשר גם למדוד טבעת קיימת שמתאימה לאותה אצבע: מודדים את הקוטר הפנימי שלה במילימטרים
        ומכפילים ב-3.14. קוטר של 16.5 מ״מ, למשל, הוא מידה 52. מומלץ למדוד בסוף היום ולא בקור, כי
        היקף האצבע משתנה במהלך היום.
      </>
    ),
  },
  /*
   * NO CERTIFICATE IS PROMISED. This question used to explain "the markings on
   * the certificate", after another answer promised a certificate for every
   * stone above a weight - a policy and a threshold the owner has not set. The
   * grades are explained where a shopper actually meets them: the product
   * page's diamond details, whose row labels these words match.
   */
  {
    id: 'clarity',
    question: 'מה המשמעות של דירוגי היהלום בעמוד המוצר?',
    /*
     * IT EXPLAINS NOW. The answer used to list the grades - weight, shape,
     * colour, clarity, cut - and stop, which told a shopper the words existed
     * without saying what any of them meant. Each line below is the standard
     * scale as the grading laboratories define it, in the order of the rows on
     * the product page; it describes the scale, not any stone in the shop.
     */
    answer: (
      <>
        הדירוגים נכתבים באותיות לועזיות, כפי שהם מופיעים בתעודות הדירוג, ולכל אחד יש סולם קבוע:
        <ul className="marker:text-muted-foreground mt-3 list-disc space-y-2 ps-5">
          <li>
            <strong className="text-foreground font-medium">משקל</strong> נמדד בקראט: קראט אחד הוא
            0.2 גרם. זה לא הקראט של הזהב, שמציין את אחוז הזהב בסגסוגת.
          </li>
          <li>
            <strong className="text-foreground font-medium">צבע</strong> מדורג מ-<Bidi>D</Bidi> עד{' '}
            <Bidi>Z</Bidi>: <Bidi>D</Bidi> עד <Bidi>F</Bidi> חסרי צבע, <Bidi>G</Bidi> עד{' '}
            <Bidi>J</Bidi> כמעט חסרי צבע, ומשם מופיע גוון צהבהב שמתחזק עם האותיות.
          </li>
          <li>
            <strong className="text-foreground font-medium">ניקיון</strong> מתאר פגמים פנימיים:{' '}
            <Bidi>VVS</Bidi> הם זעירים מאוד וקשים לאיתור גם בהגדלה, <Bidi>VS</Bidi> זעירים ונראים רק
            בהגדלה, ו-<Bidi>SI</Bidi> קלים ונראים בהגדלה.
          </li>
          <li>
            <strong className="text-foreground font-medium">ליטוש</strong> מתאר כמה טוב האבן מחזירה
            אור, מ-<Bidi>Excellent</Bidi> (מצוין) דרך <Bidi>Very Good</Bidi> (טוב מאוד) ומטה.
          </li>
          <li>
            <strong className="text-foreground font-medium">צורה</strong> היא קו המתאר של האבן: עגול
            (<Bidi>Round</Bidi>), אובלי (<Bidi>Oval</Bidi>), טיפה (<Bidi>Pear</Bidi>) ועוד.
          </li>
        </ul>
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
    question: 'כמה עולה המשלוח?',
    answer: <>המשלוח חינם, בכל הזמנה.</>,
  },
  {
    id: 'delivery-time',
    question: 'כמה זמן לוקח המשלוח?',
    answer: <>זמני המשלוח טרם נקבעו ויפורסמו כאן לפני פתיחת החנות.</>,
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
        {/* Answers are read at length, so the list takes the reading measure
            (tokens.css) - about 74 characters a line, not the ~98 the 40rem
            container held - and the answers are set as body prose. */}
        <dl className="border-border mx-auto max-w-(--measure-reading) divide-y border-y">
          {FAQS.filter((faq) => !faq.pending).map((faq) => (
            // An anchor for the homepage's questions (/faq#<id>), clear of the
            // sticky header when it is jumped to.
            <div
              key={faq.id}
              id={faq.id}
              className="scroll-mt-[calc(var(--header-height)+1rem)] py-6"
            >
              <dt className="text-base font-medium">{faq.question}</dt>
              <dd className="text-soft-foreground mt-2 text-base text-pretty">{faq.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Only when there is somewhere to turn: /contact exists only then. */}
        {contactAvailable && (
          <p className="text-muted-foreground mt-10 text-sm">
            לא מצאתם תשובה?{' '}
            <Link href="/contact" className="text-accent underline underline-offset-4">
              אפשר לפנות אלינו
            </Link>
            .
          </p>
        )}
      </Container>
    </>
  );
}
