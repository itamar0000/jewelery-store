import { EditorialImage } from '@/components/ui/EditorialImage';
import { Container } from '@/components/ui/Container';

/**
 * The first viewport: one photograph at full bleed, then the line beneath it.
 *
 * TWO ARRANGEMENTS WERE REJECTED BEFORE THIS ONE, and the reasons are worth
 * keeping because they rule out most of the obvious answers.
 *
 * The first floated the headline and a button over the picture in the usual
 * way. The second put them on a small sheet of paper laid on the photograph,
 * with the action as a red stamp; the owner's word for it was "hideous", and it
 * was - a saturated red block is the loudest thing on a quiet page, and a
 * floating panel over a photograph is a widget, not a composition.
 *
 * SO NOTHING IS LAID OVER THE PICTURE AT ALL. The photograph gets the frame to
 * itself, edge to edge, and the type begins where the image ends. That is how a
 * magazine opens and how a gallery hangs a wall, and it has a plain practical
 * virtue besides: type on paper has a contrast ratio that does not depend on
 * what the photographer put behind it. A scrim is what you reach for when the
 * words have nowhere to stand.
 *
 * THE LINE IS THE INVESTMENT. It is set at a size the old scale could not
 * reach, in ink, with the tracking pulled tight - because on a page whose only
 * colour is the jewellery, scale and restraint are what is left to spend.
 *
 * THE ACTION IS A RULE, NOT A BUTTON. A single underlined line of type under
 * the headline, which is what a shop confident in its photographs does; a
 * filled block here would pull the eye off the picture it is meant to serve.
 */
export function Hero({
  title,
  action,
  imageLabel,
}: {
  /** The line. States what the shop sells; never a slogan. */
  title: string;
  action: { readonly label: string; readonly href: string };
  imageLabel?: string;
}) {
  return (
    /*
     * THE FIRST SCREEN IS SIZED FROM THE REAL HEADER (`--header-height`).
     *
     * It used to subtract a flat 11rem from the viewport. That allowed for a
     * 4rem header and left the top of the line peeking above the fold; the
     * desktop header grew a navigation row to 8rem and nothing was adjusted,
     * so on every desktop the line began just BELOW the fold and the first
     * screen said nothing at all.
     *
     * FROM `lg`, THE PHOTOGRAPH TAKES WHAT THE LINE LEAVES. The section is the
     * first screen exactly, and the picture flexes to fill whatever the
     * headline and its action do not use - so both are on screen at any
     * desktop height and any line count, with no figure to keep in sync. Below
     * `lg` the original arrangement stands, now with honest arithmetic: the
     * photograph fills the screen but for 7rem, and the line breaks the fold
     * beneath it.
     */
    <section className="relative lg:mb-16 lg:flex lg:min-h-[calc(100svh-var(--header-height))] lg:flex-col">
      {/*
       * The photograph, edge to edge, with nothing laid over it.
       *
       * `artDirection="orientation"`: this box follows the screen's shape, so a
       * portrait screen of any width - a phone, an upright tablet - gets the
       * portrait photograph, and a landscape one the wide. Switched at a width
       * breakpoint instead, an upright tablet got the 21:9 file stretched 2.6x
       * across a tall box and cropped to the bare wall beside the model.
       *
       * `lg:min-h-64` keeps a usable band on the shortest screens. Below about
       * 620px of height the action is the part that drops under the fold.
       */}
      <div className="relative h-[calc(100svh-var(--header-height)-7rem)] min-h-[30rem] w-full overflow-hidden lg:h-auto lg:min-h-64 lg:flex-1">
        {/*
         * THE SETTLE (DESIGN.md, Motion): the photograph releases from a 4%
         * over-scale over two seconds - the site's one atmospheric movement.
         * It went missing when the hero was rewritten for type on paper, which
         * left its keyframes defined and unused. The frame clips the over-scale,
         * and reduced motion collapses it to the resting state.
         */}
        <div className="animate-hero-settle absolute inset-0">
          <EditorialImage
            id="hero"
            sizes="100vw"
            priority
            hidePlaceholderLabel
            placeholderLabel={imageLabel}
            artDirection="orientation"
          />
        </div>
      </div>

      {/*
       * The line, on paper, immediately under the frame. Aligned to the inline
       * start - the right of this RTL page - and given the full measure rather
       * than being centred, because a centred line at this size reads as a
       * poster caption instead of as the page speaking.
       *
       * THE MEASURE IS 64rem, up from 56rem, so the line sets in two lines at
       * the top size rather than three - it breaks at the comma - and leaves
       * the photograph a further 92px of the first screen.
       *
       * `short:` (under 800px of viewport height) tightens the rhythm and steps
       * the display size down once, from 5.75rem to 4.5rem, so a 768px laptop
       * still sees the line, the action and a real band of photograph.
       */}
      <Container width="wide" className="short:lg:pt-8 pt-10 pb-16 md:pt-14 md:pb-24 lg:pb-8">
        <h1 className="font-display animate-rise-in short:xl:text-6xl max-w-5xl text-4xl leading-[1] font-bold tracking-tight text-balance md:text-6xl xl:text-7xl">
          {title}
        </h1>

        {/*
         * THE ACTION CARRIES WEIGHT NOW. It was 18px under a 92px line - the
         * loudest thing on the screen was a sentence and the quietest was the
         * way in. Still a line of type, not a button (DESIGN.md, the Underlined
         * Action Rule), but stepped up to 28px on desktop with a 2px rule, so
         * it reads as the next thing to do rather than as a caption.
         *
         * `touch-target` gives it a 44px tap area wherever it is drawn smaller.
         */}
        <a
          href={action.href}
          className="animate-rise-in ease-settle decoration-border-strong hover:decoration-foreground touch-target short:lg:mt-5 short:xl:text-xl mt-8 inline-block text-lg font-semibold underline decoration-2 underline-offset-[0.4em] transition-colors duration-(--duration-settle) [animation-delay:120ms] focus-visible:ring-2 focus-visible:ring-(--color-ring) focus-visible:ring-offset-4 focus-visible:ring-offset-(--color-background) focus-visible:outline-none md:text-xl xl:text-2xl"
        >
          {action.label}
        </a>
      </Container>
    </section>
  );
}
