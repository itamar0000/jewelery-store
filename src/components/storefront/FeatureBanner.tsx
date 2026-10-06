import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';

/**
 * A full-bleed photograph with its line set on the paper beneath it - the
 * hero's grammar, used once more down the page.
 *
 * WHY THE HERO'S GRAMMAR. Bridal is the one occasion the catalogue is built
 * around, and it sat seventh on the homepage in a hairline box: a framed
 * picture at a third of the width, a 30px heading, a secondary button - the
 * same weight as the FAQ list after it. It now opens edge to edge like the
 * first screen does, with nothing laid over the photograph, the display line
 * starting where the image ends and the action an underlined line of type
 * (DESIGN.md, the First Viewport Rule and the Underlined Action Rule). Type on
 * paper, so its contrast never depends on the photograph behind it.
 *
 * THE CROP FOLLOWS THE SCREEN. The bridal master has a separately art-directed
 * portrait file; below 48rem the band is a 4:5 portrait, and from there a wide
 * band whose height is capped so the line beneath it still shares the screen.
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
    <section aria-labelledby={id} className="pt-tight md:pt-section">
      <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:h-[min(42vw,calc(100svh-var(--header-height)-14rem))] md:min-h-80">
        <EditorialImage
          id={assetId}
          sizes="100vw"
          hidePlaceholderLabel
          placeholderLabel={imageLabel ?? title}
        />
      </div>

      <Container width="wide" className="pb-section md:pb-feature pt-10 md:pt-14">
        <h2
          id={id}
          className="font-display max-w-4xl text-4xl leading-[1] font-bold tracking-tight text-balance md:text-5xl xl:text-6xl"
        >
          {title}
        </h2>

        <p className="text-soft-foreground mt-6 max-w-(--measure-reading) text-base text-pretty md:text-lg">
          {body}
        </p>

        {action && (
          <Link
            href={action.href}
            className="ease-settle decoration-border-strong hover:decoration-foreground touch-target mt-8 inline-block text-lg font-semibold underline decoration-2 underline-offset-[0.4em] transition-colors duration-(--duration-settle) md:text-xl"
          >
            {action.label}
          </Link>
        )}
      </Container>
    </section>
  );
}
