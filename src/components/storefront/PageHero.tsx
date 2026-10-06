import { Breadcrumbs, type Crumb } from '@/components/category/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';

/**
 * The header every inner page opens with.
 *
 * IT HAS NO PICTURE UNLESS ONE REALLY EXISTS, and that is the change. This
 * component used to render a tonal `PlaceholderImage` unconditionally, with a
 * marker reading "Page header placeholder" and the copy laid over a scrim. The
 * reasoning at the time was sound - the photography was still to come and this
 * was a frame waiting for it - but the photography never came for these routes,
 * and the frame shipped. Contact, custom, FAQ, search, not-found and every
 * collection page opened on a grey rectangle.
 *
 * A grey rectangle is worse than no rectangle. It is not a neutral wait: it
 * reads as a broken image to anyone who does not know the plan, it pushes the
 * real content below the fold, and it puts the least interesting object on the
 * page in the most prominent position. So the default is now typographic - the
 * title at size on paper, over a rule - which is a finished state rather than a
 * pending one, and it suits a world whose whole argument is type and space.
 *
 * `assetId` IS THE ESCAPE HATCH. A page that genuinely has a photograph passes
 * one and gets a real image band. That is how the collection pages use the
 * collection stills. A page with nothing to show simply does not ask.
 *
 * ALIGNMENT CHANGED WITH IT. The old header centred its title because a short
 * Hebrew line hard against the right margin, with a wide empty page beside it,
 * read as unfinished. At the size the title is set now it reads as intent, and
 * it matches the home page, where the line also begins at the inline start.
 */
export function PageHero({
  title,
  description,
  trail,
  imageLabel,
  assetId,
  size = 'headline',
}: {
  title: string;
  description?: string;
  trail?: readonly Crumb[];
  imageLabel?: string;
  /** Only when a real photograph exists for this page. */
  assetId?: EditorialAssetId;
  /**
   * `headline`, the inner-page title at full size, for a page that is a place
   * - a collection, the FAQ, custom work. `compact` takes the product page's
   * smaller h1 for a page that is a sentence - search, the 404 - where a 72px
   * title over one line of text was the largest thing on the page by far.
   */
  size?: 'headline' | 'compact';
}) {
  return (
    <section>
      {assetId && (
        <div className="relative aspect-[21/9] max-h-[26rem] w-full overflow-hidden">
          <EditorialImage
            id={assetId}
            sizes="100vw"
            priority
            hidePlaceholderLabel
            placeholderLabel={imageLabel ?? title}
          />
        </div>
      )}

      <Container className="pt-10 pb-8 md:pt-14 md:pb-10">
        {trail && (
          <div className="mb-6">
            <Breadcrumbs trail={trail} />
          </div>
        )}

        <h1
          className={cn(
            'font-display leading-[1.05] font-bold tracking-tight text-balance',
            size === 'compact' ? 'text-3xl xl:text-4xl' : 'text-3xl md:text-5xl xl:text-6xl',
          )}
        >
          {title}
        </h1>

        {description && (
          <p className="text-muted-foreground mt-5 max-w-(--container-prose) text-base text-pretty">
            {description}
          </p>
        )}
      </Container>

      {/* The rule closes the header. With no image band and no scrim, this is
          what separates the page's title from the page's content. */}
      <Container>
        <div className="border-border border-t" />
      </Container>
    </section>
  );
}
