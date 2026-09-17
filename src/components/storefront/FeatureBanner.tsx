import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { cn } from '@/components/ui/cn';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';

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
 * The scrim tracks the copy rather than covering the frame - vertical on mobile
 * where the text sits low, horizontal from the inline start on desktop where it
 * sits beside the subject. See the note on the gradient itself.
 */
export function FeatureBanner({
  id,
  eyebrow,
  title,
  body,
  action,
  imageLabel,
  assetId = 'bridal',
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  imageLabel?: string;
  /** Which registry asset fills the banner. */
  assetId?: EditorialAssetId;
}) {
  return (
    <section aria-labelledby={id} className="relative isolate">
      {/*
       * A campaign moment: one large image, minimal copy over it. The box is
       * sized here and the picture covers it, so the crop adapts to the
       * viewport instead of a fixed ratio dictating the height.
       */}
      <div className="relative max-h-[34rem] min-h-[26rem] w-full" style={{ height: '55vh' }}>
        <EditorialImage
          id={assetId}
          sizes="100vw"
          hidePlaceholderLabel
          placeholderLabel={imageLabel ?? title}
        />
      </div>

      {/*
       * THE SCRIM FOLLOWS THE COPY, AND THE COPY MOVES AT `md`.
       *
       * It used to be one full-width bottom-to-top wash at every size. That
       * kept the text legible, but it also laid a 90%-opaque band of page
       * colour across the ENTIRE bottom edge - including the half of the frame
       * holding the hand and the rings, which is the subject the banner exists
       * to show. On the bridal frame the engagement ring sits at roughly 30% in
       * and 45% down, squarely under the heaviest part of that wash.
       *
       * So the gradient is now responsive, because the layout it is protecting
       * is responsive:
       *
       *   mobile   copy is anchored to the BOTTOM and spans the full width
       *            (`items-end pb-12`), so the scrim has to be vertical. A
       *            side gradient here would leave the text on bare photograph.
       *
       *   md+      copy is vertically centred inside a `max-w-lg` block at the
       *            inline start - the RIGHT of this RTL page - so the scrim
       *            runs horizontally from that edge and is fully transparent
       *            before it reaches the subject.
       *
       * `to-t` and `to-l` are PHYSICAL directions because CSS gradients have no
       * logical equivalent. `to-l` is correct here only because the storefront
       * is RTL-only (src/lib/config/site.ts), which makes the inline start the
       * right edge; in an LTR context this would need to be `to-r`.
       *
       * The stops are explicit rather than left to Tailwind's defaults: fully
       * covered behind the text, half-strength through the middle, and gone by
       * 80% so the last fifth of the frame - the hand - is untouched.
       */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0',
          'from-background/90 via-background/45 bg-linear-to-t to-transparent',
          'md:from-background/90 md:via-background/60 md:bg-linear-to-l md:via-40% md:to-transparent md:to-80%',
        )}
      />

      <div className="absolute inset-0 flex items-end pb-12 md:items-center md:pb-0">
        <Container width="wide">
          <div className="max-w-lg">
            {eyebrow && <p className="text-accent text-2xs mb-3 font-medium">{eyebrow}</p>}

            <h2 id={id} className="font-display text-3xl tracking-tight text-balance md:text-4xl">
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
