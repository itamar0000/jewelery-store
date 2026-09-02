import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
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
  subtitle,
  primaryAction,
  secondaryAction,
  imageLabel,
  tone = 'dark',
  align = 'start',
  height = 'full',
}: {
  title: string;
  subtitle?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  imageLabel?: string;
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
        <PlaceholderImage ratio="fill" label={imageLabel} hideLabel className="h-full w-full" />
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
          <h1 className="font-display text-4xl tracking-tight text-balance md:text-5xl xl:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p
              className={cn(
                'mt-6 max-w-md text-base text-pretty',
                align === 'center' && 'mx-auto',
                light ? 'text-background/80' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          )}

          {(primaryAction ?? secondaryAction) && (
            <div
              className={cn('mt-10 flex flex-wrap gap-3', align === 'center' && 'justify-center')}
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
