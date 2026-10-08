import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { cn } from '@/components/ui/cn';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';

/**
 * The first viewport: the atelier's opening (D4D.26, design A).
 *
 * TWO COLUMNS ON DESKTOP. The line, its sentence and two actions stand on the
 * ivory at the inline start (the right of this RTL page); the photograph fills
 * the other column from the header to the bottom of the screen, its outer
 * lower corner swept by one wide curve. Nothing is laid over the picture, so
 * the type's contrast never depends on what the photographer put behind it.
 *
 * ON A PHONE the photograph comes first, 46% of the screen tall with the same
 * curve, and the line and both actions follow beneath it - the green action
 * inside the first screen of an ordinary phone (D4D.27).
 *
 * ONE WORD IN GREEN. The line names the shop's one advantage - made for you,
 * straight from the workshop - and the word that carries it is the only
 * coloured type on the screen.
 *
 * A DEPARTMENT OPENING (D4D.34) reuses the same grammar on the forest-green
 * field: `tone="field"` sets the copy in ivory with the emphasis in pale
 * green, and `compact` stops it short of the full screen so the department's
 * own pieces begin within the first scroll.
 */
export function Hero({
  lead,
  emphasis,
  tail,
  body,
  primary,
  secondary,
  imageLabel,
  assetId = 'hero',
  tone = 'default',
  compact = false,
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
  assetId?: EditorialAssetId;
  tone?: 'default' | 'field';
  compact?: boolean;
}) {
  const field = tone === 'field';

  return (
    <section
      className={cn(
        'grid lg:grid-cols-[1fr_1.15fr]',
        compact
          ? 'lg:min-h-[min(44rem,calc(86svh-var(--header-height)))]'
          : 'lg:min-h-[calc(100svh-var(--header-height))]',
        field && 'bg-field text-field-foreground [--focus-ring:var(--color-field-foreground)]',
      )}
    >
      <div className="relative order-first h-[46svh] min-h-[19rem] overflow-hidden rounded-ee-[30vw] lg:order-none lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-[34rem] lg:rounded-ee-[40vw]">
        {/*
         * THE SETTLE: the photograph releases from a 4% over-scale over two
         * seconds - the page's one atmospheric movement. Reduced motion
         * collapses it to the resting state.
         */}
        <div className="animate-hero-settle absolute inset-0">
          <EditorialImage
            id={assetId}
            sizes="(width >= 64rem) 54vw, 100vw"
            priority
            hidePlaceholderLabel
            placeholderLabel={imageLabel}
            artDirection="width"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-5 px-6 pt-8 pb-14 md:px-8 lg:col-start-1 lg:row-start-1 lg:gap-7 lg:py-20 lg:ps-8 lg:pe-[5vw] xl:ps-12">
        <h1 className="font-display animate-rise-in text-[2.5rem] leading-[1.06] font-normal tracking-[-0.01em] text-balance sm:text-6xl lg:text-[clamp(3.5rem,5.6vw,5.75rem)] lg:leading-[1.02]">
          {lead} <span className={field ? 'text-field-muted' : 'text-accent'}>{emphasis}</span>
          {tail ? ` ${tail}` : null}
        </h1>
        <p
          className={cn(
            'animate-rise-in max-w-[34ch] text-base leading-[1.75] font-light [animation-delay:80ms] sm:text-lg sm:leading-[1.8]',
            field ? 'text-field-foreground/85' : 'text-muted-foreground',
          )}
        >
          {body}
        </p>
        <div className="animate-rise-in flex flex-col gap-3 [animation-delay:160ms] sm:flex-row sm:flex-wrap sm:gap-3.5">
          <Button
            href={primary.href}
            variant={field ? 'inverse' : 'primary'}
            className="w-full sm:w-auto"
          >
            {primary.label}
          </Button>
          <Button href={secondary.href} variant="secondary" className="w-full sm:w-auto">
            {secondary.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
