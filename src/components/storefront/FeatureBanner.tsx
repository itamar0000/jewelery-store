import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

/**
 * A full-bleed image band with copy laid over it.
 *
 * WHY THIS EXISTS RATHER THAN A FOURTH `EditorialPanel`.
 *
 * The homepage ran three `EditorialPanel`s in a row - diamond education, custom
 * and bridal. Each is a half-width picture beside a column of text, alternating
 * which side the picture sits on. Individually each one is fine. Stacked, they
 * read as a template repeating itself: same proportions, same type sizes, same
 * rhythm, three times, so the page has no peak and the eye stops reading.
 *
 * MASTER_SPECIFICATION section 30 asks whether bridal should be a full-width
 * feature, a split editorial or a collection banner. Making it full-bleed is
 * what breaks the run: the page gets a second large image moment after the
 * hero, and the two remaining split panels either side of it read as
 * deliberate contrast rather than as a loop.
 *
 * It is a LAYOUT, not a new capability. Content still arrives as props from the
 * route, the photography is still the shared placeholder surface, and the copy
 * is still the provisional descriptive text the rest of the page uses.
 *
 * The scrim is bottom-weighted because the copy sits low on mobile and centred
 * on desktop; as with the hero, contrast against photography that does not
 * exist yet cannot be guaranteed any other way.
 */
export function FeatureBanner({
  id,
  eyebrow,
  title,
  body,
  action,
  imageLabel,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  imageLabel?: string;
}) {
  return (
    <section aria-labelledby={id} className="relative isolate">
      <PlaceholderImage
        ratio="wide"
        label={imageLabel ?? title}
        hideLabel
        className="max-h-[34rem] min-h-[26rem] w-full"
      />

      {/*
       * `to-t` is a PHYSICAL direction and correct here: the copy is anchored
       * to the bottom of the band on mobile, so the scrim has to be heaviest
       * there. Unlike the homepage hero's inline-start gradient, this one does
       * not change meaning under a different writing direction.
       */}
      <div
        aria-hidden="true"
        className="from-background/90 via-background/45 absolute inset-0 bg-gradient-to-t to-transparent"
      />

      <div className="absolute inset-0 flex items-end pb-12 md:items-center md:pb-0">
        <Container width="wide">
          <div className="max-w-lg">
            {eyebrow && <p className="text-accent text-2xs mb-3 font-medium">{eyebrow}</p>}

            <h2 id={id} className="text-3xl tracking-tight text-balance md:text-4xl">
              {title}
            </h2>

            <p className="text-muted-foreground mt-4 max-w-md text-base text-pretty">{body}</p>

            {action && (
              <Button href={action.href} variant="secondary" size="lg" className="mt-8">
                {action.label}
              </Button>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
