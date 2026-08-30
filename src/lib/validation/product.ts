import { z } from 'zod';

import {
  agorot,
  hebrewText,
  id,
  machineKey,
  optionalAgorot,
  slug,
  stockLevel,
  storageKey,
} from './common';

/**
 * Catalog validation.
 *
 * These schemas are the contract for the admin product form (spec section 41)
 * and for every server action that writes catalog data. They are enforced on
 * the server; the form reuses them so the rules cannot diverge.
 */

export const productTypeSchema = z.enum([
  'RING',
  'EARRINGS',
  'NECKLACE',
  'BRACELET',
  'SET',
  'OTHER',
]);

export const optionTypeSchema = z.enum([
  'GOLD_KARAT',
  'GOLD_COLOR',
  'RING_SIZE',
  'LENGTH',
  'STYLE',
  'PENDANT_TYPE',
  'OTHER',
]);

export const customFieldTypeSchema = z.enum(['TEXT', 'TEXTAREA', 'SELECT', 'LANGUAGE']);

export const inventoryPolicySchema = z.enum(['DENY', 'MADE_TO_ORDER']);

/** One selectable value of an option: "14K", "YELLOW", "52". */
export const optionValueInputSchema = z.object({
  id: id.optional(),
  value: z.string().trim().min(1).max(64),
  labelHe: hebrewText(64),
  /** Gold-colour swatch. */
  hexColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour, for example #E5C06B.')
    .nullish(),
  position: z.int().min(0).default(0),
  isActive: z.boolean().default(true),
});

/**
 * A product option.
 *
 * `code` is the per-product uniqueness key, NOT `type` — a product may carry
 * several options of type OTHER (spec section 10 needs Style and Pendant type
 * on one necklace). See DATA_MODEL_REVIEW F5.
 *
 * `isVariantAxis` decides whether values generate stocked variants or are
 * recorded as a line selection. The business rule for size is undecided
 * (TBD.md B11); this stays per product, as data.
 */
export const productOptionInputSchema = z.object({
  id: id.optional(),
  code: machineKey,
  type: optionTypeSchema,
  nameHe: hebrewText(64),
  isVariantAxis: z.boolean().default(true),
  isRequired: z.boolean().default(true),
  position: z.int().min(0).default(0),
  values: z.array(optionValueInputSchema).min(1, 'An option needs at least one value.'),
});

export const diamondSpecInputSchema = z.object({
  isLabGrown: z.boolean().default(true),
  /** Carat is a physical measurement, so a decimal string is correct here. */
  totalCaratWeight: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Carat weight must be a number with at most two decimals.')
    .nullish(),
  stoneCount: z.int().min(1).nullish(),
  color: z.string().trim().max(16).nullish(),
  clarity: z.string().trim().max(16).nullish(),
  cut: z.string().trim().max(32).nullish(),
  shape: z.string().trim().max(32).nullish(),
  notesHe: z.string().trim().max(2000).nullish(),
  /**
   * Certificate issuer is free text, deliberately not an enum: the provider is
   * TBD (TBD.md B16) and an enum would encode an unmade decision.
   */
  certificate: z
    .object({
      issuer: z.string().trim().min(1).max(64),
      number: z.string().trim().min(1).max(64),
      issuedAt: z.coerce.date().nullish(),
      fileKey: storageKey.nullish(),
      verifyUrl: z.url().nullish(),
    })
    .nullish(),
});

export const productVariantInputSchema = z.object({
  id: id.optional(),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required.')
    .max(64)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'SKU may contain only letters, digits, dots, hyphens and underscores.',
    ),
  /** null inherits the product's base price. */
  priceAgorot: optionalAgorot,
  compareAtAgorot: optionalAgorot,
  prepDays: z.int().min(0).max(365).nullish(),
  weightGrams: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, 'Weight must be a number with at most three decimals.')
    .nullish(),
  /** Ids of the ProductOptionValue rows this variant combines. */
  optionValueIds: z.array(id),
  isActive: z.boolean().default(true),
  position: z.int().min(0).default(0),
  inventory: z
    .object({
      onHand: stockLevel.default(0),
      policy: inventoryPolicySchema.default('MADE_TO_ORDER'),
      lowStockThreshold: z.int().min(1).nullish(),
    })
    .default({ onHand: 0, policy: 'MADE_TO_ORDER' }),
  diamondSpec: diamondSpecInputSchema.nullish(),
});

