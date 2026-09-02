import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

import { SectionHeading } from './SectionHeading';

/**
 * Category discovery cards.
 *
 * MASTER_SPECIFICATION section 32 names category cards as the PRIMARY discovery
 * mechanism and asks that the first discovery area prioritise clear navigation
 * over volume. Hence five large cards rather than a product wall.
 *
 * Categories are read from an explicit list rather than derived from
 * PRIMARY_NAV: the header navigation carries eight entries including Gifts,
 * Custom and Guides, and only the five product categories belong here
 * (section 32).
 *
 * The whole card is a link. That is safe here - unlike ProductCard, there is no
 * nested interactive control - so the simple markup is also the correct one.
 */
const DISCOVERY_CATEGORIES: readonly { id: string; label: string; href: string }[] = [
  { id: 'rings', label: 'טבעות', href: '/rings' },
  { id: 'earrings', label: 'עגילים', href: '/earrings' },
  { id: 'necklaces', label: 'שרשראות', href: '/necklaces' },
  { id: 'bracelets', label: 'צמידים', href: '/bracelets' },
  { id: 'sets', label: 'סטים', href: '/sets' },
];

export function CategoryDiscovery() {
  return (
    <Container as="section" aria-labelledby="discovery-heading" className="py-section md:py-feature">
      <SectionHeading
        id="discovery-heading"
        title="קטגוריות"
        description="נקודת הפתיחה לחיפוש. כל קטגוריה נפתחת לתת-קטגוריות ולסינון מלא."
      />

      {/*
       * Two columns on mobile, three from tablet, five on desktop, so the five
       * cards form one clean row on a wide screen instead of a 4+1 orphan.
       */}
      {/*
       * Unframed, and taller than wide.
       *
       * Two changes from the first pass, both for the same reason - the brief
       * asks this band to read as editorial rather than as a row of cards:
       *
       *   - the border and card fill are gone, so what the eye sees is five
       *     photographs, not five rectangles with pictures in them;
       *   - the crop is PORTRAIT rather than square. Five squares in a row is
       *     the shape of a category chip; the taller crop is the shape of a
       *     fashion lookbook, and it is also the crop jewellery on a model
       *     actually needs.
       */}
      <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
        {DISCOVERY_CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link href={category.href} className="group block">
              <div className="bg-muted/50 overflow-hidden">
                <PlaceholderImage
                  ratio="portrait"
                  label={category.label}
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <span className="group-hover:text-accent mt-4 block text-center text-sm transition-colors">
                {category.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
