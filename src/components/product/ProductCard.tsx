import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { PRICE_FROM, formatPrice } from '@/lib/money';

import { ProductPhoto } from './ProductPhoto';
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
 * 2. ONE LINK, NOT A LINKED CARD. The product name is the link and carries a
 *    `before:` overlay that spans the card, so the full surface is clickable
 *    while the accessible name stays exactly "product name". The card holds no
 *    other control today - the wishlist heart is withheld until saving is real
 *    (src/lib/placeholders.ts) - but the overlay is what lets one return
 *    without nesting a button in a link, which is invalid HTML.
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
};

export function ProductCard({
  product,
  priority = false,
  eager = false,
  headingLevel = 3,
}: {
  product: ProductCardData;
  /** See ProductPhoto: preload, for the likely LCP image only. */
  priority?: boolean;
  /** See ProductPhoto: eager without preload, for the rest of the first row. */
  eager?: boolean;
  /**
   * The name's heading level, one below whatever heads the grid: 2 on a
   * listing page, where the grid sits directly under the page's h1; 3 inside
   * a homepage section that has its own h2. It was always 3, which left every
   * category page jumping from h1 to h3.
   */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const { name, slug, price, compareAtPrice, badge, stockNotice, imageAlt, hoverImageAlt } =
    product;
  /* One grid, four columns at the top breakpoint - see ProductGrid. */
  const SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';
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
      {/*
       * NOTHING FRAMES THE PHOTOGRAPH. No fill, no border, no shadow, no
       * padding - the packshot sits directly on the page, and the only thing
       * separating one card from the next is the space around it. Boxing a
       * product shot is what makes a grid read as a template, and on a ground
       * this pale a box is also the only thing that would introduce an edge
       * the photograph does not already have.
       */}
      <div className="relative overflow-hidden">
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
          /*
           * mix-blend-darken SEATS THE PACKSHOT IN THE PAGE (D4D.26). The
           * product photographs are shot on a cool near-white that read as
           * white tiles on the atelier's ivory; darken keeps every pixel of
           * the jewellery and lets the ground show through where the studio
           * backdrop was lighter than the page.
           */
          imageClassName={cn(
            'mix-blend-darken',
            hoverImageAlt === undefined &&
              'ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.04] motion-reduce:group-hover:scale-100',
          )}
        />

        {hoverImageAlt !== undefined && (
          <HoverFrame label={hoverImageAlt} url={product.hoverImageUrl ?? null} sizes={SIZES} />
        )}

        {badge && (
          /*
           * Raised above the hover frame. Without the z-index the second image
           * fades in over the badge and it disappears under the cursor, which
           * reads as a rendering fault rather than as a design.
           */
          <Badge tone="accent" className="absolute start-3 top-3 z-10">
            {BADGE_LABELS[badge]}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        <Heading className="font-display text-[1.25rem] leading-snug font-normal">
          {/* `before:` overlay makes the card clickable without wrapping it. */}
          <Link
            href={`/product/${slug}`}
            /*
             * UNDERLINE, NOT A COLOUR CHANGE.
             *
             * This was `hover:text-accent`, which worked when the page ground
             * was pearl and the accent was brass. On the trade field the
             * caption is already bare metal and so is the accent, so the hover
             * changed nothing at all - a state that exists in the source and
             * not on the screen. An underline is the editorial answer and it
             * reads on any ground; the offset is themed rather than left to
             * the browser's default, which sits too tight under Hebrew.
             */
            className="decoration-border-strong underline-offset-[0.35em] transition-colors before:absolute before:inset-0 before:content-[''] hover:underline"
          >
            {name}
          </Link>
        </Heading>

        {/*
         * WHERE THE STONE COMES FROM, ON THE CARD. The store sells both kinds
         * and the price difference between them is the whole story, so a grid
         * of diamond pieces that did not say which kind each one is asked the
         * shopper to open every product to find out (D4D.15).
         */}
        {product.stone && <p className="text-muted-foreground text-xs">{product.stone}</p>}

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
          {/*
           * THE STRIKE-THROUGH CARRIES THE DISCOUNT, NOT A COLOUR.
           *
           * The discounted price used to be tinted with the accent. In this
           * palette there is nothing to tint it with: the only colour on the
           * site is the jewellery (DESIGN.md), and emphasis is ink. The
           * struck-through comparison beside it already states the fact
           * unambiguously, so nothing is lost by saying it once.
           */}
          {/*
           * THE CARD STATES A FLOOR WHEN THERE IS ONE, AND NOTHING ELSE.
           *
           * Whether prices are final is said once per view, in words, by
           * whatever renders the grid (see src/lib/catalog/price-disclosure.ts).
           * It used to be a "≈" on every card, which read as a typo, was
           * explained only in the footer, and vanished on the product page.
           *
           * "החל מ־" is a different fact and does belong here: this product's
           * options change its price, and the figure is the lowest of them.
           *
           * `bdi` isolates the figure, so the prefix stays in the Hebrew run at
           * the visual start instead of being pulled after the digits.
           */}
          <span className="text-[0.9375rem] font-medium tabular-nums">
            {product.priceFrom && PRICE_FROM}
            <bdi>{formatPrice(price)}</bdi>
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
        {/*
         * INK, NOT GOLD. This rendered in `text-warning`, an olive-gold that
         * measured roughly 2.2:1 on the trade field - under the floor, and a
         * second offence besides: gold appears only inside photographs in this
         * world, never as type. A scarcity line is information, and it is set
         * like the rest of the information on the card.
         */}
        {stockNotice && <p className="text-muted-foreground text-xs">{stockNotice}</p>}
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
