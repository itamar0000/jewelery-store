import { z } from 'zod';

import { agorot, basisPoints, email, hebrewText, id, phone, quantity, storageKey } from './common';
import { productTypeSchema } from './product';

/**
 * Commerce validation: cart, checkout, orders, coupons and custom requests.
 *
 * A recurring rule across all of these: THE CLIENT NEVER SENDS A PRICE.
 * Nothing below accepts a unit price, a line total or an order total from the
 * browser. Money is recomputed server-side from catalog data on every request
 * (spec section 48, ARCHITECTURE 4).
 */

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/**
 * A non-axis option choice recorded on the line — ring size, necklace length —
 * when the option is a selection rather than a variant axis (TBD.md B11).
 */
export const lineSelectionSchema = z.object({
  optionCode: z.string().min(1).max(64),
  optionLabelHe: z.string().min(1).max(64),
  value: z.string().min(1).max(64),
  valueLabelHe: z.string().min(1).max(64),
});

/**
 * Adding to the cart.
 *
 * Carries a variant, a quantity and the customer's choices — and no money at
 * all. Personalization values are validated separately against the product's
 * own fields (see `validatePersonalization`), because the rules are per product.
 */
export const addToCartSchema = z.object({
  variantId: id,
  quantity,
  selections: z.array(lineSelectionSchema).max(10).default([]),
  personalization: z.record(z.string(), z.string()).default({}),
});

export const updateCartItemSchema = z.object({
  cartItemId: id,
  quantity,
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Enter a coupon code.').max(64),
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/** Israeli shipping address (spec section 23). Israel only (section 4). */
export const shippingAddressSchema = z.object({
  fullName: hebrewText(120),
  phone,
  street: hebrewText(120),
  houseNumber: z.string().trim().min(1).max(20),
  apartment: z.string().trim().max(20).nullish(),
  city: hebrewText(80),
  /** Optional: Israeli customers frequently do not know it. */
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5,7}$/, 'A postal code is 5 to 7 digits.')
    .nullish(),
  instructions: z.string().trim().max(500).nullish(),
  country: z.literal('IL').default('IL'),
});

/**
 * Starting checkout.
 *
 * Guest checkout is a first-class path: there is no account requirement here
 * and none is implied (spec section 24). Contact details are captured directly.
 */
export const checkoutSchema = z.object({
  email,
  phone,
  customerName: hebrewText(120),
  shippingAddress: shippingAddressSchema,
  /** Explicit opt-in only; never implied by placing an order (section 51). */
  marketingOptIn: z.boolean().default(false),
  notes: z.string().trim().max(1000).nullish(),
});

// ---------------------------------------------------------------------------
// Coupons (admin)
// ---------------------------------------------------------------------------

export const discountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']);
export const couponTargetTypeSchema = z.enum(['PRODUCT', 'COLLECTION', 'CATEGORY']);

export const couponTargetInputSchema = z
  .object({
    targetType: couponTargetTypeSchema,
    productId: id.nullish(),
    collectionId: id.nullish(),
    categoryId: id.nullish(),
  })
  .refine(
    (target) =>
      (target.targetType === 'PRODUCT' && !!target.productId) ||
      (target.targetType === 'COLLECTION' && !!target.collectionId) ||
      (target.targetType === 'CATEGORY' && !!target.categoryId),
    { message: 'A coupon target must reference the entity matching its type.' },
  );

/**
 * Creating or editing a coupon (spec section 37).
 *
 * `discountValue` is polymorphic — basis points for PERCENTAGE, agorot for
 * FIXED_AMOUNT — which the refinement below bounds per type, mirroring the
 * `Coupon_percentage_within_range` CHECK constraint.
 */
