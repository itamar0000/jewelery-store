import type { ProductBadge, ProductCardData } from '@/components/product/types';
import { prisma } from '@/lib/db';
import { resolveAvailability, type Availability } from '@/lib/inventory/availability';
import { fromAgorot, toAgorot, type Money } from '@/lib/money';

import { resolveImageUrl, type ResolvedImage } from './images';
import type {
  CategoryDetail,
  CategorySummary,
  CollectionSummary,
  DiamondView,
  ProductDetail,
  ProductOptionView,
  VariantView,
} from './types';

/**
 * Server-side catalog reads.
 *
 * THE ONLY MODULE THAT TOUCHES PRISMA FOR CATALOG DATA. Routes call these
 * functions and receive the view models from ./types; no component imports
 * `@/lib/db`. That boundary is what the brief means by "do not expose Prisma
 * directly throughout the UI", and it is also what makes the fixture removal a
 * one-line change per route.
 *
 * These run on the server only. They are called from server components, which
 * is why there is no `use client` anywhere near them - importing this module
 * into a client component fails the build, which is the guard we want.
 *
 * VISIBILITY IS ENFORCED IN ONE PLACE. `activeProduct` below is spread into
 * every product query: unpublished, inactive and archived products must never
 * reach a customer, and repeating that predicate per call site is how one
 * eventually gets forgotten.
 *
 * PRICES ARE COMPUTED, NEVER TRUSTED FROM THE CLIENT. Every price returned here
 * is read from the database and converted through `@/lib/money`; nothing
 * accepts a price as input.
 */

/**
 * Products a customer may see. Active, published, not archived.
 *
 * Exported so `browse.ts` reuses the exact same predicate. A second copy of
 * this is how an unpublished draft eventually leaks onto a filtered page.
 */
export const activeProduct = {
  isActive: true,
  archivedAt: null,
  publishedAt: { not: null },
} as const;

/** Variants a customer may see. */
const activeVariant = { isActive: true, archivedAt: null } as const;

/** Category tree path. A child renders at /parent/child, a root at /root. */
function categoryHref(slug: string, parentSlug?: string | null): string {
  return parentSlug ? `/${parentSlug}/${slug}` : `/${slug}`;
}

// ---------------------------------------------------------------- categories

/**
 * Every active ROOT category, in display order.
 *
 * Roots only: the storefront navigation is driven by
 * `src/lib/navigation/taxonomy.ts`, and this exists for pages that need the
 * real category list rather than the hand-maintained one.
 */
export async function getCategories(): Promise<readonly CategorySummary[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true, archivedAt: null, parentId: null },
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, nameHe: true },
  });

  return rows.map((row) => ({ ...row, href: categoryHref(row.slug) }));
}

/**
 * One category by slug, with its children and ancestors.
 *
 * Returns `null` when the slug is unknown or inactive, so the route can call
 * `notFound()` rather than render an empty page - a category that does not
 * exist must not return 200 to a crawler.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const row = await prisma.category.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    select: {
      id: true,
      slug: true,
      nameHe: true,
      descriptionHe: true,
      seoTitle: true,
      seoDescription: true,
      filterConfig: true,
      parent: { select: { id: true, slug: true, nameHe: true, parentId: true } },
      children: {
        where: { isActive: true, archivedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true, slug: true, nameHe: true },
      },
    },
  });

  if (!row) return null;

  const parent = row.parent;
  const ancestors: CategorySummary[] = parent
    ? [{ id: parent.id, slug: parent.slug, nameHe: parent.nameHe, href: categoryHref(parent.slug) }]
    : [];

  return {
    id: row.id,
    slug: row.slug,
    nameHe: row.nameHe,
    descriptionHe: row.descriptionHe,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    filterConfig: row.filterConfig,
    href: categoryHref(row.slug, parent?.slug),
    ancestors,
    children: row.children.map((child) => ({
      ...child,
      href: categoryHref(child.slug, row.slug),
    })),
  };
}

/**
 * Products in a category, as cards.
 *
 * INCLUDES DESCENDANTS. Opening "טבעות" must show engagement rings too;
 * otherwise a parent category looks empty while its children hold everything.
 * Membership is the union of the primary category and the explicit
 * `ProductCategory` links, which is exactly what that join table exists for -
 * a ring can sit under both "Rings" and "Engagement Rings" without a second
 * canonical URL.
 */
