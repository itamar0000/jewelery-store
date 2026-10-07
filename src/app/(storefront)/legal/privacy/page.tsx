import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { SITE_NAME } from '@/lib/config/site';
import { contactChannels } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות',
  description: 'איזה מידע האתר אוסף, למה, למי הוא מועבר, כמה זמן נשמר ואילו זכויות יש לך.',
};

/**
 * The privacy policy - a standard one, written at the owner's request
 * (docs/DECISIONS.md D4D.19), in the shape the Israeli Privacy Protection Law
 * and its Amendment 13 expect: who collects, what, why, whether it must be
 * given, who receives it, for how long, how it is protected, and the rights.
 *
 * EVERY FACT HERE IS ONE THE CODE MAKES TRUE. What is collected is exactly
 * what the checkout and the custom-request form ask for; the cookies are the
 * two the site sets (`jfl_cart`, `jfl_order`); there is no analytics, no
 * advertising pixel and no marketing list, and the page says so. If any of
 * that changes - a payment provider, analytics, a newsletter - this page
 * changes in the same commit.
 *
 * THE OPERATOR IS THE BUSINESS ITSELF: "Jewelry for Less" is the business's
 * name (confirmed by the owner, 2026-10-06). Its registration number and
 * postal address are not in the project yet and are not invented. The contact
 * line uses the configured channels (src/lib/contact) and says plainly when
 * none is published yet. The owner should have it reviewed by a lawyer.
 */
