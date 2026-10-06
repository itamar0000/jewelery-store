import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { testPrisma } from '@/test/db';

/**
 * A personalised ring, built the way the catalogue builds one: a gold-colour
 * axis (two variants), a required ring size chosen per line, and three
 * personalisation fields - a required engraving with a surcharge, a required
 * language choice, and optional notes. The white variant is a stocked piece
 * with one unit; the yellow one is made to order.
 *
 * Shared by the cart and order integration tests, so both exercise the same
 * catalogue shape the storefront sells.
 */
export async function createPersonalisedRing(options: { whiteOnHand?: number } = {}) {
  const category = await testPrisma.category.create({
    data: { slug: `rings-${Date.now().toString(36)}`, nameHe: 'טבעות', isActive: true },
  });

  const product = await testPrisma.product.create({
    data: {
      slug: `engraved-ring-${Date.now().toString(36)}`,
      nameHe: 'טבעת חריטה',
      primaryCategoryId: category.id,
      productType: 'RING',
      basePriceAgorot: 100_000,
      isActive: true,
      publishedAt: new Date(),
      defaultPrepDays: 14,
      options: {
        create: [
          {
            code: 'gold_color',
            type: 'GOLD_COLOR',
            nameHe: 'גוון זהב',
            position: 1,
            values: {
              create: [
                { value: 'YELLOW', labelHe: 'זהב צהוב', position: 1 },
                { value: 'WHITE', labelHe: 'זהב לבן', position: 2 },
              ],
            },
          },
          {
            code: 'ring_size',
            type: 'RING_SIZE',
            nameHe: 'מידת טבעת',
            isVariantAxis: false,
            isRequired: true,
            position: 2,
            values: {
              create: [
                { value: '50', labelHe: '50', position: 1 },
                { value: '52', labelHe: '52', position: 2 },
                { value: '60', labelHe: '60', position: 3, isActive: false },
              ],
            },
          },
        ],
      },
      customFields: {
        create: [
          {
            key: 'name',
            labelHe: 'שם לחריטה',
            fieldType: 'TEXT',
            isRequired: true,
            maxLength: 12,
            position: 1,
            priceDeltaAgorot: 9_000,
          },
          {
            key: 'language',
            labelHe: 'שפת החריטה',
            fieldType: 'LANGUAGE',
            isRequired: true,
            options: [
              { value: 'he', labelHe: 'עברית' },
              { value: 'en', labelHe: 'אנגלית' },
            ],
            position: 2,
          },
          {
            key: 'notes',
            labelHe: 'הערות',
            fieldType: 'TEXTAREA',
            isRequired: false,
            maxLength: 200,
            position: 3,
          },
        ],
      },
      diamondSpec: {
        create: {
          isLabGrown: true,
          totalCaratWeight: '0.50',
          stoneCount: 1,
          color: 'G',
          clarity: 'VS1',
          shape: 'Round',
          certificate: { create: { issuer: 'IGI', number: 'LG123456' } },
        },
      },
    },
    select: {
      id: true,
      options: { select: { code: true, values: { select: { id: true, value: true } } } },
    },
  });

  const colour = product.options.find((option) => option.code === 'gold_color')!;
  const valueId = (value: string) => colour.values.find((entry) => entry.value === value)!.id;

  const yellow = await testPrisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `RING-Y-${Date.now().toString(36)}`,
      priceAgorot: 100_000,
      prepDays: 10,
      position: 1,
      optionSignature: computeOptionSignature([valueId('YELLOW')]),
      optionValues: { create: [{ valueId: valueId('YELLOW') }] },
      inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
    },
    select: { id: true, sku: true },
  });

  const white = await testPrisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `RING-W-${Date.now().toString(36)}`,
      priceAgorot: 120_000,
      position: 2,
      optionSignature: computeOptionSignature([valueId('WHITE')]),
      optionValues: { create: [{ valueId: valueId('WHITE') }] },
      inventory: { create: { onHand: options.whiteOnHand ?? 1, policy: 'DENY' } },
    },
    select: { id: true, sku: true },
  });

  return { productId: product.id, yellow, white };
}

/** A complete, valid add-to-cart payload for the ring. */
export function ringLine(
  variantId: string,
  overrides: {
    size?: string | null;
    name?: string;
    language?: string;
    notes?: string;
    quantity?: number;
  } = {},
) {
  const size = overrides.size === undefined ? '52' : overrides.size;

  return {
    variantId,
    quantity: overrides.quantity ?? 1,
    selections:
      size === null
        ? []
        : [
            {
              optionCode: 'ring_size',
              optionLabelHe: 'מידת טבעת',
              value: size,
              valueLabelHe: size,
            },
          ],
    personalization: {
      name: overrides.name ?? 'מיכל',
      language: overrides.language ?? 'he',
      notes: overrides.notes ?? '',
    },
  };
}
