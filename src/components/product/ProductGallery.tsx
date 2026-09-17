'use client';

import { useRef, useState } from 'react';

import { cn } from '@/components/ui/cn';
import { ProductPhoto } from './ProductPhoto';
import type { ResolvedImage } from '@/lib/catalog/images';

/**
 * The product gallery.
 *
 * This is the component the whole product page is built around. On a jewellery
 * store the photograph is not an illustration of the product - it IS the
 * product, until the parcel arrives - so the gallery carries more of the
 * purchase decision than every control beside it put together.
 *
 * FOUR THINGS IT DOES THAT THE PREVIOUS FILMSTRIP DID NOT:
 *
 * 1. A VERTICAL RAIL, NOT A STRIP UNDERNEATH. Every reference store in the
 *    category stacks its thumbnails down the outer edge beside the main frame.
 *    The reason is not fashion: a horizontal strip under a square image pushes
 *    the price and the buy button below the fold on a laptop, and it competes
 *    for the same horizontal band the eye uses to move between the photograph
 *    and the controls. Down the side, the thumbnails cost no vertical space at
 *    all.
 *
 *    It is a rail on desktop and a strip on mobile, because a phone has no
 *    horizontal room to give away and the fold problem does not exist there.
 *
 * 2. THE FRAME CHANGES. Selecting a thumbnail swaps the main image, which the
 *    old gallery could not do at all - it showed image one and then listed the
 *    others as decoration. That was the single largest functional gap on the
 *    page.
 *
 * 3. IT ZOOMS UNDER THE CURSOR. See `Zoomable` below.
 *
 * 4. THE SWAP IS ANIMATED. `animate-frame-in` on a keyed element, so React
 *    remounts the frame and the animation replays on every change.
 *
 * PHOTOGRAPH OR PLACEHOLDER IS NOT THIS FILE'S DECISION. `ProductPhoto` makes
 * it, from whether the row resolved to a URL - so a product whose photography
 * has been delivered shows it, and one whose has not still shows a captioned
 * stand-in, with no branch here and no flag to keep in sync.
 */
