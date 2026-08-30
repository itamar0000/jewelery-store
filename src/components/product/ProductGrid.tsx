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
}: {
  products: readonly ProductCardData[];
  compact?: boolean;
  className?: string;
}) {
  if (products.length === 0) {
    return <p className="text-muted-foreground py-16 text-center text-sm">לא נמצאו מוצרים.</p>;
  }

  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6',
        compact ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
