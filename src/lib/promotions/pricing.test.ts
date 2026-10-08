import { describe, expect, it } from 'vitest';

import { categoryIdsOf, salePrice, type ActivePromotion, type PriceContext } from './pricing';

function promo(over: Partial<ActivePromotion> = {}): ActivePromotion {
  return {
    id: 'p1',
    nameHe: 'מבצע',
    discountType: 'PERCENTAGE',
    discountValue: 1_000,
    appliesTo: 'ENTIRE_SITE',
    productIds: new Set(),
    categoryIds: new Set(),
    collectionIds: new Set(),
    ...over,
  };
}

const ring: PriceContext = {
  productId: 'ring1',
  categoryIds: ['rings', 'engagement'],
  collectionIds: ['bridal'],
};

describe('salePrice', () => {
  it('leaves the price alone with no sale', () => {
    expect(salePrice(215_000, ring, [])).toEqual({
      priceAgorot: 215_000,
      regularAgorot: 215_000,
      promotion: null,
    });
  });

  it('rounds a percentage sale to a whole shekel', () => {
    const result = salePrice(215_000, ring, [promo({ discountValue: 1_500 })]);
    expect(result.priceAgorot).toBe(182_800);
    expect(result.promotion).toEqual({ id: 'p1', nameHe: 'מבצע' });
  });

  it('takes a fixed amount off, never below one shekel', () => {
    expect(
      salePrice(50_000, ring, [promo({ discountType: 'FIXED_AMOUNT', discountValue: 20_000 })])
        .priceAgorot,
    ).toBe(30_000);
    expect(
      salePrice(50_000, ring, [promo({ discountType: 'FIXED_AMOUNT', discountValue: 90_000 })])
        .priceAgorot,
    ).toBe(100);
  });

  it('applies only the best sale, never both', () => {
    const site = promo({ id: 'site', nameHe: 'כל האתר', discountValue: 1_000 });
    const rings = promo({
      id: 'rings',
      nameHe: 'טבעות',
      discountValue: 2_000,
      appliesTo: 'CATEGORY',
      categoryIds: new Set(['rings']),
    });
    const result = salePrice(100_000, ring, [site, rings]);
    expect(result.priceAgorot).toBe(80_000);
    expect(result.promotion?.id).toBe('rings');
  });

  it('reaches only the targeted products, categories and collections', () => {
    const other = (appliesTo: ActivePromotion['appliesTo']) =>
      promo({
        appliesTo,
        productIds: new Set(['x']),
        categoryIds: new Set(['x']),
        collectionIds: new Set(['x']),
      });
    for (const scope of ['PRODUCT', 'CATEGORY', 'COLLECTION'] as const) {
      expect(salePrice(100_000, ring, [other(scope)]).promotion).toBeNull();
    }
    expect(
      salePrice(100_000, ring, [promo({ appliesTo: 'PRODUCT', productIds: new Set(['ring1']) })])
        .priceAgorot,
    ).toBe(90_000);
    expect(
      salePrice(100_000, ring, [
        promo({ appliesTo: 'COLLECTION', collectionIds: new Set(['bridal']) }),
      ]).priceAgorot,
    ).toBe(90_000);
  });
});

describe('categoryIdsOf', () => {
  it('includes each parent, so a sale on a category reaches its subcategories', () => {
    expect(
      categoryIdsOf([
        { id: 'hoops', parentId: 'earrings' },
        { id: 'gifts', parentId: null },
      ]).sort(),
    ).toEqual(['earrings', 'gifts', 'hoops']);
  });
});
