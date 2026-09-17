import Image from 'next/image';

import {
  IMAGE_RATIOS,
  PlaceholderImage,
  type PlaceholderRatio,
} from '@/components/ui/PlaceholderImage';
import { cn } from '@/components/ui/cn';

/**
 * One product photograph, or the stand-in for one that has not been delivered.
 *
 * WHY THIS EXISTS AT ALL. The gallery and the catalog card both used to render
 * `PlaceholderImage` unconditionally. That was correct while no storage
 * provider was configured and `ResolvedImage.url` was always `null` - but it
 * hard-coded a temporary condition into two components, so the day real
 * photography landed in the bucket, nothing displayed it. The rows were right,
 * the objects were in storage, and the site still showed grey boxes.
 *
 * So the branch belongs in ONE place, keyed on the only thing that actually
 * decides it: whether this image resolved to a URL.
 *
 * THE BOX IS THE SAME EITHER WAY. Both branches take their aspect class from
 * the shared `IMAGE_RATIOS`, so a photograph occupies exactly the shape its
 * placeholder did. That is what stops a catalog grid reflowing as images
 * arrive - the layout is settled before any byte is fetched.
 *
 * `fill` RATHER THAN WIDTH AND HEIGHT. A product shot is cropped to the box by
 * `object-cover`, and the box is decided by the layout rather than by the
 * file. Passing intrinsic dimensions would let an off-standard upload change
 * the grid; filling a ratio box means the catalog holds its shape no matter
 * what someone uploads.
 */
export function ProductPhoto({
  url,
  alt,
  ratio,
  sizes,
  priority = false,
  className,
  imageClassName,
}: {
  /** Resolved public URL, or `null` while the photograph is undelivered. */
  url: string | null;
  /**
   * Hebrew alt text. Required by the schema, and used as the placeholder's
   * caption too, so a missing photograph still says what belongs there.
   */
  alt: string;
  ratio: PlaceholderRatio;
  /** Widths the browser should choose between. Same contract as `next/image`. */
  sizes: string;
  priority?: boolean;
  /** Applied to the aspect box, in both branches. */
  className?: string;
  /** Applied to the <img> only. Hover transforms belong here. */
  imageClassName?: string;
}) {
  if (url === null) {
    return <PlaceholderImage ratio={ratio} label={alt} className={className} />;
  }

  return (
    <div className={cn('relative overflow-hidden', IMAGE_RATIOS[ratio], className)}>
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', imageClassName)}
      />
    </div>
  );
}
