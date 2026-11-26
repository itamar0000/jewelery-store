import type { Metadata } from 'next';
import Link from 'next/link';

import { requireAdminPage } from '@/lib/admin/session';
import { emailConfigured } from '@/lib/email/notify';
import { getPaymentProvider } from '@/lib/payments/provider';

export const metadata: Metadata = { title: 'עזרה' };

/**
 * How the admin is used, in the owner's words: what to do each day, and the
 * one button for each situation. Kept on the site rather than in a document,
 * so it is there when it is needed and always matches the buttons.
 */
export default async function AdminHelpPage() {
  await requireAdminPage();
  const email = emailConfigured();
  const gateway = getPaymentProvider() !== null;

  return (
    <article className="max-w-2xl space-y-10 text-base leading-relaxed">
      <header>
        <h1 className="text-2xl font-bold">איך עובדים עם אתר הניהול</h1>
        <p className="text-muted-foreground mt-2">
          אי אפשר לשבור כאן כלום. כל לחיצה נרשמת בהיסטוריה של ההזמנה, ואם לחצתם בטעות יש כפתור
          שמחזיר שלב אחד אחורה.
        </p>
      </header>

      <section aria-labelledby="h-status" className="bg-muted p-5 text-sm">
        <h2 id="h-status" className="font-bold">
          מצב החיבורים
        </h2>
        <ul className="mt-2 space-y-1">
          <li>
            התראות במייל:{' '}
            <strong>{email ? 'פעילות' : 'עוד לא הוגדרו - בינתיים בודקים את האתר כל יום'}</strong>
          </li>
          <li>
            תשלום באשראי באתר:{' '}
            <strong>{gateway ? 'פעיל' : 'עוד לא פעיל - כל הזמנה מגיעה כ"ממתינה לתשלום"'}</strong>
          </li>
        </ul>
      </section>

      <section aria-labelledby="h-daily">
        <h2 id="h-daily" className="text-xl font-bold">
          כל יום
        </h2>
        <ol className="mt-3 list-decimal space-y-2 ps-6">
          <li>
            נכנסים ל
            <Link href="/admin/orders" className="underline underline-offset-4">
              הזמנות
            </Link>
            . הרשימה נפתחת על <strong>&quot;לטיפול&quot;</strong> - רק מה שמחכה לכם.
          </li>
          <li>
            המספר הצבעוני ליד &quot;הזמנות&quot; ו&quot;בקשות עיצוב&quot; בתפריט אומר כמה מחכות. אין
            מספר? אין מה לעשות.
          </li>
          <li>לוחצים על הזמנה. למעלה מופיע כפתור גדול אחד - זה הדבר הבא שצריך לעשות.</li>
        </ol>
      </section>

      <section aria-labelledby="h-order">
        <h2 id="h-order" className="text-xl font-bold">
          הדרך של הזמנה
        </h2>
        <ol className="mt-3 list-decimal space-y-2 ps-6">
          <li>
            <strong>ממתינה לתשלום</strong> - הלקוח הזמין ועוד לא שילם.{' '}
            {gateway
              ? 'בדרך כלל זה מישהו שיצא מדף התשלום. אחרי 3 ימים בלי תשלום ההזמנה מתבטלת לבד.'
              : 'שולחים לו קישור תשלום (יש כפתור וואטסאפ עם הודעה מוכנה), ואחרי שהכסף התקבל לוחצים "התקבל תשלום" ובוחרים איך שולם.'}
          </li>
          <li>
            <strong>שולמה</strong> - לוחצים <strong>&quot;התחלתי להכין&quot;</strong> כשהתכשיט נכנס
            לעבודה. כדאי ללחוץ &quot;הדפסת דף עבודה&quot; - יש בו את כל הפרטים: מידה, חריטה, גוון.
          </li>
          <li>
            <strong>בהכנה</strong> - כשהתכשיט ארוז, לוחצים <strong>&quot;התכשיט מוכן&quot;</strong>.
          </li>
          <li>
            <strong>מוכנה</strong> - כשמוסרים לשליח, רושמים את מספר המעקב (לא חובה) ולוחצים{' '}
            <strong>&quot;נשלח ללקוח&quot;</strong>.{email ? ' הלקוח מקבל מייל עם מספר המעקב.' : ''}
          </li>
          <li>
            <strong>נשלחה</strong> - כשהחבילה הגיעה, לוחצים <strong>&quot;הלקוח קיבל&quot;</strong>.
            ההזמנה יוצאת מרשימת &quot;לטיפול&quot;.
          </li>
        </ol>
        <p className="text-muted-foreground mt-3 text-sm">
          בכל שלב יש כפתור <strong>&quot;וואטסאפ ללקוח&quot;</strong>: הוא פותח את הצ׳אט עם הלקוח עם
          הודעה מוכנה שמתאימה לשלב. אפשר לשנות אותה לפני שליחה.
        </p>
      </section>

      <section aria-labelledby="h-cancel">
        <h2 id="h-cancel" className="text-xl font-bold">
          ביטול והחזר כסף
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">
          <li>
            בדף ההזמנה, בצד, יש <strong>&quot;ביטול ההזמנה&quot;</strong>. האתר שואל לפני שהוא מבטל.
          </li>
          <li>
            אם ההזמנה כבר שולמה: מחזירים את הכסף באותה דרך שבה שולם (בחברת הסליקה, בביט או בהעברה),
            ואז לוחצים <strong>&quot;הכסף הוחזר ללקוח&quot;</strong> כדי שזה יירשם.
          </li>
          <li>
            לקוח שילם אחרי שההזמנה בוטלה? בהזמנה המבוטלת יש &quot;התקבל תשלום&quot;, והיא חוזרת
            לטיפול.
          </li>
        </ul>
      </section>

      <section aria-labelledby="h-requests">
        <h2 id="h-requests" className="text-xl font-bold">
          בקשות עיצוב אישי
        </h2>
        <p className="mt-3">
          ב
          <Link href="/admin/requests" className="underline underline-offset-4">
            בקשות עיצוב
          </Link>{' '}
          רואים מה הלקוח ביקש ואיך ליצור איתו קשר. כשנותנים הצעת מחיר, רושמים את הסכום ובוחרים
          &quot;נשלחה הצעת מחיר&quot;. כך רואים תמיד איפה כל בקשה עומדת.
        </p>
      </section>

      <section aria-labelledby="h-products">
        <h2 id="h-products" className="text-xl font-bold">
          מוצרים
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">
          <li>
            מוצאים מוצר בחיפוש למעלה (שם או מק״ט), לוחצים עליו, ושם משנים מחיר, תיאור או תמונות. כל
            חלק נשמר בכפתור שלו.
          </li>
          <li>
            להוריד מוצר מהאתר בלי למחוק: מורידים את הסימון <strong>&quot;מוצג באתר&quot;</strong>{' '}
            ושומרים. מחזירים באותה דרך.
          </li>
          <li>
            מוצר חדש נוצר <strong>מוסתר</strong>. מעלים תמונות, בודקים, ורק אז מסמנים &quot;מוצג
            באתר&quot;.
          </li>
          <li>המחירים כוללים מע״מ.</li>
        </ul>
      </section>

      <section aria-labelledby="h-marketing">
        <h2 id="h-marketing" className="text-xl font-bold">
          מבצעים, קופונים והודעות
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">
          <li>
            <strong>מבצעים</strong> - הנחה שכולם מקבלים אוטומטית על מוצרים או קטגוריות, בין תאריכים.
          </li>
          <li>
            <strong>קופונים</strong> - קוד שהלקוח מקליד בעגלה. קופון אחד להזמנה.
          </li>
          <li>
            <strong>הודעות</strong> - השורה הקטנה בראש האתר (למשל &quot;משלוח חינם לכל הארץ&quot;).
          </li>
        </ul>
      </section>

      <section aria-labelledby="h-trouble" className="border-border border p-5">
        <h2 id="h-trouble" className="text-xl font-bold">
          משהו לא מסתדר?
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">
          <li>
            הכפתור כתב &quot;ההזמנה כבר עודכנה בינתיים&quot;? מרעננים את הדף (גוררים למטה בטלפון).
          </li>
          <li>
            להחליף סיסמה: לוחצים על השם שלכם בראש הדף. שכחתם סיסמה? פונים למי שמתחזק את האתר, והוא
            יוצר חדשה.
          </li>
          <li>כל דבר אחר - צילום מסך של הדף ושליחה למי שמתחזק את האתר.</li>
        </ul>
      </section>
    </article>
  );
}
