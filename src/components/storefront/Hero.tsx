import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import { cn } from '@/components/ui/cn';

/**
 * Homepage hero.
 *
 * THE CREATIVE IS TBD AND IS NOT INVENTED HERE. MASTER_SPECIFICATION section 31
 * records the hero concept as "TBD" with only a direction noted
 * (craftsmanship / setting / close-up product imagery). This component supplies
 * the ARCHITECTURE and takes the content as props: whoever writes the real
 * headline and supplies the real photograph changes a route, not a component.
 *
 * REBUILT TO BE IMAGE-LED. The previous version sized itself from a fixed
 * `21/9` crop and laid the copy over the resulting band. Two things were wrong
 * with that once the page was reviewed as rendered output:
 *
 *   - the band was a horizontal STRIPE rather than a first screen. It never
 *     filled the viewport, so the page opened on a letterboxed banner with
 *     content already crowding underneath it;
 *   - the aspect ratio, not the viewport, decided the height. On a wide
 *     monitor that produced a short, wide slab; the hero got less commanding
 *     the bigger the screen, which is exactly backwards.
 *
 * It is now a VIEWPORT-SIZED SECTION with the image filling it. Height is
 * driven by `min-h`, the picture covers whatever box that produces, and the
 * crop adapts instead of dictating. That is what lets a real photograph
 * dominate the first screen at every width.
 *
 * FLEXIBILITY THE BRIEF ASKS FOR:
 *   - `tone` switches between dark copy on a light scrim and light copy on a
 *     dark one, so the same component works over a high-key packshot or a
 *     moody campaign frame without a rewrite;
 *   - `align` puts the copy at the inline start or centres it;
 *   - one CTA, two, or none; `subtitle` optional;
 *   - `height` trades a full screen against a shorter editorial band.
 *
 * TEXT SITS ON A SCRIM, never directly on the picture. Contrast against
 * photography that does not exist yet cannot be guaranteed any other way, and
 * the accessibility target is still an open legal determination
 * (ARCHITECTURE section 3.5).
 */
export interface HeroAction {
  readonly label: string;
  readonly href: string;
}

const HEIGHTS = {
  /** Dominates the first screen. The default, and the campaign treatment. */
  full: 'min-h-[32rem] md:min-h-[calc(100svh-8.125rem)] md:max-h-[52rem]',
  /** A shorter editorial band, for pages that are not the homepage. */
  band: 'min-h-[24rem] md:min-h-[32rem]',
} as const;

