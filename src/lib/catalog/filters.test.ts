import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  activeFilterCount,
  buildCatalogHref,
  canonicalFor,
  facetCodesFromConfig,
  hasActiveFilters,
  normalizeCatalogQuery,
  parseCatalogSearchParams,
  type Facet,
} from './filters';

/**
 * The URL contract, tested without a database.
 *
 * These are the rules that make reload, back/forward and shared links behave:
 * what a query string parses to, what survives normalization, and what URL a
 * filter change produces. All of it is pure, so it needs no PostgreSQL.
 */
const goldColor: Facet = {
  code: 'gold_color',
  param: 'goldColor',
  source: 'option',
  labelHe: 'גוון זהב',
  values: [
    { value: 'WHITE', token: 'white', labelHe: 'זהב לבן' },
    { value: 'YELLOW', token: 'yellow', labelHe: 'זהב צהוב' },
  ],
};

const karat: Facet = {
  code: 'gold_karat',
  param: 'karat',
  source: 'option',
  labelHe: 'קראט',
  values: [
    { value: '14K', token: '14k', labelHe: '14 קראט' },
    { value: '18K', token: '18k', labelHe: '18 קראט' },
  ],
};

const price: Facet = {
  code: 'price',
  param: 'price',
  source: 'price',
  labelHe: 'מחיר',
  values: [],
  priceBounds: { minAgorot: 100_000, maxAgorot: 900_000 },
};

const FACETS = [price, goldColor, karat];

function query(params: Record<string, string | string[] | undefined>, facets = FACETS) {
  return normalizeCatalogQuery(parseCatalogSearchParams(params), facets);
}

