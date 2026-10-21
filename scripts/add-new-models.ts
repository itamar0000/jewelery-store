/**
 * Adds the 2026 models to the catalogue (D4D.37).
 *
 *   node scripts/add-new-models.ts              # dry run, prints the plan
 *   node scripts/add-new-models.ts --apply      # creates the products, hidden
 *   node scripts/add-new-models.ts --publish    # shows those that have photographs
 *   node scripts/add-new-models.ts --update     # re-applies the words and diamond
 *                                                 of models that already exist
 *   node scripts/add-new-models.ts --sync-colours
 *                                                 offers each gold colour only
 *                                                 once it has its own photograph
 *
 * The models are data: `scripts/data/new-models-2026.json`. Each is built the
 * way the admin builds a product (src/lib/admin/create-product.ts): 14K only,
 * one variant per gold colour at one price, made to order, the catalogue's
 * ring sizes or lengths as selections, and the shop's diamond standard (D-F,
 * IF-VS1, the finish range for the shape). A men's model is also linked into
 * its men's category, and every new model joins "חדש באתר".
 *
 * IT CREATES THEM HIDDEN. Photographs are placed next with
 * `place-product-images.ts`; `--publish` then shows each model that has at
 * least one, and never one that has none.
 *
 * Idempotent: a model whose slug exists (with or without the "demo-" prefix
 * production carries) is skipped. Nothing existing is changed.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';
import type { ProductType } from '../src/generated/prisma/client.ts';
import { computeOptionSignature } from '../src/lib/catalog/option-signature.ts';
import { reindexSearchDocuments } from '../src/lib/search/reindex.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

interface Model {
  slug: string;
  nameHe: string;
  category: string;
  men?: string;
  colours?: ('YELLOW' | 'WHITE' | 'ROSE')[];
  price: number;
  short: string;
  desc: string;
  diamond: { carat: string; lab: boolean; shape: string; count: number } | null;
}

const COLOURS = [
  { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B' },
  { value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6' },
  { value: 'ROSE', labelHe: 'זהב אדום', hexColor: '#E3B7A8' },
] as const;

const TYPE_BY_ROOT: Readonly<Record<string, ProductType>> = {
  rings: 'RING',
  earrings: 'EARRINGS',
  necklaces: 'NECKLACE',
  bracelets: 'BRACELET',
  sets: 'SET',
};

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
    values: ['48', '50', '52', '54', '56', '58', '60', '62'].map((size) => [size, size]),
  },
  NECKLACE: {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    values: [
      ['40CM', '40 ס״מ'],
      ['45CM', '45 ס״מ'],
      ['50CM', '50 ס״מ'],
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
      ['21CM', '21 ס״מ'],
    ],
  },
};

/** The shop's diamond standard (D4D.30, D4D.31). */
function grades(shape: string) {
  return {
    color: 'D-F',
    clarity: 'IF-VS1',
    cut: shape === 'Round' ? 'Triple VG – Triple EX' : 'VG/VG – EX/EX',
  };
}

const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const UPDATE = process.argv.includes('--update');
const SYNC_COLOURS = process.argv.includes('--sync-colours');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const { models } = JSON.parse(
  readFileSync(new URL('./data/new-models-2026.json', import.meta.url), 'utf8'),
) as { models: Model[] };

