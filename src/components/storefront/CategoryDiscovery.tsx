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
 * Categories are an explicit list rather than derived from PRIMARY_NAV: the
 * header carries entries including Custom and FAQ, and only the five product
 * categories belong here (section 32).
 *
 * The whole tile is a link. Safe here - unlike ProductCard there is no nested
 * interactive control - so the simple markup is also the correct one.
 */
const DISCOVERY_CATEGORIES: readonly {
  id: string;
  label: string;
  href: string;
  assetId: EditorialAssetId;
}[] = [
  { id: 'rings', label: 'טבעות', href: '/rings', assetId: 'category-rings' },
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
      width="wide"
    >
      <div className="mb-10 max-w-xl">
        {/*
         * Also the target of the hero's catalogue action. The scroll margin
         * clears the sticky header, so the jump lands on the heading.
         */}
        <h2
          id="discovery-heading"
          className="font-display scroll-mt-[calc(var(--header-height)+1rem)] text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
        >
          מה מחפשים היום?
        </h2>
        {/* No intro line: the alteration axes are said once, in the hero (D4D.27). */}
      </div>

      {/*
       * ARCHES (D4D.26). Each category is a photograph in an upright arch with
       * its name in the serif beneath - the atelier's window, not a tile. Five
       * across from lg; two on a phone, the fifth centred under them.
       */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
        {DISCOVERY_CATEGORIES.map((category, index) => (
          <li
            key={category.id}
            className={cn(
              index === DISCOVERY_CATEGORIES.length - 1 &&
                'col-span-2 mx-auto w-[calc(50%-0.5rem)] sm:col-span-1 sm:mx-0 sm:w-auto',
            )}
          >
            <Link href={category.href} className="group block">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-full">
                <EditorialImage
                  id={category.assetId}
                  sizes="(width >= 64rem) 18vw, (width >= 40rem) 31vw, 48vw"
                  placeholderLabel={category.label}
                  className="ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                />
              </div>
              <span className="font-display group-hover:text-accent mt-4 block text-center text-[1.375rem] leading-tight transition-colors">
                {category.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
