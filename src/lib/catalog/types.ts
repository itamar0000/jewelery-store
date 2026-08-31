import type { Availability } from '@/lib/inventory/availability';
import type { Money } from '@/lib/money';

import type { ResolvedImage } from './images';

/**
 * The catalog VIEW MODELS.
 *
 * THE POINT OF THIS FILE IS THAT PRISMA STOPS HERE. Route and component code
 * imports these types; nothing outside `src/lib/catalog` imports a Prisma model
 * type or touches the client. That keeps three things true:
 *
 *   1. Money is `Money` (integer agorot through `@/lib/money`), never a raw
 *      number that a component might format by hand.
 *   2. Availability is the resolved `Availability` object from
 *      `@/lib/inventory`, never a display string stored in a column - the
 *      schema comment above `Inventory` is explicit that availability is
 *      derived, never stored.
 *   3. A schema change is absorbed by the mappers in `queries.ts` rather than
 *      rippling into JSX.
 *
 * These are read models. Nothing here is written back.
 */

/** A category as it appears in navigation and breadcrumbs. */
export interface CategorySummary {
  readonly id: string;
  readonly slug: string;
  readonly nameHe: string;
  /** Path this category is reachable at, already assembled for `<Link>`. */
  readonly href: string;
}

/** A category page's own data, including its children and product count. */
export interface CategoryDetail extends CategorySummary {
  readonly descriptionHe: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  /**
   * Raw `Category.filterConfig`. Read by `getCategoryFacets`, which decides
   * which facets this category offers. Kept opaque here so the type does not
   * have to track the JSON shape.
   */
  readonly filterConfig: unknown;
  /** Immediate subcategories, active only, in `position` order. */
  readonly children: readonly CategorySummary[];
  /** Ancestors from the root down to (but excluding) this category. */
  readonly ancestors: readonly CategorySummary[];
}

/** A collection as surfaced on the homepage and its own page. */
export interface CollectionSummary {
  readonly id: string;
  readonly slug: string;
  readonly nameHe: string;
  readonly descriptionHe: string | null;
  readonly href: string;
}

/**
 * One selectable option value - a gold colour, a karat, a ring size.
 *
 * `isAxis` mirrors `ProductOption.isVariantAxis`: an AXIS value picks a
 * different variant (its own SKU, price and stock); a non-axis value is a
 * SELECTION recorded on the order line for a made-to-order piece. The product
 * page renders both, but only an axis change re-resolves the variant.
 */
export interface OptionValueView {
  readonly id: string;
  readonly value: string;
  readonly labelHe: string;
  readonly hexColor: string | null;
}

export interface ProductOptionView {
  readonly id: string;
  /** "gold_karat", "gold_color", "ring_size", "length", ... */
  readonly code: string;
  readonly type: string;
  readonly nameHe: string;
  readonly isAxis: boolean;
  readonly isRequired: boolean;
  readonly values: readonly OptionValueView[];
}

/** Diamond characteristics, product-level or variant-level (schema F6). */
export interface DiamondView {
  readonly isLabGrown: boolean;
  readonly totalCaratWeight: string | null;
  readonly stoneCount: number | null;
  readonly color: string | null;
  readonly clarity: string | null;
  readonly cut: string | null;
  readonly shape: string | null;
  readonly certificate: {
    readonly issuer: string;
    readonly number: string;
    readonly verifyUrl: string | null;
  } | null;
}

/**
 * One purchasable combination.
 *
 * Carries its OWN price, availability and images, because that is where they
 * live in the schema - not on the product (spec section 11: Product != SKU).
 */
export interface VariantView {
  readonly id: string;
  readonly sku: string;
  readonly price: Money;
  readonly compareAtPrice: Money | null;
  /** Option value ids this variant is the combination of. */
  readonly optionValueIds: readonly string[];
  readonly availability: Availability;
  /** Variant-specific images. Empty when it shares the product gallery. */
  readonly images: readonly ResolvedImage[];
  /** Variant-level override; falls back to the product's spec when absent. */
  readonly diamond: DiamondView | null;
}

/** A personalization field definition (spec section 18). */
export interface CustomizationFieldView {
  readonly id: string;
  readonly key: string;
  readonly labelHe: string;
  readonly fieldType: string;
  readonly isRequired: boolean;
  readonly maxLength: number | null;
  readonly helpTextHe: string | null;
  readonly priceDelta: Money | null;
}

/** Everything the product page needs, in one object. */
export interface ProductDetail {
  readonly id: string;
  readonly slug: string;
  readonly nameHe: string;
  readonly descriptionHe: string | null;
  readonly shortDescriptionHe: string | null;
  readonly productType: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly category: CategorySummary;
  readonly ancestors: readonly CategorySummary[];
  readonly options: readonly ProductOptionView[];
  readonly variants: readonly VariantView[];
  /** Product-level images, shared by variants that carry none of their own. */
  readonly images: readonly ResolvedImage[];
  /** Product-level diamond spec, shared across variants (schema F6). */
  readonly diamond: DiamondView | null;
  readonly customizationFields: readonly CustomizationFieldView[];
  readonly collections: readonly CollectionSummary[];
  /** Lowest and highest effective variant price, for a range display. */
  readonly priceRange: { readonly min: Money; readonly max: Money };
}
