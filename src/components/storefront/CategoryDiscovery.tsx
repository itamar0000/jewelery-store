import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
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
  lead?: boolean;
}[] = [
  { id: 'rings', label: 'טבעות', href: '/rings', lead: true },
  { id: 'earrings', label: 'עגילים', href: '/earrings' },
  { id: 'necklaces', label: 'שרשראות', href: '/necklaces' },
  { id: 'bracelets', label: 'צמידים', href: '/bracelets' },
  { id: 'sets', label: 'סטים', href: '/sets' },
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
          <h2
            id="discovery-heading"
            className="font-display text-2xl tracking-tight text-balance md:text-3xl"
          >
            קטגוריות
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md text-sm text-pretty">
            נקודת הפתיחה לחיפוש. כל קטגוריה נפתחת לתת-קטגוריות ולסינון מלא.
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
              <div className="relative h-full overflow-hidden">
                <PlaceholderImage
                  ratio={category.lead ? 'tall' : 'square'}
                  label={category.label}
                  className={cn(
                    'h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]',
                    category.lead && 'md:aspect-auto',
                  )}
                />

                {/*
                 * The label sits ON the image rather than under it. With tiles
                 * this large a caption below each one left five orphaned lines
                 * of text floating in the gutter; overlaid, the name belongs to
                 * its picture and the grid reads as one object per cell.
                 */}
                <div
                  aria-hidden="true"
                  className="from-foreground/55 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                />

                <span
                  className={cn(
                    'text-background absolute inset-x-0 bottom-0 p-4 font-medium',
                    category.lead ? 'text-lg md:p-6 md:text-xl' : 'text-sm md:text-base',
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
