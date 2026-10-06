import { describe, expect, it, vi } from 'vitest';

import type { ProductCardRow } from './queries';

// queries.ts imports the Prisma singleton; `toProductCard` never queries.
vi.mock('@/lib/db', () => ({ prisma: {} }));

const { toProductCard } = await import('./queries');

/**
 * `toProductCard` on hand-built rows, no database.
 *
 * The integration suite covers what a shopper sees today, with stock levels
 * that are seed data. This covers the path that waits behind
 * `STOCK_LEVELS_ARE_LIVE`: the low-stock line has to work on the day stock is
 * real, and nothing on the storefront exercises it until then.
 */
function row(overrides: Partial<ProductCardRow> = {}): ProductCardRow {
  return {
    id: 'p1',
    slug: 'wedding-band',
    nameHe: 'טבעת נישואין',
    basePriceAgorot: 100_000,
    compareAtAgorot: null,
    lowStockThreshold: null,
    defaultPrepDays: null,
    publishedAt: new Date('2026-01-01'),
    images: [],
    options: [],
    variants: [],
    collections: [],
    ...overrides,
  };
}

function stocked(
  onHand: number,
  options: { policy?: 'DENY' | 'MADE_TO_ORDER'; lowStockThreshold?: number | null } = {},
): ProductCardRow['variants'][number] {
  return {
    priceAgorot: 100_000,
    compareAtAgorot: null,
    prepDays: null,
    inventory: {
      onHand,
      reserved: 0,
      policy: options.policy ?? 'DENY',
      lowStockThreshold: options.lowStockThreshold ?? null,
    },
  };
}

function inCollections(...slugs: string[]): ProductCardRow['collections'] {
  return slugs.map((slug) => ({ collection: { slug } }));
}

describe('toProductCard', () => {
  describe('stock notice', () => {
    const atThreshold = row({ variants: [stocked(2, { lowStockThreshold: 2 })] });

    it('is absent by default, even at the threshold - the counts are seed data', () => {
      expect(toProductCard(atThreshold).stockNotice).toBeUndefined();
    });

    it('appears at the threshold once stock levels are live', () => {
      expect(toProductCard(atThreshold, { stockLevelsLive: true }).stockNotice).toBe(
        'נותרו 2 במלאי',
      );
    });

    it('stays silent above the threshold when live', () => {
      const ample = row({ variants: [stocked(20, { lowStockThreshold: 2 })] });

      expect(toProductCard(ample, { stockLevelsLive: true }).stockNotice).toBeUndefined();
    });

    it('stays silent with no threshold configured when live', () => {
      const unthresholded = row({ variants: [stocked(1)] });

      expect(toProductCard(unthresholded, { stockLevelsLive: true }).stockNotice).toBeUndefined();
    });
  });

  describe('badge', () => {
    it('is "new" for a product in new arrivals', () => {
      expect(toProductCard(row({ collections: inCollections('new-arrivals') })).badge).toBe('new');
    });

    it('is one badge, not two, for a new product that is also a best seller', () => {
      const card = toProductCard(
        row({ collections: inCollections('best-sellers', 'new-arrivals') }),
      );

      expect(card.badge).toBe('new');
    });

    it('is absent for a best seller, and for a made-to-order piece', () => {
      const card = toProductCard(
        row({
          collections: inCollections('best-sellers'),
          variants: [stocked(0, { policy: 'MADE_TO_ORDER' })],
        }),
      );

      expect(card.badge).toBeUndefined();
    });
  });
});
