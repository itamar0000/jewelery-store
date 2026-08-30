import { Container } from '@/components/ui/Container';
import { StarIcon } from '@/components/ui/icons';

import { SectionHeading } from './SectionHeading';

/**
 * Social proof.
 *
 * NO REVIEW CONTENT IS INVENTED HERE, AND NONE MAY BE.
 *
 * Every other placeholder in this phase stands in for creative that does not
 * exist yet. A fabricated customer review is a different thing: it is a false
 * statement attributed to a real-sounding person, it is what the section would
 * literally display in production, and in Israel a fake testimonial is a
 * consumer-protection problem, not a design shortcut. Writing three plausible
 * five-star quotes here would be the single most damaging placeholder on the
 * page, because it is the one nobody would notice was fake.
 *
 * So this renders the LAYOUT - a three-card row at the right proportions, with
 * the star row and attribution line positioned - and fills it with an explicit
 * empty state. Card sizing and section rhythm can be reviewed now; the content
 * arrives from the reviews system (section 25).
 *
 * The stars are `aria-hidden` and show no rating, because there is no rating.
 */
export function ReviewsSection() {
  return (
    <Container as="section" aria-labelledby="reviews-heading" className="py-16 md:py-20">
      <SectionHeading
        id="reviews-heading"
        title="ביקורות לקוחות"
        description="ביקורות אמיתיות בלבד, מתוך הזמנות שבוצעו. המערכת תחובר בשלב מאוחר יותר."
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <li
            key={slot}
            className="border-border bg-card flex min-h-44 flex-col rounded-sm border border-dashed p-6"
          >
            <div aria-hidden="true" className="text-border-strong flex gap-0.5">
              {[0, 1, 2, 3, 4].map((star) => (
                <StarIcon key={star} filled className="size-4" />
              ))}
            </div>

            <p className="text-muted-foreground mt-4 text-sm">
              מקום לביקורת לקוח. לא מוצג כאן תוכן לדוגמה כדי שלא תוצג ביקורת שאינה אמיתית.
            </p>

            <p className="text-muted-foreground/70 text-2xs mt-auto pt-4">שם הלקוח • תאריך</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
