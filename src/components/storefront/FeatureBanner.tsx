import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';

/**
 * A full-width photograph with its statement beneath (D4D.26).
 *
 * The photograph runs edge to edge, square: the hero keeps the page's one
 * curve. The copy and its action stand on the ivory under it, never over it.
 */
export function FeatureBanner({
  id,
  title,
  body,
  action,
  imageLabel,
  assetId = 'bridal',
}: {
  id: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  imageLabel?: string;
  assetId?: EditorialAssetId;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:h-[min(42vw,calc(100svh-var(--header-height)-12rem))] md:min-h-80">
        <EditorialImage
          id={assetId}
          sizes="100vw"
          hidePlaceholderLabel
          placeholderLabel={imageLabel ?? title}
        />
      </div>

      <Container width="wide" className="pb-section md:pb-feature pt-12 md:pt-16">
        <div>
          <div>
            <h2
              id={id}
              className="font-display max-w-3xl text-4xl leading-[1.08] font-normal text-balance md:text-5xl xl:text-6xl"
            >
              {title}
            </h2>
            <p className="text-soft-foreground mt-6 max-w-(--measure-reading) text-base leading-[1.8] font-light text-pretty md:text-lg">
              {body}
            </p>
          </div>
          {action && (
            <div className="mt-9">
              <Button href={action.href} variant="primary">
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