export async function getProductsByCategory(
  categoryId: string,
  options: { readonly limit?: number } = {},
): Promise<readonly ProductCardData[]> {
  const categoryIds = await descendantCategoryIds(categoryId);

  const rows = await prisma.product.findMany({
    where: {
      ...activeProduct,
      OR: [
        { primaryCategoryId: { in: categoryIds } },
        { categories: { some: { categoryId: { in: categoryIds } } } },
      ],
    },
    orderBy: [{ publishedAt: 'desc' }, { nameHe: 'asc' }],
    take: options.limit,
    select: productCardSelect,
  });

  return rows.map(toProductCard);
}

/** How many products a category page will show. Same predicate as the list. */
export async function countProductsByCategory(categoryId: string): Promise<number> {
  const categoryIds = await descendantCategoryIds(categoryId);

  return prisma.product.count({
    where: {
      ...activeProduct,
      OR: [
        { primaryCategoryId: { in: categoryIds } },
        { categories: { some: { categoryId: { in: categoryIds } } } },
      ],
    },
  });
}

/**
 * A category and everything beneath it.
 *
 * Two levels deep, which is the whole depth the specification describes
 * (section 5: category, then subcategory). Deliberately not a recursive CTE -
 * that would be a raw query for a tree that is two levels tall.
 */
export async function descendantCategoryIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId, isActive: true, archivedAt: null },
    select: { id: true },
  });

  return [categoryId, ...children.map((child) => child.id)];
}

// --------------------------------------------------------------- collections

/** Active collections in display order. */
export async function getCollections(): Promise<readonly CollectionSummary[]> {
  const rows = await prisma.collection.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, nameHe: true, descriptionHe: true },
  });

  return rows.map((row) => ({ ...row, href: `/collections/${row.slug}` }));
}

/** One collection by slug, or `null` when it does not exist. */
export async function getCollection(slug: string): Promise<CollectionSummary | null> {
  const row = await prisma.collection.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    select: { id: true, slug: true, nameHe: true, descriptionHe: true },
  });

  return row ? { ...row, href: `/collections/${row.slug}` } : null;
}

/**
 * Products in a collection, in the curator's order.
 *
 * `ProductCollection.position` is the merchandising order and is respected
 * first. Automatic collections are TBD (TBD.md B15) - `isAutomatic` is false
 * everywhere and no rule engine is invented here.
 */
export async function getProductsByCollection(
  collectionId: string,
  options: { readonly limit?: number } = {},
): Promise<readonly ProductCardData[]> {
  const rows = await prisma.productCollection.findMany({
    where: { collectionId, product: activeProduct },
    orderBy: { position: 'asc' },
    take: options.limit,
    select: { product: { select: productCardSelect } },
  });

  return rows.map((row) => toProductCard(row.product));
}

export async function countProductsByCollection(collectionId: string): Promise<number> {
  return prisma.productCollection.count({
    where: { collectionId, product: activeProduct },
  });
}

// ------------------------------------------------------------------ products

