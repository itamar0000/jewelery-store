import { prisma } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { reindexSearchDocuments } from '@/lib/search/reindex';

/**
 * Products, as the owner edits them (D4D.24).
 *
 * WHAT THIS EDITS: the words, the visibility, every variant's price, and the
 * diamond sizes a piece is offered in. Ids, photographs and order history are
 * never touched; nothing is deleted - a product is hidden or archived, a
 * diamond size is withdrawn by archiving its variants.
 *
 * DENORMALISED FIELDS ARE KEPT IN STEP HERE. A price change recomputes
 * `Product.minPriceAgorot/maxPriceAgorot` (F19, which the price filter and
 * sort read), and a change of words or options rebuilds the search document.
 */

type Tx = Prisma.TransactionClient;

export const DIAMOND_SIZE_CODE = 'diamond_carat';

export async function listProductsForAdmin() {
  return prisma.product.findMany({
    orderBy: [
      { archivedAt: { sort: 'asc', nulls: 'first' } },
      { primaryCategory: { position: 'asc' } },
      { nameHe: 'asc' },
    ],
    select: {
      id: true,
      slug: true,
      nameHe: true,
      isActive: true,
      archivedAt: true,
      minPriceAgorot: true,
      maxPriceAgorot: true,
      hasDiamonds: true,
      primaryCategory: { select: { nameHe: true } },
      images: {
        where: { variantId: null },
        orderBy: { position: 'asc' },
        take: 1,
        select: { storageKey: true },
      },
      _count: { select: { variants: { where: { archivedAt: null } } } },
    },
  });
}

export async function getProductForAdmin(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      primaryCategory: { select: { nameHe: true } },
      diamondSpec: true,
      options: {
        orderBy: { position: 'asc' },
        include: { values: { orderBy: { position: 'asc' } } },
      },
      variants: {
        where: { archivedAt: null },
        orderBy: { position: 'asc' },
        include: {
          optionValues: { include: { value: { include: { option: true } } } },
          diamondSpec: { select: { totalCaratWeight: true } },
        },
      },
      images: { where: { variantId: null }, orderBy: { position: 'asc' }, take: 1 },
    },
  });
  if (!product) return null;

  const variants = product.variants.map((variant) => {
    const values = [...variant.optionValues]
      .map((link) => link.value)
      .sort((a, b) => a.option.position - b.option.position);
    return {
      id: variant.id,
      sku: variant.sku,
      isActive: variant.isActive,
      priceAgorot: variant.priceAgorot ?? product.basePriceAgorot,
      label: values.map((value) => value.labelHe).join(' · ') || 'דגם יחיד',
      caratValue: values.find((value) => value.option.code === DIAMOND_SIZE_CODE)?.value ?? null,
    };
  });

  const sizeOption = product.options.find((option) => option.code === DIAMOND_SIZE_CODE) ?? null;
  return { ...product, variants, sizeOption };
}

// ----------------------------------------------------------------- details

export async function updateProductDetails(
  id: string,
  input: {
    readonly nameHe: string;
    readonly shortDescriptionHe: string | null;
    readonly descriptionHe: string | null;
    readonly visible: boolean;
  },
): Promise<void> {
  const current = await prisma.product.findUniqueOrThrow({
    where: { id },
    select: { publishedAt: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        nameHe: input.nameHe,
        shortDescriptionHe: input.shortDescriptionHe,
        descriptionHe: input.descriptionHe,
        isActive: input.visible,
        // A product shown for the first time is published now.
        ...(input.visible && !current.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    await reindexSearchDocuments(tx, [id]);
  });
}

/** Archive takes a product out of the shop entirely; restore brings it back hidden. */
export async function setProductArchived(id: string, archived: boolean): Promise<void> {
  await prisma.product.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), isActive: false } : { archivedAt: null },
  });
}

// ------------------------------------------------------------------ prices

async function recomputePriceRange(tx: Tx, productId: string): Promise<void> {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: {
      basePriceAgorot: true,
      variants: {
        where: { archivedAt: null, isActive: true },
        select: { priceAgorot: true },
      },
    },
  });
  const prices = product.variants.map((variant) => variant.priceAgorot ?? product.basePriceAgorot);
  await tx.product.update({
    where: { id: productId },
    data: {
      minPriceAgorot: prices.length ? Math.min(...prices) : null,
      maxPriceAgorot: prices.length ? Math.max(...prices) : null,
    },
  });
}

export async function updateVariantPrices(
  productId: string,
  prices: readonly { readonly variantId: string; readonly priceAgorot: number }[],
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    let changed = 0;
    for (const entry of prices) {
      const result = await tx.productVariant.updateMany({
        where: { id: entry.variantId, productId, archivedAt: null },
        data: { priceAgorot: entry.priceAgorot },
      });
      changed += result.count;
    }
    await recomputePriceRange(tx, productId);
    return changed;
  });
}

