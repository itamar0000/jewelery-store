import type { ReactNode } from 'react';

import { cn } from './cn';

/**
 * Small status label, used on product cards.
 *
 * Restrained by design: the visual direction warns against noisy "luxury"
 * styling (MASTER_SPECIFICATION section 2), so badges are quiet hairline chips
 * rather than saturated stickers.
 */
const TONES = {
  neutral: 'bg-card text-foreground border-border-strong',
  accent: 'bg-accent-muted text-accent border-transparent',
  /** Made-to-order and similar lead-time statements. */
  info: 'bg-muted text-muted-foreground border-transparent',
  /** Reserved for genuine scarcity backed by real inventory data. */
  warning: 'bg-card text-warning border-warning/30',
  /**
   * For badges that sit ON a photograph rather than on the page.
   *
   * Added in the visual pass. Once product cards lost their frame, the badges
   * were no longer chips inside a box - they were coloured stickers lying on
   * the picture, and a product carrying three of them (new, best seller and
   * made-to-order are not mutually exclusive) turned the top corner of the
   * image into the loudest thing in the grid.
   *
   * This tone matches the wishlist control instead: translucent, blurred,
   * uncoloured. Three of them stack quietly, and the jewellery stays the
   * subject. The badges are NOT capped in number - which of them apply is a
   * fact about the product, and suppressing a true one is a merchandising
   * decision, not a styling one.
   */
  onImage: 'bg-card/80 text-foreground border-transparent backdrop-blur-sm',
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'text-2xs tracking-snug inline-flex items-center rounded-xs border px-2 py-0.5 font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
