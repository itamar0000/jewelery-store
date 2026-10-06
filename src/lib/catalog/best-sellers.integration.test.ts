import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCardData } from '@/components/product/types';
import type { OrderStatus } from '@/generated/prisma/client';
import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { fromShekels } from '@/lib/money';
import { resetDb, testPrisma } from '@/test/db';
import { createCustomer, createOrder } from '@/test/factories';

/**
 * The best-sellers ranking, against a real PostgreSQL.
 *
 * What it must get right is the claim "רבי מכר": sold units lead, and only
 * orders that are genuinely sales count. Today no order exists, and the band
 * must then be exactly the curated collection it was before the ranking
 * existed.
 *
 * Same `@/lib/db` mock as queries.integration.test.ts, for the same reason.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { getBestSellers, mergeRanking, BEST_SELLERS_SLUG } = await import('./best-sellers');

let categoryId: string;

beforeEach(async () => {
  await resetDb();

  const category = await testPrisma.category.create({
    data: { slug: 'rings', nameHe: 'טבעות', isActive: true },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

/** A published, sellable product with one variant. */
async function product(slug: string, data: { isActive?: boolean } = {}) {
  return testPrisma.product.create({
    data: {
      slug,
      nameHe: `מוצר ${slug}`,
      primaryCategoryId: categoryId,
      productType: 'RING',
      basePriceAgorot: 100_000,
      isActive: data.isActive ?? true,
      publishedAt: new Date(),
      variants: {
        create: {
          sku: `${slug}-0`,
          priceAgorot: 100_000,
          optionSignature: computeOptionSignature([slug]),
          inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
        },
      },
    },
  });
}

/** The owner's picks, in this order. */
async function curate(...productIds: string[]) {
  const collection = await testPrisma.collection.create({
    data: { slug: BEST_SELLERS_SLUG, nameHe: 'רבי מכר', isActive: true },
  });
  await testPrisma.productCollection.createMany({
    data: productIds.map((productId, position) => ({
      productId,
      collectionId: collection.id,
      position,
    })),
  });
}

/** One order line of `quantity` units, its order at `status`. */
async function sell(productId: string, quantity: number, status: OrderStatus = 'PAID') {
  const customer = await createCustomer();
  const order = await createOrder({ customerId: customer.id });
  await testPrisma.order.update({ where: { id: order.id }, data: { status } });

  await testPrisma.orderItem.create({
    data: {
      orderId: order.id,
      productId,
      productNameHe: 'מוצר',
      variantLabelHe: '14K זהב צהוב',
      sku: 'SKU-1',
      productSnapshot: {},
      fulfillment: 'MADE_TO_ORDER',
      quantity,
      unitPriceAgorot: 100_000,
      lineTotalAgorot: 100_000 * quantity,
    },
  });
}

const slugs = (products: readonly ProductCardData[]) => products.map((p) => p.slug);

describe('getBestSellers', () => {
  it('is the curated collection, in the curator order, while nothing has sold', async () => {
    const a = await product('a');
    const b = await product('b');
    await curate(b.id, a.id);

    expect(slugs(await getBestSellers())).toEqual(['b', 'a']);
  });

  it('is empty, not an error, with no sales and no collection', async () => {
    expect(await getBestSellers()).toEqual([]);
  });

  it('puts what sold first, most units first, then the curated picks', async () => {
    const curated = await product('curated');
    const steady = await product('steady');
    const popular = await product('popular');
    await curate(curated.id);

    await sell(steady.id, 1);
    await sell(popular.id, 2);
    await sell(popular.id, 1, 'DELIVERED');

    expect(slugs(await getBestSellers())).toEqual(['popular', 'steady', 'curated']);
  });

  it('lists a product once, at its sales rank, when it is also curated', async () => {
    const a = await product('a');
    const b = await product('b');
    await curate(a.id, b.id);
    await sell(b.id, 1);

    expect(slugs(await getBestSellers())).toEqual(['b', 'a']);
  });

  /*
   * An unpaid order is not a sale, and a cancelled or refunded one was undone.
   * Counting either would rank by intent or by returns.
   */
  it('counts only orders that are sales', async () => {
    const paid = await product('paid');
    const unpaid = await product('unpaid');
    const cancelled = await product('cancelled');
    const refunded = await product('refunded');

    await sell(paid.id, 1, 'PROCESSING');
    await sell(unpaid.id, 5, 'PENDING_PAYMENT');
    await sell(cancelled.id, 5, 'CANCELLED');
    await sell(refunded.id, 5, 'REFUNDED');

    expect(slugs(await getBestSellers())).toEqual(['paid']);
  });

  it('does not advertise a product that has left the storefront', async () => {
    const withdrawn = await product('withdrawn', { isActive: false });
    const live = await product('live');
    await sell(withdrawn.id, 9);
    await sell(live.id, 1);

    expect(slugs(await getBestSellers())).toEqual(['live']);
  });

  it('honours the limit', async () => {
    const a = await product('a');
    const b = await product('b');
    const c = await product('c');
    await curate(a.id, b.id, c.id);

    expect(slugs(await getBestSellers({ limit: 2 }))).toEqual(['a', 'b']);
  });
});

describe('mergeRanking', () => {
  const card = (id: string): ProductCardData => ({
    id,
    slug: id,
    name: id,
    price: fromShekels(1000),
  });

  it('keeps sales order, then appends unseen curated picks', () => {
    const merged = mergeRanking([card('x'), card('y')], [card('y'), card('z')]);

    expect(merged.map((p) => p.id)).toEqual(['x', 'y', 'z']);
  });

  it('cuts at the limit', () => {
    const merged = mergeRanking([card('x')], [card('y'), card('z')], 2);

    expect(merged.map((p) => p.id)).toEqual(['x', 'y']);
  });
});