/**
 * One product with everything the product page renders.
 *
 * A single query with nested selects rather than several round trips: the
 * product page needs all of it before it can render anything, so splitting it
 * would only add latency.
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: { slug, ...activeProduct },
    select: {
      id: true,
      slug: true,
      nameHe: true,
      descriptionHe: true,
      shortDescriptionHe: true,
      productType: true,
      seoTitle: true,
      seoDescription: true,
      basePriceAgorot: true,
      compareAtAgorot: true,
      defaultPrepDays: true,
      lowStockThreshold: true,

      primaryCategory: {
        select: {
          id: true,
          slug: true,
          nameHe: true,
          parent: { select: { id: true, slug: true, nameHe: true } },
        },
      },

      options: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          code: true,
          type: true,
          nameHe: true,
          isVariantAxis: true,
          isRequired: true,
          values: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
            select: { id: true, value: true, labelHe: true, hexColor: true },
          },
        },
      },

      variants: {
        where: activeVariant,
        orderBy: { position: 'asc' },
        select: {
          id: true,
          sku: true,
          priceAgorot: true,
          compareAtAgorot: true,
          prepDays: true,
          optionValues: { select: { valueId: true } },
          inventory: {
            select: { onHand: true, reserved: true, policy: true, lowStockThreshold: true },
          },
          images: { orderBy: { position: 'asc' }, select: imageSelect },
          diamondSpec: { select: diamondSelect },
        },
      },

      // Product-level assets only. Variant assets are read on the variant.
      images: {
        where: { variantId: null },
        orderBy: { position: 'asc' },
        select: imageSelect,
      },

      diamondSpec: { select: diamondSelect },

      customFields: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          key: true,
          labelHe: true,
          fieldType: true,
          isRequired: true,
          maxLength: true,
          helpTextHe: true,
          priceDeltaAgorot: true,
        },
      },

      collections: {
        where: { collection: { isActive: true, archivedAt: null } },
        select: {
          collection: { select: { id: true, slug: true, nameHe: true, descriptionHe: true } },
        },
      },
    },
  });

  if (!row) return null;

  const variants: VariantView[] = row.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    price: fromAgorot(variant.priceAgorot ?? row.basePriceAgorot),
    compareAtPrice:
      variant.compareAtAgorot !== null
        ? fromAgorot(variant.compareAtAgorot)
        : row.compareAtAgorot !== null
          ? fromAgorot(row.compareAtAgorot)
          : null,
    optionValueIds: variant.optionValues.map((link) => link.valueId),
    availability: toAvailability(variant.inventory, {
      productThreshold: row.lowStockThreshold,
      productPrepDays: row.defaultPrepDays,
      variantPrepDays: variant.prepDays,
    }),
    images: variant.images.map(toResolvedImage),
    diamond: variant.diamondSpec ? toDiamond(variant.diamondSpec) : null,
  }));

  const parent = row.primaryCategory.parent;

  return {
    id: row.id,
    slug: row.slug,
    nameHe: row.nameHe,
    descriptionHe: row.descriptionHe,
    shortDescriptionHe: row.shortDescriptionHe,
    productType: row.productType,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,

    category: {
      id: row.primaryCategory.id,
      slug: row.primaryCategory.slug,
      nameHe: row.primaryCategory.nameHe,
      href: categoryHref(row.primaryCategory.slug, parent?.slug),
    },
    ancestors: parent
      ? [
          {
            id: parent.id,
            slug: parent.slug,
            nameHe: parent.nameHe,
            href: categoryHref(parent.slug),
          },
        ]
      : [],

    options: row.options.map((option): ProductOptionView => ({
      id: option.id,
      code: option.code,
      type: option.type,
      nameHe: option.nameHe,
      isAxis: option.isVariantAxis,
      isRequired: option.isRequired,
      values: option.values,
    })),

    variants,
    images: row.images.map(toResolvedImage),
    diamond: row.diamondSpec ? toDiamond(row.diamondSpec) : null,

    customizationFields: row.customFields.map((field) => ({
      id: field.id,
      key: field.key,
      labelHe: field.labelHe,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      maxLength: field.maxLength,
      helpTextHe: field.helpTextHe,
      priceDelta: field.priceDeltaAgorot !== null ? fromAgorot(field.priceDeltaAgorot) : null,
    })),

    collections: row.collections.map((link) => ({
      ...link.collection,
      href: `/collections/${link.collection.slug}`,
    })),

    priceRange: priceRange(variants, row.basePriceAgorot),
  };
}

/**
 * Variants for a product.
 *
 * Exposed separately because the brief asks for it; the product page itself
 * gets them inside `getProductBySlug`, which avoids a second round trip.
 */