export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'A coupon code needs at least 3 characters.')
      .max(64)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Coupon codes may contain only letters, digits, hyphens and underscores.',
      ),
    descriptionHe: z.string().trim().max(200).nullish(),
    discountType: discountTypeSchema,
    discountValue: z.int().min(1, 'A discount of zero is not a coupon.'),
    maxDiscountAgorot: agorot.min(1).nullish(),
    minOrderAgorot: agorot.nullish(),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish(),
    usageLimitTotal: z.int().min(1).nullish(),
    usageLimitPerCustomer: z.int().min(1).nullish(),
    appliesTo: z
      .enum(['ENTIRE_ORDER', 'COLLECTION', 'PRODUCT', 'CATEGORY'])
      .default('ENTIRE_ORDER'),
    targets: z.array(couponTargetInputSchema).default([]),
    isActive: z.boolean().default(true),
  })
  .refine((coupon) => coupon.discountType !== 'PERCENTAGE' || coupon.discountValue <= 10_000, {
    message: 'A percentage discount may not exceed 100% (10000 basis points).',
    path: ['discountValue'],
  })
  .refine((coupon) => !coupon.startsAt || !coupon.endsAt || coupon.startsAt < coupon.endsAt, {
    message: 'The start date must fall before the end date.',
    path: ['endsAt'],
  })
  .refine((coupon) => coupon.appliesTo === 'ENTIRE_ORDER' || coupon.targets.length > 0, {
    message: 'A scoped coupon must declare at least one target.',
    path: ['targets'],
  });

// ---------------------------------------------------------------------------
// Custom jewelry requests (spec section 19)
// ---------------------------------------------------------------------------

/**
 * A custom request.
 *
 * Contact details are captured directly so an anonymous visitor can submit
 * without an account. Budget is optional (section 19 marks it optional/TBD).
 */
export const customRequestSchema = z.object({
  fullName: hebrewText(120),
  email,
  phone,
  jewelryType: productTypeSchema,
  description: z
    .string()
    .trim()
    .min(10, 'Please describe your idea in a little more detail.')
    .max(5000),
  extraDetails: z.string().trim().max(5000).nullish(),
  budgetAgorot: agorot.nullish(),
  /** Uploads go direct to storage; only the resulting keys arrive here. */
  imageKeys: z.array(storageKey).max(10, 'Up to 10 images.').default([]),
});

export const customRequestStatusSchema = z.enum([
  'NEW',
  'REVIEWING',
  'QUOTE_SENT',
  'CUSTOMER_APPROVED',
  'PRODUCTION',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);

/** An admin moving a request along, optionally attaching a quote. */
export const customRequestTransitionSchema = z
  .object({
    requestId: id,
    toStatus: customRequestStatusSchema,
    quoteAgorot: agorot.nullish(),
    quoteNotes: z.string().trim().max(2000).nullish(),
    note: z.string().trim().max(1000).nullish(),
  })
  .refine((input) => input.toStatus !== 'QUOTE_SENT' || input.quoteAgorot != null, {
    message: 'A quote amount is required before a quote can be sent.',
    path: ['quoteAgorot'],
  });

// ---------------------------------------------------------------------------
// Orders (admin)
// ---------------------------------------------------------------------------

export const orderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);

export const orderStatusTransitionSchema = z.object({
  orderId: id,
  toStatus: orderStatusSchema,
  note: z.string().trim().max(1000).nullish(),
});

/**
 * The server-computed money for an order.
 *
 * NOT a request body — this is the shape the checkout service produces after
 * recomputing everything from catalog data. Validating it before writing
 * catches an arithmetic bug at the application boundary, in addition to the
 * `Order_total_consistent` CHECK constraint.
 */
export const orderTotalsSchema = z
  .object({
    subtotalAgorot: agorot,
    discountAgorot: agorot,
    shippingAgorot: agorot,
    totalAgorot: agorot,
    vatRateBps: basisPoints.nullish(),
    vatAmountAgorot: agorot.nullish(),
  })
  .refine(
    (totals) =>
      totals.totalAgorot === totals.subtotalAgorot - totals.discountAgorot + totals.shippingAgorot,
    {
      message: 'Order total does not equal subtotal - discount + shipping.',
      path: ['totalAgorot'],
    },
  )
  .refine((totals) => totals.discountAgorot <= totals.subtotalAgorot, {
    message: 'Discount may not exceed the subtotal.',
    path: ['discountAgorot'],
  });

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CouponInput = z.infer<typeof couponInputSchema>;
export type CustomRequestInput = z.infer<typeof customRequestSchema>;
export type OrderTotals = z.infer<typeof orderTotalsSchema>;
