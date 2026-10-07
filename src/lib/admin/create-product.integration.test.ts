import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDb, testPrisma } from '@/test/db';

/**
 * A new product and its photographs, from the admin (D4D.25), against a real
 * PostgreSQL. Storage is replaced by a stub: what is under test is which rows
 * are written, not the bucket.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

let uploads = 0;
vi.mock('@/lib/media', () => ({
  requireMediaStorage: () => ({
    createUpload: async () => {
      uploads += 1;
      return {
        url: 'https://storage.test/put',
        key: `public/products/test/photo-${uploads}.jpg`,
        headers: { 'Content-Type': 'image/jpeg' },
        expiresAt: new Date(),
      };
    },
  }),
}));

const { createProduct } = await import('./create-product');
const {
  addProductImage,
  ALL_GROUP,
  detectImageType,
  listImageGroups,
  moveProductImage,
  removeProductImage,
  setImageSimulation,
} = await import('./images');

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(120).fill(1)]);

let ringsCategoryId: string;

beforeEach(async () => {
  await resetDb();
  uploads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 200 })),
  );
  const root = await testPrisma.category.create({
    data: { slug: 'rings', nameHe: 'טבעות', isActive: true },
  });
  ringsCategoryId = (
    await testPrisma.category.create({
      data: {
        slug: 'engagement-rings',
        nameHe: 'טבעות אירוסין',
        isActive: true,
        parentId: root.id,
      },
    })
  ).id;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const RING = {
  nameHe: 'טבעת סוליטר אובלית',
  slug: 'oval-solitaire',
  categoryId: '',
  shortDescriptionHe: 'סוליטר אובלי עדין.',
  descriptionHe: '',
  colours: ['YELLOW', 'WHITE'] as ('YELLOW' | 'WHITE' | 'ROSE')[],
  priceAgorot: 489_000,
  prepDays: 21,
  diamond: {
    carat: '0.70',
    isLabGrown: true,
    shape: 'Oval',
    stoneCount: 1,
    color: 'G',
    clarity: 'VS1',
    cut: '',
  },
};

describe('createProduct', () => {
  it('builds a hidden 14K ring, one variant per colour, with sizes and its diamond', async () => {
    const result = await createProduct({ ...RING, categoryId: ringsCategoryId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const product = await testPrisma.product.findUniqueOrThrow({
      where: { id: result.productId },
      include: {
        options: { include: { values: true } },
        variants: { include: { inventory: true, optionValues: { include: { value: true } } } },
        diamondSpec: true,
        categories: true,
      },
    });
    expect(product).toMatchObject({
      slug: 'oval-solitaire',
      productType: 'RING',
      isActive: false,
      minPriceAgorot: 489_000,
      hasDiamonds: true,
    });
    expect(product.categories.map((link) => link.categoryId)).toEqual([ringsCategoryId]);
    expect(
      product.options.find((option) => option.code === 'gold_karat')?.values.map((v) => v.value),
    ).toEqual(['14K']);
    expect(product.options.find((option) => option.code === 'ring_size')?.isVariantAxis).toBe(
      false,
    );
    expect(product.variants.map((variant) => variant.sku).sort()).toEqual([
      'OVAL-SOLITAIRE-WHITE-14K',
      'OVAL-SOLITAIRE-YELLOW-14K',
    ]);
    expect(product.variants.every((variant) => variant.inventory?.policy === 'MADE_TO_ORDER')).toBe(
      true,
    );
    expect(String(product.diamondSpec?.totalCaratWeight)).toBe('0.7');
    expect(product.searchDocument).toContain('סוליטר');
  });

  it('refuses an address already taken', async () => {
    await createProduct({ ...RING, categoryId: ringsCategoryId });
    const again = await createProduct({ ...RING, categoryId: ringsCategoryId });
    expect(again.ok).toBe(false);
  });
});

describe('product photographs', () => {
  it('fills a colour group on every variant of that colour, in order, and manages it', async () => {
    const created = await createProduct({ ...RING, categoryId: ringsCategoryId });
    if (!created.ok) throw new Error('fixture');
    const productId = created.productId;

    for (const simulated of [false, true]) {
      expect(
        await addProductImage({
          productId,
          group: 'YELLOW',
          bytes: JPEG,
          simulated,
          width: 2000,
          height: 2000,
        }),
      ).toEqual({ ok: true });
    }
    await addProductImage({
      productId,
      group: ALL_GROUP,
      bytes: JPEG,
      simulated: false,
      width: null,
      height: null,
    });

    const yellow = await testPrisma.productVariant.findFirstOrThrow({
      where: { productId, sku: 'OVAL-SOLITAIRE-YELLOW-14K' },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    expect(
      yellow.images.map((image) => [image.position, image.isPrimary, image.isSimulation]),
    ).toEqual([
      [1, true, false],
      [2, false, true],
    ]);
    expect(yellow.images[1]?.altHe).toBe('טבעת סוליטר אובלית, זהב צהוב (הדמיה)');

    let groups = await listImageGroups(productId);
    expect(groups.map((group) => [group.key, group.images.length])).toEqual([
      ['YELLOW', 2],
      ['WHITE', 0],
      [ALL_GROUP, 1],
    ]);

    const [first, second] = groups[0]!.images;
    await moveProductImage(productId, 'YELLOW', second!.storageKey, 'earlier');
    await setImageSimulation(productId, 'YELLOW', second!.storageKey, false);
    groups = await listImageGroups(productId);
    expect(groups[0]!.images.map((image) => [image.storageKey, image.isSimulation])).toEqual([
      [second!.storageKey, false],
      [first!.storageKey, false],
    ]);

    await removeProductImage(productId, 'YELLOW', second!.storageKey);
    groups = await listImageGroups(productId);
    expect(groups[0]!.images.map((image) => [image.storageKey, image.position])).toEqual([
      [first!.storageKey, 1],
    ]);
  });

  it('refuses a file that is not an image, whatever it claims', async () => {
    const created = await createProduct({ ...RING, categoryId: ringsCategoryId });
    if (!created.ok) throw new Error('fixture');
    const text = new TextEncoder().encode('<html>'.repeat(30));
    expect(detectImageType(text)).toBeNull();
    expect(
      await addProductImage({
        productId: created.productId,
        group: 'YELLOW',
        bytes: text,
        simulated: false,
        width: null,
        height: null,
      }),
    ).toEqual({ ok: false, reason: 'type' });
    expect(uploads).toBe(0);
  });
});
