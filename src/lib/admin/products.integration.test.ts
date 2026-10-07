import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing } from '@/test/ring-fixture';

/**
 * Diamond sizes and prices, against a real PostgreSQL (D4D.24).
 *
 * The promises: the size a piece is listed in becomes the base choice without
 * touching its variants' ids, SKUs or prices; each new size mirrors every
 * base variant at the owner's price, with the same photographs and its own
 * diamond weight; withdrawing a size archives, never deletes; and the price
 * range the shop filters on follows every change.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const {
  addDiamondSize,
  normalizeCarat,
  removeDiamondSize,
  updateVariantPrices,
  DIAMOND_SIZE_CODE,
} = await import('./products');
const { getProductVariants } = await import('@/lib/catalog/queries');

let productId: string;
let baseVariantIds: string[];

beforeEach(async () => {
  await resetDb();
  const ring = await createPersonalisedRing();
  productId = ring.productId;
  const variants = await testPrisma.productVariant.findMany({
    where: { productId },
    orderBy: { position: 'asc' },
  });
  baseVariantIds = variants.map((variant) => variant.id);
  await testPrisma.productImage.create({
    data: {
      productId,
      variantId: baseVariantIds[0]!,
      storageKey: 'public/products/test/yellow-main.jpg',
      altHe: 'טבעת בזהב צהוב',
      position: 1,
      isPrimary: true,
    },
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('normalizeCarat', () => {
  it('writes a weight with two decimals and refuses nonsense', () => {
    expect(normalizeCarat('0.7')).toBe('0.70');
    expect(normalizeCarat('.5')).toBe('0.50');
    expect(normalizeCarat('1,25')).toBe('1.25');
    expect(normalizeCarat('0')).toBeNull();
    expect(normalizeCarat('abc')).toBeNull();
    expect(normalizeCarat('25')).toBeNull();
  });
});

describe('addDiamondSize', () => {
  it('makes the listed size the base and mirrors every variant at the new size', async () => {
    const before = await testPrisma.productVariant.findMany({ where: { productId } });

    const result = await addDiamondSize({
      productId,
      carat: '0.70',
      priceDifferenceAgorot: 120_000,
    });
    expect(result).toEqual({ ok: true, created: before.length });

    const option = await testPrisma.productOption.findFirstOrThrow({
      where: { productId, code: DIAMOND_SIZE_CODE },
      include: { values: { orderBy: { position: 'asc' } } },
    });
    expect(option.values.map((value) => value.value)).toEqual(['0.50', '0.70']);

    // The original variants are untouched but for their new link to the base size.
    for (const original of before) {
      const now = await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: original.id },
        include: { optionValues: true },
      });
      expect(now.sku).toBe(original.sku);
      expect(now.priceAgorot).toBe(original.priceAgorot);
      expect(now.optionValues.map((link) => link.valueId)).toContain(option.values[0]!.id);
    }

    const mirrored = await testPrisma.productVariant.findMany({
      where: { productId, id: { notIn: baseVariantIds } },
      include: { diamondSpec: true, images: true, inventory: true },
    });
    expect(mirrored).toHaveLength(before.length);
    for (const variant of mirrored) {
      expect(variant.sku).toMatch(/-070CT$/);
      expect(String(variant.diamondSpec?.totalCaratWeight)).toBe('0.7');
      expect(variant.inventory?.policy).toBe('MADE_TO_ORDER');
    }
    const yellowTwin = mirrored.find((variant) => variant.sku.startsWith('RING-Y-'))!;
    expect(yellowTwin.priceAgorot).toBe(100_000 + 120_000);
    expect(yellowTwin.images.map((image) => image.storageKey)).toEqual([
      'public/products/test/yellow-main.jpg',
    ]);

    const product = await testPrisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.maxPriceAgorot).toBe(
      Math.max(...mirrored.map((variant) => variant.priceAgorot ?? 0)),
    );

    // The shop sees the size on each variant.
    const views = await getProductVariants(productId);
    const sizes = views.map((view) => view.diamond?.totalCaratWeight ?? '0.50');
    expect(sizes.filter((size) => Number(size) === 0.7)).toHaveLength(before.length);
  });

  it('refuses a size that is already offered', async () => {
    await addDiamondSize({ productId, carat: '0.70', priceDifferenceAgorot: 100 });
    expect(await addDiamondSize({ productId, carat: '0.70', priceDifferenceAgorot: 100 })).toEqual({
      ok: false,
      reason: 'exists',
    });
    expect(await addDiamondSize({ productId, carat: '0.50', priceDifferenceAgorot: 100 })).toEqual({
      ok: false,
      reason: 'exists',
    });
  });

  it('refuses a difference that would make a price zero or less, and writes nothing', async () => {
    const result = await addDiamondSize({
      productId,
      carat: '0.30',
      priceDifferenceAgorot: -500_000,
    });
    expect(result).toEqual({ ok: false, reason: 'negative' });
    expect(
      await testPrisma.productOption.count({ where: { productId, code: DIAMOND_SIZE_CODE } }),
    ).toBe(0);
  });
});

describe('removeDiamondSize', () => {
  it('archives the size, keeps the base, and brings it back if offered again', async () => {
    await addDiamondSize({ productId, carat: '0.70', priceDifferenceAgorot: 120_000 });
    const values = await testPrisma.productOptionValue.findMany({
      where: { option: { productId, code: DIAMOND_SIZE_CODE } },
    });
    const base = values.find((value) => value.value === '0.50')!;
    const larger = values.find((value) => value.value === '0.70')!;

    expect(await removeDiamondSize(productId, base.id)).toBe('base');
    expect(await removeDiamondSize(productId, larger.id)).toBe('removed');

    const archived = await testPrisma.productVariant.findMany({
      where: { productId, optionValues: { some: { valueId: larger.id } } },
    });
    expect(archived.every((variant) => variant.archivedAt !== null)).toBe(true);

    const again = await addDiamondSize({ productId, carat: '0.70', priceDifferenceAgorot: 90_000 });
    expect(again).toEqual({ ok: true, created: archived.length });
    const revived = await testPrisma.productVariant.findMany({
      where: { productId, optionValues: { some: { valueId: larger.id } } },
    });
    expect(revived.map((variant) => variant.id).sort()).toEqual(
      archived.map((variant) => variant.id).sort(),
    );
    expect(revived.every((variant) => variant.archivedAt === null)).toBe(true);
  });
});

describe('updateVariantPrices', () => {
  it('saves prices and moves the price range with them', async () => {
    await updateVariantPrices(
      productId,
      baseVariantIds.map((variantId, index) => ({
        variantId,
        priceAgorot: 200_000 + index * 10_000,
      })),
    );
    const product = await testPrisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.minPriceAgorot).toBe(200_000);
    expect(product.maxPriceAgorot).toBe(200_000 + (baseVariantIds.length - 1) * 10_000);
  });

  it('ignores a variant of another product', async () => {
    const other = await createPersonalisedRing();
    const foreign = await testPrisma.productVariant.findFirstOrThrow({
      where: { productId: other.productId },
    });
    const changed = await updateVariantPrices(productId, [
      { variantId: foreign.id, priceAgorot: 1 },
    ]);
    expect(changed).toBe(0);
    const untouched = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: foreign.id },
    });
    expect(untouched.priceAgorot).not.toBe(1);
  });
});
