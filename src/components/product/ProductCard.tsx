import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { formatPrice } from '@/lib/money';

import { WishlistButton } from './WishlistButton';
import type { ProductBadge, ProductCardData } from './types';

/**
 * The catalog product card.
 *
 * Used by every grid on the site, so its contract matters more than its looks.
 *
 * THREE DECISIONS WORTH KNOWING:
 *
 * 1. STOCK IS NEVER INVENTED. `stockNotice` renders only when a caller passes
 *    one, and there is no client-side threshold rule. A card with no inventory
 *    data says nothing about inventory, which is the honest default. See
 *    ./types.ts.
 *
 * 2. ONE LINK, NOT A LINKED CARD. The whole card is not wrapped in an anchor,
 *    because the wishlist button sits inside it and nesting an interactive
 *    control in a link is invalid HTML with genuinely unpredictable behaviour.
 *    Instead the product name is the link and carries a `before:` overlay that
 *    spans the card, so the full surface is clickable while the accessible name
 *    stays exactly "product name". The wishlist button is raised above that
 *    overlay with `relative z-10`.
 *
 * 3. PRICES GO THROUGH `formatPrice`. It emits the correct directional marks
 *    for RTL, so prices must never be interpolated by hand
 *    (MASTER_SPECIFICATION section 49).
 */
const BADGE_LABELS: Record<ProductBadge, string> = {
  new: 'חדש',
  'best-seller': 'רב מכר',
  'made-to-order': 'בהזמנה אישית',
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const { name, slug, price, compareAtPrice, badges, stockNotice, imageAlt } = product;
  const discounted = compareAtPrice !== undefined;

  return (
    <article className="group border-border bg-card relative flex w-full flex-col overflow-hidden rounded-sm border transition-shadow duration-200 hover:shadow-md">
      <div className="relative overflow-hidden">
        <PlaceholderImage
          ratio="portrait"
          label={imageAlt ?? name}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {badges && badges.length > 0 && (
          <ul className="absolute top-3 flex flex-col items-start gap-1.5 ps-3">
            {badges.map((badge) => (
              <li key={badge}>
                <Badge tone={badge === 'made-to-order' ? 'info' : 'accent'}>
                  {BADGE_LABELS[badge]}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <WishlistButton productName={name} className="absolute end-3 top-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm leading-snug">
          {/* `before:` overlay makes the card clickable without wrapping it. */}
          <Link
            href={`/product/${slug}`}
            className="hover:text-accent transition-colors before:absolute before:inset-0 before:content-['']"
          >
            {name}
          </Link>
        </h3>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
          <span className={discounted ? 'text-accent text-sm font-medium' : 'text-sm font-medium'}>
            {formatPrice(price)}
          </span>

          {compareAtPrice && (
            <span className="text-muted-foreground text-xs line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {/* Real inventory only. Absent by default - see the header comment. */}
        {stockNotice && <p className="text-warning text-2xs">{stockNotice}</p>}
      </div>
    </article>
  );
}
