/**
 * Automatic sales, as prices (D4D.33).
 *
 * PURE. Given the live sales and what a piece belongs to, this says what the
 * piece costs now. Every surface that shows or charges a price - the card,
 * the product page, the bag, the order - goes through `salePrice`, so a sale
 * cannot show one figure and charge another.
 *
 * ONE SALE PER PIECE, THE BUYER'S BEST. Sales never stack: where two reach the
 * same piece (a site-wide 10% and a 20% on earrings), the larger discount
 * applies and the other is ignored for that piece.
 *
 * A PERCENTAGE SALE PRICE IS A WHOLE SHEKEL, rounded to the nearest one, so a
 * 15% sale on ₪2,150 reads ₪1,828 rather than ₪1,827.50. A fixed amount is
 * taken off as given, and never takes a price below one shekel.
 */

export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionScopeValue = 'ENTIRE_SITE' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION';

export interface ActivePromotion {
  readonly id: string;
  readonly nameHe: string;
  readonly discountType: PromotionDiscountType;
  /** Basis points for PERCENTAGE, agorot for FIXED_AMOUNT. */
  readonly discountValue: number;
  readonly appliesTo: PromotionScopeValue;
  readonly productIds: ReadonlySet<string>;
  readonly categoryIds: ReadonlySet<string>;
  readonly collectionIds: ReadonlySet<string>;
}

/** What a piece belongs to, as far as a sale can target it. */
export interface PriceContext {
  readonly productId: string;
  /** The primary category, its parent, and every other category it is filed under. */
  readonly categoryIds: readonly string[];
  readonly collectionIds: readonly string[];
}

export interface SalePrice {
  /** What the piece costs now, in agorot. */
  readonly priceAgorot: number;
  /** Its regular price, in agorot. */
  readonly regularAgorot: number;
  /** The sale that applies, or null when none does. */
  readonly promotion: { readonly id: string; readonly nameHe: string } | null;
}

const MIN_PRICE_AGOROT = 100;

export function promotionReaches(promotion: ActivePromotion, context: PriceContext): boolean {
  switch (promotion.appliesTo) {
    case 'ENTIRE_SITE':
      return true;
    case 'PRODUCT':
      return promotion.productIds.has(context.productId);
    case 'CATEGORY':
      return context.categoryIds.some((id) => promotion.categoryIds.has(id));
    case 'COLLECTION':
      return context.collectionIds.some((id) => promotion.collectionIds.has(id));
  }
}

/** The price under one sale. */
export function discountedPrice(promotion: ActivePromotion, regularAgorot: number): number {
  if (promotion.discountType === 'PERCENTAGE') {
    const raw = regularAgorot * (1 - promotion.discountValue / 10_000);
    return Math.max(MIN_PRICE_AGOROT, Math.round(raw / 100) * 100);
  }
  return Math.max(MIN_PRICE_AGOROT, regularAgorot - promotion.discountValue);
}

export function salePrice(
  regularAgorot: number,
  context: PriceContext,
  promotions: readonly ActivePromotion[],
): SalePrice {
  let best: SalePrice = { priceAgorot: regularAgorot, regularAgorot, promotion: null };
  for (const promotion of promotions) {
    if (!promotionReaches(promotion, context)) continue;
    const price = discountedPrice(promotion, regularAgorot);
    if (price < best.priceAgorot) {
      best = {
        priceAgorot: price,
        regularAgorot,
        promotion: { id: promotion.id, nameHe: promotion.nameHe },
      };
    }
  }
  return best;
}

/**
 * A product's category ids for matching: each category it is filed under and
 * that category's parent, so a sale on "עגילים" reaches "עגילי חישוק".
 */
export function categoryIdsOf(
  links: readonly { readonly id: string; readonly parentId: string | null }[],
): string[] {
  const ids = new Set<string>();
  for (const link of links) {
    ids.add(link.id);
    if (link.parentId) ids.add(link.parentId);
  }
  return [...ids];
}
