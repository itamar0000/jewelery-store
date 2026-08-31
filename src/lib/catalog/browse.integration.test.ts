import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { resetDb, testPrisma } from '@/test/db';

import {
  DEFAULT_PAGE_SIZE,
  normalizeCatalogQuery,
  parseCatalogSearchParams,
  type CatalogQuery,
  type Facet,
  type SearchParams,
} from './filters';

/**
 * Filtering, sorting and pagination, against a real PostgreSQL.
 *
 * These go through the SAME path a request takes - parse the query string,
 * derive facets from the category, normalize against those facets, then query.
 * Testing `buildCatalogWhere` with a hand-built object would skip the two
 * stages where a bad parameter is actually neutralised.
 *
 * See queries.integration.test.ts for why `@/lib/db` is mocked.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { getCatalogPage, getCategoryFacets } = await import('./browse');

const RING_CONFIG = {
  facets: ['price', 'gold_karat', 'gold_color', 'ring_size', 'diamond_shape', 'carat', 'style'],
};
const NECKLACE_CONFIG = { facets: ['price', 'gold_karat', 'gold_color', 'length', 'style'] };

let ringsId: string;
let necklacesId: string;

/**
 * A fixed catalog, built once.
 *
 * Deliberately not `beforeEach`: nothing here mutates, and rebuilding 20
 * products per test made the file slower than the rest of the suite combined.
 */
