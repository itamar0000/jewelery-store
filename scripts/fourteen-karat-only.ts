/**
 * The shop sells 14K only (D4D.25).
 *
 * The owner's decision, 2026-10-07: every piece in 14 karat; anyone who wants
 * 18 karat asks for it as a custom request. This script makes the catalogue
 * say so.
 *
 *   node scripts/fourteen-karat-only.ts            # dry run, prints the plan
 *   node scripts/fourteen-karat-only.ts --apply    # writes
 *
 * PER PRODUCT:
 *
 *   - Offered in 14K and in other karats: every non-14K variant is ARCHIVED,
 *     never deleted (orders and carts keep their rows), and the non-14K karat
 *     values are switched off so no filter or picker offers them.
 *   - Offered ONLY in another karat (18K): there is nothing to fall back to,
 *     so those variants are RELABELLED 14K in place - same id, price,
 *     photographs and diamond - their SKU's "-18K" becomes "-14K". The price
 *     stays what it was and is listed at the end for the owner to review:
 *     a 14K price is the owner's to set, not this script's to guess.
 *
 *   - Offered with NO karat at all (seven starter pieces): a 14K option is
 *     added, holding the one value, and linked to every live variant.
 *
 * Then the price range and the search document are rebuilt, and the one
 * product description that offered "14 או 18 קראט" is reworded.
 *
 * Idempotent: a second run finds nothing to do. One transaction: all or nothing.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { computeOptionSignature } from '../src/lib/catalog/option-signature.ts';
import { reindexSearchDocuments } from '../src/lib/search/reindex.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const KEEP = '14K';

/** Descriptions that offered a choice the shop no longer has. */
const COPY_FIXES: readonly [from: string, to: string][] = [
  ['ב-14 או 18 קראט.', 'ב-14 קראט. ב-18 קראט אפשר להזמין כעיצוב אישי.'],
];

