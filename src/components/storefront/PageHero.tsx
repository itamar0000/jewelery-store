import { Breadcrumbs, type Crumb } from '@/components/category/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

/**
 * The banner every inner page opens with.
 *
 * Title and introduction sit CENTRED over an image band, rather than flush to
 * the inline-start edge. That is a deliberate change from the first pass: a
 * short Hebrew title hard against the right margin with a wide empty page
 * beside it reads as unfinished rather than as restraint, and the effect is
 * worse in RTL because the eye starts at the heavy edge.
 *
 * Centring is applied HERE and not everywhere. Where it is wrong, it stays
 * left alone:
 *   - breadcrumbs stay start-aligned; a centred trail is unreadable;
 *   - the product page title stays start-aligned, because it heads a column of
 *     form controls that are themselves start-aligned;
 *   - footer columns and editorial two-column bands stay start-aligned, where
 *     centring short text inside a narrow column looks accidental.
 *
 * The image is the same tonal PlaceholderImage used everywhere else - the
 * photography is still TBD, and this is a frame waiting for it, not invented
 * creative. Text sits on a scrim so it stays legible against whatever
 * eventually lands here.
 */
export function PageHero({
  title,
  description,
  trail,
  imageLabel,
}: {
  title: string;
  description?: string;
  trail?: readonly Crumb[];
  imageLabel?: string;
}) {
  return (
    <section className="relative isolate">
      <PlaceholderImage
        ratio="wide"
        label={imageLabel ?? title}
        hideLabel
        className="max-h-80 min-h-60 w-full"
      />

      {/* Vertical scrim: direction-agnostic, unlike the homepage hero, because
          the content is centred rather than pushed to one side. */}
      <div
        aria-hidden="true"
        className="from-background/90 via-background/55 absolute inset-0 bg-gradient-to-t to-transparent"
      />

      <div className="absolute inset-0 flex flex-col justify-center">
        <Container>
          {trail && (
            <div className="mb-4 flex justify-center">
              <Breadcrumbs trail={trail} />
            </div>
          )}

          <h1 className="font-display text-center text-3xl tracking-tight text-balance md:text-4xl">
            {title}
          </h1>

          {description && (
            <p className="text-muted-foreground mx-auto mt-3 max-w-(--container-prose) text-center text-sm text-pretty">
              {description}
            </p>
          )}
        </Container>
      </div>
    </section>
  );
}
