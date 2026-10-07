/**
 * Add a yellow-gold option to pieces that were listed in white gold only.
 *
 * The owner's review (2026-10-07) asked for yellow-gold photographs of six
 * pieces sold only in white or rose: a photograph needs a variant to belong
 * to. Every model is made to order in any colour (PRODUCT.md), so the yellow
 * variant mirrors its white one exactly - same karat, price, lead time and
 * made-to-order policy - and differs only in the colour.
 *
 * SAFETY, as in scripts/remove-demo-markers.ts:
 *
 *   1. DRY RUN BY DEFAULT. Nothing is written without `--apply`.
 *   2. IDEMPOTENT. A product that already has a yellow value is skipped.
 *   3. ADDS ONLY. No variant, image or option is changed or removed; product
 *      ids and photographs are untouched.
 *   4. ALL OR NOTHING, in one transaction, with the search documents rebuilt.
 *
 *   node scripts/add-yellow-gold-variants.ts            # dry run
 *   node scripts/add-yellow-gold-variants.ts --apply    # writes
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

const SLUGS = [
  'pear-solitaire',
  'pave-band',
  'emerald-cut-ring',
  'diamond-hoops',
  'diamond-bangle',
  'bridal-trio',
] as const;

/** The yellow value as every other product in the catalogue words it. */
const YELLOW = { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B' } as const;

try {
  const touched: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const slug of SLUGS) {
      const product = await tx.product.findUnique({
        where: { slug },
        select: {
          id: true,
          options: {
            where: { code: 'gold_color' },
            select: { id: true, values: { select: { id: true, value: true, position: true } } },
          },
          variants: {
            where: { archivedAt: null },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              sku: true,
              priceAgorot: true,
              compareAtAgorot: true,
              prepDays: true,
              weightGrams: true,
              position: true,
              isActive: true,
              optionValues: { select: { valueId: true } },
              inventory: { select: { policy: true } },
            },
          },
        },
      });

      const colour = product?.options[0];
      if (!product || !colour) {
        console.log(`${slug.padEnd(18)} not found or has no gold colour - skipped`);
        continue;
      }
      if (colour.values.some((value) => value.value === YELLOW.value)) {
        console.log(`${slug.padEnd(18)} already has yellow gold - skipped`);
        continue;
      }

      const white = colour.values.find((value) => value.value === 'WHITE');
      if (!white) {
        console.log(`${slug.padEnd(18)} has no white gold to mirror - skipped`);
        continue;
      }

      const templates = product.variants.filter((variant) =>
        variant.optionValues.some((link) => link.valueId === white.id),
      );
      const lastPosition = Math.max(0, ...product.variants.map((variant) => variant.position));

      console.log(`${slug.padEnd(18)} + yellow gold, ${templates.length} variant(s):`);
      for (const template of templates) {
        console.log(`  ${template.sku} -> ${template.sku.replace('-WHITE-', '-YELLOW-')}`);
      }
      if (!APPLY) continue;

      const yellow = await tx.productOptionValue.create({
        data: {
          optionId: colour.id,
          ...YELLOW,
          position: Math.max(0, ...colour.values.map((value) => value.position)) + 1,
        },
        select: { id: true },
      });

      for (const [index, template] of templates.entries()) {
        const valueIds = [
          ...template.optionValues.map((link) => link.valueId).filter((id) => id !== white.id),
          yellow.id,
        ];
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: template.sku.includes('-WHITE-')
              ? template.sku.replace('-WHITE-', '-YELLOW-')
              : `${template.sku}-YELLOW`,
            priceAgorot: template.priceAgorot,
            compareAtAgorot: template.compareAtAgorot,
            prepDays: template.prepDays,
            weightGrams: template.weightGrams,
            isActive: template.isActive,
            position: lastPosition + index + 1,
            optionSignature: computeOptionSignature(valueIds),
            optionValues: { create: valueIds.map((valueId) => ({ valueId })) },
            inventory: {
              create: { onHand: 0, policy: template.inventory?.policy ?? 'MADE_TO_ORDER' },
            },
          },
        });
      }
      touched.push(product.id);
    }

    if (APPLY && touched.length > 0) await reindexSearchDocuments(tx, touched);
  });

  console.log(
    APPLY ? `\nApplied to ${touched.length} product(s).` : '\nDRY RUN - nothing written.',
  );
} finally {
  await prisma.$disconnect();
}
