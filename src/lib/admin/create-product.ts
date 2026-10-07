import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import { prisma } from '@/lib/db';
import type { ProductType } from '@/generated/prisma/client';
import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { reindexSearchDocuments } from '@/lib/search/reindex';

/**
 * A new product from the admin (D4D.25).
 *
 * It is built the way every product in the catalogue is: 14 karat only
 * (D4D.25), one variant per gold colour chosen, all at the one price given,
 * made to order; a ring gets the catalogue's ring sizes, a necklace or a
 * bracelet its lengths, as selections recorded on the order rather than
 * variants. A diamond, when there is one, is a product-level record that the
 * product page, the cart and the order all read.
 *
 * IT IS CREATED HIDDEN. The owner adds photographs on the next screen and
 * shows the product when it is ready; a product cannot be shown without one.
 */

export const GOLD_COLOURS = [
  { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B', sku: 'YELLOW' },
  { value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6', sku: 'WHITE' },
  { value: 'ROSE', labelHe: 'זהב אדום', hexColor: '#E3B7A8', sku: 'ROSE' },
] as const;

export const DIAMOND_SHAPES = [
  { value: 'Round', labelHe: 'עגול' },
  { value: 'Oval', labelHe: 'אובלי' },
  { value: 'Pear', labelHe: 'טיפה' },
  { value: 'Princess', labelHe: 'פרינסס' },
  { value: 'Emerald', labelHe: 'אמרלד' },
  { value: 'Cushion', labelHe: 'קושן' },
  { value: 'Marquise', labelHe: 'מרקיזה' },
  { value: 'Heart', labelHe: 'לב' },
  { value: 'Radiant', labelHe: 'רדיאנט' },
  { value: 'Asscher', labelHe: 'אשר' },
] as const;

/** The product type follows the top-level category. */
const TYPE_BY_ROOT: Readonly<Record<string, ProductType>> = {
  rings: 'RING',
  earrings: 'EARRINGS',
  necklaces: 'NECKLACE',
  bracelets: 'BRACELET',
  sets: 'SET',
};

/** The sizes and lengths the catalogue already offers, by product type. */
const SELECTIONS: Partial<
  Record<
    ProductType,
    { code: string; type: 'RING_SIZE' | 'LENGTH'; nameHe: string; values: [string, string][] }
  >
> = {
  RING: {
    code: 'ring_size',
    type: 'RING_SIZE',
    nameHe: 'מידה',
    values: ['48', '50', '52', '54', '56', '58'].map((size) => [size, size]),
  },
  NECKLACE: {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    values: [
      ['40CM', '40 ס״מ'],
      ['45CM', '45 ס״מ'],
    ],
  },
  BRACELET: {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    values: [
      ['17CM', '17 ס״מ'],
      ['18CM', '18 ס״מ'],
      ['19CM', '19 ס״מ'],
    ],
  },
};

export const createProductSchema = z.object({
  nameHe: z.string().trim().min(2, 'שם המוצר קצר מדי.').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, 'כתובת באנגלית: אותיות קטנות, ספרות ומקפים בלבד.')
    .max(60),
  categoryId: z.string().min(1, 'בחרו קטגוריה.').max(40),
  shortDescriptionHe: z.string().trim().max(300),
  descriptionHe: z.string().trim().max(5000),
  colours: z.array(z.enum(['YELLOW', 'WHITE', 'ROSE'])).min(1, 'בחרו לפחות גוון זהב אחד.'),
  priceAgorot: z.number().int().positive('המחיר צריך להיות גדול מאפס.'),
  prepDays: z.number().int().min(1).max(120),
  diamond: z
    .object({
      carat: z.string(),
      isLabGrown: z.boolean(),
      shape: z.string().max(20),
      stoneCount: z.number().int().min(1).max(500).nullable(),
      color: z.string().trim().max(10),
      clarity: z.string().trim().max(10),
      cut: z.string().trim().max(20),
    })
    .nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export type CreateProductResult =
  | { readonly ok: true; readonly productId: string }
  | { readonly ok: false; readonly message: string };

export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, slug: true, parent: { select: { slug: true } } },
  });
  if (!category) return { ok: false, message: 'הקטגוריה לא נמצאה.' };
  const productType = TYPE_BY_ROOT[category.parent?.slug ?? category.slug] ?? 'OTHER';

  const slug = input.slug || `${productType.toLowerCase()}-${randomBytes(3).toString('hex')}`;
  if (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    return { ok: false, message: `כבר יש מוצר בכתובת "${slug}". בחרו כתובת אחרת.` };
  }

  const selection = SELECTIONS[productType];
  const skuBase = slug.toUpperCase();

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug,
        nameHe: input.nameHe,
        shortDescriptionHe: input.shortDescriptionHe || null,
        descriptionHe: input.descriptionHe || null,
        primaryCategoryId: category.id,
        categories: { create: { categoryId: category.id } },
        productType,
        basePriceAgorot: input.priceAgorot,
        minPriceAgorot: input.priceAgorot,
        maxPriceAgorot: input.priceAgorot,
        hasDiamonds: input.diamond !== null,
        defaultPrepDays: input.prepDays,
        isActive: false,
        options: {
          create: [
            {
              code: 'gold_karat',
              type: 'GOLD_KARAT',
              nameHe: 'קראט זהב',
              position: 1,
              values: { create: { value: '14K', labelHe: '14 קראט', position: 0 } },
            },
            {
              code: 'gold_color',
              type: 'GOLD_COLOR',
              nameHe: 'גוון זהב',
              position: 2,
              values: {
                create: GOLD_COLOURS.filter((colour) => input.colours.includes(colour.value)).map(
                  (colour, position) => ({
                    value: colour.value,
                    labelHe: colour.labelHe,
                    hexColor: colour.hexColor,
                    position,
                  }),
                ),
              },
            },
            ...(selection
              ? [
                  {
                    code: selection.code,
                    type: selection.type,
                    nameHe: selection.nameHe,
                    isVariantAxis: false,
                    position: 3,
                    values: {
                      create: selection.values.map(([value, labelHe], position) => ({
                        value,
                        labelHe,
                        position,
                      })),
                    },
                  },
                ]
              : []),
          ],
        },
        ...(input.diamond && {
          diamondSpec: {
            create: {
              isLabGrown: input.diamond.isLabGrown,
              totalCaratWeight: input.diamond.carat,
              stoneCount: input.diamond.stoneCount,
              shape: input.diamond.shape || null,
              color: input.diamond.color || null,
              clarity: input.diamond.clarity || null,
              cut: input.diamond.cut || null,
            },
          },
        }),
      },
      include: { options: { include: { values: true } } },
    });

    const karat = product.options.find((option) => option.code === 'gold_karat')!.values[0]!;
    const colours = product.options.find((option) => option.code === 'gold_color')!.values;
    for (const [index, colour] of colours.sort((a, b) => a.position - b.position).entries()) {
      const ids = [karat.id, colour.id];
      await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: `${skuBase}-${colour.value}-14K`,
          priceAgorot: input.priceAgorot,
          position: index + 1,
          optionSignature: computeOptionSignature(ids),
          optionValues: { create: ids.map((valueId) => ({ valueId })) },
          inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
        },
      });
    }
    await reindexSearchDocuments(tx, [product.id]);
    return product.id;
  });

  return { ok: true, productId };
}

/** The categories a product can be filed under: every sub-category, by its parent. */
export async function listCategoryChoices() {
  const roots = await prisma.category.findMany({
    where: { parentId: null, archivedAt: null },
    orderBy: { position: 'asc' },
    select: {
      nameHe: true,
      children: {
        where: { archivedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true, nameHe: true },
      },
    },
  });
  return roots.filter((root) => root.children.length > 0);
}