export function Hero({
  title,
  displayLine,
  subtitle,
  primaryAction,
  secondaryAction,
  imageLabel,
  assetId = 'hero',
  tone = 'dark',
  align = 'start',
  height = 'full',
}: {
  title: string;
  /**
   * A short LATIN campaign line, set above the Hebrew headline in the display
   * serif. Optional, and omitted entirely on pages that have nothing to say
   * in this register.
   *
   * WHY THE SLOT EXISTS AT ALL. `--font-display` resolves to a Latin-only face
   * backed by the Hebrew face (src/lib/fonts.ts), so marking a Hebrew heading
   * `font-display` renders it in Heebo exactly as before - the token does
   * nothing until Latin glyphs pass through it. This is the slot where they
   * do.
   *
   * IT IS A SEPARATE ELEMENT RATHER THAN PART OF THE HEADLINE, and that is a
   * typographic requirement rather than a preference. Cormorant has a much
   * smaller x-height than Heebo, so the two faces do not read as the same size
   * at the same `font-size`; mixed inside one line they look like a rendering
   * fault. Given its own line at its own size, the pairing is deliberate.
   *
   * IT IS NOT A TRANSLATION OF THE HEADLINE. It sits outside the heading
   * element and is not announced as one - a screen-reader user gets the Hebrew
   * `h1`, which is the real title of the page. Putting an English restatement
   * in the accessibility tree of a Hebrew store would be noise, not access.
   */
  displayLine?: string;
  subtitle?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  imageLabel?: string;
  /** Which registry asset fills the plane. See lib/content/editorial-assets. */
  assetId?: EditorialAssetId;
  /** `dark` = dark copy on a light scrim. `light` = light copy on a dark one. */
  tone?: 'dark' | 'light';
  align?: 'start' | 'center';
  height?: keyof typeof HEIGHTS;
}) {
  const light = tone === 'light';

  return (
    <section className={cn('relative isolate flex items-center overflow-hidden', HEIGHTS[height])}>
      {/*
       * The image is a background LAYER rather than a sibling that sets the
       * height. `inset-0` plus the section's own min-height is what makes the
       * viewport the authority on scale.
       */}
      <div className="absolute inset-0 -z-20">
        {/*
         * PRIORITY. This is the largest contentful paint on the homepage, and
         * the only image on the site that opts out of lazy loading.
         *
         * `100vw` because the hero is full-bleed at every width - anything
         * narrower would make the browser pick a source too small and upscale
         * it across the whole first screen.
         */}
        {/*
         * The settle wraps the image rather than being applied to it, so the
         * animation owns `transform` outright. EditorialImage's own classes
         * stay free for the art-directed focal point, which is also a
         * positioning concern and would otherwise be competing for the same
         * property.
         */}
        <div className="animate-hero-settle size-full">
          <EditorialImage
            id={assetId}
            sizes="100vw"
            priority
            hidePlaceholderLabel
            placeholderLabel={imageLabel}
          />
        </div>
      </div>

      {/*
       * Scrim. `to-l` is a PHYSICAL direction because CSS gradients have no
       * logical equivalent; it is correct here because the storefront is
       * RTL-only (src/lib/config/site.ts), so inline-start is always the right
       * edge. A centred hero gets a vertical wash instead, because a
       * side-weighted gradient under centred text darkens one shoulder only.
       */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10',
          align === 'center'
            ? light
              ? 'from-foreground/75 via-foreground/45 bg-gradient-to-t to-transparent'
              : 'from-background/85 via-background/55 bg-gradient-to-t to-transparent'
            : light
              ? 'from-foreground/80 via-foreground/40 bg-linear-to-l to-transparent'
              : 'from-background/90 via-background/50 bg-linear-to-l to-transparent',
        )}
      />

      <Container width="wide" className="py-16">
        <div
          className={cn(
            'max-w-xl',
            align === 'center' && 'mx-auto max-w-2xl text-center',
            light && 'text-background',
          )}
        >
          {/*
           * THE ONE PLACE ON THE SITE SET IN LATIN, ON PURPOSE.
           *
           * `tracking-[0.14em]` is an arbitrary value rather than a token, and
           * it has to be: the tracking scale in tokens.css runs tight-to-normal
           * only, because positive letter-spacing breaks Hebrew glyph joins and
           * is never correct for it. That rule is about HEBREW. This element is
           * Latin by contract, where wide tracking on a light serif is the
           * whole effect - so it reaches past the scale deliberately, and the
           * scale stays honest for everything else.
           *
           * `font-light` picks Cormorant's 300. At 400 the same line reads as a
           * wedding invitation, which section 2 rules out.
           */}
          {displayLine && (
            <p
              aria-hidden="true"
              className={cn(
                'font-display animate-rise-in mb-4 text-xl font-light tracking-[0.14em] uppercase md:text-2xl',
                light ? 'text-background/90' : 'text-foreground/80',
              )}
            >
              {displayLine}
            </p>
          )}

          {/*
           * THE STAGGER.
           *
           * Each block enters a beat after the one above it, so the first
           * screen assembles top-down instead of appearing all at once. Ninety
           * milliseconds is small enough that nobody watches it happen and
           * large enough that the order is felt.
           *
           * The delays are arbitrary values rather than tokens because they are
           * a composition local to this one component - the RELATIONSHIP
           * between these four lines - not a site-wide design value. A
           * `--stagger-2` token would imply other components should share it,
           * and they should not.
           *
           * All four inherit `both` from `--animate-rise-in`, without which a
           * delayed element paints at its end state first and the stagger
           * flashes. See the token.
           */}
          <h1 className="font-display animate-rise-in text-4xl tracking-tight text-balance [animation-delay:90ms] md:text-5xl xl:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p
              className={cn(
                'animate-rise-in mt-6 max-w-md text-base text-pretty [animation-delay:180ms]',
                align === 'center' && 'mx-auto',
                light ? 'text-background/80' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          )}

          {(primaryAction ?? secondaryAction) && (
            <div
              className={cn(
                'animate-rise-in mt-10 flex flex-wrap gap-3 [animation-delay:270ms]',
                align === 'center' && 'justify-center',
              )}
            >
              {primaryAction && (
                <Button href={primaryAction.href} variant="primary" size="lg">
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button href={secondaryAction.href} variant="secondary" size="lg">
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