// ----------------------------------------------------------- diamond sizes

/**
 * A carat weight as the catalogue writes it: two decimals, "0.60". Accepts
 * "0.6", ".6" and "0,6"; refuses anything outside 0.01-20 carat.
 */
export function normalizeCarat(raw: string): string | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!/^\d{0,2}(\.\d{1,2})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0.01 || value > 20) return null;
  return value.toFixed(2);
}

export function caratLabel(carat: string): string {
  return `${carat} קראט`;
}

/** The SKU suffix for a size: 0.70 -> "-070CT". */
function caratSku(carat: string): string {
  return `-${String(Math.round(Number(carat) * 100)).padStart(3, '0')}CT`;
}

export type AddSizeResult =
  | { readonly ok: true; readonly created: number }
  | { readonly ok: false; readonly reason: 'no-diamond' | 'exists' | 'no-variants' | 'negative' };

/**
 * Offer a piece in one more diamond size.
 *
 * THE FIRST TIME, the size the piece is listed in today becomes the base
 * choice: a "גודל יהלום" option is added, holding that size, and every current
 * variant is linked to it (its option signature recomputed). Nothing about
 * those variants changes otherwise - same id, SKU, price, photographs.
 *
 * THEN every base-size variant is mirrored at the new size: same gold and
 * karat, made to order, the price the owner gave (base price + the difference), the
 * same photographs - the photograph shows the design, the size is a choice -
 * and its own diamond record carrying the new weight, so the product page,
 * the cart and the order all state the size that was chosen.
 */
export async function addDiamondSize(input: {
  readonly productId: string;
  readonly carat: string;
  readonly priceDifferenceAgorot: number;
}): Promise<AddSizeResult> {
  return prisma
    .$transaction(async (tx): Promise<AddSizeResult> => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: input.productId },
        include: {
          diamondSpec: true,
          options: { include: { values: true } },
          variants: {
            where: { archivedAt: null },
            include: {
              optionValues: true,
              images: true,
            },
          },
        },
      });
      const spec = product.diamondSpec;
      if (!spec?.totalCaratWeight) return { ok: false, reason: 'no-diamond' };
      if (product.variants.length === 0) return { ok: false, reason: 'no-variants' };

      const baseCarat = Number(spec.totalCaratWeight).toFixed(2);
      let option = product.options.find((entry) => entry.code === DIAMOND_SIZE_CODE);
      let baseValueId: string;

      if (!option) {
        const created = await tx.productOption.create({
          data: {
            productId: product.id,
            code: DIAMOND_SIZE_CODE,
            type: 'OTHER',
            nameHe: 'גודל יהלום',
            isVariantAxis: true,
            isRequired: true,
            position: Math.max(0, ...product.options.map((entry) => entry.position)) + 1,
            values: { create: { value: baseCarat, labelHe: caratLabel(baseCarat), position: 0 } },
          },
          include: { values: true },
        });
        option = created;
        baseValueId = created.values[0]!.id;

        for (const variant of product.variants) {
          const ids = [...variant.optionValues.map((link) => link.valueId), baseValueId];
          await tx.variantOptionValue.create({
            data: { variantId: variant.id, valueId: baseValueId },
          });
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { optionSignature: computeOptionSignature(ids) },
          });
          variant.optionValues.push({ variantId: variant.id, valueId: baseValueId });
        }
      } else {
        const base = option.values.find((value) => value.value === baseCarat);
        if (!base) return { ok: false, reason: 'no-diamond' };
        baseValueId = base.id;
      }

      const existing = option.values.find((value) => value.value === input.carat);
      if (existing?.isActive) return { ok: false, reason: 'exists' };

      const value = existing
        ? await tx.productOptionValue.update({
            where: { id: existing.id },
            data: { isActive: true },
          })
        : await tx.productOptionValue.create({
            data: {
              optionId: option.id,
              value: input.carat,
              labelHe: caratLabel(input.carat),
              position: Math.max(0, ...option.values.map((entry) => entry.position)) + 1,
            },
          });

      const templates = product.variants.filter((variant) =>
        variant.optionValues.some((link) => link.valueId === baseValueId),
      );
      let position = Math.max(0, ...product.variants.map((variant) => variant.position));
      let created = 0;

      for (const template of templates) {
        const price =
          (template.priceAgorot ?? product.basePriceAgorot) + input.priceDifferenceAgorot;
        if (price <= 0) throw new NegativePriceError();

        const ids = [
          ...template.optionValues.map((link) => link.valueId).filter((id) => id !== baseValueId),
          value.id,
        ];
        const signature = computeOptionSignature(ids);
        const archivedTwin = await tx.productVariant.findUnique({
          where: {
            productId_optionSignature: { productId: product.id, optionSignature: signature },
          },
        });
        if (archivedTwin) {
          // The size was offered before and withdrawn: bring its variant back.
          await tx.productVariant.update({
            where: { id: archivedTwin.id },
            data: { archivedAt: null, isActive: true, priceAgorot: price },
          });
          created += 1;
          continue;
        }

        position += 1;
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: `${template.sku}${caratSku(input.carat)}`,
            priceAgorot: price,
            compareAtAgorot: null,
            prepDays: template.prepDays,
            weightGrams: template.weightGrams,
            isActive: template.isActive,
            position,
            optionSignature: signature,
            optionValues: { create: ids.map((valueId) => ({ valueId })) },
            // Made to order, always: a piece in stock is in stock at its own
            // size, and a new stone size is made when it is ordered.
            inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
            diamondSpec: {
              create: {
                isLabGrown: spec.isLabGrown,
                totalCaratWeight: input.carat,
                stoneCount: spec.stoneCount,
                color: spec.color,
                clarity: spec.clarity,
                cut: spec.cut,
                shape: spec.shape,
                notesHe: spec.notesHe,
              },
            },
          },
        });
        if (template.images.length > 0) {
          await tx.productImage.createMany({
            data: template.images.map((image) => ({
              productId: product.id,
              variantId: variant.id,
              storageKey: image.storageKey,
              altHe: image.altHe,
              width: image.width,
              height: image.height,
              position: image.position,
              isPrimary: image.isPrimary,
              isSimulation: image.isSimulation,
              mediaType: image.mediaType,
            })),
          });
        }
        created += 1;
      }

      await recomputePriceRange(tx, product.id);
      await reindexSearchDocuments(tx, [product.id]);
      return { ok: true, created };
    })
    .catch((error: unknown) => {
      if (error instanceof NegativePriceError)
        return { ok: false as const, reason: 'negative' as const };
      throw error;
    });
}