beforeAll(async () => {
  await resetDb();

  const rings = await testPrisma.category.create({
    data: { slug: 'rings', nameHe: 'טבעות', isActive: true, filterConfig: RING_CONFIG },
  });
  const necklaces = await testPrisma.category.create({
    data: { slug: 'necklaces', nameHe: 'שרשראות', isActive: true, filterConfig: NECKLACE_CONFIG },
  });

  ringsId = rings.id;
  necklacesId = necklaces.id;

  // 20 rings, priced 1,000 to 20,000 shekels, published a day apart so
  // "newest" has a strict order. Even-numbered rings are white gold 18K; odd
  // are yellow gold 14K.
  for (let index = 1; index <= 20; index += 1) {
    const even = index % 2 === 0;
    const priceAgorot = index * 100_000;

    const product = await testPrisma.product.create({
      data: {
        slug: `ring-${String(index).padStart(2, '0')}`,
        nameHe: `טבעת ${index}`,
        primaryCategoryId: rings.id,
        productType: 'RING',
        basePriceAgorot: priceAgorot,
        minPriceAgorot: priceAgorot,
        maxPriceAgorot: priceAgorot,
        hasDiamonds: even,
        isActive: true,
        publishedAt: new Date(2026, 0, index),
        attributes: { style: even ? 'modern' : 'classic' },
        ...(even
          ? {
              diamondSpec: {
                create: { isLabGrown: true, shape: 'Oval', totalCaratWeight: '1.50' },
              },
            }
          : {
              diamondSpec: {
                create: { isLabGrown: true, shape: 'Round', totalCaratWeight: '0.30' },
              },
            }),
      },
    });

    const colorOption = await testPrisma.productOption.create({
      data: {
        productId: product.id,
        code: 'gold_color',
        type: 'GOLD_COLOR',
        nameHe: 'גוון זהב',
        isVariantAxis: true,
        values: { create: [{ value: even ? 'WHITE' : 'YELLOW', labelHe: 'גוון' }] },
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
        values: { create: [{ value: even ? '18K' : '14K', labelHe: 'קראט' }] },
      },
      include: { values: true },
    });

    await testPrisma.productOption.create({
      data: {
        productId: product.id,
        code: 'ring_size',
        type: 'RING_SIZE',
        nameHe: 'מידה',
        isVariantAxis: false,
        values: { create: [{ value: even ? '54' : '52', labelHe: 'מידה' }] },
      },
    });

    const valueIds = [colorOption.values[0]!.id, karatOption.values[0]!.id];

    await testPrisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-${index}`,
        priceAgorot,
        optionSignature: computeOptionSignature(valueIds),
        optionValues: { create: valueIds.map((valueId) => ({ valueId })) },
        inventory: { create: { onHand: 5, policy: 'DENY' } },
      },
    });
  }

  // One necklace, so the necklace category has facets of its own.
  const necklace = await testPrisma.product.create({
    data: {
      slug: 'necklace-01',
      nameHe: 'שרשרת',
      primaryCategoryId: necklaces.id,
      productType: 'NECKLACE',
      basePriceAgorot: 150_000,
      minPriceAgorot: 150_000,
      maxPriceAgorot: 150_000,
      isActive: true,
      publishedAt: new Date(2026, 1, 1),
      attributes: { style: 'delicate' },
    },
  });

  await testPrisma.productOption.create({
    data: {
      productId: necklace.id,
      code: 'length',
      type: 'LENGTH',
      nameHe: 'אורך',
      isVariantAxis: false,
      values: { create: [{ value: '45CM', labelHe: '45 ס״מ' }] },
    },
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

/** The real request path: parse, derive facets, normalize. */
async function buildQuery(
  categoryId: string,
  filterConfig: unknown,
  params: SearchParams,
): Promise<{ query: CatalogQuery; facets: readonly Facet[] }> {
  const facets = await getCategoryFacets([categoryId], filterConfig);
  return { query: normalizeCatalogQuery(parseCatalogSearchParams(params), facets), facets };
}

async function page(categoryId: string, filterConfig: unknown, params: SearchParams) {
  const { query } = await buildQuery(categoryId, filterConfig, params);
  return getCatalogPage([categoryId], query);
}

describe('facets', () => {
  it('offers only the facets the category configures', async () => {
    const facets = await getCategoryFacets([ringsId], RING_CONFIG);
    expect(facets.map((facet) => facet.code)).toContain('ring_size');

    const necklaceFacets = await getCategoryFacets([necklacesId], NECKLACE_CONFIG);
    // The category-awareness requirement, at the source.
    expect(necklaceFacets.map((facet) => facet.code)).not.toContain('ring_size');
    expect(necklaceFacets.map((facet) => facet.code)).toContain('length');
  });

  it('offers only values that exist in the category', async () => {
    const facets = await getCategoryFacets([ringsId], RING_CONFIG);
    const colors = facets.find((facet) => facet.code === 'gold_color');

    expect(colors?.values.map((value) => value.value).toSorted()).toEqual(['WHITE', 'YELLOW']);
  });

  it('reports the real price bounds of the category', async () => {
    const facets = await getCategoryFacets([ringsId], RING_CONFIG);
    const price = facets.find((facet) => facet.code === 'price');

    expect(price?.priceBounds).toEqual({ minAgorot: 100_000, maxAgorot: 2_000_000 });
  });
});

describe('filters', () => {
  it('returns everything with no filters', async () => {
    expect((await page(ringsId, RING_CONFIG, {})).total).toBe(20);
  });

  it('filters by gold colour', async () => {
    const result = await page(ringsId, RING_CONFIG, { goldColor: 'white' });
    expect(result.total).toBe(10);
  });

  it('filters by karat', async () => {
    expect((await page(ringsId, RING_CONFIG, { karat: '14k' })).total).toBe(10);
  });

  it('treats multiple values of one facet as OR', async () => {
    expect((await page(ringsId, RING_CONFIG, { goldColor: 'white,yellow' })).total).toBe(20);
  });

  it('treats different facets as AND', async () => {
    // White is 18K in this fixture, so white + 14K matches nothing.
    expect((await page(ringsId, RING_CONFIG, { goldColor: 'white', karat: '14k' })).total).toBe(0);
    expect((await page(ringsId, RING_CONFIG, { goldColor: 'white', karat: '18k' })).total).toBe(10);
  });

  describe('price', () => {
    it('filters by a minimum', async () => {
      // Rings are priced 1,000..20,000; >= 15,000 leaves six.
      expect((await page(ringsId, RING_CONFIG, { minPrice: '15000' })).total).toBe(6);
    });

    it('filters by a maximum', async () => {
      expect((await page(ringsId, RING_CONFIG, { maxPrice: '5000' })).total).toBe(5);
    });

    it('filters by a range', async () => {
      expect((await page(ringsId, RING_CONFIG, { minPrice: '5000', maxPrice: '9000' })).total).toBe(
        5,
      );
    });

    it('handles a reversed range by swapping it', async () => {
      const reversed = await page(ringsId, RING_CONFIG, { minPrice: '9000', maxPrice: '5000' });
      expect(reversed.total).toBe(5);
    });
  });

  it('filters by a non-axis option, matched at product level', async () => {
    expect((await page(ringsId, RING_CONFIG, { ringSize: '54' })).total).toBe(10);
  });

  it('filters by diamond shape', async () => {
    expect((await page(ringsId, RING_CONFIG, { shape: 'oval' })).total).toBe(10);
  });

  it('filters by carat bucket', async () => {
    // Even rings are 1.50ct, odd are 0.30ct.
    expect((await page(ringsId, RING_CONFIG, { carat: '1-2' })).total).toBe(10);
    expect((await page(ringsId, RING_CONFIG, { carat: '0-0.5' })).total).toBe(10);
  });

  it('filters by a JSON attribute', async () => {
    expect((await page(ringsId, RING_CONFIG, { style: 'modern' })).total).toBe(10);
  });

  it('combines many filters', async () => {
    const result = await page(ringsId, RING_CONFIG, {
      goldColor: 'white',
      karat: '18k',
      style: 'modern',
      minPrice: '10000',
    });

    // Even rings priced >= 10,000: 10,12,14,16,18,20.
    expect(result.total).toBe(6);
  });

  describe('invalid values are inert', () => {
    it('ignores an unknown facet value', async () => {
      expect((await page(ringsId, RING_CONFIG, { goldColor: 'chartreuse' })).total).toBe(20);
    });

    it('ignores a facet the category does not offer', async () => {
      // ring_size is not a necklace facet, so it cannot filter a necklace page.
      const result = await page(necklacesId, NECKLACE_CONFIG, { ringSize: '52' });
      expect(result.total).toBe(1);
    });
  });
});

describe('sort', () => {
  async function slugs(params: SearchParams) {
    return (await page(ringsId, RING_CONFIG, { ...params, pageSize: '48' })).products.map(
      (product) => product.slug,
    );
  }

  it('sorts by price ascending', async () => {
    const ordered = await slugs({ sort: 'price-asc' });
    expect(ordered[0]).toBe('ring-01');
    expect(ordered.at(-1)).toBe('ring-20');
  });

  it('sorts by price descending', async () => {
    const ordered = await slugs({ sort: 'price-desc' });
    expect(ordered[0]).toBe('ring-20');
    expect(ordered.at(-1)).toBe('ring-01');
  });

  it('sorts by newest', async () => {
    // Ring 20 was published last.
    expect((await slugs({ sort: 'newest' }))[0]).toBe('ring-20');
  });

  it('sorts recommended deterministically', async () => {
    const first = await slugs({ sort: 'recommended' });
    const second = await slugs({ sort: 'recommended' });

    // The business rule is TBD; determinism is the property that matters, and
    // is what makes pagination free of duplicates and gaps.
    expect(first).toEqual(second);
    expect(first).toHaveLength(20);
  });

  it('sorts in the DATABASE, not after paging', async () => {
    // If the sort were applied in JavaScript to one page, page 1 of price-desc
    // would start at the cheapest of an arbitrary slice rather than the
    // globally most expensive product.
    const firstPage = await page(ringsId, RING_CONFIG, { sort: 'price-desc' });
    expect(firstPage.products[0]?.slug).toBe('ring-20');
  });
});

describe('pagination', () => {
  it('serves the first page by default', async () => {
    const result = await page(ringsId, RING_CONFIG, {});

    expect(result.page).toBe(1);
    expect(result.products).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(result.totalPages).toBe(2);
    expect(result.total).toBe(20);
  });

  it('serves the second page', async () => {
    const result = await page(ringsId, RING_CONFIG, { page: '2' });

    expect(result.page).toBe(2);
    expect(result.products).toHaveLength(8);
  });

  it('has no duplicates and no gaps across pages', async () => {
    const first = await page(ringsId, RING_CONFIG, { sort: 'price-asc' });
    const second = await page(ringsId, RING_CONFIG, { sort: 'price-asc', page: '2' });

    const slugs = [...first.products, ...second.products].map((product) => product.slug);

    expect(new Set(slugs).size).toBe(20);
    expect(slugs).toHaveLength(20);
  });

  it('clamps a page beyond the result set to the last page', async () => {
    const result = await page(ringsId, RING_CONFIG, { page: '99' });

    // An empty page 99 is a dead end that looks broken; the last page is not.
    expect(result.page).toBe(2);
    expect(result.products.length).toBeGreaterThan(0);
  });

  it('clamps to page 1 when filters leave a single page', async () => {
    const result = await page(ringsId, RING_CONFIG, { page: '5', minPrice: '19000' });

    expect(result.page).toBe(1);
    expect(result.total).toBe(2);
  });

  it('respects an offered page size', async () => {
    const result = await page(ringsId, RING_CONFIG, { pageSize: '24' });

    expect(result.products).toHaveLength(20);
    expect(result.totalPages).toBe(1);
  });

  it('reports one page when a filter leaves few results', async () => {
    const result = await page(ringsId, RING_CONFIG, { minPrice: '19000' });
    expect(result.totalPages).toBe(1);
  });
});

describe('count reflects the active filters', () => {
  it('drops as filters narrow the set', async () => {
    expect((await page(ringsId, RING_CONFIG, {})).total).toBe(20);
    expect((await page(ringsId, RING_CONFIG, { goldColor: 'white' })).total).toBe(10);
    expect(
      (await page(ringsId, RING_CONFIG, { goldColor: 'white', minPrice: '10000' })).total,
    ).toBe(6);
  });

  it('is the FILTERED total, not the page length', async () => {
    const result = await page(ringsId, RING_CONFIG, {});

    expect(result.products).toHaveLength(12);
    expect(result.total).toBe(20);
  });
});

describe('URL state round-trips through the query layer', () => {
  it('a reloaded URL produces identical results', async () => {
    const params: SearchParams = { goldColor: 'white', sort: 'price-desc', page: '1' };

    const first = await page(ringsId, RING_CONFIG, params);
    const second = await page(ringsId, RING_CONFIG, params);

    expect(first.products.map((p) => p.slug)).toEqual(second.products.map((p) => p.slug));
    expect(first.total).toBe(second.total);
  });

  it('a page URL is stable, which is what makes back/forward correct', async () => {
    const pageTwo = await page(ringsId, RING_CONFIG, { sort: 'price-asc', page: '2' });
    const again = await page(ringsId, RING_CONFIG, { sort: 'price-asc', page: '2' });

    expect(pageTwo.products.map((p) => p.slug)).toEqual(again.products.map((p) => p.slug));
    expect(pageTwo.page).toBe(2);
  });

  it('a malformed query still returns a usable page', async () => {
    const result = await page(ringsId, RING_CONFIG, {
      page: 'abc',
      sort: 'sideways',
      minPrice: 'cheap',
      goldColor: 'chartreuse',
    });

    expect(result.page).toBe(1);
    expect(result.total).toBe(20);
  });
});
