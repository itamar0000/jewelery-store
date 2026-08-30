'use client';

import { useId, useState } from 'react';

import { HeartIcon } from '@/components/ui/icons';
import { cn } from '@/components/ui/cn';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

/**
 * Save-to-wishlist toggle.
 *
 * PLACEHOLDER (registry id `wishlist`). The pressed state is local and is lost
 * on navigation - there is no persistence, no account, and no server call.
 * MASTER_SPECIFICATION section 26 defines the real behaviour; Phase 6 builds it.
 *
 * The ACCESSIBILITY CONTRACT is real even though the behaviour is not, because
 * it is the part later phases must not regress:
 *
 *   - `aria-pressed` communicates toggle state, so the control announces as
 *     "pressed"/"not pressed" rather than as a plain button;
 *   - the accessible name names the product, so a screen-reader user hearing a
 *     list of buttons can tell them apart - "הוספה למועדפים" repeated eight
 *     times down a grid is useless;
 *   - the icon is decorative and `aria-hidden`; the name comes from the
 *     visually hidden text.
 *
 * Wiring this up later means replacing `useState` with the real mutation. The
 * markup should not need to change.
 */
export function WishlistButton({
  productName,
  className,
}: {
  productName: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const labelId = useId();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-labelledby={labelId}
      onClick={() => setSaved((value) => !value)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full',
        'bg-card/85 text-foreground backdrop-blur-sm transition-colors duration-200',
        'hover:bg-card focus-visible:bg-card',
        className,
      )}
      {...PLACEHOLDER_ATTR}
    >
      <HeartIcon filled={saved} className={cn('size-5', saved && 'text-accent')} />
      <span id={labelId} className="sr-only">
        {saved ? `הסרת ${productName} מהמועדפים` : `הוספת ${productName} למועדפים`}
      </span>
    </button>
  );
}