/** A per-product personalization field definition (spec section 18). */
export const customizationFieldInputSchema = z
  .object({
    id: id.optional(),
    key: machineKey,
    labelHe: hebrewText(64),
    fieldType: customFieldTypeSchema,
    isRequired: z.boolean().default(false),
    maxLength: z.int().min(1).max(1000).nullish(),
    options: z
      .array(z.object({ value: z.string().trim().min(1).max(64), labelHe: hebrewText(64) }))
      .nullish(),
    pattern: z.string().max(200).nullish(),
    helpTextHe: z.string().trim().max(500).nullish(),
    position: z.int().min(0).default(0),
    priceDeltaAgorot: agorot.default(0),
  })
  .refine(
    (field) =>
      !['SELECT', 'LANGUAGE'].includes(field.fieldType) ||
      (field.options !== null && field.options !== undefined && field.options.length > 0),
    { message: 'A SELECT or LANGUAGE field must declare its allowed values.', path: ['options'] },
  );

export const productImageInputSchema = z.object({
  id: id.optional(),
  storageKey,
  /** Required: accessibility is not optional (spec section 47). */
  altHe: hebrewText(200),
  variantId: id.nullish(),
  width: z.int().min(1).nullish(),
  height: z.int().min(1).nullish(),
  position: z.int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
});

/**
 * Creating or replacing a product.
 *
 * The refinements below encode the invariants the database cannot check across
 * rows in a single statement — duplicate keys within one submission, and
 * variant combinations that collide before they are ever written.
 */
export const productInputSchema = z
  .object({
    slug,
    nameHe: hebrewText(200),
    descriptionHe: z.string().trim().max(20_000).nullish(),
    shortDescriptionHe: z.string().trim().max(500).nullish(),
    primaryCategoryId: id,
    additionalCategoryIds: z.array(id).default([]),
    collectionIds: z.array(id).default([]),
    productType: productTypeSchema,
    basePriceAgorot: agorot,
    compareAtAgorot: optionalAgorot,
    hasDiamonds: z.boolean().default(false),
    defaultPrepDays: z.int().min(0).max(365).nullish(),
    lowStockThreshold: z.int().min(1).nullish(),
    /**
     * Long-tail facets only. Scalars and scalar arrays — no nesting, because
     * nested JSON is not usefully indexable. Allowed keys are checked against
     * the category's `filterConfig` at the service layer (D2.5).
     */
    attributes: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
      )
      .nullish(),
    seoTitle: z.string().trim().max(70).nullish(),
    seoDescription: z.string().trim().max(160).nullish(),
    isActive: z.boolean().default(false),
    options: z.array(productOptionInputSchema).default([]),
    variants: z.array(productVariantInputSchema).min(1, 'A product needs at least one variant.'),
    customFields: z.array(customizationFieldInputSchema).default([]),
    images: z.array(productImageInputSchema).default([]),
    /** Product-level diamond default, inherited by variants that declare none. */
    diamondSpec: diamondSpecInputSchema.nullish(),
  })
  .refine(
    (product) =>
      product.compareAtAgorot == null || product.compareAtAgorot > product.basePriceAgorot,
    {
      message: 'Compare-at price must be higher than the price, or it is not a comparison.',
      path: ['compareAtAgorot'],
    },
  )
  .refine(
    (product) => new Set(product.options.map((o) => o.code)).size === product.options.length,
    {
      message: 'Option codes must be unique within a product.',
      path: ['options'],
    },
  )
  .refine(
    (product) =>
      new Set(product.customFields.map((f) => f.key)).size === product.customFields.length,
    {
      message: 'Customization field keys must be unique within a product.',
      path: ['customFields'],
    },
  )
  .refine(
    (product) => new Set(product.variants.map((v) => v.sku)).size === product.variants.length,
    {
      message: 'SKUs must be unique.',
      path: ['variants'],
    },
  )
  .refine(
    (product) => {
      // Mirrors the `[productId, optionSignature]` unique constraint, so a
      // duplicate combination is reported as a form error rather than a raw
      // database violation (DATA_MODEL_REVIEW F3).
      const signatures = product.variants.map((variant) =>
        [...new Set(variant.optionValueIds)].sort().join(':'),
      );
      return new Set(signatures).size === signatures.length;
    },
    { message: 'Two variants share the same option combination.', path: ['variants'] },
  );

export const productUpdateSchema = productInputSchema;

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type ProductOptionInput = z.infer<typeof productOptionInputSchema>;
export type CustomizationFieldInput = z.infer<typeof customizationFieldInputSchema>;
