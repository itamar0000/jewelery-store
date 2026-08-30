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
    <Container as="section" aria-labelledby="discovery-heading" className="py-16 md:py-20">
      <SectionHeading
        id="discovery-heading"
        title="קטגוריות"
        description="נקודת הפתיחה לחיפוש. כל קטגוריה נפתחת לתת-קטגוריות ולסינון מלא."
      />

      {/*
       * Two columns on mobile, three from tablet, five on desktop, so the five
       * cards form one clean row on a wide screen instead of a 4+1 orphan.
       */}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {DISCOVERY_CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link
              href={category.href}
              className="group border-border bg-card hover:border-border-strong block overflow-hidden rounded-sm border transition-colors"
            >
              <PlaceholderImage
                ratio="square"
                label={category.label}
                className="transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span className="group-hover:text-accent block px-4 py-3.5 text-center text-sm transition-colors">
                {category.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