class NegativePriceError extends Error {}

/**
 * Stop offering a size. Its variants are archived, never deleted - orders and
 * carts that reference them keep their rows. The base size cannot be removed:
 * it is the size the product's own diamond record describes.
 */
export async function removeDiamondSize(
  productId: string,
  valueId: string,
): Promise<'removed' | 'base' | 'missing'> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { diamondSpec: { select: { totalCaratWeight: true } } },
    });
    const value = await tx.productOptionValue.findFirst({
      where: { id: valueId, option: { productId, code: DIAMOND_SIZE_CODE } },
    });
    if (!value) return 'missing';
    const base = product.diamondSpec?.totalCaratWeight
      ? Number(product.diamondSpec.totalCaratWeight).toFixed(2)
      : null;
    if (value.value === base) return 'base';

    await tx.productVariant.updateMany({
      where: { productId, archivedAt: null, optionValues: { some: { valueId } } },
      data: { archivedAt: new Date(), isActive: false },
    });
    await tx.productOptionValue.update({ where: { id: valueId }, data: { isActive: false } });
    await recomputePriceRange(tx, productId);
    await reindexSearchDocuments(tx, [productId]);
    return 'removed';
  });
}

// ------------------------------------------------------- men's department

/** The men's department root (D4D.34). Its children are the choices. */
export const MEN_DEPARTMENT_SLUG = 'men';

export interface MenDepartmentState {
  readonly choices: readonly { id: string; nameHe: string }[];
  /** The men's category the piece is in, or null when it is not in one. */
  readonly currentId: string | null;
}

/** Which men's category a piece belongs to, and which it could. */
export async function getMenDepartment(productId: string): Promise<MenDepartmentState> {
  const choices = await prisma.category.findMany({
    where: { parent: { slug: MEN_DEPARTMENT_SLUG }, archivedAt: null },
    orderBy: { position: 'asc' },
    select: { id: true, nameHe: true },
  });
  const link = await prisma.productCategory.findFirst({
    where: { productId, categoryId: { in: choices.map((choice) => choice.id) } },
    select: { categoryId: true },
  });
  return { choices, currentId: link?.categoryId ?? null };
}

/**
 * Puts a piece in one men's category, or takes it out of the department.
 *
 * A SECONDARY MEMBERSHIP ONLY: the piece's primary category, its URL and its
 * photographs do not change. A piece sits in at most one men's category, so
 * the old link goes in the same transaction the new one is made.
 */
export async function setMenDepartment(
  productId: string,
  categoryId: string | null,
): Promise<void> {
  const { choices } = await getMenDepartment(productId);
  const ids = choices.map((choice) => choice.id);
  if (categoryId !== null && !ids.includes(categoryId)) {
    throw new Error('Not a men’s category.');
  }
  await prisma.$transaction([
    prisma.productCategory.deleteMany({ where: { productId, categoryId: { in: ids } } }),
    ...(categoryId === null
      ? []
      : [prisma.productCategory.create({ data: { productId, categoryId, position: 100 } })]),
  ]);
}
