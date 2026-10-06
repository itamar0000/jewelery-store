/**
 * One-off data fix: remove the demo markers from an existing catalogue, IN PLACE.
 *
 * WHY THIS EXISTS AS A SCRIPT RATHER THAN A RE-SEED.
 *
 * `prisma/seed.ts` no longer writes the demo markers (see docs/DECISIONS.md
 * D4D.1). But the seed only builds a catalogue from nothing: it deletes every
 * product first, and the product photography is attached AFTERWARDS by
 * scripts/place-product-images.ts, keyed on product ids that a re-seed would
 * replace. Re-seeding a database that already has its photographs therefore
 * unlinks all of them. This script brings an existing database to the same
 * state the corrected seed would produce, without creating or deleting a single
 * product, variant or image row.
 *
 * WHAT IT CHANGES, and only when the stored value is EXACTLY what the old seed
 * wrote:
 *
 *   1. Product.slug               `demo-aurora-ring`  ->  `aurora-ring`
 *   2. ProductVariant.sku         `DEMO-AURORA-14K-ROSE`  ->  `AURORA-14K-ROSE`
 *   3. Product.shortDescriptionHe / descriptionHe - the leading
 *      "נתוני הדגמה בלבד — לא מוצר אמיתי." notice is removed; the rest is kept
 *      character for character.
 *   4. Two pieces of product copy that asserted stock the data cannot back
 *      ("במלאי", "מלאי מוגבל...") - exact seeded sentences only.
 *   5. DiamondSpec.notesHe equal to the notice - set to null.
 *   6. DiamondCertificate rows issued by `DEMO-LAB` with a `DEMO-<n>` number -
 *      DELETED. These are the only rows this script deletes. A certificate
 *      number names a real document; an invented one is a false claim, and the
 *      corrected seed no longer creates them. The diamond specification they
 *      hang off is kept.
 *   7. 18K variant prices the old seed derived as `base x 1.18`, which left
 *      agorot on a placeholder price (₪3,115.20). Rounded to whole ten shekels,
 *      exactly as the corrected seed now computes them. A price that does not
 *      match the old formula is NOT touched - it was set by someone.
 *   8. Product.minPriceAgorot / maxPriceAgorot, recomputed from the variants
 *      for the products whose prices moved.
 *   9. The development coupon's description.
 *  10. Product.searchDocument for every product whose text changed, rebuilt by
 *      the same function the application uses.
 *
 * WHAT IT NEVER TOUCHES: product, variant and image ids; ProductImage rows and
 * their storage keys (the object names in the bucket keep their old
 * `demo-...` file names, which are invisible to a shopper and must not change
 * or the photographs detach); categories, collections, options, inventory,
 * customization fields.
 *
 * SAFETY:
 *
 *   1. DRY RUN BY DEFAULT. Nothing is written without `--apply`.
 *   2. EXACT MATCHES ONLY. A value that differs from what the seed wrote is
 *      reported and left alone - it may have been edited by a person.
 *   3. COLLISIONS ABORT. A new slug or SKU that already exists on another row
 *      stops the run before anything is written.
 *   4. ALL OR NOTHING. Every write, including the search documents, happens in
 *      one transaction.
 *   5. IDEMPOTENT. A second run finds nothing to do and writes nothing.
 *
 *   node scripts/remove-demo-markers.ts            # dry run - prints the plan
 *   node scripts/remove-demo-markers.ts --apply    # writes
 *
 * Point DATABASE_URL at the database you mean to change, and read the dry run
 * first. Renaming a slug changes that product's URL; it is safe now because the
 * site is not indexed (SITE_INDEXABLE) and has not launched.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { reindexSearchDocuments } from '../src/lib/search/reindex.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ------------------------------------------------- what the old seed wrote

const DEMO_NOTICE = 'נתוני הדגמה בלבד — לא מוצר אמיתי.';
const SHORT_PREFIX = `${DEMO_NOTICE} `;
const LONG_PREFIX = `${DEMO_NOTICE}\n\n`;
const SLUG_PREFIX = 'demo-';
const SKU_PREFIX = 'DEMO-';
const DEMO_CERT_ISSUER = 'DEMO-LAB';
const DEMO_CERT_NUMBER = /^DEMO-\d+$/;

/**
 * Seeded copy that stated a stock fact. Matched on the product's NEW slug and
 * on the text as it reads once the notice is gone.
 */
const COPY_FIXES: readonly {
  slug: string;
  field: 'shortDescriptionHe' | 'descriptionHe';
  from: string;
  to: string;
}[] = [
  {
    slug: 'nova-bracelet',
    field: 'shortDescriptionHe',
    from: 'צמיד זהב עדין, במלאי.',
    to: 'צמיד זהב עדין.',
  },
  {
    slug: 'wedding-band',
    field: 'descriptionHe',
    from: 'טבעת נישואין חלקה ברוחב 3 מ״מ, בגימור מט או מבריק. מלאי מוגבל: כשנגמר, הדגם אינו זמין להזמנה עד ייצור הסדרה הבאה.',
    to: 'טבעת נישואין חלקה ברוחב 3 מ״מ, בגימור מט או מבריק.',
  },
];

