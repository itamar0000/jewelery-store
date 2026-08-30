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
