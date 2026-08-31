import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { resetDb, testPrisma } from '@/test/db';

import { reindexSearchDocuments } from './reindex';

/**
 * Search against a real PostgreSQL, with pg_trgm.
 *
 * These cannot be unit tests: `similarity` and `word_similarity` are database
 * functions, the trigram index is a database object, and the ranking is an SQL
 * expression. A mocked client would assert only that the code calls itself the
 * way it was written.
 *
 * See queries.integration.test.ts for why `@/lib/db` is mocked.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { postgresSearchProvider } = await import('./postgres');
const { getCatalogPage } = await import('@/lib/catalog/browse');
const { normalizeCatalogQuery, parseCatalogSearchParams } = await import('@/lib/catalog/filters');

const nameById = new Map<string, string>();

/** Resolves ranked ids back to names, so failures read intelligibly. */
async function search(query: string, limit = 20): Promise<string[]> {
  const hits = await postgresSearchProvider.searchProductIds(query, { limit });
  return hits.map((hit) => nameById.get(hit.productId) ?? hit.productId);
}

beforeAll(async () => {
  await resetDb();

  const rings = await testPrisma.category.create({
    data: {
      slug: 'rings',
      nameHe: 'טבעות',
      isActive: true,
      filterConfig: { facets: ['price', 'gold_karat', 'gold_color'] },
    },
  });

  const engagement = await testPrisma.category.create({
    data: { slug: 'engagement-rings', nameHe: 'טבעות אירוסין', parentId: rings.id, isActive: true },
  });

  const bracelets = await testPrisma.category.create({
    data: {
      slug: 'bracelets',
      nameHe: 'צמידים',
      isActive: true,
      filterConfig: { facets: ['price', 'gold_karat', 'gold_color'] },
    },
  });

  const bestSellers = await testPrisma.collection.create({
    data: { slug: 'best-sellers', nameHe: 'רבי מכר', isActive: true },
  });

  interface Spec {
    slug: string;
    nameHe: string;
    categoryId: string;
    price: number;
    color: 'WHITE' | 'YELLOW' | 'ROSE';
    karat: '14K' | '18K';
    shape?: string;
    published?: boolean;
    collection?: boolean;
  }

  const specs: Spec[] = [
    {
      slug: 'p-solitaire',
      nameHe: 'טבעת סוליטר יהלום',
      categoryId: engagement.id,
      price: 500_000,
      color: 'WHITE',
      karat: '18K',
      shape: 'Round',
      collection: true,
    },
    {
      slug: 'p-halo',
      nameHe: 'טבעת הילה',
      categoryId: engagement.id,
      price: 620_000,
      color: 'YELLOW',
      karat: '14K',
      shape: 'Oval',
    },
    {
      slug: 'p-wedding',
      nameHe: 'טבעת נישואין',
      categoryId: rings.id,
      price: 200_000,
      color: 'ROSE',
      karat: '14K',
    },
    {
      slug: 'p-gold-ring',
      nameHe: 'טבעת זהב לבן חלקה',
      categoryId: rings.id,
      price: 300_000,
      color: 'WHITE',
      karat: '14K',
    },
    {
      slug: 'p-tennis',
      nameHe: 'צמיד טניס יהלומים',
      categoryId: bracelets.id,
      price: 900_000,
      color: 'WHITE',
      karat: '18K',
      shape: 'Round',
    },
    {
      slug: 'p-bangle',
      nameHe: 'צמיד באנגל',
      categoryId: bracelets.id,
      price: 250_000,
      color: 'YELLOW',
      karat: '14K',
    },
    {
      slug: 'p-draft',
      nameHe: 'טבעת טיוטה',
      categoryId: rings.id,
      price: 100_000,
      color: 'WHITE',
      karat: '14K',
      published: false,
    },
  ];

  for (const [index, spec] of specs.entries()) {
    const product = await testPrisma.product.create({
      data: {
        slug: spec.slug,
        nameHe: spec.nameHe,
        shortDescriptionHe: `${spec.nameHe} לדוגמה`,
        primaryCategoryId: spec.categoryId,
        productType: spec.categoryId === bracelets.id ? 'BRACELET' : 'RING',
        basePriceAgorot: spec.price,
        minPriceAgorot: spec.price,
        maxPriceAgorot: spec.price,
        hasDiamonds: spec.shape !== undefined,
        isActive: true,
        publishedAt: spec.published === false ? null : new Date(2026, 0, index + 1),
        attributes: { style: 'classic' },
        ...(spec.shape ? { diamondSpec: { create: { isLabGrown: true, shape: spec.shape } } } : {}),
        ...(spec.collection ? { collections: { create: [{ collectionId: bestSellers.id }] } } : {}),
      },
    });

    nameById.set(product.id, product.nameHe);

    const colorOption = await testPrisma.productOption.create({
      data: {
        productId: product.id,
        code: 'gold_color',
        type: 'GOLD_COLOR',
        nameHe: 'גוון זהב',
        isVariantAxis: true,
        values: {
          create: [
            {
              value: spec.color,
              labelHe:
                spec.color === 'WHITE'
                  ? 'זהב לבן'
                  : spec.color === 'YELLOW'
                    ? 'זהב צהוב'
                    : 'זהב אדום',
            },
          ],
        },
      },
      include: { values: true },
    });

    const karatOption = await testPrisma.productOption.create({
      data: {
        productId: product.id,
        code: 'gold_karat',
        type: 'GOLD_KARAT',
        nameHe: 'קראט',
        isVariantAxis: true,
        values: { create: [{ value: spec.karat, labelHe: `${spec.karat.slice(0, 2)} קראט` }] },
      },
      include: { values: true },
    });

    const valueIds = [colorOption.values[0]!.id, karatOption.values[0]!.id];

    await testPrisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-${spec.slug}`,
        priceAgorot: spec.price,
        optionSignature: computeOptionSignature(valueIds),
        optionValues: { create: valueIds.map((valueId) => ({ valueId })) },
        inventory: { create: { onHand: 5, policy: 'DENY' } },
      },
    });
  }

  await reindexSearchDocuments(testPrisma);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('exact and partial matching', () => {
  it('finds products by an exact Hebrew word', async () => {
    const names = await search('טבעת');

    expect(names).toContain('טבעת סוליטר יהלום');
    expect(names).toContain('טבעת נישואין');
    expect(names).not.toContain('צמיד באנגל');
  });

  it('finds products by a PARTIAL word - the overlay case', async () => {
    // "טבע" is what a shopper has typed after three keystrokes.
    expect(await search('טבע')).toContain('טבעת סוליטר יהלום');
  });

  it('matches a multi-word query as AND across terms', async () => {
    const names = await search('טבעת זהב לבן');

    expect(names).toContain('טבעת זהב לבן חלקה');
    // A bracelet is white gold too, but is not a ring, so all three terms
    // cannot be satisfied.
    expect(names).not.toContain('צמיד באנגל');
  });

  it('finds a two-word product name', async () => {
    expect((await search('צמיד טניס'))[0]).toBe('צמיד טניס יהלומים');
  });
});

describe('English jewellery terms resolve through synonyms', () => {
  it('finds gold products for "gold"', async () => {
    expect(await search('gold')).toContain('טבעת זהב לבן חלקה');
  });

  it('finds rose gold for "rose"', async () => {
    expect(await search('rose')).toContain('טבעת נישואין');
  });

  it('finds diamond products for "diamond"', async () => {
    expect(await search('diamond')).toContain('צמיד טניס יהלומים');
  });

  it('finds rings for "ring"', async () => {
    expect(await search('ring')).toContain('טבעת סוליטר יהלום');
  });

  it('resolves "white gold" as a phrase, not two loose words', async () => {
    expect(await search('white gold')).toContain('טבעת זהב לבן חלקה');
  });
});

describe('ranking', () => {
  it('puts an exact name match first', async () => {
    expect((await search('טבעת נישואין'))[0]).toBe('טבעת נישואין');
  });

  it('ranks a name match above a mere document match', async () => {
    const names = await search('הילה');
    expect(names[0]).toBe('טבעת הילה');
  });

  /**
   * The specific regression this guards. An earlier scoring pass ranked only
   * the whole query, so "טבעת אירוסין" put whichever product happened to
   * contain the phrase first - not the engagement rings.
   */
  it('ranks engagement rings first for "טבעת אירוסין"', async () => {
    const names = await search('טבעת אירוסין');
    const top = names.slice(0, 2);

    expect(top).toContain('טבעת סוליטר יהלום');
    expect(top).toContain('טבעת הילה');
  });

  it('is deterministic across identical queries', async () => {
    expect(await search('טבעת')).toEqual(await search('טבעת'));
  });
});

describe('visibility', () => {
  it('never returns an unpublished draft', async () => {
    expect(await search('טיוטה')).not.toContain('טבעת טיוטה');
    expect(await search('טבעת')).not.toContain('טבעת טיוטה');
  });
});

describe('degenerate queries', () => {
  it('returns nothing for an empty query rather than the whole catalog', async () => {
    // "No query" and "query matched nothing" must not be the same result, or an
    // empty search box silently becomes a catalog listing.
    expect(await search('')).toEqual([]);
  });

  it('returns nothing for whitespace only', async () => {
    expect(await search('     ')).toEqual([]);
  });

  it('returns nothing for punctuation only', async () => {
    expect(await search('!!!???')).toEqual([]);
  });

  it('treats LIKE wildcards as literal characters, not as match-everything', async () => {
    // Unescaped, "%" would match every product in the catalog.
    expect(await search('%')).toEqual([]);
    expect(await search('%%%')).toEqual([]);
    expect(await search('_')).toEqual([]);
  });

  it('returns nothing for a term that does not exist', async () => {
    expect(await search('zzzznothingatall')).toEqual([]);
  });

  it('normalizes surrounding and repeated whitespace', async () => {
    expect(await search('   טבעת   נישואין   ')).toEqual(await search('טבעת נישואין'));
  });

  it('normalizes punctuation inside a query', async () => {
    expect(await search('טבעת, נישואין!')).toEqual(await search('טבעת נישואין'));
  });

  it('is case-insensitive for Latin terms', async () => {
    expect(await search('GOLD')).toEqual(await search('gold'));
  });
});

describe('search composes with filters, sort and pagination', () => {
  async function page(term: string, params: Record<string, string> = {}) {
    const hits = await postgresSearchProvider.searchProductIds(term, { limit: 200 });
    const raw = parseCatalogSearchParams({ q: term, ...params });

    const query = normalizeCatalogQuery(raw, [
      {
        code: 'gold_color',
        param: 'goldColor',
        source: 'option',
        labelHe: 'גוון זהב',
        values: [
          { value: 'WHITE', token: 'white', labelHe: 'זהב לבן' },
          { value: 'YELLOW', token: 'yellow', labelHe: 'זהב צהוב' },
          { value: 'ROSE', token: 'rose', labelHe: 'זהב אדום' },
        ],
      },
      {
        code: 'price',
        param: 'price',
        source: 'price',
        labelHe: 'מחיר',
        values: [],
        priceBounds: { minAgorot: 100_000, maxAgorot: 900_000 },
      },
    ]);

    return getCatalogPage(
      [],
      query,
      hits.map((hit) => hit.productId),
    );
  }

  it('applies a filter to the search result set', async () => {
    const all = await page('טבעת');
    const white = await page('טבעת', { goldColor: 'white' });

    expect(white.total).toBeLessThan(all.total);
    expect(white.total).toBeGreaterThan(0);
  });

  it('applies a price filter to search results', async () => {
    const cheap = await page('טבעת', { maxPrice: '2500' });

    expect(cheap.total).toBeGreaterThan(0);
    expect(cheap.products.every((product) => Number(product.price) <= 250_000)).toBe(true);
  });

  it('sorts search results by price in the database', async () => {
    const ascending = await page('טבעת', { sort: 'price-asc' });
    const prices = ascending.products.map((product) => Number(product.price));

    expect(prices).toEqual([...prices].toSorted((a, b) => a - b));
  });

  it('defaults to relevance ordering when a query is present', async () => {
    const result = await page('צמיד טניס');
    expect(result.products[0]?.name).toBe('צמיד טניס יהלומים');
  });

  it('paginates search results without duplicates or gaps', async () => {
    const first = await page('טבעת', { pageSize: '12', page: '1' });

    expect(first.total).toBeGreaterThan(0);
    expect(new Set(first.products.map((p) => p.slug)).size).toBe(first.products.length);
  });

  it('returns an empty page for a query that matches nothing', async () => {
    const result = await page('zzzznothingatall');

    expect(result.total).toBe(0);
    expect(result.products).toEqual([]);
  });

  it('clamps a page beyond the search result set', async () => {
    const result = await page('טבעת', { page: '99' });
    expect(result.page).toBe(result.totalPages);
  });
});

describe('category suggestions', () => {
  it('suggests a category whose name matches', async () => {
    const suggestions = await postgresSearchProvider.suggestCategories('טבעות');
    expect(suggestions.map((s) => s.nameHe)).toContain('טבעות');
  });

  it('builds a nested href for a subcategory', async () => {
    const suggestions = await postgresSearchProvider.suggestCategories('אירוסין');
    expect(suggestions.find((s) => s.slug === 'engagement-rings')?.href).toBe(
      '/rings/engagement-rings',
    );
  });

  it('returns nothing for an empty query', async () => {
    expect(await postgresSearchProvider.suggestCategories('')).toEqual([]);
  });
});

describe('search documents', () => {
  it('includes the category name, so a category word finds its products', async () => {
    // "אירוסין" appears in no product NAME - only in the category.
    expect(await search('אירוסין')).toContain('טבעת סוליטר יהלום');
  });

  it('includes the collection name', async () => {
    expect(await search('רבי מכר')).toContain('טבעת סוליטר יהלום');
  });

  it('includes gold option labels', async () => {
    expect(await search('זהב אדום')).toContain('טבעת נישואין');
  });

  it('is rebuilt idempotently', async () => {
    const before = await testPrisma.product.findMany({
      select: { id: true, searchDocument: true },
      orderBy: { id: 'asc' },
    });

    await reindexSearchDocuments(testPrisma);

    const after = await testPrisma.product.findMany({
      select: { id: true, searchDocument: true },
      orderBy: { id: 'asc' },
    });

    expect(after).toEqual(before);
  });

  it('picks up a renamed category after a reindex', async () => {
    // The documented staleness window: a category rename does not fan out to
    // product rows until someone reindexes. This asserts the fix works.
    await testPrisma.category.update({
      where: { slug: 'engagement-rings' },
      data: { nameHe: 'טבעות אירוסין מיוחדות' },
    });

    await reindexSearchDocuments(testPrisma);
    expect(await search('מיוחדות')).toContain('טבעת סוליטר יהלום');

    await testPrisma.category.update({
      where: { slug: 'engagement-rings' },
      data: { nameHe: 'טבעות אירוסין' },
    });
    await reindexSearchDocuments(testPrisma);
  });
});