try {
  const toReview = new Set<string>();
  const touched: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      /*
       * PIECES WITH NO KARAT AT ALL. Seven starter products were created with
       * no gold_karat option, so the product page, the cart and the order said
       * nothing about the gold. They get a 14K option holding the one value,
       * linked to every live variant (whose option signature is recomputed),
       * so the page states "14 קראט" as a fact like every other piece.
       */
      const unstated = await tx.product.findMany({
        where: { archivedAt: null, options: { none: { code: 'gold_karat' } } },
        orderBy: { slug: 'asc' },
        select: {
          id: true,
          slug: true,
          variants: {
            where: { archivedAt: null },
            select: { id: true, optionValues: { select: { valueId: true } } },
          },
        },
      });
      for (const product of unstated) {
        console.log(`${product.slug.padEnd(22)} add 14K (had no karat)`);
        touched.push(product.id);
        if (!APPLY) continue;
        const option = await tx.productOption.create({
          data: {
            productId: product.id,
            code: 'gold_karat',
            type: 'GOLD_KARAT',
            nameHe: 'קראט זהב',
            isVariantAxis: true,
            isRequired: true,
            position: 0,
            values: { create: { value: KEEP, labelHe: '14 קראט', position: 0 } },
          },
          include: { values: true },
        });
        const valueId = option.values[0]!.id;
        for (const variant of product.variants) {
          await tx.variantOptionValue.create({ data: { variantId: variant.id, valueId } });
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              optionSignature: computeOptionSignature([
                ...variant.optionValues.map((link) => link.valueId),
                valueId,
              ]),
            },
          });
        }
      }

      const products = await tx.product.findMany({
        where: { options: { some: { code: 'gold_karat' } } },
        orderBy: { slug: 'asc' },
        select: {
          id: true,
          slug: true,
          nameHe: true,
          basePriceAgorot: true,
          descriptionHe: true,
          options: {
            where: { code: 'gold_karat' },
            select: { id: true, values: { select: { id: true, value: true, isActive: true } } },
          },
          variants: {
            where: { archivedAt: null },
            select: {
              id: true,
              sku: true,
              priceAgorot: true,
              optionValues: { select: { valueId: true } },
            },
          },
        },
      });

      for (const product of products) {
        const option = product.options[0]!;
        const keep = option.values.find((value) => value.value === KEEP);
        const others = option.values.filter((value) => value.value !== KEEP);
        const otherIds = new Set(others.map((value) => value.id));
        const karatOf = (variant: (typeof product.variants)[number]) =>
          variant.optionValues.find(
            (link) => link.valueId === keep?.id || otherIds.has(link.valueId),
          )?.valueId;

        const kept = product.variants.filter((variant) => keep && karatOf(variant) === keep.id);
        const rest = product.variants.filter((variant) => otherIds.has(karatOf(variant) ?? ''));
        const copyFix = COPY_FIXES.find(([from]) => product.descriptionHe?.includes(from));
        const activeOthers = others.filter((value) => value.isActive);

        if (
          rest.length === 0 &&
          activeOthers.length === 0 &&
          keep?.isActive !== false &&
          !copyFix
        ) {
          continue;
        }
        touched.push(product.id);

        if (kept.length > 0) {
          console.log(`${product.slug.padEnd(22)} archive ${rest.length} non-14K variant(s)`);
          if (APPLY && rest.length > 0) {
            await tx.productVariant.updateMany({
              where: { id: { in: rest.map((variant) => variant.id) } },
              data: { archivedAt: new Date(), isActive: false },
            });
          }
        } else if (rest.length > 0) {
          console.log(`${product.slug.padEnd(22)} relabel ${rest.length} variant(s) as 14K`);
          let keepId = keep?.id;
          if (APPLY && !keepId) {
            keepId = (
              await tx.productOptionValue.create({
                data: { optionId: option.id, value: KEEP, labelHe: '14 קראט', position: 0 },
              })
            ).id;
          }
          for (const variant of rest) {
            const price = variant.priceAgorot ?? product.basePriceAgorot;
            toReview.add(
              `  ${product.nameHe} (${product.slug}): ₪${(price / 100).toLocaleString('en-US')}`,
            );
            if (!APPLY) continue;
            const from = karatOf(variant)!;
            const ids = variant.optionValues
              .map((link) => link.valueId)
              .map((id) => (id === from ? keepId! : id));
            await tx.variantOptionValue.delete({
              where: { variantId_valueId: { variantId: variant.id, valueId: from } },
            });
            await tx.variantOptionValue.create({
              data: { variantId: variant.id, valueId: keepId! },
            });
            const sku = variant.sku.replace(/-18K(?=-|$)/, '-14K');
            const clash =
              sku !== variant.sku && (await tx.productVariant.findUnique({ where: { sku } }));
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                optionSignature: computeOptionSignature(ids),
                ...(sku !== variant.sku && !clash ? { sku } : {}),
              },
            });
          }
        }

        if (APPLY) {
          if (activeOthers.length > 0) {
            await tx.productOptionValue.updateMany({
              where: { id: { in: activeOthers.map((value) => value.id) } },
              data: { isActive: false },
            });
          }
          if (keep && !keep.isActive) {
            await tx.productOptionValue.update({
              where: { id: keep.id },
              data: { isActive: true },
            });
          }
          if (copyFix) {
            await tx.product.update({
              where: { id: product.id },
              data: { descriptionHe: product.descriptionHe!.replace(copyFix[0], copyFix[1]) },
            });
          }

          const live = await tx.productVariant.findMany({
            where: { productId: product.id, archivedAt: null, isActive: true },
            select: { priceAgorot: true },
          });
          const prices = live.map((variant) => variant.priceAgorot ?? product.basePriceAgorot);
          await tx.product.update({
            where: { id: product.id },
            data: {
              minPriceAgorot: prices.length ? Math.min(...prices) : null,
              maxPriceAgorot: prices.length ? Math.max(...prices) : null,
            },
          });
        }
        if (copyFix) console.log(`${product.slug.padEnd(22)} description reworded`);
      }

      if (APPLY && touched.length > 0) await reindexSearchDocuments(tx, touched);
    },
    { timeout: 60_000 },
  );

  if (toReview.size > 0) {
    console.log('\nNow 14K at the price they had as 18K - review these prices in the admin:');
    for (const line of toReview) console.log(line);
  }
  console.log(
    APPLY ? `\nApplied to ${touched.length} product(s).` : '\nDRY RUN - nothing written.',
  );
} finally {
  await prisma.$disconnect();
}
