import { cn } from './cn';

/**
 * A neutral stand-in for photography that does not exist yet.
 *
 * TEMPORARY - REMOVE WHEN REAL ASSETS LAND.
 *
 * The product, hero and collection photography is TBD
 * (MASTER_SPECIFICATION section 2 and 57, TBD.md). Two things this deliberately
 * is NOT:
 *
 *   - not stock or generated jewellery imagery, which would put invented
 *     product creative in front of a reviewer as though it were the real thing;
 *   - not an empty box, which makes layout review impossible.
 *
 * Instead it renders a calm tonal surface at the correct aspect ratio, so
 * spacing, grid rhythm and card proportions can be judged now. `label` names
 * what belongs there, which doubles as a checklist when the shoot is briefed.
 *
 * It is `aria-hidden` and carries no alt text on purpose: there is no content
 * here to describe, and announcing "placeholder" to a screen-reader user adds
 * nothing. The surrounding card supplies the accessible name.
 */
const RATIOS = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[3/2]',
  wide: 'aspect-[16/9]',
  hero: 'aspect-[4/5] md:aspect-[21/9]',
} as const;

export type PlaceholderRatio = keyof typeof RATIOS;

export function PlaceholderImage({
  ratio = 'square',
  label,
  hideLabel = false,
  className,
}: {
  ratio?: PlaceholderRatio;
  /** What the final asset should show. Shown only at larger sizes. */
  label?: string;
  /**
   * Suppresses the caption chip. Used where the placeholder sits BEHIND text -
   * a page hero - because the centred chip and the centred title land on top of
   * each other and the overlap reads as a rendering bug.
   */
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        // A soft diagonal wash reads as "surface", not as a broken image.
        'from-muted via-card to-accent-muted bg-gradient-to-bl',
        RATIOS[ratio],
        className,
      )}
    >
      {!hideLabel && (
        <span className="border-border-strong/60 text-muted-foreground/70 text-2xs tracking-snug hidden rounded-full border px-3 py-1 sm:inline-block">
          {label ?? 'תמונה'}
        </span>
      )}
    </div>
  );
}
