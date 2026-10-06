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
  /*
   * Ink, stated. It read `text-foreground`, which was a near-white and correct
   * on the page ground and roughly 1.1:1 on the pale surface this chip sits on.
   * The tone is currently unused, so nothing shipped broken, but a latent
   * unreadable variant is a trap for whoever reaches for it next.
   */
  neutral: 'bg-card text-card-foreground border-border-strong',
  accent: 'bg-accent-muted text-accent border-transparent',
  /** Lead-time and similar statements. Unused since the product page says it in a line. */
  info: 'bg-muted text-muted-foreground border-transparent',
  /** Reserved for genuine scarcity backed by real inventory data. */
  warning: 'bg-card text-warning border-warning/30',
  /**
   * For badges that sit ON a photograph rather than on the page.
   *
   * Added in the visual pass. Once product cards lost their frame, the badges
   * were no longer chips inside a box - they were coloured stickers lying on
   * the picture, and a product carrying three of them (new, best seller and
   * made-to-order) turned the top corner of the image into the loudest thing
   * in the grid.
   *
   * So the tone is translucent, blurred and uncoloured, and the jewellery stays
   * the subject. The count is capped as well: a card carries at most one badge
   * (`ProductCardData.badge`), because the three that stacked were partly
   * redundant and, as "new" beside "best seller", partly contradictory.
   *
   * THE FOREGROUND IS INK, NOT `foreground`, and that distinction is the whole
   * correctness of this tone. It used to read `text-foreground`, which was
   * right when the page ground was pearl and `foreground` was near-black. The
   * redesign that preceded this one re-pointed `foreground` to a near-white,
   * and this chip - which sits on a pale surface, not on the page ground -
   * silently became near-white on pale at roughly 1.1:1. A badge is a fact
   * about the product; one nobody can read states nothing. Anything drawn on a
   * light surface names an ink token explicitly rather than inheriting.
   */
  onImage: 'bg-card/85 text-card-foreground border-transparent backdrop-blur-sm',
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
        'tracking-snug inline-flex items-center rounded-xs border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
