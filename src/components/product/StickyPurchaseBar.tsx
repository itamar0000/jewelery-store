'use client';

import { useEffect, useState, type RefObject } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { formatPrice, type Money } from '@/lib/money';

/**
 * The purchase action, kept within reach on a phone.
 *
 * On a 375px screen "הוספה לסל" sat about 1,190px down the page, under the
 * photograph, the options and the personalisation (critique 2026-10-06). A
 * shopper who had decided had to scroll to find out how to act on it.
 *
 * The bar shows only while the page's own button is still BELOW the screen -
 * not yet reached - and leaves the moment it comes into view, so there are
 * never two "add" buttons in sight. Once the shopper has scrolled past the
 * button the bar stays away, rather than sitting over the description and
 * the footer. It calls the same handler: a missing size is still pointed at,
 * at the field, exactly as the main button does.
 *
 * Phones only (below 48rem). On a desktop the controls column is beside the
 * photograph and the button is within a short scroll; a bar there would sit
 * over the gallery the page is built around.
 */
export function StickyPurchaseBar({
  target,
  price,
  pending,
  added,
  onAdd,
}: {
  /** The page's own purchase action, watched for visibility. */
  target: RefObject<HTMLElement | null>;
  price: Money;
  pending: boolean;
  /** Just added: the bar says so and offers the bag. */
  added: boolean;
  onAdd: () => void;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    // Where the button is now, before the observer's first report - which a
    // browser can hold back for a tab in the background.
    setHidden(element.getBoundingClientRect().top <= window.innerHeight);
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      // Shown only while the button is below the visible area.
      setHidden(entry.isIntersecting || entry.boundingClientRect.top < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn(
        'bg-background border-border fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-(--duration-settle) md:hidden',
        hidden ? 'translate-y-full' : 'translate-y-0',
      )}
    >
      <bdi className="shrink-0 text-lg font-semibold tabular-nums">{formatPrice(price)}</bdi>
      {added ? (
        <Button href="/cart" variant="secondary" size="lg" className="flex-1">
          נוסף. לסל הקניות
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={pending ? undefined : onAdd}
          aria-busy={pending || undefined}
        >
          {pending ? 'מוסיפים לסל…' : 'הוספה לסל'}
        </Button>
      )}
    </div>
  );
}