export function ProductGallery({
  images,
  productName,
}: {
  /** Ordered, already variant-resolved by the caller. May be empty. */
  images: readonly ResolvedImage[];
  /** Fallback caption for a product with no image rows at all. */
  productName: string;
}) {
  /**
   * Selection is held by INDEX, not by image id.
   *
   * The caller swaps the whole `images` array when the shopper changes gold
   * colour, and the new array's ids have nothing to do with the old one's. An
   * id-based selection would fall through to "not found" on every colour
   * change and silently reset the gallery to the first frame.
   *
   * An index degrades far more usefully: it survives a colour change, and the
   * clamp below covers the case where the new variant simply has fewer
   * photographs than the old one.
   */
  const [selected, setSelected] = useState(0);
  const active = images[Math.min(selected, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
      {/*
       * DOM ORDER PUTS THE RAIL FIRST, AND THAT IS WHAT PLACES IT CORRECTLY.
       *
       * A flex row lays children out along the inline axis, so on this RTL
       * storefront the rail lands on the RIGHT - the outer edge of a gallery
       * that occupies the right half of the page - and it would land on the
       * left in an LTR context without a single style changing. There is no
       * physical `left`/`right` anywhere in this component for the same reason
       * (MASTER_SPECIFICATION section 49).
       *
       * It is also the right READING order: the rail is a list of choices that
       * governs the frame beside it, so a screen reader meeting it first is
       * told what the options are before being shown the result.
       */}
      {images.length > 1 && (
        <ul
          className={cn(
            'flex shrink-0 gap-2.5 md:flex-col',
            // Sized so four thumbnails and their gaps stand roughly level with
            // a square main frame, rather than by picking a round number.
            'md:basis-20 lg:basis-24',
          )}
        >
          {images.map((image, index) => {
            const isActive = image === active;

            return (
              <li key={image.id} className="basis-1/5 md:basis-auto">
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelected(index)}
                  className={cn(
                    'block w-full cursor-pointer overflow-hidden transition-opacity',
                    /*
                     * The unselected thumbnails are held back rather than the
                     * selected one being decorated. A ring or a border around
                     * the active thumbnail draws a box on a page whose whole
                     * visual argument is that there are no boxes; dimming the
                     * others says the same thing using only the photographs.
                     */
                    isActive ? 'opacity-100' : 'opacity-55 hover:opacity-85',
                  )}
                >
                  <ProductPhoto
                    url={image.url}
                    alt={image.altHe}
                    ratio="square"
                    // A thumbnail is never wider than the rail.
                    sizes="(min-width: 1024px) 6rem, (min-width: 768px) 5rem, 20vw"
                  />
                  {/*
                   * The thumbnail's accessible name. PlaceholderImage is
                   * `aria-hidden` by design, so without this the button would
                   * announce as "button" and nothing else.
                   */}
                  <span className="sr-only">{image.altHe}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
       * THE FRAME IS CAPPED TO WHAT THE VIEWPORT CAN ACTUALLY SHOW.
       *
       * This exists because of a bug the sticky column introduced. The gallery
       * pins its top at a fixed offset below the header, so any part of a
       * square frame taller than the remaining viewport sat permanently below
       * the fold - and being STUCK, it could not be scrolled to. The bottom of
       * the photograph only appeared at the very end of the page, when the
       * column finally released. Measured at a 620px-tall viewport, 11px were
       * unreachable; at 500px it is closer to 130.
       *
       * Capping the WIDTH is what fixes it, which looks indirect until you
       * remember the frame is square: width and height are the same number, so
       * `max-width` is the only handle that shrinks the box without cropping
       * it. A `max-height` would clamp the box while leaving the width alone,
       * which - inside `overflow-hidden` - crops the picture instead of
       * resizing it, turning a layout bug into a worse one.
       *
       * `svh` rather than `vh` so a mobile browser's collapsing toolbar cannot
       * make the reserved space wrong. The 11rem covers the sticky offset plus
       * a margin at the bottom, and 26rem is an upper bound for large screens -
       * past that the photograph stops being commanding and starts being
       * merely large.
       *
       * `md:` only. Below that the column is not sticky and the frame is not
       * competing with anything for height.
       */}
      <div className="min-w-0 flex-1 md:max-w-[min(calc(100svh-11rem),26rem)]">
        <Zoomable>
          <div
            /*
             * The key is the whole point. Changing it makes React discard the
             * old frame and mount a new one, which restarts the CSS animation;
             * without it the element persists across a selection change and
             * `animate-frame-in` runs exactly once, on first paint.
             */
            key={active?.id ?? 'fallback'}
            className="animate-frame-in"
          >
            <ProductPhoto
              url={active?.url ?? null}
              alt={active?.altHe ?? productName}
              ratio="square"
              /* Capped at 26rem by the wrapper above, so never larger. */
              sizes="(min-width: 768px) 26rem, 100vw"
              priority
            />
          </div>
        </Zoomable>
      </div>
    </div>
  );
}

/**
 * Cursor-tracked magnification for whatever it wraps.
 *
 * WHAT IT IS FOR. Someone deciding between a 1.0ct and a 1.5ct stone is trying
 * to see the setting, the prongs, the finish of the metal. On a physical
 * counter they would pick the ring up and turn it toward the light. A gallery
 * that offers no way to look closer is asking for a four-figure decision from
 * an image the size of a postcard, and every store in the reference set
 * answers this the same way.
 *
 * HOW IT WORKS. The pointer's position over the box is written to two custom
 * properties and used as `transform-origin`, so the scale pushes INTO the point
 * under the cursor rather than into the middle of the frame. Moving the pointer
 * pans the magnified image, which is what makes it feel like a loupe rather
 * than a zoom button.
 *
 * WHY THE ORIGIN IS SET IN JAVASCRIPT AND THE SCALE IS NOT. Following a pointer
 * is genuinely per-frame data with no CSS equivalent, so it has to be scripted.
 * The magnification itself is a hover state, and CSS does hover states better
 * than a listener does: no state, no re-render, and it inherits the reduced
 * motion rule in globals.css for free.
 *
 * WHY THE PROPERTY IS WRITTEN TO THE NODE, NOT TO REACT STATE. A mousemove
 * handler that called `setState` would re-render this subtree on every pointer
 * sample - dozens of React renders per second to move one CSS value. Writing
 * the custom property straight to the DOM node keeps it off the render path
 * entirely; nothing React manages is being changed.
 *
 * TOUCH DEVICES GET NOTHING, ON PURPOSE. Tailwind's `hover:` variant is already
 * gated behind `@media (hover: hover)`, so a tap never leaves a phone stuck at
 * 1.6x with no way back. Pinch-zoom stays available at the browser level, which
 * is the gesture a touch user actually expects, and the viewport meta
 * deliberately does not cap it.
 */
function Zoomable({ children }: { children: React.ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={frame}
      onMouseMove={(event) => {
        const node = frame.current;
        if (node === null) return;

        const box = node.getBoundingClientRect();
        node.style.setProperty('--zoom-x', `${((event.clientX - box.left) / box.width) * 100}%`);
        node.style.setProperty('--zoom-y', `${((event.clientY - box.top) / box.height) * 100}%`);
      }}
      className="group bg-muted/40 relative overflow-hidden"
    >
      <div
        /*
         * The 50% fallbacks matter for the first frames after a pointer enters
         * from an edge: until the first mousemove lands, the origin is the
         * centre of the box, which is a sane zoom rather than a corner.
         */
        style={{ transformOrigin: 'var(--zoom-x, 50%) var(--zoom-y, 50%)' }}
        className="ease-settle transition-transform duration-(--duration-settle) group-hover:scale-160"
      >
        {children}
      </div>
    </div>
  );
}
