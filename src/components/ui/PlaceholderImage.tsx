import { cn } from './cn';

/**
 * A stand-in for photography that does not exist yet.
 *
 * TEMPORARY - DELETE THIS FILE WHEN REAL ASSETS LAND, along with the
 * `--ref-placeholder*` tokens.
 *
 * WHY IT LOOKS THE WAY IT DOES NOW.
 *
 * The first version rendered a cream-to-white wash - a surface almost exactly
 * the tone of the page behind it. The intent was restraint. The effect, once
 * the whole storefront was reviewed as rendered pages rather than as code, was
 * that every image on the site read as blank paper. The homepage looked like a
 * wireframe with generous margins, and its real problem - that it had no
 * visual anchors - was indistinguishable from "the photography is pending".
 *
 * A photograph is the densest object on a page. A stand-in that is not dense
 * does not stand in for anything: it makes the layout under review a different
 * layout from the one that will ship, and it hides exactly the compositional
 * faults this pass exists to find.
 *
 * So this is now a clearly visible neutral media frame:
 *
 *   - a mid-tone surface that holds its own against the page;
 *   - a hairline inset so the frame's edges are legible against any neighbour;
 *   - a caption naming what belongs there, which doubles as the shot list when
 *     the photography is briefed.
 *
 * It is deliberately NOT stock or generated jewellery imagery. Inventing
 * product creative would put fake goods in front of a reviewer as though they
 * were real, and it would flatter the design with photography nobody has
 * commissioned. Neutral and obviously provisional is the honest option.
 *
 * It stays `aria-hidden` with no alt text: there is no content here to
 * describe, and announcing "placeholder" to a screen-reader user adds nothing.
 * The surrounding card or section supplies the accessible name.
 */
const RATIOS = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  /** Taller than portrait. Editorial category tiles and campaign panels. */
  tall: 'aspect-[3/4]',
  landscape: 'aspect-[3/2]',
  wide: 'aspect-[16/9]',
  /** Tall crop on a phone, cinematic on a desktop. */
  hero: 'aspect-[4/5] md:aspect-[21/9]',
  /** Fills whatever box the caller sizes. For full-viewport heroes. */
  fill: 'h-full w-full',
} as const;

export type PlaceholderRatio = keyof typeof RATIOS;

export function PlaceholderImage({
  ratio = 'square',
  label,
  hideLabel = false,
  className,
}: {
  ratio?: PlaceholderRatio;
  /** What the final asset should show. Shown only where there is room. */
  label?: string;
  /**
   * Suppresses the caption. Used where the placeholder sits BEHIND text - a
   * hero - because the centred caption and the centred headline land on top of
   * each other and the overlap reads as a rendering bug.
   */
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-placeholder text-placeholder-foreground relative flex items-center justify-center overflow-hidden',
        RATIOS[ratio],
        className,
      )}
    >
      {/*
       * Inset hairline. Reads as the edge of a photograph rather than as a
       * component border, which is why it is inset rather than on the box.
       *
       * Suppressed together with the caption. `hideLabel` marks the cases where
       * this is a full-bleed BACKGROUND layer - a hero, a campaign banner - and
       * there a rectangle inset from the viewport edge does not read as a photo
       * edge at all; it reads as the section having a border, which is exactly
       * the framed look the rest of this pass removed.
       */}
      {!hideLabel && (
        <span
          aria-hidden="true"
          className="border-placeholder-foreground/20 pointer-events-none absolute inset-2 border"
        />
      )}

      {!hideLabel && (
        <span className="relative flex max-w-[85%] flex-col items-center gap-1.5 px-3 text-center">
          {/* A camera glyph, so the frame is recognisable as "image goes here"
              at sizes too small for the caption to render. */}
          <svg viewBox="0 0 24 24" fill="none" className="size-5 opacity-45" aria-hidden="true">
            <path
              d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.6l1-1.7a1 1 0 0 1 .87-.5h6.06a1 1 0 0 1 .86.5l1 1.7h2.61A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          </svg>

          {label && (
            <span className="text-2xs hidden leading-snug font-medium sm:block">{label}</span>
          )}
        </span>
      )}
    </div>
  );
}