const COUPON = {
  code: 'DEMO10',
  from: `${DEMO_NOTICE} 10% הנחה.`,
  to: 'קופון בדיקה לפיתוח בלבד — 10% הנחה.',
};

/** The old seed's 18K rule, and the corrected seed's. */
const oldEighteenK = (base: number): number => Math.round(base * 1.18);
const newEighteenK = (base: number): number => Math.round((base * 1.18) / 1_000) * 1_000;

const shekels = (agorot: number): string =>
  `₪${(agorot / 100).toLocaleString('en-US', {
    minimumFractionDigits: agorot % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

// ------------------------------------------------------------------ plan

interface ProductChange {
  id: string;
  label: string;
  data: {
    slug?: string;
    shortDescriptionHe?: string;
    descriptionHe?: string;
    minPriceAgorot?: number;
    maxPriceAgorot?: number;
  };
}

interface VariantChange {
  id: string;
  label: string;
  data: { sku?: string; priceAgorot?: number };
}

async function main(): Promise<void> {
  const host = new URL(connectionString!).host;
  console.log(`Database: ${host}`);
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: dry run\n');

  const [products, specs, certificates, coupon] = await Promise.all([
    prisma.product.findMany({
      orderBy: { slug: 'asc' },
      select: {
        id: true,
        slug: true,
        shortDescriptionHe: true,
        descriptionHe: true,
        basePriceAgorot: true,
        minPriceAgorot: true,
        maxPriceAgorot: true,
        variants: { select: { id: true, sku: true, priceAgorot: true } },
      },
    }),
    prisma.diamondSpec.findMany({ select: { id: true, notesHe: true } }),
    prisma.diamondCertificate.findMany({ select: { id: true, issuer: true, number: true } }),
    prisma.coupon.findUnique({ where: { code: COUPON.code }, select: { descriptionHe: true } }),
  ]);

  const productChanges: ProductChange[] = [];
  const variantChanges: VariantChange[] = [];
  const notes: string[] = [];
  const collisions: string[] = [];

  const existingSlugs = new Set(products.map((product) => product.slug));
  const existingSkus = new Set(products.flatMap((product) => product.variants.map((v) => v.sku)));
  const plannedSlugs = new Set<string>();
  const plannedSkus = new Set<string>();

  for (const product of products) {
    const data: ProductChange['data'] = {};

    // 1. Slug.
    let slug = product.slug;
    if (slug.startsWith(SLUG_PREFIX)) {
      const next = slug.slice(SLUG_PREFIX.length);
      if (existingSlugs.has(next) || plannedSlugs.has(next)) {
        collisions.push(`slug ${slug} -> ${next}: already taken`);
      } else {
        plannedSlugs.add(next);
        data.slug = next;
        slug = next;
      }
    }

    // 3. Descriptions: the leading notice, exact prefix only.
    let short = product.shortDescriptionHe;
    if (short?.startsWith(SHORT_PREFIX)) {
      short = short.slice(SHORT_PREFIX.length);
      data.shortDescriptionHe = short;
    } else if (short?.startsWith(DEMO_NOTICE)) {
      notes.push(
        `${product.slug}: short description starts with the notice in an unexpected form - left alone`,
      );
    }

    let long = product.descriptionHe;
    if (long?.startsWith(LONG_PREFIX)) {
      long = long.slice(LONG_PREFIX.length);
      data.descriptionHe = long;
    } else if (long?.startsWith(DEMO_NOTICE)) {
      notes.push(
        `${product.slug}: description starts with the notice in an unexpected form - left alone`,
      );
    }

    // 4. Copy that asserted stock.
    for (const fix of COPY_FIXES) {
      if (fix.slug !== slug) continue;
      const current = fix.field === 'shortDescriptionHe' ? short : long;
      if (current === fix.from) data[fix.field] = fix.to;
    }

    // 2 and 7. Variants.
    let pricesMoved = false;
    const effectivePrices: number[] = [];

    for (const variant of product.variants) {
      const change: VariantChange['data'] = {};

      if (variant.sku.startsWith(SKU_PREFIX)) {
        const next = variant.sku.slice(SKU_PREFIX.length);
        if (existingSkus.has(next) || plannedSkus.has(next)) {
          collisions.push(`sku ${variant.sku} -> ${next}: already taken`);
        } else {
          plannedSkus.add(next);
          change.sku = next;
        }
      }

      let price = variant.priceAgorot ?? product.basePriceAgorot;
      if (variant.priceAgorot !== null && variant.priceAgorot % 1_000 !== 0) {
        if (variant.priceAgorot === oldEighteenK(product.basePriceAgorot)) {
          change.priceAgorot = newEighteenK(product.basePriceAgorot);
          price = change.priceAgorot;
          pricesMoved = true;
        } else {
          notes.push(
            `${variant.sku}: ${shekels(variant.priceAgorot)} is not the old seed's 18K price - left alone`,
          );
        }
      }
      effectivePrices.push(price);

      if (Object.keys(change).length > 0) {
        const parts: string[] = [];
        if (change.sku) parts.push(`sku ${variant.sku} -> ${change.sku}`);
        if (change.priceAgorot !== undefined) {
          parts.push(`price ${shekels(variant.priceAgorot!)} -> ${shekels(change.priceAgorot)}`);
        }
        variantChanges.push({ id: variant.id, label: parts.join(', '), data: change });
      }
    }

    // 8. Price range, only where prices moved and the stored range disagrees.
    if (pricesMoved && effectivePrices.length > 0) {
      const min = Math.min(...effectivePrices);
      const max = Math.max(...effectivePrices);
      if (product.minPriceAgorot !== min) data.minPriceAgorot = min;
      if (product.maxPriceAgorot !== max) data.maxPriceAgorot = max;
    }

    if (Object.keys(data).length > 0) {
      const parts: string[] = [];
      if (data.slug) parts.push(`slug -> ${data.slug}`);
      if (data.shortDescriptionHe !== undefined) parts.push('short description');
      if (data.descriptionHe !== undefined) parts.push('description');
      if (data.minPriceAgorot !== undefined || data.maxPriceAgorot !== undefined) {
        parts.push('price range');
      }
      productChanges.push({ id: product.id, label: `${product.slug}: ${parts.join(', ')}`, data });
    }
  }

  // 5. Diamond notes.
  const specChanges = specs.filter((spec) => spec.notesHe === DEMO_NOTICE).map((spec) => spec.id);

  // 6. Invented certificates.
  const certificateDeletes = certificates.filter(
    (certificate) =>
      certificate.issuer === DEMO_CERT_ISSUER && DEMO_CERT_NUMBER.test(certificate.number),
  );

  // 9. Coupon.
  const couponChange = coupon?.descriptionHe === COUPON.from;

  // ---------------------------------------------------------------- report

  for (const change of productChanges) console.log(`  product  ${change.label}`);
  for (const change of variantChanges) console.log(`  variant  ${change.label}`);
  for (const certificate of certificateDeletes) {
    console.log(`  delete   certificate ${certificate.issuer} ${certificate.number}`);
  }
  if (couponChange) console.log(`  coupon   ${COUPON.code} description`);

  const touchedProductIds = productChanges
    .filter(
      (change) =>
        change.data.shortDescriptionHe !== undefined || change.data.descriptionHe !== undefined,
    )
    .map((change) => change.id);

  console.log('\n---');
  console.log(
    [
      `products: ${productChanges.length}`,
      `slugs: ${productChanges.filter((c) => c.data.slug).length}`,
      `descriptions: ${touchedProductIds.length}`,
      `variants: ${variantChanges.length}`,
      `skus: ${variantChanges.filter((c) => c.data.sku).length}`,
      `prices: ${variantChanges.filter((c) => c.data.priceAgorot !== undefined).length}`,
      `diamond notes: ${specChanges.length}`,
      `certificates deleted: ${certificateDeletes.length}`,
      `coupon: ${couponChange ? 1 : 0}`,
      `search documents to rebuild: ${touchedProductIds.length}`,
    ].join(' | '),
  );

  if (notes.length > 0) {
    console.log(`\n${notes.length} value(s) left alone:`);
    for (const note of notes) console.log(`  ${note}`);
  }

  if (collisions.length > 0) {
    console.log(`\n${collisions.length} collision(s) - nothing will be written:`);
    for (const collision of collisions) console.log(`  ${collision}`);
    process.exitCode = 1;
    return;
  }

  const nothing =
    productChanges.length === 0 &&
    variantChanges.length === 0 &&
    specChanges.length === 0 &&
    certificateDeletes.length === 0 &&
    !couponChange;

  if (nothing) {
    console.log('\nNothing to do.');
    return;
  }

  if (!APPLY) {
    console.log('\nDry run - nothing written. Re-run with --apply to make these changes.');
    return;
  }

  // ----------------------------------------------------------------- write

  const rebuilt = await prisma.$transaction(
    async (tx) => {
      for (const change of productChanges) {
        await tx.product.update({ where: { id: change.id }, data: change.data });
      }
      for (const change of variantChanges) {
        await tx.productVariant.update({ where: { id: change.id }, data: change.data });
      }
      if (specChanges.length > 0) {
        await tx.diamondSpec.updateMany({
          where: { id: { in: specChanges } },
          data: { notesHe: null },
        });
      }
      if (certificateDeletes.length > 0) {
        await tx.diamondCertificate.deleteMany({
          where: { id: { in: certificateDeletes.map((certificate) => certificate.id) } },
        });
      }
      if (couponChange) {
        await tx.coupon.update({
          where: { code: COUPON.code },
          data: { descriptionHe: COUPON.to },
        });
      }

      // The search document is built from the descriptions, so it is rebuilt in
      // the same transaction: there is never a moment where a product's text
      // and its search document disagree.
      return touchedProductIds.length > 0 ? reindexSearchDocuments(tx, touchedProductIds) : 0;
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  console.log(`\nApplied. Search documents rebuilt: ${rebuilt}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
