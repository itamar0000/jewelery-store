import { Bidi } from '@/lib/rtl/bidi';

/**
 * Phase 1 placeholder.
 *
 * Not storefront UI, and not a design. It exists so the foundation is
 * observable in a browser: RTL flows correctly, the Hebrew webfont loads, the
 * design tokens resolve, and an embedded Latin run does not drift.
 *
 * Phase 3 replaces this with the real homepage.
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-(--container-prose) px-6 py-24">
      <h1 className="text-3xl tracking-tight">שלב 1 — תשתית האפליקציה</h1>

      <p className="text-muted-foreground mt-6">
        אין כאן עדיין ממשק חנות. הדף הזה קיים כדי לאמת שהתשתית עובדת: כיווניות RTL, טעינת הגופן
        העברי, וטוקני העיצוב.
      </p>

      <p className="mt-4">
        טקסט לטיני משובץ בתוך משפט עברי, עטוף ברכיב <Bidi>Bidi</Bidi> כדי שהפיסוק לא ייסחף: זהב{' '}
        <Bidi>14K</Bidi>, יהלום בניקיון <Bidi>VS1</Bidi>, גוון <Bidi>Rose Gold</Bidi>.
      </p>

      <div className="border-border bg-card mt-10 rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          המסגרת, הרקע והצל שלמעלה מגיעים כולם מטוקני העיצוב. אף ערך צבע אינו כתוב ישירות ברכיב.
        </p>
      </div>
    </main>
  );
}
