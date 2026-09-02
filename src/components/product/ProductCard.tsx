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
    /*
     * NO BOX. The card is an image with type under it, sitting directly on the
     * page - no border, no card fill, no hover shadow, no rounded corners.
     *
     * This is the single biggest change in the visual pass, and the reason is
     * that the bordered-and-shadowed card is THE tell of a stock ecommerce
     * theme. Twelve hairline rectangles in a grid draw twelve boxes; the eye
     * reads the boxes and the frames compete with the product. Every jewellery
     * house that reads as expensive - and every gallery - does the opposite:
     * the photograph is the object, and the page around it is empty.
     *
     * Losing the frame means the IMAGE has to define the card's edge, which is
     * why the image well keeps a faint tonal fill: it holds the shape while the
     * photography is still a placeholder, and a real cut-out product shot on
     * white will sit on it correctly too.
     */
    <article className="group relative flex w-full flex-col">
      <div className="bg-muted/50 relative overflow-hidden">
        <PlaceholderImage
          ratio="portrait"
          label={imageAlt ?? name}
          // Slower and slighter than before. At 500ms/1.03 the zoom read as a
          // UI response; at 700ms it reads as the image settling.
          className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />

        {badges && badges.length > 0 && (
          <ul className="absolute top-3 flex flex-col items-start gap-1.5 ps-3">
            {badges.map((badge) => (
              <li key={badge}>
                {/* One tone for all three now. The old accent/info split tried
                    to separate promotion from lead-time, but on a photograph
                    the difference read as "two kinds of sticker" rather than as
                    a meaningful distinction. */}
                <Badge tone="onImage">{BADGE_LABELS[badge]}</Badge>
              </li>
            ))}
          </ul>
        )}

        <WishlistButton productName={name} className="absolute end-2 top-2 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        <h3 className="text-sm leading-snug">
          {/* `before:` overlay makes the card clickable without wrapping it. */}
          <Link
            href={`/product/${slug}`}
            className="hover:text-accent transition-colors before:absolute before:inset-0 before:content-['']"
          >
            {name}
          </Link>
        </h3>

        {/*
         * The price steps up from `text-sm` to `text-base`. On the old card it
         * was set at exactly the size of the product name and of every other
         * line on the page, so the one number a shopper scans for had no
         * weight of its own.
         *
         * It also no longer carries `mt-auto`. Bottom-anchoring the price
         * looked orderly in the abstract but was ragged in practice: cards that
         * carry a stock notice pushed their price a line higher than their
         * neighbours, so prices along a row landed on three different
         * baselines. Flowing at a fixed distance below the name puts every
         * price on the same line whenever the names are - which is the normal
         * case - and degrades predictably when one wraps.
         */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-0.5">
          <span
            className={discounted ? 'text-accent text-base font-medium' : 'text-base font-medium'}
          >
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
