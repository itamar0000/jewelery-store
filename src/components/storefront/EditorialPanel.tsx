import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import { cn } from '@/components/ui/cn';

/**
 * Image-beside-copy editorial band.
 *
 * Three homepage sections share exactly this shape - lab-grown diamond
 * education (MASTER_SPECIFICATION section 33), custom jewelry (section 17) and
 * bridal (section 30) - so they share one component rather than three
 * near-identical ones. Content comes from the route.
 *
 * `imageSide` alternates the composition down the page so the bands do not read
 * as a stack of identical blocks. It is expressed with `order`, which is
 * direction-agnostic: in RTL the "start" side is the right, and the layout
 * follows the document rather than needing a mirrored variant.
 *
 * Stacks to a single column below `md`, image first - on a phone the picture
 * establishes the subject faster than a heading does.
 */
export interface EditorialPanelProps {
  id: string;
  title: string;
  body: string;
  points?: readonly string[];
  action?: { label: string; href: string };
  imageSide?: 'start' | 'end';
  imageLabel?: string;
  /** Which registry asset sits beside the copy. */
  assetId?: EditorialAssetId;
  tone?: 'default' | 'muted';
  /**
   * The page's closing statement: the finale spacing tier, the line a size up,
   * prose in soft ink, and the action an underlined line rather than a ruled
   * button (DESIGN.md: the Underlined Action Rule). One per page.
   */
  finale?: boolean;
}

export function EditorialPanel({
  id,
  title,
  body,
  points,
  action,
  imageSide = 'start',
  imageLabel,
  assetId,
  tone = 'default',
  finale = false,
}: EditorialPanelProps) {
  return (
    <section aria-labelledby={id} className={cn(tone === 'muted' && 'bg-muted/50')}>
      <Container className={cn('py-section', finale ? 'md:py-finale' : 'md:py-feature')}>
        <div
          className={cn('grid items-center gap-8 md:gap-12 lg:gap-16', assetId && 'md:grid-cols-2')}
        >
          {/*
           * NO PICTURE, NO FRAME. The panel drops to a single column rather
           * than reserving a grey rectangle where a photograph would go.
           *
           * This is the same fix PageHero needed and for the same reason: a
           * tonal stand-in is not a neutral wait. It reads as a broken image
           * to anyone who does not know the plan, and it is the least
           * interesting object on the page occupying half of it. Both callers
           * on the home page pass an asset today, so nothing changes on screen
           * - what changes is that adding a third caller without photography
           * can no longer ship a grey box by accident.
           */}
          {assetId && (
            <div className={cn(imageSide === 'end' && 'md:order-2')}>
              {/*
               * The ratio lives on the WRAPPER, not the image, because
               * EditorialImage fills its parent. Portrait rather than landscape
               * here - a tall frame beside a column of copy reads as a magazine
               * spread, where a wide one reads as a banner with text bolted on.
               */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <EditorialImage
                  id={assetId}
                  sizes="(max-width: 767px) 100vw, 45vw"
                  placeholderLabel={imageLabel ?? title}
                />
              </div>
            </div>
          )}

          <div>
            <h2
              id={id}
              className={cn(
                'font-display text-accent font-bold tracking-tight text-balance',
                finale ? 'text-3xl leading-[1.05] md:text-5xl' : 'text-2xl md:text-3xl',
              )}
            >
              {title}
            </h2>

            {/* Body steps up from `text-sm` to `text-base`. This is the one
                place on the homepage that asks to be READ rather than scanned,
                and 14px Hebrew in a half-width column is a paragraph people
                skip. */}
            <p
              className={cn(
                'mt-5 text-base text-pretty',
                finale ? 'text-soft-foreground md:text-lg' : 'text-muted-foreground',
              )}
            >
              {body}
            </p>

            {points && points.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm">
                    {/* Decorative marker. The list semantics carry the meaning. */}
                    <span
                      aria-hidden="true"
                      className="bg-accent mt-2 size-1 shrink-0 rounded-full"
                    />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {/*
             * ONE ACTION STYLE ON EVERY EDITORIAL BAND: an underlined line of
             * type (DESIGN.md, the Underlined Action Rule). The non-final
             * panels used to carry a ruled box, so the diamonds band offered an
             * outlined button between two bands whose actions were underlines
             * (critique 2026-10-06; D4D.18). The finale keeps its step up in size.
             */}
            {action && (
              <Link
                href={action.href}
                className={cn(
                  'ease-settle decoration-border-strong hover:decoration-foreground touch-target mt-8 inline-block font-semibold underline decoration-2 underline-offset-[0.4em] transition-colors duration-(--duration-settle)',
                  finale ? 'text-lg md:text-xl' : 'text-base md:text-lg',
                )}
              >
                {action.label}
              </Link>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
