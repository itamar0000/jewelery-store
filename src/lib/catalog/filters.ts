import { z } from 'zod';

/**
 * Catalog query parameters: the URL contract.
 *
 * THE URL IS THE SOURCE OF TRUTH for every active filter, the sort order and
 * the page. No filter state is held in a component. That is what makes reload,
 * back/forward and a pasted link all behave identically, and it is why the
 * filter UI is a set of links and a form rather than a controlled widget with
 * its own memory.
 *
 * PARAMETER NAMES (documented contract, stable):
 *
 *   minPrice, maxPrice   whole SHEKELS, not agorot - a URL a human can read
 *   karat                14k, 18k
 *   goldColor            yellow, white, rose
 *   ringSize             48, 50, 52, ...
 *   length               40cm, 45cm, ...
 *   shape                round, oval, princess, emerald, pear
 *   carat                0-0.5, 0.5-1, 1-2, 2-plus
 *   style                classic, modern, delicate, everyday, personalized
 *   pendantType          name, solitaire
 *   sort                 recommended | newest | price-asc | price-desc
 *   page                 1-based integer
 *   pageSize             12 | 24 | 48
 *
 * Multi-value facets are COMMA-SEPARATED and lowercase: `?goldColor=white,rose`.
 * Repeated keys (`?goldColor=white&goldColor=rose`) are also accepted, because
 * a browser will produce them from a checkbox form, and both spellings
 * normalize to the same canonical query.
 *
 * VALIDATION IS TWO-STAGE, and the second stage matters most:
 *
 *   1. `parseCatalogSearchParams` shape-checks with zod - types, ranges,
 *      enums. Anything malformed falls back to a default rather than throwing,
 *      because a bad query string is a link someone shared, not an exception.
 *   2. `normalizeCatalogQuery` intersects every token with the REAL facet
 *      values for that category, read from the database. A value that does not
 *      exist is dropped.
 *
 * Stage 2 is what makes "invalid parameters are safely ignored" structural: no
 * caller-supplied string ever reaches Prisma unless it matched a value that
 * already exists in the catalog.
 */

/** Facet codes, matching the strings stored in `Category.filterConfig.facets`. */
export const FACET_CODES = [
  'price',
  'gold_karat',
  'gold_color',
  'ring_size',
  'length',
  'diamond_shape',
  'carat',
  'style',
  'pendant_type',
] as const;

export type FacetCode = (typeof FACET_CODES)[number];

/** Facet code to URL parameter. `price` uses minPrice/maxPrice instead. */
export const FACET_PARAM = {
  price: 'price',
  gold_karat: 'karat',
  gold_color: 'goldColor',
  ring_size: 'ringSize',
  length: 'length',
  diamond_shape: 'shape',
  carat: 'carat',
  style: 'style',
  pendant_type: 'pendantType',
} as const satisfies Record<FacetCode, string>;

/** How a facet is answered, which decides both the query and the control. */
export type FacetSource =
  /** A `ProductOption` value: gold colour, karat, ring size, length. */
  | 'option'
  /** A column on `DiamondSpec`. */
  | 'diamond'
  /** A key inside `Product.attributes`. */
  | 'attribute'
  /** Price, handled as a range rather than a value list. */
  | 'price';

export const FACET_SOURCE = {
  price: 'price',
  gold_karat: 'option',
  gold_color: 'option',
  ring_size: 'option',
  length: 'option',
  diamond_shape: 'diamond',
  carat: 'diamond',
  style: 'attribute',
  pendant_type: 'attribute',
} as const satisfies Record<FacetCode, FacetSource>;

/** `Product.attributes` key backing each attribute facet. */
export const ATTRIBUTE_KEY = {
  style: 'style',
  pendant_type: 'pendantType',
} as const;

/**
 * `relevance` exists only for search: ordering by "how well does this match"
 * is meaningless without a query. The search page defaults to it and offers it;
 * category pages neither offer nor accept it (it normalizes away to the default
 * there), so a category URL cannot ask for an order it has no basis for.
 */
export const SORT_KEYS = ['relevance', 'recommended', 'newest', 'price-asc', 'price-desc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'הכי רלוונטי',
  recommended: 'מומלץ',
  newest: 'הכי חדש',
  'price-asc': 'מחיר: מהנמוך לגבוה',
  'price-desc': 'מחיר: מהגבוה לנמוך',
};

export const DEFAULT_SORT: SortKey = 'recommended';
export const DEFAULT_PAGE_SIZE = 12;
export const PAGE_SIZES = [12, 24, 48] as const;