export async function getProductVariants(productId: string): Promise<readonly VariantView[]> {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...activeProduct },
    select: {
      basePriceAgorot: true,
      compareAtAgorot: true,
      defaultPrepDays: true,
      lowStockThreshold: true,
      variants: {
        where: activeVariant,
        orderBy: { position: 'asc' },
        select: {
          id: true,
          sku: true,
          priceAgorot: true,
          compareAtAgorot: true,
          prepDays: true,
          optionValues: { select: { valueId: true } },
          inventory: {
            select: { onHand: true, reserved: true, policy: true, lowStockThreshold: true },
          },
          images: { orderBy: { position: 'asc' }, select: imageSelect },
          diamondSpec: { select: diamondSelect },
        },
      },
    },
  });

  if (!product) return [];

  return product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    price: fromAgorot(variant.priceAgorot ?? product.basePriceAgorot),
    compareAtPrice:
      variant.compareAtAgorot !== null
        ? fromAgorot(variant.compareAtAgorot)
        : product.compareAtAgorot !== null
          ? fromAgorot(product.compareAtAgorot)
          : null,
    optionValueIds: variant.optionValues.map((link) => link.valueId),
    availability: toAvailability(variant.inventory, {
      productThreshold: product.lowStockThreshold,
      productPrepDays: product.defaultPrepDays,
      variantPrepDays: variant.prepDays,
    }),
    images: variant.images.map(toResolvedImage),
    diamond: variant.diamondSpec ? toDiamond(variant.diamondSpec) : null,
  }));
}

/**
 * Images for a product, product-level and variant-level together.
 *
 * Ordered product-level first, then by position, which is the order a gallery
 * shows them in when no variant is selected.
 */
export async function getProductImages(productId: string): Promise<readonly ResolvedImage[]> {
  const rows = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ variantId: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }],
    select: imageSelect,
  });

  return rows.map(toResolvedImage);
}

// ------------------------------------------------------------------ mapping

const imageSelect = {
  id: true,
  storageKey: true,
  altHe: true,
  width: true,
  height: true,
  isPrimary: true,
  variantId: true,
} as const;

const diamondSelect = {
  isLabGrown: true,
  totalCaratWeight: true,
  stoneCount: true,
  color: true,
  clarity: true,
  cut: true,
  shape: true,
  certificate: { select: { issuer: true, number: true, verifyUrl: true } },
} as const;

/**
 * What a product card needs.
 *
 * Variants are pulled in because price, availability and therefore the
 * made-to-order badge all live there - a card cannot be built from the product
 * row alone.
 */
export const productCardSelect = {
  id: true,
  slug: true,
  nameHe: true,
  basePriceAgorot: true,
  compareAtAgorot: true,
  lowStockThreshold: true,
  defaultPrepDays: true,
  publishedAt: true,
  images: {
    where: { variantId: null },
    orderBy: { position: 'asc' },
    take: 1,
    select: { altHe: true },
  },
  variants: {
    where: activeVariant,
    orderBy: { position: 'asc' },
    select: {
      priceAgorot: true,
      compareAtAgorot: true,
      prepDays: true,
      inventory: {
        select: { onHand: true, reserved: true, policy: true, lowStockThreshold: true },
      },
    },
  },
  collections: { select: { collection: { select: { slug: true } } } },
} as const;

type ProductCardRow = {
  id: string;
  slug: string;
  nameHe: string;
  basePriceAgorot: number;
  compareAtAgorot: number | null;
  lowStockThreshold: number | null;
  defaultPrepDays: number | null;
  publishedAt: Date | null;
  images: { altHe: string }[];
  variants: {
    priceAgorot: number | null;
    compareAtAgorot: number | null;
    prepDays: number | null;
    inventory: {
      onHand: number;
      reserved: number;
      policy: string;
      lowStockThreshold: number | null;
    } | null;
  }[];
  collections: { collection: { slug: string } }[];
};

/**
 * Product row to card.
 *
 * THREE DERIVATIONS WORTH READING:
 *
 * PRICE is the LOWEST effective variant price, so a card never advertises a
 * price the customer cannot actually get. It falls back to the product base
 * price when a product has no variants.
 *
 * BADGES come from real data, not from a content field: collection membership
 * supplies "new"/"best seller", and the resolved availability supplies
 * "made to order". Nothing here is hand-authored merchandising.
 *
 * STOCK NOTICE is emitted ONLY when `resolveAvailability` reports genuine low
 * stock, which itself requires a configured threshold. This is the caller with
 * real inventory data that `ProductCardData.stockNotice` was designed for
 * (docs/DECISIONS.md D3.4) - the component still invents nothing.
 */
