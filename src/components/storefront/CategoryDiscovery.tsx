import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import { cn } from '@/components/ui/cn';

/**
 * Category discovery.
 *
 * MASTER_SPECIFICATION section 32 names category cards as the PRIMARY discovery
 * mechanism and asks that the first discovery area prioritise clear navigation
 * over volume. Hence five destinations rather than a product wall.
 *
 * AN EDITORIAL GRID, NOT FIVE EQUAL CARDS.
 *
 * The previous pass laid these out as five identical tiles in one row. Rendered
 * at 1280 that gave each category about 210px of width - postage stamps with
 * captions - and the section became a thin strip of small pictures inside a
 * large empty band. Worse, it was the first of THREE consecutive sections built
 * the same way (centred heading, one row of things), so the page had no shape.
 *
 * This is now an asymmetric grid: RINGS takes a tall two-row tile and the other
 * four fill the remaining cells. That does three things at once - it gives the
 * band a genuine focal point, it makes every image substantially larger, and it
 * makes this section structurally different from the product grid that follows.
 *
 * The lead tile is rings because that is the category the catalogue is deepest
 * in and the one bridal traffic lands on. Changing which category leads is a
 * `lead: true` move in the list below.
 *
 * The heading sits at the inline start rather than centred, again for contrast
 * with the centred `SectionHeading` used by the product bands.
 *
 * Categories are an explicit list rather than derived from PRIMARY_NAV: the
 * header carries eight entries including Custom, FAQ and Contact, and only the
 * five product categories belong here (section 32).
 *
 * The whole tile is a link. Safe here - unlike ProductCard there is no nested
 * interactive control - so the simple markup is also the correct one.
 */
const DISCOVERY_CATEGORIES: readonly {
  id: string;
  label: string;
  href: string;
  assetId: EditorialAssetId;
  lead?: boolean;
}[] = [
  { id: 'rings', label: 'טבעות', href: '/rings', assetId: 'category-rings', lead: true },
  { id: 'earrings', label: 'עגילים', href: '/earrings', assetId: 'category-earrings' },
  { id: 'necklaces', label: 'שרשראות', href: '/necklaces', assetId: 'category-necklaces' },
  { id: 'bracelets', label: 'צמידים', href: '/bracelets', assetId: 'category-bracelets' },
  { id: 'sets', label: 'סטים', href: '/sets', assetId: 'category-sets' },
];

export function CategoryDiscovery() {
  return (
    <Container
      as="section"
      aria-labelledby="discovery-heading"
      className="py-section md:py-feature"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          {/*
           * Also the target of the hero's "לכל הקטגוריות". The scroll margin
           * clears the sticky masthead (4rem, then 8rem + its rule from lg), so
           * the jump lands on the heading instead of underneath the bar.
           */}
          <h2
            id="discovery-heading"
            className="font-display scroll-mt-[calc(var(--header-height)+1rem)] text-2xl font-bold tracking-tight text-balance md:text-3xl"
          >
            קטגוריות
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md text-sm text-pretty">
            {/* What the shopper gets, not how the site is built: both facts are
                PRODUCT.md's - the workshop is the owner's, and every model can
                be altered in these axes. */}
            כל דגם בקטלוג מיוצר בסדנה שלנו, ואפשר להתאים אותו: קראט, גוון זהב, מידה וחריטה.
          </p>
        </div>
      </div>

      {/*
       * Two columns on a phone, four from `md`. The lead tile spans two columns
       * and two rows on desktop, which is what produces the asymmetry; below
       * `md` it simply spans the full width and the rest pair up beneath it.
       */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {DISCOVERY_CATEGORIES.map((category) => (
          <li key={category.id} className={cn(category.lead && 'col-span-2 md:row-span-2')}>
            <Link href={category.href} className="group block h-full">
              {/*
               * THE NAME SITS UNDER THE PICTURE, NOT ON IT.
               *
               * These were six photographs laid directly on the trade field
               * with their names set over a darkening scrim. That is the
               * arrangement this build removed from the closing banner for
               * being the category default, surviving in the browse band - and
               * it breaks the one rule OWN-WORLD is strictest about, that
               * a photograph is never used as a background for type.
               *
               * So each tile is simply the picture with its name written on a rule
               * beneath it. The scrim disappears with the overlay, and with it the
               * contrast problem a scrim exists to paper over.
               *
               * The ratio lives on the WRAPPER, not the image, because
               * EditorialImage fills its parent. That is what lets the lead
               * tile stretch to the grid row while the others stay square.
               */}
              <div className="flex h-full flex-col">
                <div
                  className={cn(
                    'relative w-full flex-1 overflow-hidden',
                    category.lead ? 'aspect-[3/4] md:aspect-auto' : 'aspect-square',
                  )}
                >
                  <EditorialImage
                    id={category.assetId}
                    /*
                     * Two columns on a phone, and at most half the container on
                     * desktop for the lead tile, a quarter for the rest. Without
                     * this every tile would ask for a full-width source.
                     */
                    sizes={
                      category.lead
                        ? '(max-width: 767px) 100vw, 45vw'
                        : '(max-width: 767px) 50vw, 23vw'
                    }
                    placeholderLabel={category.label}
                    className="ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                  />
                </div>

                <span
                  className={cn(
                    'border-border mt-2.5 block border-t pt-2.5 font-medium',
                    category.lead ? 'text-base md:text-lg' : 'text-sm',
                  )}
                >
                  {category.label}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