/**
 * Carat buckets.
 *
 * Defined in code rather than read from the database because they are DERIVED
 * ranges over a continuous measurement, not a set of stored values - there is
 * no "0.5-1" row anywhere. `lt` is exclusive so the buckets tile without
 * overlapping and a 1.00ct stone lands in exactly one of them.
 */
export const CARAT_BUCKETS = [
  { id: '0-0.5', labelHe: 'עד 0.5', gte: null, lt: 0.5 },
  { id: '0.5-1', labelHe: '0.5 עד 1', gte: 0.5, lt: 1 },
  { id: '1-2', labelHe: '1 עד 2', gte: 1, lt: 2 },
  { id: '2-plus', labelHe: '2 ומעלה', gte: 2, lt: null },
] as const;

export type CaratBucketId = (typeof CARAT_BUCKETS)[number]['id'];

// ------------------------------------------------------------------ parsing

/** Splits `a,b` and repeated keys into a lowercase, de-duplicated token list. */
function tokens(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];

  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  // A bounded list: a hand-edited URL with hundreds of tokens should not turn
  // into an unbounded `IN` clause.
  return [...new Set(parts)].slice(0, 24);
}

const priceSchema = z.coerce.number().int().min(0).max(10_000_000).nullable().catch(null);

const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);

const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((value): value is (typeof PAGE_SIZES)[number] =>
    (PAGE_SIZES as readonly number[]).includes(value),
  )
  .catch(DEFAULT_PAGE_SIZE);

/**
 * Sort validation. The fallback is supplied per call rather than baked in,
 * because the correct default differs between /search and a category page.
 */
const sortSchema = z.enum(SORT_KEYS);

/** Shape-checked query, before facet values are known. */
export interface RawCatalogQuery {
  /**
   * The search term. Empty string on a category page.
   *
   * Deliberately part of the SAME parsed object as the filters rather than a
   * parallel parser: search results carry filters, sort and pagination, so one
   * query type keeps `/search?q=טבעת&goldColor=white&sort=price-asc&page=2`
   * working with the machinery that already exists.
   */
  readonly q: string;
  readonly values: Readonly<Record<FacetCode, readonly string[]>>;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly sort: SortKey;
  readonly page: number;
  readonly pageSize: number;
}

/** Canonical query, after invalid values have been dropped. */
export interface CatalogQuery extends RawCatalogQuery {
  /** Price bounds in agorot, ready for the database. */
  readonly minPriceAgorot: number | null;
  readonly maxPriceAgorot: number | null;
}

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Stage 1: shape validation.
 *
 * Every field `.catch(...)`es to a default. A malformed `?page=abc` is a
 * shared link or a crawler, not a programming error, so it normalizes to page
 * 1 instead of throwing a 500.
 */
export function parseCatalogSearchParams(params: SearchParams): RawCatalogQuery {
  const rawValues = Object.fromEntries(
    FACET_CODES.map((code) => [code, code === 'price' ? [] : tokens(params[FACET_PARAM[code]])]),
  ) as Record<FacetCode, string[]>;

  // Bounded and trimmed. A query is a user-supplied string that reaches a
  // database function, so its length is capped here rather than trusted.
  const rawQ = Array.isArray(params.q) ? (params.q[0] ?? '') : (params.q ?? '');
  const q = rawQ.trim().slice(0, 120);

  const min = priceSchema.parse(params.minPrice ?? null);
  const max = priceSchema.parse(params.maxPrice ?? null);

  // A reversed range is a slip, not an empty result set: swap it.
  const [minPrice, maxPrice] = min !== null && max !== null && min > max ? [max, min] : [min, max];

  return {
    q,
    values: rawValues,
    minPrice,
    maxPrice,
    // The default depends on the page: a search defaults to relevance, a
    // category listing to the merchandising order. Without this the search
    // page silently sorted by "recommended" and buried the best match.
    sort: sortSchema.catch(defaultSortFor(q)).parse(params.sort),
    page: pageSchema.parse(params.page ?? 1),
    pageSize: pageSizeSchema.parse(params.pageSize ?? DEFAULT_PAGE_SIZE),
  };
}

/** One selectable value of a facet, as it exists in the catalog. */
export interface FacetValue {
  /** Canonical database value: `WHITE`, `14K`, `Round`, `classic`. */
  readonly value: string;
  /** Lowercase URL token: `white`, `14k`, `round`, `classic`. */
  readonly token: string;
  readonly labelHe: string;
  readonly hexColor?: string | null;
}

export interface Facet {
  readonly code: FacetCode;
  readonly param: string;
  readonly source: FacetSource;
  readonly labelHe: string;
  readonly values: readonly FacetValue[];
  /** Price facet only: the real bounds of the current category, in agorot. */
  readonly priceBounds?: { readonly minAgorot: number; readonly maxAgorot: number };
}

