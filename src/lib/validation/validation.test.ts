import { describe, expect, it } from 'vitest';

import { customRequestSchema, couponInputSchema, orderTotalsSchema } from './commerce';
import { normalizeEmail } from './common';
import { validatePersonalization, type FieldRule } from './personalization';
import { productInputSchema } from './product';

/**
 * Validation schemas.
 *
 * These run on the server. Everything asserted here is a rule that would
 * otherwise reach the database as a constraint violation with an unhelpful
 * message, or — worse — as data that satisfies the database but not the
 * business.
 */

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'aurora-ring',
    nameHe: 'טבעת אורורה',
    primaryCategoryId: 'clh0000000000000000000000',
    productType: 'RING',
    basePriceAgorot: 489_000,
    variants: [{ sku: 'AURORA-1', optionValueIds: ['clh0000000000000000000001'] }],
    ...overrides,
  };
}

describe('product input', () => {
  it('accepts a minimal valid product', () => {
    expect(productInputSchema.safeParse(baseProduct()).success).toBe(true);
  });

  it('requires at least one variant, because Product != SKU', () => {
    const result = productInputSchema.safeParse(baseProduct({ variants: [] }));
    expect(result.success).toBe(false);
  });

  it('rejects a fractional price, which is not representable in agorot', () => {
    const result = productInputSchema.safeParse(baseProduct({ basePriceAgorot: 1299.5 }));
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(productInputSchema.safeParse(baseProduct({ basePriceAgorot: -1 })).success).toBe(false);
  });

  it('rejects a compare-at price at or below the actual price', () => {
    // Otherwise the storefront renders a fake discount.
    const result = productInputSchema.safeParse(
      baseProduct({ basePriceAgorot: 100_000, compareAtAgorot: 100_000 }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects a non-ASCII slug', () => {
    // Slugs are canonical URLs; Hebrew percent-encodes into unreadable links.
    expect(productInputSchema.safeParse(baseProduct({ slug: 'טבעת' })).success).toBe(false);
    expect(productInputSchema.safeParse(baseProduct({ slug: 'Aurora Ring' })).success).toBe(false);
  });

  it('rejects duplicate option codes within a product', () => {
    const result = productInputSchema.safeParse(
      baseProduct({
        options: [
          {
            code: 'gold_color',
            type: 'GOLD_COLOR',
            nameHe: 'גוון',
            values: [{ value: 'Y', labelHe: 'צהוב' }],
          },
          {
            code: 'gold_color',
            type: 'OTHER',
            nameHe: 'כפילות',
            values: [{ value: 'X', labelHe: 'איקס' }],
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts several options of type OTHER, which section 10 needs', () => {
    const result = productInputSchema.safeParse(
      baseProduct({
        options: [
          {
            code: 'style',
            type: 'OTHER',
            nameHe: 'סגנון',
            values: [{ value: 'V', labelHe: 'וינטג' }],
          },
          {
            code: 'pendant_type',
            type: 'OTHER',
            nameHe: 'תליון',
            values: [{ value: 'N', labelHe: 'שם' }],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects duplicate SKUs', () => {
    const result = productInputSchema.safeParse(
      baseProduct({
        variants: [
          { sku: 'SAME', optionValueIds: ['clh0000000000000000000001'] },
          { sku: 'SAME', optionValueIds: ['clh0000000000000000000002'] },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects two variants sharing an option combination before it reaches the database', () => {
    // Mirrors the [productId, optionSignature] unique constraint, so the admin
    // sees a form error rather than a raw constraint violation.
    const result = productInputSchema.safeParse(
      baseProduct({
        variants: [
          { sku: 'A', optionValueIds: ['clh0000000000000000000001', 'clh0000000000000000000002'] },
          { sku: 'B', optionValueIds: ['clh0000000000000000000002', 'clh0000000000000000000001'] },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires a SELECT customization field to declare its options', () => {
    const result = productInputSchema.safeParse(
      baseProduct({
        customFields: [{ key: 'language', labelHe: 'שפה', fieldType: 'SELECT' }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects duplicate customization keys', () => {
    const result = productInputSchema.safeParse(
      baseProduct({
        customFields: [
          { key: 'name', labelHe: 'שם', fieldType: 'TEXT' },
          { key: 'name', labelHe: 'שם שוב', fieldType: 'TEXT' },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe('personalization', () => {
  const rules: FieldRule[] = [
    {
      key: 'name',
      labelHe: 'שם לחריטה',
      fieldType: 'TEXT',
      isRequired: true,
      maxLength: 12,
      pattern: null,
      options: null,
    },
    {
      key: 'language',
      labelHe: 'שפה',
      fieldType: 'LANGUAGE',
      isRequired: true,
      maxLength: null,
      pattern: null,
      options: [
        { value: 'he', labelHe: 'עברית' },
        { value: 'en', labelHe: 'אנגלית' },
      ],
    },
    {
      key: 'notes',
      labelHe: 'הערות',
      fieldType: 'TEXTAREA',
      isRequired: false,
      maxLength: 200,
      pattern: null,
      options: null,
    },
  ];

  it('accepts a valid submission', () => {
    const result = validatePersonalization(rules, { name: 'מיכל', language: 'he' });
    expect(result).toEqual({ ok: true, values: { name: 'מיכל', language: 'he' } });
  });

  it('requires required fields', () => {
    const result = validatePersonalization(rules, { language: 'he' });
    expect(result.ok).toBe(false);
  });

  it('enforces maxLength on the server, not just in the browser', () => {
    const result = validatePersonalization(rules, {
      name: 'שם ארוך מדי בהחלט לחריטה',
      language: 'he',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a value outside a SELECT field options', () => {
    const result = validatePersonalization(rules, { name: 'מיכל', language: 'fr' });
    expect(result.ok).toBe(false);
  });

  it('rejects an unrecognised key rather than silently dropping it', () => {
    // An unknown key means the submission was not built from this product's
    // fields — a stale form, or tampering.
    const result = validatePersonalization(rules, {
      name: 'מיכל',
      language: 'he',
      priceOverride: '1',
    });
    expect(result.ok).toBe(false);
  });

  it('omits unanswered optional fields from the result', () => {
    const result = validatePersonalization(rules, { name: 'מיכל', language: 'he', notes: '' });
    expect(result).toEqual({ ok: true, values: { name: 'מיכל', language: 'he' } });
  });

  it('enforces a configured pattern', () => {
    const patterned: FieldRule[] = [
      {
        key: 'initials',
        labelHe: 'ראשי תיבות',
        fieldType: 'TEXT',
        isRequired: true,
        maxLength: 3,
        pattern: '^[A-Z]{2,3}$',
        options: null,
      },
    ];

    expect(validatePersonalization(patterned, { initials: 'ABC' }).ok).toBe(true);
    expect(validatePersonalization(patterned, { initials: 'abc' }).ok).toBe(false);
  });

  it('fails safely when a field is misconfigured, rather than allowing anything', () => {
    const broken: FieldRule[] = [
      {
        key: 'choice',
        labelHe: 'בחירה',
        fieldType: 'SELECT',
        isRequired: true,
        maxLength: null,
        pattern: null,
        options: [],
      },
    ];

    expect(validatePersonalization(broken, { choice: 'anything' }).ok).toBe(false);
  });
});

describe('coupon input', () => {
  const base = { code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 1_000 };

  it('accepts a valid percentage coupon', () => {
    expect(couponInputSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a percentage above 100%', () => {
    expect(couponInputSchema.safeParse({ ...base, discountValue: 10_001 }).success).toBe(false);
  });

  it('permits a large fixed amount, which is not a percentage', () => {
    const result = couponInputSchema.safeParse({
      ...base,
      discountType: 'FIXED_AMOUNT',
      discountValue: 50_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an inverted validity window', () => {
    const result = couponInputSchema.safeParse({
      ...base,
      startsAt: '2026-07-01',
      endsAt: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('requires a scoped coupon to name a target', () => {
    expect(couponInputSchema.safeParse({ ...base, appliesTo: 'PRODUCT' }).success).toBe(false);
  });

  it('requires a target to reference the entity matching its type', () => {
    const result = couponInputSchema.safeParse({
      ...base,
      appliesTo: 'PRODUCT',
      targets: [{ targetType: 'PRODUCT', collectionId: 'clh0000000000000000000001' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('order totals', () => {
  it('accepts totals that add up', () => {
    const result = orderTotalsSchema.safeParse({
      subtotalAgorot: 100_000,
      discountAgorot: 10_000,
      shippingAgorot: 3_000,
      totalAgorot: 93_000,
    });
    expect(result.success).toBe(true);
  });

  it('catches an arithmetic error before it reaches the CHECK constraint', () => {
    const result = orderTotalsSchema.safeParse({
      subtotalAgorot: 100_000,
      discountAgorot: 10_000,
      shippingAgorot: 3_000,
      totalAgorot: 100_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a discount larger than the subtotal', () => {
    const result = orderTotalsSchema.safeParse({
      subtotalAgorot: 10_000,
      discountAgorot: 20_000,
      shippingAgorot: 0,
      totalAgorot: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('custom request input', () => {
  const base = {
    fullName: 'לקוח בדיקה',
    email: 'demo@example.test',
    phone: '050-1234567',
    jewelryType: 'RING',
    description: 'רעיון לטבעת בעיצוב אישי עם יהלום מעבדה.',
  };

  it('accepts a valid request without an account', () => {
    // Spec section 19: an anonymous visitor can submit.
    expect(customRequestSchema.safeParse(base).success).toBe(true);
  });

  it('requires a description with some substance', () => {
    expect(customRequestSchema.safeParse({ ...base, description: 'קצר' }).success).toBe(false);
  });

  it('accepts an Israeli phone number in common formats', () => {
    for (const value of ['050-1234567', '0501234567', '+972 50 123 4567', '(050) 123-4567']) {
      expect(customRequestSchema.safeParse({ ...base, phone: value }).success).toBe(true);
    }
  });

  it('rejects an obviously invalid phone number', () => {
    expect(customRequestSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
  });

  it('caps the number of uploaded images', () => {
    const result = customRequestSchema.safeParse({
      ...base,
      imageKeys: Array.from({ length: 11 }, (_, index) => `uploads/${index}.jpg`),
    });
    expect(result.success).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims for the indexed lookup column', () => {
    expect(normalizeEmail('  Demo@Example.TEST ')).toBe('demo@example.test');
  });
});
