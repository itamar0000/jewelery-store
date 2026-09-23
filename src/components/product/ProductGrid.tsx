import type { ReactNode } from 'react';

import { cn } from '@/components/ui/cn';

import { ProductCard } from './ProductCard';
import type { ProductCardData } from './types';

/**
 * Responsive product grid.
 *
 * Density, per the Phase 3A brief: two columns on mobile, two to three on
 * tablet, four on desktop. Mobile stays at two rather than one because a
 * single-column catalog on a phone shows one product per screen and makes
 * browsing a hundred products (MASTER_SPECIFICATION section 5) tedious - mobile
 * is a first-class experience, not a narrowed desktop (section 50).
 *
 * The card text is sized to survive two columns at 375px; the long Hebrew names
 * in the fixtures are there specifically to keep that honest.
 *
 * `compact` drops to a narrower maximum for homepage rails, where four across
 * inside a contained section would leave the cards too small.
 */
export function ProductGrid({
  products,
  compact = false,
  className,
  emptyTitle = 'אין כרגע מוצרים בקטגוריה הזו.',
  emptyBody = 'הקטלוג מתעדכן. אפשר לעבור לקטגוריה אחרת דרך התפריט.',
  emptyAction,
}: {
  products: readonly ProductCardData[];
  compact?: boolean;
  className?: string;
  /** Overridden where "category" is the wrong word - a collection, a search. */
  emptyTitle?: string;
  emptyBody?: string;
  /** A way out of the empty state - typically "clear filters". */
  emptyAction?: ReactNode;
}) {
  // A genuinely empty category is a normal state for a shop, not an error, so
  // this explains and offers a way onward rather than leaving a blank column.
  if (products.length === 0) {
    return (
      <div className="border-border rounded-sm border border-dashed py-16 text-center">
        <p className="text-sm">{emptyTitle}</p>
        <p className="text-muted-foreground mt-2 text-sm">{emptyBody}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <ul
      className={cn(
        // Wider gutters than the bordered card needed. A framed card is
        // separated from its neighbour by its own border; an unframed one is
        // separated only by the space around it, so the space has to do that
        // work. The row gap is larger than the column gap because the caption
        // block under each image would otherwise crowd the next row's picture.
        'grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 md:gap-y-16',
        compact ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {/*
       * THE FIRST ROW DOES NOT WAIT.
       *
       * Every card used to render its photograph with `loading="lazy"`,
       * including the ones already on screen. Lighthouse measured the result
       * on /necklaces: the Largest Contentful Paint element was a product
       * image, lazily loaded, and LCP landed at 3.4s on mobile.
       *
       * A lazy image is invisible to the browser's preload scanner, so it is
       * not even requested until layout has run and the observer has fired -
       * which is precisely the wrong treatment for the picture the visitor is
       * already looking at.
       *
       * TWO TIERS, because `priority` is not free. It emits a `<link rel=
       * preload>`, and preloads compete with one another; marking a whole row
       * would have the first four images fighting for the same bandwidth and
       * could leave LCP slower than lazy-loading did.
       *
       *   - The first TWO are preloaded. The grid is two columns at the
       *     narrowest breakpoint, so these two are on screen for every
       *     visitor, and one of them is the LCP element.
       *   - The next TWO load eagerly but are NOT preloaded. They complete the
       *     first row at the md and lg breakpoints, so they should not wait
       *     for the observer - but they are not the LCP on any viewport that
       *     shows them, so they must not jump the queue either.
       *   - Everything from the fifth card on stays lazy, which is correct:
       *     it is below the fold at every breakpoint.
       */}
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} priority={index < 2} eager={index >= 2 && index < 4} />
        </li>
      ))}
    </ul>
  );
}