describe('parseCatalogSearchParams', () => {
  it('defaults to page 1, the default sort and the default page size', () => {
    const raw = parseCatalogSearchParams({});

    expect(raw.page).toBe(1);
    expect(raw.sort).toBe(DEFAULT_SORT);
    expect(raw.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('accepts comma-separated values', () => {
    expect(parseCatalogSearchParams({ goldColor: 'white,yellow' }).values.gold_color).toEqual([
      'white',
      'yellow',
    ]);
  });

  it('accepts repeated keys, which is what a checkbox form submits', () => {
    expect(parseCatalogSearchParams({ goldColor: ['white', 'yellow'] }).values.gold_color).toEqual([
      'white',
      'yellow',
    ]);
  });

  it('de-duplicates and lowercases', () => {
    expect(parseCatalogSearchParams({ goldColor: 'WHITE,white' }).values.gold_color).toEqual([
      'white',
    ]);
  });

  describe('invalid input is normalized, never thrown', () => {
    it('falls back to page 1 for a non-numeric page', () => {
      expect(parseCatalogSearchParams({ page: 'abc' }).page).toBe(1);
    });

    it('falls back to page 1 for a zero or negative page', () => {
      expect(parseCatalogSearchParams({ page: '0' }).page).toBe(1);
      expect(parseCatalogSearchParams({ page: '-5' }).page).toBe(1);
    });

    it('falls back to the default sort for an unknown sort', () => {
      expect(parseCatalogSearchParams({ sort: 'sideways' }).sort).toBe(DEFAULT_SORT);
    });

    it('falls back to the default page size for an unoffered size', () => {
      expect(parseCatalogSearchParams({ pageSize: '999' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    });

    it('ignores a non-numeric price', () => {
      const raw = parseCatalogSearchParams({ minPrice: 'cheap' });
      expect(raw.minPrice).toBeNull();
    });

    it('swaps a reversed price range rather than returning nothing', () => {
      const raw = parseCatalogSearchParams({ minPrice: '900', maxPrice: '100' });

      expect(raw.minPrice).toBe(100);
      expect(raw.maxPrice).toBe(900);
    });

    it('bounds a pathological token list', () => {
      const many = Array.from({ length: 500 }, (_, index) => `v${index}`).join(',');
      expect(parseCatalogSearchParams({ goldColor: many }).values.gold_color.length).toBe(24);
    });
  });
});

describe('normalizeCatalogQuery', () => {
  it('keeps values that exist and maps them to canonical database values', () => {
    expect(query({ goldColor: 'white' }).values.gold_color).toEqual(['WHITE']);
  });

  it('drops values that do not exist in the catalog', () => {
    expect(query({ goldColor: 'chartreuse' }).values.gold_color).toEqual([]);
  });

  it('keeps the valid half of a mixed list', () => {
    expect(query({ goldColor: 'white,chartreuse' }).values.gold_color).toEqual(['WHITE']);
  });

  /**
   * The category-awareness guarantee. A necklace category has no `ring_size`
   * facet, so the parameter cannot take effect however it is typed.
   */
  it('drops a facet the category does not offer', () => {
    const necklaceFacets = [price, goldColor];
    expect(query({ ringSize: '52' }, necklaceFacets).values.ring_size).toEqual([]);
  });

  it('drops price when the category has no price facet', () => {
    const withoutPrice = [goldColor];
    const normalized = query({ minPrice: '500' }, withoutPrice);

    expect(normalized.minPrice).toBeNull();
    expect(normalized.minPriceAgorot).toBeNull();
  });

  it('converts shekels in the URL to agorot for the database', () => {
    const normalized = query({ minPrice: '1000', maxPrice: '5000' });

    expect(normalized.minPriceAgorot).toBe(100_000);
    expect(normalized.maxPriceAgorot).toBe(500_000);
  });
});

describe('hasActiveFilters / activeFilterCount', () => {
  it('reports nothing active for a bare URL', () => {
    expect(hasActiveFilters(query({}))).toBe(false);
    expect(activeFilterCount(query({}))).toBe(0);
  });

  it('does not count sort or page as filters', () => {
    expect(hasActiveFilters(query({ sort: 'newest', page: '3' }))).toBe(false);
  });

  it('counts a price range as one filter', () => {
    expect(activeFilterCount(query({ minPrice: '100', maxPrice: '900' }))).toBe(1);
  });

  it('counts each selected value', () => {
    expect(activeFilterCount(query({ goldColor: 'white,yellow', karat: '14k' }))).toBe(3);
  });
});

describe('buildCatalogHref', () => {
  it('omits defaults, so one state has exactly one URL', () => {
    expect(buildCatalogHref('/rings', query({}), {}, FACETS)).toBe('/rings');
  });

  it('never emits page=1', () => {
    expect(buildCatalogHref('/rings', query({}), { page: 1 }, FACETS)).toBe('/rings');
  });

  it('adds a value when toggled on', () => {
    const href = buildCatalogHref(
      '/rings',
      query({}),
      { toggle: { code: 'gold_color', token: 'white' } },
      FACETS,
    );

    expect(href).toBe('/rings?goldColor=white');
  });

  it('removes a value when toggled off', () => {
    const href = buildCatalogHref(
      '/rings',
      query({ goldColor: 'white' }),
      { toggle: { code: 'gold_color', token: 'white' } },
      FACETS,
    );

    expect(href).toBe('/rings');
  });

  it('produces byte-identical URLs for the same filter set in any order', () => {
    const a = buildCatalogHref('/rings', query({ goldColor: 'white,yellow' }), {}, FACETS);
    const b = buildCatalogHref('/rings', query({ goldColor: 'yellow,white' }), {}, FACETS);

    expect(a).toBe(b);
  });

  /**
   * Keeping the page across a filter change strands the visitor on an empty
   * page 4 of a 2-page result, which reads as a broken catalog.
   */
  it('resets the page when a filter changes', () => {
    const href = buildCatalogHref(
      '/rings',
      query({ page: '4' }),
      { toggle: { code: 'gold_color', token: 'white' } },
      FACETS,
    );

    expect(href).toBe('/rings?goldColor=white');
    expect(href).not.toContain('page');
  });

  it('resets the page when the sort changes', () => {
    const href = buildCatalogHref('/rings', query({ page: '4' }), { sort: 'newest' }, FACETS);

    expect(href).toBe('/rings?sort=newest');
  });

  it('keeps filters when only the page changes', () => {
    const href = buildCatalogHref('/rings', query({ goldColor: 'white' }), { page: 3 }, FACETS);

    expect(href).toContain('goldColor=white');
    expect(href).toContain('page=3');
  });

  it('clears everything but keeps a non-default sort', () => {
    const current = query({ goldColor: 'white', minPrice: '500', sort: 'newest' });
    const href = buildCatalogHref('/rings', current, { clearAll: true, sort: current.sort });

    expect(href).toBe('/rings?sort=newest');
  });

  it('round-trips: a built URL parses back to the same query', () => {
    const original = query({ goldColor: 'white,yellow', karat: '18k', minPrice: '1000' });
    const href = buildCatalogHref('/rings', original, {}, FACETS);

    const search = Object.fromEntries(new URLSearchParams(href.split('?')[1] ?? ''));
    const reparsed = query(search);

    expect(reparsed.values.gold_color.toSorted()).toEqual(original.values.gold_color.toSorted());
    expect(reparsed.values.gold_karat).toEqual(original.values.gold_karat);
    expect(reparsed.minPrice).toBe(original.minPrice);
  });
});

describe('canonicalFor', () => {
  it('points a filtered URL at the bare category', () => {
    expect(canonicalFor('/rings', { goldColor: 'white', sort: 'newest' })).toBe('/rings');
  });

  it('keeps the page, because page 3 holds different products', () => {
    expect(canonicalFor('/rings', { page: '3' })).toBe('/rings?page=3');
  });

  it('drops page 1', () => {
    expect(canonicalFor('/rings', { page: '1' })).toBe('/rings');
  });

  it('ignores a malformed page', () => {
    expect(canonicalFor('/rings', { page: 'abc' })).toBe('/rings');
  });
});

describe('facetCodesFromConfig', () => {
  it('reads the configured facets', () => {
    expect(facetCodesFromConfig({ facets: ['price', 'ring_size'] })).toEqual([
      'price',
      'ring_size',
    ]);
  });

  it('ignores unknown facet codes', () => {
    expect(facetCodesFromConfig({ facets: ['price', 'not_a_facet'] })).toEqual(['price']);
  });

  it('falls back to shared facets when the config is missing or malformed', () => {
    // A newly created category should be usable before anyone configures it.
    expect(facetCodesFromConfig(null)).toContain('price');
    expect(facetCodesFromConfig('nonsense')).toContain('price');
    expect(facetCodesFromConfig({ facets: [] })).toContain('price');
  });
});
