import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { resetDb, testPrisma } from '@/test/db';

/**
 * Catalog query integration tests, against a real PostgreSQL.
 *
 * WHY THE MOCK. `queries.ts` imports the singleton from `@/lib/db`, which is
 * bound to DATABASE_URL - the development database holding the demo seed.
 * Pointing it at `testPrisma` here lets the queries run unmodified against the
 * isolated test database, so production code needs no injected-client
 * parameter threaded through every function purely to be testable.
 *
 * WHAT IS WORTH ASSERTING. Not "does Prisma work", but the DERIVATIONS the
 * mappers perform, because those are the ones that silently produce a wrong
 * price or a false stock claim on a customer-facing page:
 *   - visibility filtering (a draft must never reach a customer)
 *   - descendant categories rolling up into their parent
 *   - the card price being the LOWEST sellable variant price
 *   - badges coming from real collection membership and real availability
 *   - low-stock messaging appearing ONLY on genuinely low stock
 *   - a missing inventory row failing CLOSED
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const {
  countProductsByCategory,
  getCategories,
  getCategoryBySlug,
  getCollection,
  getProductBySlug,
  getProductsByCategory,
  getProductsByCollection,
  getProductVariants,
} = await import('./queries');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function seedCategory(slug: string, nameHe: string, parentId?: string) {
  return testPrisma.category.create({
    data: { slug, nameHe, parentId: parentId ?? null, isActive: true },
  });
}

/** A published product with one variant, stocked as specified. */
async function seedProduct(options: {
  slug: string;
  categoryId: string;
  basePriceAgorot?: number;
  onHand?: number;
  policy?: 'DENY' | 'MADE_TO_ORDER';
  lowStockThreshold?: number | null;
  isActive?: boolean;
  publishedAt?: Date | null;
  variantPrices?: readonly number[];
}) {
  const product = await testPrisma.product.create({
    data: {
      slug: options.slug,
      nameHe: `מוצר ${options.slug}`,
      primaryCategoryId: options.categoryId,
      productType: 'RING',
      basePriceAgorot: options.basePriceAgorot ?? 100_000,
      isActive: options.isActive ?? true,
      publishedAt: options.publishedAt === undefined ? new Date() : options.publishedAt,
      lowStockThreshold: options.lowStockThreshold ?? null,
    },
  });

  const prices = options.variantPrices ?? [options.basePriceAgorot ?? 100_000];

  for (const [index, price] of prices.entries()) {
    await testPrisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${options.slug}-${index}`,
        priceAgorot: price,
        optionSignature: computeOptionSignature([`${options.slug}-${index}`]),
        position: index,
        inventory: {
          create: {
            onHand: options.onHand ?? 0,
            policy: options.policy ?? 'MADE_TO_ORDER',
            lowStockThreshold: options.lowStockThreshold ?? null,
          },
        },
      },
    });
  }

  return product;
}

describe('getCategoryBySlug', () => {
  it('returns a root category with its children', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedCategory('engagement-rings', 'טבעות אירוסין', rings.id);

    const found = await getCategoryBySlug('rings');

    expect(found?.nameHe).toBe('טבעות');
    expect(found?.href).toBe('/rings');
    expect(found?.children.map((child) => child.slug)).toEqual(['engagement-rings']);
  });

  it('builds a nested href and an ancestor for a child', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedCategory('engagement-rings', 'טבעות אירוסין', rings.id);

    const child = await getCategoryBySlug('engagement-rings');

    expect(child?.href).toBe('/rings/engagement-rings');
    expect(child?.ancestors.map((a) => a.slug)).toEqual(['rings']);
  });

  it('returns null for an unknown slug, so the route can 404', async () => {
    expect(await getCategoryBySlug('nope')).toBeNull();
  });

  it('hides an inactive category', async () => {
    await testPrisma.category.create({
      data: { slug: 'hidden', nameHe: 'מוסתר', isActive: false },
    });

    expect(await getCategoryBySlug('hidden')).toBeNull();
  });

  it('lists only root categories', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedCategory('engagement-rings', 'טבעות אירוסין', rings.id);

    expect((await getCategories()).map((c) => c.slug)).toEqual(['rings']);
  });
});

describe('getProductsByCategory', () => {
  it('includes products of descendant categories', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const engagement = await seedCategory('engagement-rings', 'אירוסין', rings.id);

    await seedProduct({ slug: 'child-product', categoryId: engagement.id });

    // A parent that showed nothing while its children held everything would
    // look broken to a customer.
    const products = await getProductsByCategory(rings.id);
    expect(products.map((p) => p.slug)).toEqual(['child-product']);
    expect(await countProductsByCategory(rings.id)).toBe(1);
  });

  describe('visibility', () => {
    it('excludes an unpublished draft', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({ slug: 'draft', categoryId: rings.id, publishedAt: null });

      expect(await getProductsByCategory(rings.id)).toHaveLength(0);
      expect(await countProductsByCategory(rings.id)).toBe(0);
    });

    it('excludes an inactive product', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({ slug: 'inactive', categoryId: rings.id, isActive: false });

      expect(await getProductsByCategory(rings.id)).toHaveLength(0);
    });

    it('excludes an archived product', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      const product = await seedProduct({ slug: 'archived', categoryId: rings.id });
      await testPrisma.product.update({
        where: { id: product.id },
        data: { archivedAt: new Date() },
      });

      expect(await getProductsByCategory(rings.id)).toHaveLength(0);
    });
  });

  describe('card price', () => {
    it('is the LOWEST variant price, never one the customer cannot get', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({
        slug: 'ranged',
        categoryId: rings.id,
        variantPrices: [589_000, 489_000, 629_000],
      });

      const [card] = await getProductsByCategory(rings.id);
      expect(Number(card?.price)).toBe(489_000);
    });
  });

  describe('stock messaging', () => {
    it('says nothing about stock when no threshold is configured', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({ slug: 'plain', categoryId: rings.id, onHand: 1 });

      const [card] = await getProductsByCategory(rings.id);
      expect(card?.stockNotice).toBeUndefined();
    });

    it('emits a notice only when stock is genuinely at or below the threshold', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({
        slug: 'low',
        categoryId: rings.id,
        onHand: 2,
        lowStockThreshold: 2,
        policy: 'DENY',
      });

      const [card] = await getProductsByCategory(rings.id);
      expect(card?.stockNotice).toContain('2');
    });

    it('stays silent when stock is above the threshold', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({
        slug: 'ample',
        categoryId: rings.id,
        onHand: 20,
        lowStockThreshold: 2,
        policy: 'DENY',
      });

      const [card] = await getProductsByCategory(rings.id);
      expect(card?.stockNotice).toBeUndefined();
    });
  });

  describe('badges', () => {
    it('marks made-to-order only when every variant is made to order', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      await seedProduct({ slug: 'mto', categoryId: rings.id, onHand: 0 });

      const [card] = await getProductsByCategory(rings.id);
      expect(card?.badges).toContain('made-to-order');
    });

    it('derives new and best-seller from real collection membership', async () => {
      const rings = await seedCategory('rings', 'טבעות');
      const product = await seedProduct({ slug: 'featured', categoryId: rings.id, onHand: 5 });

      const collection = await testPrisma.collection.create({
        data: { slug: 'best-sellers', nameHe: 'רבי מכר', isActive: true },
      });
      await testPrisma.productCollection.create({
        data: { productId: product.id, collectionId: collection.id },
      });

      const [card] = await getProductsByCategory(rings.id);
      expect(card?.badges).toContain('best-seller');
    });
  });
});

describe('getProductBySlug', () => {
  it('returns null for an unknown slug', async () => {
    expect(await getProductBySlug('nope')).toBeNull();
  });

  it('returns null for an unpublished product, exactly like a missing one', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedProduct({ slug: 'draft', categoryId: rings.id, publishedAt: null });

    expect(await getProductBySlug('draft')).toBeNull();
  });

  it('exposes a price range across variants', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedProduct({
      slug: 'ranged',
      categoryId: rings.id,
      variantPrices: [489_000, 589_000],
    });

    const product = await getProductBySlug('ranged');
    expect(Number(product?.priceRange.min)).toBe(489_000);
    expect(Number(product?.priceRange.max)).toBe(589_000);
  });

  it('resolves availability per variant from real inventory', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    await seedProduct({
      slug: 'stocked',
      categoryId: rings.id,
      onHand: 3,
      policy: 'DENY',
    });

    const product = await getProductBySlug('stocked');
    expect(product?.variants[0]?.availability.state).toBe('IN_STOCK');
    expect(product?.variants[0]?.availability.available).toBe(3);
  });

  /**
   * A data gap must not read as "available". Showing an unstocked item as
   * purchasable is the expensive direction to be wrong in.
   */
  it('fails CLOSED when a variant has no inventory row', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const product = await seedProduct({ slug: 'gap', categoryId: rings.id });
    await testPrisma.inventory.deleteMany({
      where: { variant: { productId: product.id } },
    });

    const detail = await getProductBySlug('gap');
    expect(detail?.variants[0]?.availability.available).toBe(0);
    expect(detail?.variants[0]?.availability.state).not.toBe('IN_STOCK');
  });
});

describe('getProductVariants', () => {
  it('returns the variants of a visible product', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const product = await seedProduct({
      slug: 'multi',
      categoryId: rings.id,
      variantPrices: [100_000, 200_000],
    });

    expect(await getProductVariants(product.id)).toHaveLength(2);
  });

  it('returns nothing for an unpublished product', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const product = await seedProduct({
      slug: 'draft',
      categoryId: rings.id,
      publishedAt: null,
    });

    expect(await getProductVariants(product.id)).toHaveLength(0);
  });
});

describe('collections', () => {
  it('returns products in the curator order', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const first = await seedProduct({ slug: 'second-added', categoryId: rings.id });
    const second = await seedProduct({ slug: 'first-shown', categoryId: rings.id });

    const collection = await testPrisma.collection.create({
      data: { slug: 'new-arrivals', nameHe: 'חדש', isActive: true },
    });

    await testPrisma.productCollection.createMany({
      data: [
        { productId: first.id, collectionId: collection.id, position: 2 },
        { productId: second.id, collectionId: collection.id, position: 1 },
      ],
    });

    const products = await getProductsByCollection(collection.id);
    expect(products.map((p) => p.slug)).toEqual(['first-shown', 'second-added']);
  });

  it('returns null for an unknown collection', async () => {
    expect(await getCollection('nope')).toBeNull();
  });

  it('excludes unpublished products from a collection', async () => {
    const rings = await seedCategory('rings', 'טבעות');
    const draft = await seedProduct({
      slug: 'draft',
      categoryId: rings.id,
      publishedAt: null,
    });

    const collection = await testPrisma.collection.create({
      data: { slug: 'bridal', nameHe: 'כלה', isActive: true },
    });
    await testPrisma.productCollection.create({
      data: { productId: draft.id, collectionId: collection.id },
    });

    expect(await getProductsByCollection(collection.id)).toHaveLength(0);
  });
});
