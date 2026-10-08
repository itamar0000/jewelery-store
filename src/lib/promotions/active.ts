import { cache } from 'react';

import { prisma } from '@/lib/db';

import type { ActivePromotion } from './pricing';

/**
 * The sales running now (D4D.33): switched on, not archived, inside their
 * dates. Read once per request and shared by every price on the page.
 */
export const getActivePromotions = cache(async (): Promise<ActivePromotion[]> => {
  const now = new Date();
  const rows = await prisma.promotion.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      discountType: { in: ['PERCENTAGE', 'FIXED_AMOUNT'] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    select: {
      id: true,
      nameHe: true,
      discountType: true,
      discountValue: true,
      appliesTo: true,
      targets: { select: { productId: true, categoryId: true, collectionId: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    nameHe: row.nameHe,
    discountType: row.discountType as ActivePromotion['discountType'],
    discountValue: row.discountValue,
    appliesTo: row.appliesTo,
    productIds: new Set(row.targets.flatMap((t) => (t.productId ? [t.productId] : []))),
    categoryIds: new Set(row.targets.flatMap((t) => (t.categoryId ? [t.categoryId] : []))),
    collectionIds: new Set(row.targets.flatMap((t) => (t.collectionId ? [t.collectionId] : []))),
  }));
});
