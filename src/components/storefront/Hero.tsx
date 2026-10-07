import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';

/**
 * The first viewport: the atelier's opening (D4D.26, design A).
 *
 * TWO COLUMNS ON DESKTOP. The line, its sentence and two actions stand on the
 * ivory at the inline start (the right of this RTL page); the photograph fills
 * the other column from the header to the bottom of the screen, its outer
 * lower corner swept by one wide curve. Nothing is laid over the picture, so
 * the type's contrast never depends on what the photographer put behind it.
 *
 * ON A PHONE the photograph comes first, 60% of the screen tall with the same
 * curve, and the line follows beneath it.
 *
 * ONE WORD IN GREEN. The line names the shop's one advantage - made for you,
 * straight from the workshop - and the word that carries it is the only
 * coloured type on the screen.
 */
export function Hero({
  lead,
  emphasis,
  tail,
  body,
  primary,
  secondary,
  imageLabel,
}: {
  /** The line before the emphasised word. */
  lead: string;
  /** The one word set in green. */
  emphasis: string;
  /** The line after it. */
  tail: string;
  body: string;
  primary: { readonly label: string; readonly href: string };
  secondary: { readonly label: string; readonly href: string };
  imageLabel?: string;
}) {
  return (
    <section className="grid lg:min-h-[calc(100svh-var(--header-height))] lg:grid-cols-[1fr_1.15fr]">
      <div className="relative order-first h-[60svh] min-h-[22rem] overflow-hidden rounded-ee-[30vw] lg:order-none lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-[34rem] lg:rounded-ee-[40vw]">
        {/*
         * THE SETTLE: the photograph releases from a 4% over-scale over two
         * seconds - the page's one atmospheric movement. Reduced motion
         * collapses it to the resting state.
         */}
        <div className="animate-hero-settle absolute inset-0">
          <EditorialImage
            id="hero"
            sizes="(width >= 64rem) 54vw, 100vw"
            priority
            hidePlaceholderLabel
            placeholderLabel={imageLabel}
            artDirection="width"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-7 px-6 pt-12 pb-16 md:px-8 lg:col-start-1 lg:row-start-1 lg:py-20 lg:ps-8 lg:pe-[5vw] xl:ps-12">
        <h1 className="font-display animate-rise-in text-[2.75rem] leading-[1.04] font-normal tracking-[-0.01em] text-balance sm:text-6xl lg:text-[clamp(3.5rem,5.6vw,5.75rem)] lg:leading-[1.02]">
          {lead} <span className="text-accent">{emphasis}</span> {tail}
        </h1>
        <p className="text-muted-foreground animate-rise-in max-w-[34ch] text-lg leading-[1.8] font-light [animation-delay:80ms]">
          {body}
        </p>
        <div className="animate-rise-in flex flex-wrap gap-3.5 [animation-delay:160ms]">
          <Button href={primary.href} variant="primary">
            {primary.label}
          </Button>
          <Button href={secondary.href} variant="secondary">
            {secondary.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
