import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { formatPrice } from '@/lib/money';

import { ProductPhoto } from './ProductPhoto';
import { WishlistButton } from './WishlistButton';
import type { ProductBadge, ProductCardData } from './types';

/**
 * The catalog product card.
 *
 * Used by every grid on the site, so its contract matters more than its looks.
 *
 * FIVE DECISIONS WORTH KNOWING:
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
 *
 * 4. TWO FRAMES, ONE CARD. Where a second photograph exists the card crossfades
 *    to it under the cursor. See `HoverFrame` below for why that REPLACES the
 *    zoom rather than joining it.
 *
 * 5. THE PRICE NO LONGER SHOUTS. See the note above the price block.
 */
const BADGE_LABELS: Record<ProductBadge, string> = {
  new: 'חדש',
  'best-seller': 'רב מכר',
  'made-to-order': 'בהזמנה אישית',
};

export function ProductCard({
  product,
  priority = false,
  eager = false,
}: {
  product: ProductCardData;
  /** See ProductPhoto: preload, for the likely LCP image only. */
  priority?: boolean;
  /** See ProductPhoto: eager without preload, for the rest of the first row. */
  eager?: boolean;
}) {
  const { name, slug, price, compareAtPrice, badges, stockNotice, imageAlt, hoverImageAlt } =
    product;
  /* One grid, four columns at the top breakpoint - see ProductGrid. */
  const SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';
  const discounted = compareAtPrice !== undefined;
  const swatches = product.swatches ?? [];

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
        <ProductPhoto
          url={product.imageUrl ?? null}
          alt={imageAlt ?? name}
          ratio="portrait"
          sizes={SIZES}
          priority={priority}
          eager={eager}
          /*
           * THE ZOOM IS NOW A FALLBACK, NOT THE DEFAULT.
           *
           * A card with a second photograph gets the crossfade instead: two
           * different pictures say more than one picture moving, and running
           * both at once produces an image that swaps AND drifts, which reads
           * as two effects fighting rather than as one gesture.
           *
           * Where there is only one photograph the zoom still earns its place,
           * because a card that does nothing under the cursor reads as
           * disabled. At the `drift` tier it is slower than anything else on
           * the site and deliberately below the threshold of looking like a
           * response - the image settles rather than reacts.
           */
          imageClassName={cn(
            hoverImageAlt === undefined &&
              'ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.04]',
          )}
        />

        {hoverImageAlt !== undefined && (
          <HoverFrame label={hoverImageAlt} url={product.hoverImageUrl ?? null} sizes={SIZES} />
        )}

        {badges && badges.length > 0 && (
          /*
           * Raised above the hover frame. Without the z-index the second image
           * fades in over the badges and they disappear under the cursor, which
           * reads as a rendering fault rather than as a design.
           */
          <ul className="absolute top-3 z-10 flex flex-col items-start gap-1.5 ps-3">
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
         * THE PRICE SITS LEVEL WITH THE NAME - same size, same weight.
         *
         * It used to be a step LOUDER than everything else on the card, on the
         * argument that the one number a shopper scans for should carry weight
         * of its own. Measured against the reference stores that is the wrong
         * register. Malka sets the product name at 24px/400 and the price at
         * 14px/300 - markedly quieter than the name - and Cartier frequently
         * declines to print one at all. The pattern holds right across the
         * category: where a piece costs several thousand shekels, leading with
         * the number is what a store competing on price does, and it is read
         * that way.
         *
         * This deliberately does NOT go as far as Malka. Muting the price below
         * the name would style away information a shopper has a plain right to
         * scan, and this catalog has a real range in it. Equal billing is the
         * honest middle: the price stays immediately findable, and it is no
         * longer the loudest thing in a grid of photographs.
         *
         * `tabular-nums` fixes the digit widths so prices line up down a column
         * instead of ragging against each other.
         */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-0.5">
          <span className={cn('text-sm tabular-nums', discounted && 'text-accent')}>
            {formatPrice(price)}
          </span>

          {compareAtPrice && (
            <span className="text-muted-foreground text-xs tabular-nums line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {swatches.length > 0 && (
          /*
           * Gold colours, as metal chips.
           *
           * WHAT THEY BUY. A grid without them is a wall of single objects, and
           * a shopper cannot tell that half of it also comes in rose gold
           * without opening every card. It is the cheapest information a
           * jewellery grid can carry, and every store in the reference set
           * carries it.
           *
           * ONE ELEMENT FOR SCREEN READERS, NOT ONE PER CHIP. A category page
           * holds twenty-four of these cards; announcing three separate colour
           * labels each would put seventy-two extra stops between a
           * screen-reader user and the end of the page. The chips are therefore
           * decorative to assistive technology, and a single visually-hidden
           * phrase carries the meaning.
           *
           * THEY ARE NOT INTERACTIVE HERE. Colour is chosen on the product page,
           * where the choice changes a price and an availability. A chip that
           * silently changed which variant a card referred to would leave the
           * price printed directly above it wrong.
           */
          <p className="flex items-center gap-1.5 pt-1">
            <span className="sr-only">גוונים: {swatches.map((s) => s.labelHe).join(', ')}</span>

            {swatches.map((swatch) => (
              <span
                key={swatch.value}
                aria-hidden="true"
                title={swatch.labelHe}
                /*
                 * A hex from the DATABASE, not from the palette. The token
                 * layer's ban on literal colour in components is about design
                 * values; this is a product attribute the catalog owner set,
                 * and it has no token because it is not a brand decision.
                 *
                 * A value with no hex falls back to the muted surface rather
                 * than to a guess - see ProductSwatch in ./types.ts.
                 */
                style={swatch.hexColor ? { backgroundColor: swatch.hexColor } : undefined}
                className={cn(
                  'border-border-strong/60 size-2.5 rounded-full border',
                  swatch.hexColor === undefined && 'bg-muted',
                )}
              />
            ))}
          </p>
        )}

        {/* Real inventory only. Absent by default - see the header comment. */}
        {stockNotice && <p className="text-warning text-2xs">{stockNotice}</p>}
      </div>
    </article>
  );
}

/**
 * The second photograph, stacked on the first and revealed on hover.
 *
 * WHY A CROSSFADE AND NOT A SWAP. Both frames are always in the DOM and the top
 * one animates only its opacity, so nothing is mounted, decoded or laid out
 * under the cursor. A card that swapped `src` on hover would flash white on the
 * first hover of every product while the second image decoded - which, on a
 * grid, is most of the hovers a shopper ever makes.
 *
 * WHAT THE PAIR IS FOR. The convention across this category is that the two
 * frames are the piece alone and the piece worn. Scale is the first thing
 * anyone wants to know about a ring, and it is unreadable from a cut-out
 * packshot - so the hover is not decoration. It answers the question the grid
 * otherwise forces a click to answer.
 *
 * The timing is the `reveal` tier rather than the UI default. This is not
 * feedback about a control; it is one picture becoming another, and at the
 * 240ms default it snapped hard enough to read as a glitch.
 *
 * `pointer-events-none` keeps the layer clear of the name link's click overlay
 * underneath it.
 *
 * PHOTOGRAPH OR STAND-IN IS `ProductPhoto`'S DECISION, not this component's. A
 * product whose second photograph has been delivered crossfades between two
 * pictures; one whose has not crossfades between two captioned stand-ins, which
 * still demonstrates the wiring.
 */
function HoverFrame({ label, url, sizes }: { label: string; url: string | null; sizes: string }) {
  return (
    <div className="ease-settle pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-(--duration-reveal) group-hover:opacity-100">
      <ProductPhoto url={url} alt={label} ratio="portrait" sizes={sizes} className="size-full" />
    </div>
  );
}
