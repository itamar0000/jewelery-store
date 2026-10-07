import { getImageProps } from 'next/image';
import type { CSSProperties } from 'react';

import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { cn } from '@/components/ui/cn';
import { resolveEditorialAsset, type EditorialAssetId } from '@/lib/content/editorial-assets';

/**
 * Renders one editorial image, or an honest stand-in for it.
 *
 * THE ONE PLACE EDITORIAL IMAGERY IS RENDERED. Sections name an asset by id and
 * describe the box; everything else - the file path, the crop, the alt text,
 * the focal point, the fallback - is decided here and in the registry. No
 * section contains an image path, and none of them re-solve cropping with
 * bespoke CSS.
 *
 * IT FILLS ITS PARENT. The caller owns the aspect ratio, because the right
 * shape is a compositional decision that differs per section - a full-viewport
 * hero, a 4:5 category tile, a campaign banner. The parent must be positioned;
 * that is the only contract.
 *
 * NO LAYOUT SHIFT. The image is absolutely positioned and never contributes to
 * layout, so the box is the same size before and after the bytes arrive. That
 * also means no intrinsic dimensions are needed - which matters, because none
 * of these files exist yet and hard-coding sizes for photographs nobody has
 * shot would be inventing facts.
 *
 * WHEN THE FILE IS MISSING it renders the development placeholder instead of a
 * broken image. That is the normal state today: every editorial asset is a
 * pending file drop.
 */
export interface EditorialImageProps {
  readonly id: EditorialAssetId;
  /**
   * `sizes` for the responsive srcset. Get this right per section: it is what
   * stops a phone downloading a 2560px hero.
   */
  readonly sizes: string;
  /**
   * Above the fold. Exactly one image per page should set it - the hero - so
   * the largest contentful paint is not queued behind lazy images.
   */
  readonly priority?: boolean;
  /** Caption on the placeholder. Names what belongs there while it is missing. */
  readonly placeholderLabel?: string;
  /** Suppresses the placeholder caption where text sits over the image. */
  readonly hidePlaceholderLabel?: boolean;
  /**
   * What decides between the phone crop and the desktop crop, for an asset
   * that has both. See ART_DIRECTION.
   */
  readonly artDirection?: ArtDirection;
  readonly className?: string;
}

export type ArtDirection = 'width' | 'orientation' | 'portrait';

/**
 * Above the library default of 75.
 *
 * These are large, smooth, low-contrast photographs - skin, cream backgrounds,
 * soft gradients - which is exactly the content that bands visibly at 75 across
 * a full-bleed hero. Declared in next.config.ts under `images.qualities`,
 * without which the optimizer refuses it.
 */
const QUALITY = 82;

/**
 * When the phone crop is used, and the focal-point rule that goes with it.
 *
 * Each pair MUST agree: the query picks the file and the class picks the
 * matching focal point (globals.css), so a mismatch would crop one photograph
 * to the other's focal point in the sliver between them.
 *
 * `width` - below `--breakpoint-md` (48rem), which is what `md:` compiles to.
 * Right for a box whose shape is fixed by the section, like the bridal banner.
 *
 * `orientation` - in a portrait viewport. Right for a box that follows the
 * viewport's own shape, which is the hero: a portrait tablet gives it a tall
 * box, and switching by width served it the 21:9 desktop file - cropped to the
 * empty wall beside the model and stretched 2.6x. Orientation gives every
 * portrait screen the portrait photograph and every landscape one the wide.
 */
const ART_DIRECTION: Readonly<Record<ArtDirection, { media: string; focalClass: string }>> = {
  width: { media: '(width < 48rem)', focalClass: 'editorial-focal' },
  orientation: { media: '(orientation: portrait)', focalClass: 'editorial-focal-orientation' },
  // The portrait crop everywhere: for a box that is upright at every size.
  portrait: { media: 'all', focalClass: 'editorial-focal-portrait' },
};

export function EditorialImage({
  id,
  sizes,
  priority = false,
  placeholderLabel,
  hidePlaceholderLabel = false,
  artDirection = 'width',
  className,
}: EditorialImageProps) {
  const { media, focalClass } = ART_DIRECTION[artDirection];
  const resolved = resolveEditorialAsset(id);

  if (!resolved.available) {
    return (
      <PlaceholderImage
        ratio="fill"
        marker="Editorial image placeholder"
        label={placeholderLabel ?? resolved.asset.brief}
        hideLabel={hidePlaceholderLabel}
        className={className}
      />
    );
  }

  const shared = { alt: resolved.alt, fill: true as const, sizes, quality: QUALITY };

  // `alt` is pulled out of the spread and passed explicitly. It reads better at
  // the element, and it is the one prop worth being unable to lose silently.
  const { alt, ...desktop } = getImageProps({ ...shared, src: resolved.desktopSrc }).props;
  const mobile = resolved.mobileSrc
    ? getImageProps({ ...shared, src: resolved.mobileSrc }).props
    : null;

  /*
   * FOCAL POINTS AS CUSTOM PROPERTIES, not as an inline `object-position`.
   *
   * A phone crop and a desktop crop are different photographs and need
   * different focal points, but they are ONE <img> - the browser picks the
   * source - and an inline style cannot hold two values behind a media query.
   * The values stay data from the registry; globals.css decides which applies.
   */
  const focal = {
    '--editorial-focal-desktop': resolved.objectPosition,
    '--editorial-focal-mobile': resolved.mobileObjectPosition,
  } as CSSProperties;

  return (
    /*
     * ART DIRECTION, not just resizing.
     *
     * Where a separate phone crop exists it is a DIFFERENT PICTURE - framed
     * tighter, composed for a portrait box - so swapping it is not something
     * `srcset` can do on its own. <picture> is what does it, and unlike two
     * elements toggled by `md:hidden` it downloads exactly ONE of them.
     */
    <picture>
      {mobile && <source media={media} srcSet={mobile.srcSet} sizes={sizes} />}
      <img
        alt={alt}
        {...desktop}
        /*
         * `priority` here is `fetchPriority` + eager loading, WITHOUT the
         * preload link `next/image` would emit. A preload cannot express
         * "whichever source <picture> chooses", so `next/image`'s own priority
         * handling preloads both crops and downloads the hero twice - which
         * costs far more than the preload saves for an image that is already
         * in the first kilobytes of the HTML.
         */
        fetchPriority={priority ? 'high' : undefined}
        loading={priority ? 'eager' : 'lazy'}
        style={{ ...desktop.style, objectFit: 'cover', ...focal }}
        className={cn(focalClass, className)}
      />
    </picture>
  );
}
