import type { ProductCardData } from '@/components/product/types';
import type { OrderStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';

import { getCollection, getProductsByCollection, getProductsByIds } from './queries';

/**
 * Best sellers: what sold, then what the owner picked.
 *
 * ONE RANKING, READ FROM ONE PLACE. The homepage band and
 * /collections/best-sellers both call `getBestSellers`, so the claim "רבי מכר"
 * is made from a single source and cannot disagree with itself.
 *
 * WHAT IT RANKS BY. Units sold, across order lines whose order reached a sold
 * status. Products with sales come first, most units first; the curated
 * `best-sellers` collection fills the remaining places in the curator's order.
 *
 * TODAY THERE ARE NO ORDERS - the seed creates none, and checkout does not take
 * payment - so the ranking is exactly the curated collection, which is what the
 * band showed before this module existed. When paid orders exist, they lead the
 * band with no code change. Nothing here invents a sales figure, and no figure
 * is ever shown: the order is the only output.
 *
 * DECISIONS LEFT OPEN, deliberately (docs/DECISIONS.md D4D.2): all-time rather
 * than a recent window, and no minimum number of sales before a product
 * outranks the curated picks. Both are business calls, and both are a change
 * to `rankedBySales` alone.
 */
export const BEST_SELLERS_SLUG = 'best-sellers';

/**
 * Orders that represent a sale.
 *
 * Not PENDING_PAYMENT (nothing was paid), CANCELLED or REFUNDED (the sale was
 * undone). Everything from PAID onward counts, including orders still in the
 * workshop: a made-to-order piece is sold well before it ships.
 */
const SOLD: readonly OrderStatus[] = [
  'PAID',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
];

export async function getBestSellers(
  options: { readonly limit?: number } = {},
): Promise<readonly ProductCardData[]> {
  const [ranked, curated] = await Promise.all([rankedBySales(), curatedPicks()]);

  return mergeRanking(ranked, curated, options.limit);
}

/**
 * Products by units sold, most first.
 *
 * Ties break on product id, so the order is stable between requests rather
 * than whatever the database returns first. Archived, inactive and unpublished
 * products drop out in `getProductsByIds`, which applies the storefront's
 * visibility rule - a product that sold well and was then withdrawn is not
 * advertised.
 */
async function rankedBySales(): Promise<readonly ProductCardData[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { productId: { not: null }, order: { status: { in: [...SOLD] } } },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: 'desc' } }, { productId: 'asc' }],
  });

  const ids = rows.map((row) => row.productId).filter((id): id is string => id !== null);

  return getProductsByIds(ids);
}

/** The owner's picks, in the curator's order. Empty when the collection is missing. */
async function curatedPicks(): Promise<readonly ProductCardData[]> {
  const collection = await getCollection(BEST_SELLERS_SLUG);

  return collection ? getProductsByCollection(collection.id) : [];
}

/**
 * Sales first, then the curated picks not already listed, up to `limit`.
 *
 * Pure, and exported for its unit test: the order of this merge is the whole
 * claim the band makes.
 */
export function mergeRanking(
  ranked: readonly ProductCardData[],
  curated: readonly ProductCardData[],
  limit?: number,
): readonly ProductCardData[] {
  const seen = new Set<string>();
  const merged: ProductCardData[] = [];

  for (const product of [...ranked, ...curated]) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    merged.push(product);
  }

  return limit === undefined ? merged : merged.slice(0, limit);
}