const UPDATED = '6 באוקטובר 2026';

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="מדיניות פרטיות"
        description={`איך ${SITE_NAME} משתמש במידע שנמסר באתר. עודכן לאחרונה: ${UPDATED}.`}
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'מדיניות פרטיות' }]}
      />

      <Container className="py-12 md:py-16">
        <div className="text-soft-foreground max-w-(--measure-reading) space-y-10 text-base text-pretty">
          <Section title="מי אנחנו">
            <p>
              {SITE_NAME} (להלן: &quot;אנחנו&quot;) מפעילה את האתר, מוכרת תכשיטי זהב ויהלומים ומקבלת
              בקשות לעיצוב אישי. אנחנו אחראים למידע שנמסר באתר, כמפורט כאן ובהתאם לחוק הגנת הפרטיות,
              התשמ&quot;א-1981.
            </p>
          </Section>

          <Section title="איזה מידע נאסף">
            <ul className="marker:text-muted-foreground list-disc space-y-2 ps-5">
              <li>
                <strong className="text-foreground font-medium">בהזמנה:</strong> שם, אימייל, טלפון
                וכתובת למשלוח, ואם המשלוח לאדם אחר - שמו והטלפון שלו. וכן הפריטים שהוזמנו, הבחירות
                וההתאמה האישית (למשל שם לחריטה).
              </li>
              <li>
                <strong className="text-foreground font-medium">בבקשה לעיצוב אישי:</strong> שם,
                טלפון או אימייל, ומה שנכתב בבקשה, כולל הדגם שממנו היא התחילה.
              </li>
              <li>
                <strong className="text-foreground font-medium">בגלישה:</strong> שתי עוגיות
                (cookies) הכרחיות בלבד - אחת שמזהה את סל הקניות, ואחת שמאפשרת להציג את ההזמנה שזה
                עתה בוצעה. בנוסף, פרטי ההזמנה שהוקלדו נשמרים בדפדפן עצמו (sessionStorage) עד סגירת
                הלשונית, כדי שלא יאבדו במעבר בין עמודים. שרתי האחסון רושמים, כמקובל, נתונים טכניים
                כמו כתובת IP וסוג הדפדפן.
              </li>
            </ul>
            <p>
              אין באתר כלי ניתוח תנועה, פיקסלים של פרסום או רשימת דיוור. אין חובה חוקית למסור את
              המידע, אבל בלעדיו אי אפשר להשלים הזמנה או לחזור אליך בעניין בקשה.
            </p>
          </Section>

          <Section title="למה הוא משמש">
            <ul className="marker:text-muted-foreground list-disc space-y-2 ps-5">
              <li>הכנת ההזמנה, משלוחה ויצירת קשר בעניינה.</li>
              <li>מענה לבקשה לעיצוב אישי: הצעת עיצוב ומחיר ותיאום העבודה.</li>
              <li>הפעלת האתר ואבטחתו, ועמידה בחובות על פי דין, כמו שמירת מסמכים חשבונאיים.</li>
            </ul>
            <p>לא נשלח לך דיוור שיווקי בלי הסכמה מפורשת, ולא נמכור את המידע לאף אחד.</p>
          </Section>

          <Section title="למי הוא מועבר">
            <p>
              רק למי שצריך אותו כדי לתת את השירות: ספקי האחסון והתשתית שעליהם האתר והמסד שלו פועלים,
              שחלקם נמצאים מחוץ לישראל ומחויבים לשמירה על המידע; חברת משלוחים, למשלוח הזמנה;
              וכשיופעל תשלום באתר - ספק התשלום, שיקבל את פרטי התשלום ישירות. וכן כשהדין מחייב זאת.
            </p>
          </Section>

          <Section title="כמה זמן הוא נשמר">
            <p>
              פרטי הזמנה נשמרים כל עוד הם נדרשים למתן השירות, לאחריות ולחובות על פי דין. בקשה לעיצוב
              אישי שלא הפכה להזמנה נשמרת עד שהטיפול בה מסתיים, ואפשר לבקש למחוק אותה לפני כן. עוגיית
              הסל פגה אחרי 30 יום, ועוגיית ההזמנה אחרי יום אחד.
            </p>
          </Section>

          <Section title="אבטחה">
            <p>
              המידע עובר באתר בחיבור מוצפן (HTTPS) ונשמר במסד נתונים שהגישה אליו מוגבלת. העוגיות
              אינן נגישות לקוד בדף, והמזהה שמאפשר לצפות בהזמנה נשמר אצלנו רק בהצפנה חד-כיוונית. אין
              שיטה שמבטיחה הגנה מלאה, אבל אנחנו נוקטים אמצעים סבירים ומקובלים.
            </p>
          </Section>

          <Section title="הזכויות שלך">
            <p>
              לפי חוק הגנת הפרטיות אפשר לעיין במידע שנשמר עליך, לבקש לתקן מידע שגוי, לא שלם או לא
              מעודכן, ולבקש למחוק מידע שאינו נדרש עוד או להסיר אותו מכל שימוש שאינו הכרחי. אפשר גם
              לחזור בך מהסכמה שנתת.
            </p>
            <ContactLine />
          </Section>

          <Section title="שינויים במדיניות">
            <p>
              כשהאתר משתנה - למשל כשיופעל בו תשלום - המדיניות תעודכן כאן, עם תאריך העדכון בראש
              העמוד.
            </p>
          </Section>
        </div>
      </Container>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-foreground text-xl font-normal tracking-tight md:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Where to send a privacy request: the configured channels, or a plain statement. */
function ContactLine() {
  if (contactChannels.length === 0) {
    return (
      <p>
        פרטי הקשר לבקשות בנושא פרטיות יפורסמו בעמוד זה. עד אז אפשר לציין את הבקשה ב
        <Link
          href="/custom/request"
          className="decoration-border-strong hover:decoration-accent underline underline-offset-[0.35em]"
        >
          טופס הפנייה
        </Link>
        , ונחזור אליך.
      </p>
    );
  }

  return (
    <p>
      לבקשות אפשר לפנות אלינו:{' '}
      {contactChannels.map((channel, index) => (
        <span key={channel.id}>
          {index > 0 && ', '}
          {channel.label}{' '}
          <a
            href={channel.href}
            className="decoration-border-strong hover:decoration-accent underline underline-offset-[0.35em]"
          >
            <bdi>{channel.display}</bdi>
          </a>
        </span>
      ))}
      .
    </p>
  );
}