/**
 * Stage 2: drop anything the catalog does not actually contain.
 *
 * This is the security-relevant step. After it, every string that reaches a
 * Prisma `in` clause is a value that already exists in the database, so a
 * hand-edited query parameter cannot introduce an unexpected value - quite
 * apart from Prisma parameterizing the SQL.
 */
export function normalizeCatalogQuery(
  raw: RawCatalogQuery,
  facets: readonly Facet[],
): CatalogQuery {
  const byCode = new Map(facets.map((facet) => [facet.code, facet]));

  const values = Object.fromEntries(
    FACET_CODES.map((code) => {
      const facet = byCode.get(code);

      // A facet this category does not expose is dropped entirely, which is
      // what keeps ring size off a necklace page even if someone types it in.
      if (!facet) return [code, []];

      const allowed = new Map(facet.values.map((value) => [value.token, value.value]));
      const kept = raw.values[code]
        .map((token) => allowed.get(token))
        .filter((value): value is string => value !== undefined);

      return [code, kept];
    }),
  ) as Record<FacetCode, string[]>;

  const pricingAvailable = byCode.has('price');

  // Relevance without a query has nothing to rank by, so it degrades to the
  // catalog default rather than producing an arbitrary order.
  const sort = raw.sort === 'relevance' && raw.q.length === 0 ? DEFAULT_SORT : raw.sort;

  return {
    ...raw,
    sort,
    values,
    minPrice: pricingAvailable ? raw.minPrice : null,
    maxPrice: pricingAvailable ? raw.maxPrice : null,
    minPriceAgorot: pricingAvailable && raw.minPrice !== null ? raw.minPrice * 100 : null,
    maxPriceAgorot: pricingAvailable && raw.maxPrice !== null ? raw.maxPrice * 100 : null,
  };
}

/** Whether anything is actively narrowing the result set. */
export function hasActiveFilters(query: CatalogQuery): boolean {
  return (
    query.minPrice !== null ||
    query.maxPrice !== null ||
    FACET_CODES.some((code) => query.values[code].length > 0)
  );
}

/** How many filters are active, for the "סינון (3)" badge. */
export function activeFilterCount(query: CatalogQuery): number {
  const valueCount = FACET_CODES.reduce((total, code) => total + query.values[code].length, 0);
  const priceCount = query.minPrice !== null || query.maxPrice !== null ? 1 : 0;
  return valueCount + priceCount;
}

// -------------------------------------------------------------- serializing

export interface HrefOverrides {
  readonly toggle?: { readonly code: FacetCode; readonly token: string };
  readonly minPrice?: number | null;
  readonly maxPrice?: number | null;
  readonly sort?: SortKey;
  readonly page?: number;
  readonly clearAll?: boolean;
}

/**
 * Builds the URL for a filter change.
 *
 * ANY FILTER OR SORT CHANGE RESETS TO PAGE 1. Keeping the page across a filter
 * change strands the visitor on an empty page 4 of a 2-page result, which looks
 * like a broken catalog. Only an explicit `page` override sets a page.
 *
 * Default values are OMITTED from the URL - no `?sort=recommended`, no
 * `?page=1` - so one state has exactly one URL. That is what keeps the
 * canonical link stable and stops near-duplicate URLs multiplying.
 *
 * Parameters are emitted in a fixed order for the same reason: two identical
 * filter sets must produce byte-identical URLs.
 */
export function buildCatalogHref(
  basePath: string,
  query: CatalogQuery,
  overrides: HrefOverrides = {},
  facets: readonly Facet[] = [],
): string {
  if (overrides.clearAll) {
    // The search term is NOT a filter and survives "clear filters": clearing
    // the facets on a search page must not also throw away what was searched
    // for, which would drop the visitor back onto an empty search page.
    const kept = new URLSearchParams();
    if (query.q.length > 0) kept.set('q', query.q);
    if (overrides.sort && overrides.sort !== defaultSortFor(query.q)) {
      kept.set('sort', overrides.sort);
    }

    const search = kept.toString();
    return search.length > 0 ? `${basePath}?${search}` : basePath;
  }

  const tokenFor = (code: FacetCode, value: string): string =>
    facets.find((facet) => facet.code === code)?.values.find((entry) => entry.value === value)
      ?.token ?? value.toLowerCase();

  const params = new URLSearchParams();

  // `q` leads, so a shared search URL reads as a search.
  if (query.q.length > 0) params.set('q', query.q);

  for (const code of FACET_CODES) {
    if (code === 'price') continue;

    let selected = query.values[code].map((value) => tokenFor(code, value));

    if (overrides.toggle?.code === code) {
      const { token } = overrides.toggle;
      selected = selected.includes(token)
        ? selected.filter((entry) => entry !== token)
        : [...selected, token];
    }

    if (selected.length > 0) params.set(FACET_PARAM[code], [...selected].sort().join(','));
  }

  const minPrice = overrides.minPrice !== undefined ? overrides.minPrice : query.minPrice;
  const maxPrice = overrides.maxPrice !== undefined ? overrides.maxPrice : query.maxPrice;
  if (minPrice !== null) params.set('minPrice', String(minPrice));
  if (maxPrice !== null) params.set('maxPrice', String(maxPrice));

  const sort = overrides.sort ?? query.sort;
  if (sort !== defaultSortFor(query.q)) params.set('sort', sort);

  // Page survives ONLY when explicitly overridden; every other change resets it.
  const page = overrides.page ?? 1;
  if (page > 1) params.set('page', String(page));

  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize));

  const search = params.toString();
  return search.length > 0 ? `${basePath}?${search}` : basePath;
}

