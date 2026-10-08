import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import { cn } from '@/components/ui/cn';

/**
 * Image-beside-copy editorial band, the atelier's split (D4D.26, design A).
 *
 * EDGE TO EDGE, TWO HALVES. The photograph fills one half of the screen's
 * width and the full height of the band; the copy stands in the other half on
 * a field of its own. Nothing is laid over the photograph.
 *
 * THREE TONES. `default` sets the copy on the page's ivory; `muted` on the
 * recessed ivory, to pace a run of bands; `field` on the forest green with
 * ivory type - the page's one colour field, for the closing statement. Every
 * colour on the field is named for it (field-foreground, field-muted), since
 * the page's ink and green would disappear there.
 *
 * The action is a pill: green on ivory, ivory on green.
 */
export interface EditorialPanelProps {
  id: string;
  title: string;
  body: string;
  /** Short facts set as a list under the body. */
  points?: readonly string[];
  action?: { label: string; href: string };
  /** A help or reference link takes the outlined pill; the default is the primary. */
  actionVariant?: 'primary' | 'secondary';
  /** Which half the photograph takes, in reading order. */
  imageSide?: 'start' | 'end';
  imageLabel?: string;
  assetId?: EditorialAssetId;
  tone?: 'default' | 'muted' | 'field';
}

export function EditorialPanel({
  id,
  title,
  body,
  points,
  action,
  actionVariant = 'primary',
  imageSide = 'start',
  imageLabel,
  assetId,
  tone = 'default',
}: EditorialPanelProps) {
  const field = tone === 'field';

  return (
    <section
      aria-labelledby={id}
      className={cn('grid md:grid-cols-2', tone === 'muted' && 'bg-muted')}
    >
      {assetId && (
        <div
          className={cn(
            'relative aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[34rem]',
            imageSide === 'end' && 'md:order-2',
          )}
        >
          <EditorialImage
            id={assetId}
            sizes="(width >= 48rem) 50vw, 100vw"
            placeholderLabel={imageLabel ?? title}
          />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col justify-center px-6 py-16 sm:px-10 md:px-[6vw] md:py-24',
          field && 'bg-field text-field-foreground [--focus-ring:var(--color-field-foreground)]',
        )}
      >
        <h2
          id={id}
          className="font-display max-w-[16ch] text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
        >
          {title}
        </h2>

        <p
          className={cn(
            'mt-6 max-w-[40ch] text-base leading-[1.8] font-light text-pretty md:text-lg',
            field ? 'text-field-foreground/90' : 'text-soft-foreground',
          )}
        >
          {body}
        </p>

        {points && points.length > 0 && (
          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-[0.9375rem]">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-[0.6em] size-1.5 shrink-0 rounded-full',
                    field ? 'bg-field-muted' : 'bg-accent',
                  )}
                />
                <span className={field ? 'text-field-foreground/90' : 'text-soft-foreground'}>
                  {point}
                </span>
              </li>
            ))}
          </ul>
        )}

        {action && (
          <div className="mt-9">
            <Button href={action.href} variant={field ? 'inverse' : actionVariant}>
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
