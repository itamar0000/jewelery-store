import type { ProductCardData } from '@/components/product/types';
import { prisma } from '@/lib/db';

import {
  ATTRIBUTE_KEY,
  ATTRIBUTE_VALUE_LABELS,
  CARAT_BUCKETS,
  FACET_LABELS,
  FACET_PARAM,
  FACET_SOURCE,
  OPTION_CODE,
  facetCodesFromConfig,
  type CatalogQuery,
  type Facet,
  type FacetValue,
  type SortKey,
} from './filters';
import { activeProduct, productCardSelect, toProductCard } from './queries';

import type { Prisma } from '@/generated/prisma/client';

/**
 * Catalog browsing: facets, filtering, sorting and pagination.
 *
 * Split from `queries.ts` because that file answers "give me this one thing"
 * and this one answers "give me the slice of the catalog matching these
 * constraints". Both are inside the query boundary; nothing outside
 * `src/lib/catalog` imports Prisma.
 *
 * THE FILTER PREDICATES ARE THE INTERESTING PART, because each facet lives in a
 * different place in the schema and a naive translation gets two of them wrong.
 */

// ------------------------------------------------------------------- facets

/**
 * The facets a category offers, with their REAL values.
 *
 * WHICH facets appear comes from `Category.filterConfig.facets` - data, so
 * adding or removing a filter is a row edit, not a deployment. WHICH VALUES
 * appear comes from the catalog itself, so a colour nobody stocks is not
 * offered as a filter that returns nothing.
 *
 * That combination is also what makes the category-awareness requirement
 * structural rather than a convention: a necklace category simply has no
 * `ring_size` facet, so the parameter is dropped in normalization and the
 * control never renders. No component contains a category conditional.
 */
export async function getCategoryFacets(
  categoryIds: readonly string[],
  filterConfig: unknown,
): Promise<readonly Facet[]> {
  const codes = facetCodesFromConfig(filterConfig);
  // Same rule as buildCatalogWhere: an empty list scopes to the whole catalog,
  // which is what makes /search offer facets drawn from every product.
  const scope: Prisma.ProductWhereInput = {
    ...activeProduct,
    ...(categoryIds.length > 0
      ? {
          OR: [
            { primaryCategoryId: { in: [...categoryIds] } },
            { categories: { some: { categoryId: { in: [...categoryIds] } } } },
          ],
        }
      : {}),
  };

  const facets: Facet[] = [];

  for (const code of codes) {
    const source = FACET_SOURCE[code];

    if (source === 'price') {
      const bounds = await prisma.product.aggregate({
        where: scope,
        _min: { minPriceAgorot: true },
        _max: { maxPriceAgorot: true },
      });

      const minAgorot = bounds._min.minPriceAgorot;
      const maxAgorot = bounds._max.maxPriceAgorot;

      // Omit the facet when the category has nothing priced: a range control
      // with no range is a control that cannot be used.
      if (minAgorot === null || maxAgorot === null) continue;

      facets.push({
        code,
        param: FACET_PARAM[code],
        source,
        labelHe: FACET_LABELS[code],
        values: [],
        priceBounds: { minAgorot, maxAgorot },
      });
      continue;
    }

    if (source === 'option') {
      const optionCode = OPTION_CODE[code as keyof typeof OPTION_CODE];

      const values = await prisma.productOptionValue.findMany({
        where: {
          isActive: true,
          option: { code: optionCode, product: scope },
        },
        orderBy: [{ position: 'asc' }, { value: 'asc' }],
        select: { value: true, labelHe: true, hexColor: true },
        distinct: ['value'],
      });

      if (values.length === 0) continue;

      facets.push({
        code,
        param: FACET_PARAM[code],
        source,
        labelHe: FACET_LABELS[code],
        values: values.map((row): FacetValue => ({
          value: row.value,
          token: row.value.toLowerCase(),
          labelHe: row.labelHe,
          hexColor: row.hexColor,
        })),
      });
      continue;
    }

    if (source === 'diamond') {
      if (code === 'carat') {
        // Buckets are derived ranges, so they are offered whenever the category
        // has any stone data at all rather than read from distinct values.
        const withStones = await prisma.product.count({
          where: { ...scope, hasDiamonds: true },
        });
        if (withStones === 0) continue;

        facets.push({
          code,
          param: FACET_PARAM[code],
          source,
          labelHe: FACET_LABELS[code],
          values: CARAT_BUCKETS.map((bucket) => ({
            value: bucket.id,
            token: bucket.id,
            labelHe: bucket.labelHe,
          })),
        });
        continue;
      }

      // Shapes on a product-level spec, plus shapes on any variant-level
      // override - schema F6 allows both.
      const [productShapes, variantShapes] = await Promise.all([
        prisma.diamondSpec.findMany({
          where: { shape: { not: null }, product: scope },
          select: { shape: true },
          distinct: ['shape'],
        }),
        prisma.diamondSpec.findMany({
          where: { shape: { not: null }, variant: { product: scope } },
          select: { shape: true },
          distinct: ['shape'],
        }),
      ]);

      const shapes = [
        ...new Set([...productShapes, ...variantShapes].flatMap((row) => row.shape ?? [])),
      ].sort();

      if (shapes.length === 0) continue;

      facets.push({
        code,
        param: FACET_PARAM[code],
        source,
        labelHe: FACET_LABELS[code],
        // Kept in English: these are the terms printed on the certificate
        // (specification section 49).
        values: shapes.map((shape) => ({
          value: shape,
          token: shape.toLowerCase(),
          labelHe: shape,
        })),
      });
      continue;
    }

    // Attribute facets. `Product.attributes` is a small JSON object and the
    // catalog is ~100 rows, so the distinct values are collected in memory
    // rather than with a JSON-path aggregate that Prisma cannot express.
    const key = ATTRIBUTE_KEY[code as keyof typeof ATTRIBUTE_KEY];
    const rows = await prisma.product.findMany({ where: scope, select: { attributes: true } });

    const seen = [
      ...new Set(
        rows
          .map((row) => readAttribute(row.attributes, key))
          .filter((value): value is string => value !== null),
      ),
    ].sort();

    if (seen.length === 0) continue;

    facets.push({
      code,
      param: FACET_PARAM[code],
      source,
      labelHe: FACET_LABELS[code],
      values: seen.map((value) => ({
        value,
        token: value.toLowerCase(),
        labelHe: ATTRIBUTE_VALUE_LABELS[value] ?? value,
      })),
    });
  }

  return facets;
}

