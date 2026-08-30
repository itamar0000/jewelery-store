import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { cn } from '@/components/ui/cn';

/**
 * Homepage hero.
 *
 * THE CREATIVE IS TBD AND IS NOT INVENTED HERE. MASTER_SPECIFICATION section 31
 * records the hero concept as "TBD" with only a direction noted
 * (craftsmanship / setting / close-up product imagery). So this component
 * supplies the ARCHITECTURE and takes the content as props: whoever writes the
 * real headline and supplies the real photograph changes a route, not a
 * component.
 *
 * The default copy passed by the homepage is deliberately descriptive rather
 * than promotional - it states what the store sells. It is not a slogan, and it
 * is marked as provisional at the call site.
 *
 * FLEXIBILITY THE BRIEF ASKS FOR:
 *   - `layout="full"` bleeds edge to edge; `layout="contained"` sits inside the
 *     page gutter with a rounded frame;
 *   - one or two CTAs, or none;
 *   - `subtitle` optional;
 *   - the image area switches aspect ratio between mobile and desktop through
 *     the `hero` ratio, so a tall mobile crop and a wide desktop crop are both
 *     supported without a second component.
 *
 * TEXT OVER IMAGE: the copy sits on a scrim rather than directly on the
 * picture. Contrast against unknown future photography cannot be guaranteed
 * any other way, and the accessibility target is a legal determination that is
 * still open (ARCHITECTURE section 3.5).
 */
export interface HeroAction {
  readonly label: string;
  readonly href: string;
}

export function Hero({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  layout = 'full',
  imageLabel,
}: {
  title: string;
  subtitle?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  layout?: 'full' | 'contained';
  imageLabel?: string;
}) {
  const content = (
    <div className={cn('relative isolate overflow-hidden', layout === 'contained' && 'rounded-lg')}>
      <PlaceholderImage ratio="hero" label={imageLabel ?? 'תמונת נושא'} hideLabel />

      {/*
       * Scrim, strongest behind the text.
       *
       * `to-l` is a PHYSICAL direction because CSS gradients have no logical
       * equivalent. It is correct here because the storefront is RTL-only -
       * there is no locale switcher and no second locale planned
       * (src/lib/config/site.ts) - so inline-start is always the right edge.
       * If an LTR locale is ever added, this one class becomes `to-r`.
       */}
      <div
        aria-hidden="true"
        className="from-background/85 via-background/45 absolute inset-0 bg-linear-to-l to-transparent"
      />

      <div className="absolute inset-0 flex items-center">
        <Container width={layout === 'full' ? 'wide' : 'content'}>
          <div className="max-w-lg">
            <h1 className="text-3xl tracking-tight text-balance md:text-4xl">{title}</h1>

            {subtitle && (
              <p className="text-muted-foreground mt-4 text-base text-pretty">{subtitle}</p>
            )}

            {(primaryAction ?? secondaryAction) && (
              <div className="mt-8 flex flex-wrap gap-3">
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
      </div>
    </div>
  );

  return layout === 'full' ? content : <Container className="pt-6">{content}</Container>;
}