try {
  if (SYNC_COLOURS) {
    /*
     * THE COLOUR PLAN, OFFERED AS FAR AS IT CAN BE SEEN (D4D.38).
     * `data/colour-plan.json` names the gold colours each piece is offered in.
     * A planned colour the piece lacks is created (option value and variant,
     * at the piece's price, made to order); then each variant is offered only
     * if its colour is in the plan AND it has a photograph of its own. Nothing
     * is archived or deleted: a colour off the plan, or still unphotographed,
     * is switched off and comes back on a later run.
     */
    const plan = (
      JSON.parse(readFileSync(new URL('./data/colour-plan.json', import.meta.url), 'utf8')) as {
        plan: Record<string, string[]>;
      }
    ).plan;
    let on = 0;
    let off = 0;
    let created = 0;
    const read = (slug: string) =>
      prisma.product.findFirst({
        where: { slug: { in: [slug, `demo-${slug}`] } },
        select: {
          id: true,
          slug: true,
          options: {
            where: { code: { in: ['gold_color', 'gold_karat'] } },
            select: {
              id: true,
              code: true,
              values: { select: { id: true, value: true, position: true } },
            },
          },
          variants: {
            where: { archivedAt: null },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              priceAgorot: true,
              position: true,
              images: { select: { id: true }, take: 1 },
              optionValues: {
                select: {
                  valueId: true,
                  value: { select: { value: true, option: { select: { code: true } } } },
                },
              },
            },
          },
        },
      });
    for (const [slug, colours] of Object.entries(plan)) {
      let product = await read(slug);
      if (!product) continue;
      const colourOption = product.options.find((option) => option.code === 'gold_color');
      const karat = product.options
        .find((option) => option.code === 'gold_karat')
        ?.values.find((value) => value.value === '14K');
      if (!colourOption) continue;
      const colourOf = (variant: {
        optionValues: { value: { value: string; option: { code: string } } }[];
      }) =>
        variant.optionValues.find((link) => link.value.option.code === 'gold_color')?.value.value;
      for (const colour of colours) {
        if (product.variants.some((variant) => colourOf(variant) === colour)) continue;
        const spec = COLOURS.find((candidate) => candidate.value === colour)!;
        const value =
          colourOption.values.find((candidate) => candidate.value === colour) ??
          (await prisma.productOptionValue.create({
            data: {
              optionId: colourOption.id,
              ...spec,
              position:
                Math.max(0, ...colourOption.values.map((candidate) => candidate.position)) + 1,
            },
          }));
        const ids = [...(karat ? [karat.id] : []), value.id];
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `${product.slug.toUpperCase()}-${colour}-14K`,
            priceAgorot: product.variants[0]?.priceAgorot ?? null,
            position: Math.max(0, ...product.variants.map((variant) => variant.position)) + 1,
            optionSignature: computeOptionSignature(ids),
            optionValues: { create: ids.map((valueId) => ({ valueId })) },
            inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
          },
        });
        created++;
      }
      product = (await read(slug))!;
      for (const variant of product.variants) {
        const colour = colourOf(variant);
        const offered =
          colour !== undefined && colours.includes(colour) && variant.images.length > 0;
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { isActive: offered },
        });
        await prisma.productOptionValue.updateMany({
          where: {
            id: {
              in: variant.optionValues
                .filter((link) => link.value.option.code === 'gold_color')
                .map((link) => link.valueId),
            },
          },
          data: { isActive: offered },
        });
        if (offered) on++;
        else off++;
      }
    }
    console.log(
      `Colours created: ${created}. Offered: ${on}. Off (unplanned or unphotographed): ${off}.`,
    );
  } else if (UPDATE) {
    // The data file is the record: names, descriptions and the diamond were
    // corrected to match the photographs as generated (D4D.37).
    let updated = 0;
    for (const model of models) {
      const product = await prisma.product.findFirst({
        where: { slug: { in: [model.slug, `demo-${model.slug}`] } },
        select: { id: true },
      });
      if (!product) continue;
      const diamond = model.diamond && {
        isLabGrown: model.diamond.lab,
        totalCaratWeight: model.diamond.carat,
        stoneCount: model.diamond.count,
        shape: model.diamond.shape,
        ...grades(model.diamond.shape),
      };
      await prisma.$transaction(
        async (tx) => {
          await tx.product.update({
            where: { id: product.id },
            data: {
              nameHe: model.nameHe,
              shortDescriptionHe: model.short,
              descriptionHe: model.desc,
              hasDiamonds: diamond !== null,
              ...(diamond && { diamondSpec: { upsert: { create: diamond, update: diamond } } }),
            },
          });
          await reindexSearchDocuments(tx, [product.id]);
        },
        { maxWait: 15_000, timeout: 120_000 },
      );
      updated++;
    }
    console.log(`Updated ${updated}.`);
  } else if (PUBLISH) {
    const slugs = models.flatMap((model) => [model.slug, `demo-${model.slug}`]);
    const ready = await prisma.product.findMany({
      where: { slug: { in: slugs }, isActive: false, archivedAt: null, images: { some: {} } },
      select: { id: true, slug: true },
    });
    await prisma.product.updateMany({
      where: { id: { in: ready.map((product) => product.id) } },
      data: { isActive: true, publishedAt: new Date() },
    });
    await prisma.$transaction(
      async (tx) => {
        await reindexSearchDocuments(
          tx,
          ready.map((product) => product.id),
        );
      },
      { maxWait: 15_000, timeout: 120_000 },
    );
    const waiting = await prisma.product.count({
      where: { slug: { in: slugs }, isActive: false, images: { none: {} } },
    });
    console.log(`Published ${ready.length}. Waiting for photographs: ${waiting}.`);
  } else {
    const categories = new Map(
      (
        await prisma.category.findMany({
          select: { id: true, slug: true, parent: { select: { slug: true } } },
        })
      ).map((category) => [category.slug, category]),
    );
    const newArrivals = await prisma.collection.findUnique({
      where: { slug: 'new-arrivals' },
      select: { id: true },
    });

    let created = 0;
    for (const [index, model] of models.entries()) {
      const exists = await prisma.product.findFirst({
        where: { slug: { in: [model.slug, `demo-${model.slug}`] } },
        select: { id: true },
      });
      if (exists) {
        console.log(`  skip  ${model.slug} (exists)`);
        continue;
      }
      const category = categories.get(model.category);
      if (!category) throw new Error(`${model.slug}: no category "${model.category}".`);
      const men = model.men ? categories.get(model.men) : undefined;
      if (model.men && !men) throw new Error(`${model.slug}: no men's category "${model.men}".`);
      const productType = TYPE_BY_ROOT[category.parent?.slug ?? model.category] ?? 'OTHER';
      const colours = COLOURS.filter((colour) =>
        (model.colours ?? ['YELLOW', 'WHITE', 'ROSE']).includes(colour.value),
      );
      console.log(
        `  ${APPLY ? 'add ' : 'plan'}  ${model.slug.padEnd(28)} ${productType.padEnd(9)} ₪${model.price} ` +
          `${colours.map((colour) => colour.value[0]).join('')}${model.men ? ` +${model.men}` : ''}`,
      );
      if (!APPLY) continue;

      const price = model.price * 100;
      const selection = SELECTIONS[productType];
      await prisma.$transaction(
        async (tx) => {
          const product = await tx.product.create({
            data: {
              slug: model.slug,
              nameHe: model.nameHe,
              shortDescriptionHe: model.short,
              descriptionHe: model.desc,
              primaryCategoryId: category.id,
              categories: {
                create: [
                  { categoryId: category.id },
                  ...(men ? [{ categoryId: men.id, position: 50 + index }] : []),
                ],
              },
              ...(newArrivals && {
                collections: { create: { collectionId: newArrivals.id, position: index } },
              }),
              productType,
              basePriceAgorot: price,
              minPriceAgorot: price,
              maxPriceAgorot: price,
              hasDiamonds: model.diamond !== null,
              defaultPrepDays: 10,
              isActive: false,
              options: {
                create: [
                  {
                    code: 'gold_karat',
                    type: 'GOLD_KARAT',
                    nameHe: 'זהב',
                    position: 1,
                    values: { create: { value: '14K', labelHe: 'זהב 14K', position: 0 } },
                  },
                  {
                    code: 'gold_color',
                    type: 'GOLD_COLOR',
                    nameHe: 'גוון זהב',
                    position: 2,
                    values: {
                      create: colours.map((colour, position) => ({ ...colour, position })),
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
              ...(model.diamond && {
                diamondSpec: {
                  create: {
                    isLabGrown: model.diamond.lab,
                    totalCaratWeight: model.diamond.carat,
                    stoneCount: model.diamond.count,
                    shape: model.diamond.shape,
                    ...grades(model.diamond.shape),
                  },
                },
              }),
            },
            include: { options: { include: { values: true } } },
          });

          const karat = product.options.find((option) => option.code === 'gold_karat')!.values[0]!;
          const values = product.options
            .find((option) => option.code === 'gold_color')!
            .values.sort((a, b) => a.position - b.position);
          for (const [position, colour] of values.entries()) {
            const ids = [karat.id, colour.id];
            await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: `${model.slug.toUpperCase()}-${colour.value}-14K`,
                priceAgorot: price,
                position: position + 1,
                optionSignature: computeOptionSignature(ids),
                optionValues: { create: ids.map((valueId) => ({ valueId })) },
                inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
              },
            });
          }
          await reindexSearchDocuments(tx, [product.id]);
        },
        { maxWait: 15_000, timeout: 120_000 },
      );
      created++;
    }
    console.log(
      APPLY ? `Created ${created}, hidden until photographed.` : 'DRY RUN - nothing written.',
    );
  }
} finally {
  await prisma.$disconnect();
}