export function toProductCard(row: ProductCardRow): ProductCardData {
  const availabilities = row.variants.map((variant) =>
    toAvailability(variant.inventory, {
      productThreshold: row.lowStockThreshold,
      productPrepDays: row.defaultPrepDays,
      variantPrepDays: variant.prepDays,
    }),
  );

  const prices = row.variants.map((variant) => variant.priceAgorot ?? row.basePriceAgorot);
  const minPrice = prices.length > 0 ? Math.min(...prices) : row.basePriceAgorot;

  // A comparison price is only meaningful when it exceeds what is being asked.
  const compareCandidates = row.variants
    .map((variant) => variant.compareAtAgorot ?? row.compareAtAgorot)
    .filter((value): value is number => value !== null && value > minPrice);

  const collectionSlugs = new Set(row.collections.map((link) => link.collection.slug));

  const badges: ProductBadge[] = [];
  if (collectionSlugs.has('new-arrivals')) badges.push('new');
  if (collectionSlugs.has('best-sellers')) badges.push('best-seller');
  if (
    availabilities.length > 0 &&
    availabilities.every((availability) => availability.state === 'MADE_TO_ORDER')
  ) {
    badges.push('made-to-order');
  }

  // The lowest genuinely-low stock figure across variants, if any.
  const lowStock = availabilities.find((availability) => availability.isLowStock);

  const card: ProductCardData = {
    id: row.id,
    slug: row.slug,
    name: row.nameHe,
    price: fromAgorot(minPrice),
    imageAlt: row.images[0]?.altHe ?? row.nameHe,
    ...(compareCandidates.length > 0
      ? { compareAtPrice: fromAgorot(Math.max(...compareCandidates)) }
      : {}),
    ...(badges.length > 0 ? { badges } : {}),
    ...(lowStock ? { stockNotice: `נותרו ${lowStock.available} במלאי` } : {}),
  };

  return card;
}

function toResolvedImage(row: {
  id: string;
  storageKey: string;
  altHe: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  variantId: string | null;
}): ResolvedImage {
  return {
    id: row.id,
    url: resolveImageUrl(row.storageKey),
    altHe: row.altHe,
    width: row.width,
    height: row.height,
    isPrimary: row.isPrimary,
    variantId: row.variantId,
  };
}

function toDiamond(row: {
  isLabGrown: boolean;
  totalCaratWeight: unknown;
  stoneCount: number | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  shape: string | null;
  certificate: { issuer: string; number: string; verifyUrl: string | null } | null;
}): DiamondView {
  return {
    isLabGrown: row.isLabGrown,
    // Prisma Decimal. Stringified rather than converted to a float, because a
    // carat weight is a printed specification, not something to compute with.
    totalCaratWeight: row.totalCaratWeight === null ? null : String(row.totalCaratWeight),
    stoneCount: row.stoneCount,
    color: row.color,
    clarity: row.clarity,
    cut: row.cut,
    shape: row.shape,
    certificate: row.certificate,
  };
}

/**
 * Inventory row to resolved availability.
 *
 * A MISSING INVENTORY ROW IS NOT "IN STOCK". It is treated as zero on hand
 * under the schema default policy, so a data gap fails closed - showing an
 * unstocked item as available is the expensive direction to be wrong in.
 */
function toAvailability(
  inventory: {
    onHand: number;
    reserved: number;
    policy: string;
    lowStockThreshold: number | null;
  } | null,
  fallbacks: {
    productThreshold: number | null;
    productPrepDays: number | null;
    variantPrepDays: number | null;
  },
): Availability {
  return resolveAvailability({
    onHand: inventory?.onHand ?? 0,
    reserved: inventory?.reserved ?? 0,
    policy: inventory?.policy === 'DENY' ? 'DENY' : 'MADE_TO_ORDER',
    lowStockThreshold: inventory?.lowStockThreshold ?? fallbacks.productThreshold,
    prepDays: fallbacks.variantPrepDays ?? fallbacks.productPrepDays,
  });
}

function priceRange(
  variants: readonly VariantView[],
  basePriceAgorot: number,
): { min: Money; max: Money } {
  if (variants.length === 0) {
    const base = fromAgorot(basePriceAgorot);
    return { min: base, max: base };
  }

  const sorted = [...variants].sort((a, b) => toAgorot(a.price) - toAgorot(b.price));
  return { min: sorted[0]!.price, max: sorted[sorted.length - 1]!.price };
}