function readAttribute(attributes: Prisma.JsonValue | null, key: string): string | null {
  if (attributes === null || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return null;
  }

  const value = (attributes as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// ------------------------------------------------------------------ filters

/**
 * Translates a normalized query into a Prisma predicate.
 *
 * TWO PLACES THIS IS EASY TO GET WRONG:
 *
 * 1. AXIS FILTERS MUST MATCH THE SAME VARIANT. "18K" and "white gold" as two
 *    separate `variants: { some: ... }` clauses means "has an 18K variant AND
 *    has a white variant" - which matches a ring that has 18K-yellow and
 *    14K-white and no 18K-white at all. They are therefore combined INSIDE one
 *    `some`, so a single purchasable variant has to satisfy every axis.
 *
 * 2. PRICE IS AN OVERLAP, NOT A CONTAINMENT. A product whose variants run
 *    4,890-5,890 must appear in a 5,000-6,000 search. So the test is "the
 *    product's range intersects the requested range", using the denormalized
 *    min/max columns the schema maintains for exactly this.
 *
 * Non-axis options (ring size, chain length) are matched at PRODUCT level,
 * because they are selections recorded on the order line rather than stocked
 * SKUs - there is no variant carrying them to match against.
 */
export function buildCatalogWhere(
  categoryIds: readonly string[],
  query: CatalogQuery,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  // Axis options: one variant must satisfy all of them.
  const axisClauses: Prisma.ProductVariantWhereInput[] = [];
  for (const code of ['gold_karat', 'gold_color'] as const) {
    const values = query.values[code];
    if (values.length === 0) continue;

    axisClauses.push({
      optionValues: {
        some: { value: { value: { in: [...values] }, option: { code: OPTION_CODE[code] } } },
      },
    });
  }

  if (axisClauses.length > 0) {
    and.push({ variants: { some: { isActive: true, archivedAt: null, AND: axisClauses } } });
  }

  // Non-axis options, matched on the product's own option values.
  for (const code of ['ring_size', 'length'] as const) {
    const values = query.values[code];
    if (values.length === 0) continue;

    and.push({
      options: {
        some: {
          code: OPTION_CODE[code],
          values: { some: { value: { in: [...values] }, isActive: true } },
        },
      },
    });
  }

  if (query.values.diamond_shape.length > 0) {
    const shapes = [...query.values.diamond_shape];
    and.push({
      OR: [
        { diamondSpec: { shape: { in: shapes } } },
        { variants: { some: { diamondSpec: { shape: { in: shapes } } } } },
      ],
    });
  }

  if (query.values.carat.length > 0) {
    const specFilters = query.values.carat
      .map((id) => CARAT_BUCKETS.find((bucket) => bucket.id === id))
      .filter((bucket): bucket is (typeof CARAT_BUCKETS)[number] => bucket !== undefined)
      .map((bucket) => ({
        totalCaratWeight: {
          ...(bucket.gte !== null ? { gte: bucket.gte } : {}),
          ...(bucket.lt !== null ? { lt: bucket.lt } : {}),
        },
      }));

    if (specFilters.length > 0) {
      and.push({
        OR: [
          ...specFilters.map((filter) => ({ diamondSpec: filter })),
          ...specFilters.map((filter) => ({ variants: { some: { diamondSpec: filter } } })),
        ],
      });
    }
  }

  for (const code of ['style', 'pendant_type'] as const) {
    const values = query.values[code];
    if (values.length === 0) continue;

    const key = ATTRIBUTE_KEY[code];
    and.push({
      OR: values.map((value) => ({ attributes: { path: [key], equals: value } })),
    });
  }

  if (query.minPriceAgorot !== null) and.push({ maxPriceAgorot: { gte: query.minPriceAgorot } });
  if (query.maxPriceAgorot !== null) and.push({ minPriceAgorot: { lte: query.maxPriceAgorot } });

  return {
    ...activeProduct,
    // An EMPTY category list means "no category restriction", which is how
    // /search scopes to the whole catalog. Emitting the predicate anyway would
    // produce `IN ()` - a condition that matches nothing - and silently turn
    // every search into zero results.
    ...(categoryIds.length > 0
      ? {
          OR: [
            { primaryCategoryId: { in: [...categoryIds] } },
            { categories: { some: { categoryId: { in: [...categoryIds] } } } },
          ],
        }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

/**
 * Sort order, applied by PostgreSQL.
 *
 * Every mode ends with `id: 'asc'`. Without a unique tiebreak, two products
 * with the same price or the same publish timestamp have no defined relative
 * order, and PostgreSQL is free to return them differently for `OFFSET 0` and
 * `OFFSET 12` - which shows a product twice on one page and never on the other.
 * The tiebreak is what makes "no duplicates, no missing products" true.
 *
 * PRICE SORTS ON `minPriceAgorot` IN BOTH DIRECTIONS, because that is the
 * figure the card displays. Sorting descending on `maxPriceAgorot` would order
 * by a number the customer never sees.
 *
 * "RECOMMENDED" IS A PLACEHOLDER RULE, and the business definition is TBD.
 * Today it is: products the owner has curated into collections first (ordered
 * by how many collections they appear in), then newest, then id. That uses only
 * real merchandising data the owner already maintains, it is deterministic, and
 * it is genuinely different from "newest". When a real rule exists - margin,
 * stock cover, conversion - this function is the single place it lands.
 */
export function buildCatalogOrderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ minPriceAgorot: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
    case 'price-desc':
      return [{ minPriceAgorot: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
    case 'newest':
      return [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
    case 'recommended':
      return [
        { collections: { _count: 'desc' } },
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'asc' },
      ];
    case 'relevance':
      // Relevance is not expressible as a Prisma ordering - it comes from the
      // search provider's score. `getCatalogPage` handles it by ordering the
      // ranked id list instead; this branch is the fallback for the impossible
      // case of relevance without a search, which normalization already
      // prevents.
      return [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
  }
}

export interface CatalogPage {
  readonly products: readonly ProductCardData[];
  /** Total matching the ACTIVE FILTERS, not the category total. */
  readonly total: number;
  /** The page actually served, after clamping. */
  readonly page: number;
  readonly totalPages: number;
  readonly pageSize: number;
}

/**
 * One page of filtered, sorted products.
 *
 * OFFSET PAGINATION, deliberately. At the ~100-product scale in the
 * specification the deep-offset cost that motivates cursor pagination does not
 * exist, while offset gives what this catalog actually needs: jumpable page
 * numbers, a total count, and a shareable `?page=3`. Cursor pagination would
 * trade all of that away for a benefit measured at a scale this catalog is not
 * at.
 *
 * THE PAGE IS CLAMPED, not rejected. `?page=99` on a two-page result serves
 * page 2 rather than an empty grid: an empty page is a dead end that looks
 * broken, and clamping keeps a stale bookmark useful.
 *
 * Counting first is what makes the clamp possible, so the two queries are
 * sequential by necessity rather than by oversight.
 */
export async function getCatalogPage(
  categoryIds: readonly string[],
  query: CatalogQuery,
  /**
   * Search results, most relevant first.
   *
   * When present, the catalog is restricted to these products AND - if the
   * sort is relevance - served in this order. This is the seam that makes
   * search reuse the catalog instead of duplicating it: the filter predicate,
   * the card shape and the paging arithmetic are all the ones the category
   * pages already use.
   */
  rankedIds?: readonly string[],
): Promise<CatalogPage> {
  if (rankedIds !== undefined) {
    return getRankedPage(categoryIds, query, rankedIds);
  }

  const where = buildCatalogWhere(categoryIds, query);

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);

  const rows = await prisma.product.findMany({
    where,
    orderBy: buildCatalogOrderBy(query.sort),
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    select: productCardSelect,
  });

  return {
    products: rows.map(toProductCard),
    total,
    page,
    totalPages,
    pageSize: query.pageSize,
  };
}

/**
 * A page of search results.
 *
 * FILTERING STILL HAPPENS IN POSTGRESQL. The only work done in JavaScript is
 * intersecting two id lists to preserve relevance order, which no `ORDER BY`
 * Prisma can express would do - and ids are the cheapest thing to move.
 *
 * Three steps:
 *   1. ask the database which of the ranked ids survive the active filters
 *      (one query, ids only);
 *   2. keep them in rank order and slice the page;
 *   3. fetch that page's cards.
 *
 * For a non-relevance sort the ordering is handed back to PostgreSQL, because
 * "cheapest first" is a property of the products, not of the query.
 */
async function getRankedPage(
  categoryIds: readonly string[],
  query: CatalogQuery,
  rankedIds: readonly string[],
): Promise<CatalogPage> {
  if (rankedIds.length === 0) {
    return { products: [], total: 0, page: 1, totalPages: 1, pageSize: query.pageSize };
  }

  const where: Prisma.ProductWhereInput = {
    ...buildCatalogWhere(categoryIds, query),
    id: { in: [...rankedIds] },
  };

  if (query.sort !== 'relevance') {
    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(Math.max(1, query.page), totalPages);

    const rows = await prisma.product.findMany({
      where,
      orderBy: buildCatalogOrderBy(query.sort),
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      select: productCardSelect,
    });

    return { products: rows.map(toProductCard), total, page, totalPages, pageSize: query.pageSize };
  }

  const surviving = await prisma.product.findMany({ where, select: { id: true } });
  const survivingIds = new Set(surviving.map((row) => row.id));

  const ordered = rankedIds.filter((id) => survivingIds.has(id));
  const total = ordered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);

  const pageIds = ordered.slice((page - 1) * query.pageSize, page * query.pageSize);
  if (pageIds.length === 0) {
    return { products: [], total, page, totalPages, pageSize: query.pageSize };
  }

  const rows = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    select: productCardSelect,
  });

  // `findMany` returns rows in the database's order, not the id list's, so the
  // rank order is reapplied here.
  const byId = new Map(rows.map((row) => [row.id, row]));
  const products = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)
    .map(toProductCard);

  return { products, total, page, totalPages, pageSize: query.pageSize };
}