/**
 * Hebrew labels for `Product.attributes` values.
 *
 * Attribute values are bare JSON strings with no label column of their own -
 * unlike `ProductOptionValue`, which carries `labelHe`. Unknown values fall
 * back to the raw token rather than rendering blank, so a newly added style
 * appears in the UI before anyone writes a translation for it.
 *
 * Diamond shapes are deliberately absent: `Round` and `Oval` are the terms that
 * appear on the certificate, and specification section 49 keeps those in
 * English inside Hebrew copy.
 */
export const ATTRIBUTE_VALUE_LABELS: Readonly<Record<string, string>> = {
  classic: 'קלאסי',
  modern: 'מודרני',
  delicate: 'עדין',
  everyday: 'יומיומי',
  personalized: 'בעיצוב אישי',
  name: 'שם',
  solitaire: 'סוליטר',
};

/** Hebrew label for a facet, used as the group heading in the filter panel. */
export const FACET_LABELS: Record<FacetCode, string> = {
  price: 'מחיר',
  gold_karat: 'קראט זהב',
  gold_color: 'גוון זהב',
  ring_size: 'מידת טבעת',
  length: 'אורך',
  diamond_shape: 'צורת יהלום',
  carat: 'משקל קראט',
  style: 'סגנון',
  pendant_type: 'סוג תליון',
};

/** The `ProductOption.code` backing each option-sourced facet. */
export const OPTION_CODE = {
  gold_karat: 'gold_karat',
  gold_color: 'gold_color',
  ring_size: 'ring_size',
  length: 'length',
} as const;

/** Reads the facet list out of a `Category.filterConfig` JSON blob, safely. */
export function facetCodesFromConfig(filterConfig: unknown): readonly FacetCode[] {
  const parsed = z
    .object({ facets: z.array(z.string()).optional() })
    .catch({ facets: [] })
    .parse(filterConfig ?? {});

  const known = new Set<string>(FACET_CODES);
  const configured = (parsed.facets ?? []).filter((code): code is FacetCode => known.has(code));

  // An unconfigured category still gets the shared facets rather than none, so
  // a newly created category is usable before anyone fills in its config.
  return configured.length > 0 ? configured : ['price', 'gold_karat', 'gold_color'];
}

/**
 * The default sort for a page.
 *
 * Search defaults to relevance, a catalog listing to the merchandising order.
 * Keeping this in one function is what lets `buildCatalogHref` omit the default
 * from the URL on both kinds of page, so each state still has exactly one URL.
 */
export function defaultSortFor(q: string): SortKey {
  return q.length > 0 ? 'relevance' : DEFAULT_SORT;
}

/**
 * The canonical URL for a catalog page.
 *
 * THE STRATEGY, in one place:
 *
 *   - FILTERS ARE REFINEMENTS, not pages. `?goldColor=white` shows a subset of
 *     the same category, so its canonical points at the bare category URL. That
 *     is what stops a combinatorial explosion of near-duplicate URLs from being
 *     indexed - with nine facets, the alternative is thousands of pages that
 *     are all subsets of one.
 *   - PAGINATION IS NOT a refinement. Page 3 holds genuinely different
 *     products, so it is self-canonical and keeps `?page=3`. Collapsing pages
 *     onto page 1 would tell a crawler that products only reachable on page 3
 *     do not exist.
 *   - SORT IS A REFINEMENT of ordering, not of content: the same products in a
 *     different order. It is dropped from the canonical.
 *
 * Deliberately nothing else. No generated titles per filter combination, no
 * synthetic descriptions - the brief asks not to over-build SEO here.
 */
export function canonicalFor(basePath: string, params: SearchParams): string {
  const page = pageSchema.parse(params.page ?? 1);
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}
