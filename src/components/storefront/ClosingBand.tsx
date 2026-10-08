import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/**
 * The page's last word (D4D.27).
 *
 * The home page ended on three FAQ links and an outlined "all questions" pill
 * - a close on doubt. Visits are remembered by their peak and their end, so the
 * last band says the shop's one fact again, in the display serif at finale
 * spacing, and offers the way into the catalogue. Set on the recessed ivory so
 * it reads as a close before the night footer, not as one more band.
 */
export function ClosingBand() {
  return (
    <section aria-labelledby="closing-heading" className="bg-muted">
      <Container width="wide" className="py-section md:py-finale">
        <h2
          id="closing-heading"
          className="font-display max-w-[18ch] text-4xl leading-[1.08] font-normal text-balance md:text-6xl"
        >
          כל תכשיט מתחיל בסדנה, ונגמר אצלכם
        </h2>
        <p className="text-soft-foreground mt-6 max-w-(--measure-reading) text-base leading-[1.8] font-light text-pretty md:text-lg">
          בוחרים דגם, מתאימים אותו, והוא מיוצר בשבילכם. בלי חנות באמצע.
        </p>
        <div className="mt-9">
          <Button href="#discovery-heading" variant="primary">
            לכל הקטגוריות
          </Button>
        </div>
      </Container>
    </section>
  );
}
