import { computeOptionSignature } from '@/lib/catalog/option-signature';

import { testPrisma } from './db';

/**
 * Minimal fixtures for integration tests.
 *
 * Deliberately small: each factory creates the least that satisfies the
 * schema's required columns and foreign keys, so a test reads as the thing it
 * is testing rather than forty lines of setup.
 */

let counter = 0;
/** Unique suffix, so parallel-safe values never collide within a run. */
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export async function createCategory(): Promise<{ id: string }> {
  return testPrisma.category.create({
    data: { slug: unique('cat'), nameHe: 'קטגוריית בדיקה' },
    select: { id: true },
  });
}

export interface VariantFixture {
  productId: string;
  variantId: string;
  categoryId: string;
}

/**
 * A product with one variant and its inventory row.
 *
 * `policy` and `onHand` are the two knobs the inventory tests actually turn.
 */
export async function createVariantWithStock(options: {
  onHand: number;
  policy: 'DENY' | 'MADE_TO_ORDER';
  priceAgorot?: number;
  lowStockThreshold?: number | null;
}): Promise<VariantFixture> {
  const category = await createCategory();

  const product = await testPrisma.product.create({
    data: {
      slug: unique('product'),
      nameHe: 'מוצר בדיקה',
      primaryCategoryId: category.id,
      productType: 'RING',
      basePriceAgorot: options.priceAgorot ?? 100_000,
      variants: {
        create: {
          sku: unique('SKU').toUpperCase(),
          priceAgorot: options.priceAgorot ?? 100_000,
          optionSignature: '',
          inventory: {
            create: {
              onHand: options.onHand,
              policy: options.policy,
              lowStockThreshold: options.lowStockThreshold ?? null,
            },
          },
        },
      },
    },
    select: { id: true, variants: { select: { id: true } } },
  });

  const variantId = product.variants[0]?.id;
  if (!variantId) throw new Error('Fixture failed to create a variant.');

  return { productId: product.id, variantId, categoryId: category.id };
}

/** A product carrying one two-value option axis, for signature tests. */
export async function createProductWithOption(): Promise<{
  productId: string;
  optionId: string;
  valueIds: string[];
}> {
  const category = await createCategory();

  const product = await testPrisma.product.create({
    data: {
      slug: unique('product'),
      nameHe: 'מוצר בדיקה',
      primaryCategoryId: category.id,
      productType: 'RING',
      basePriceAgorot: 100_000,
      options: {
        create: {
          code: 'gold_color',
          type: 'GOLD_COLOR',
          nameHe: 'גוון זהב',
          values: {
            create: [
              { value: 'YELLOW', labelHe: 'זהב צהוב' },
              { value: 'WHITE', labelHe: 'זהב לבן' },
            ],
          },
        },
      },
    },
    select: { id: true, options: { select: { id: true, values: { select: { id: true } } } } },
  });

  const option = product.options[0];
  if (!option) throw new Error('Fixture failed to create an option.');

  return {
    productId: product.id,
    optionId: option.id,
    valueIds: option.values.map((value) => value.id),
  };
}

/** Create a variant bound to a specific set of option values. */
export async function createVariantForValues(
  productId: string,
  valueIds: string[],
): Promise<{ id: string }> {
  return testPrisma.productVariant.create({
    data: {
      productId,
      sku: unique('SKU').toUpperCase(),
      priceAgorot: 100_000,
      optionSignature: computeOptionSignature(valueIds),
      optionValues: { create: valueIds.map((valueId) => ({ valueId })) },
    },
    select: { id: true },
  });
}

export async function createCustomer(email = 'demo@example.test'): Promise<{ id: string }> {
  return testPrisma.customer.create({
    data: { email, emailNormalized: email.toLowerCase() },
    select: { id: true },
  });
}

/**
 * A minimal placed order.
 *
 * Totals default to a set that satisfies `Order_total_consistent`; a test that
 * wants to violate it passes its own.
 */
export async function createOrder(options: {
  customerId: string;
  subtotalAgorot?: number;
  discountAgorot?: number;
  shippingAgorot?: number;
  totalAgorot?: number;
}): Promise<{ id: string; orderNumber: number }> {
  const subtotal = options.subtotalAgorot ?? 100_000;
  const discount = options.discountAgorot ?? 0;
  const shipping = options.shippingAgorot ?? 0;

  return testPrisma.order.create({
    data: {
      customerId: options.customerId,
      email: 'demo@example.test',
      phone: '050-0000000',
      customerName: 'לקוח בדיקה',
      subtotalAgorot: subtotal,
      discountAgorot: discount,
      shippingAgorot: shipping,
      totalAgorot: options.totalAgorot ?? subtotal - discount + shipping,
    },
    select: { id: true, orderNumber: true },
  });
}
