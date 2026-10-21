/**
 * Copies the catalogue's photographs from the LOCAL environment to PRODUCTION.
 *
 *   node scripts/push-local-images.ts            # dry run: counts, nothing written
 *   node scripts/push-local-images.ts --apply    # uploads to R2 and rewrites image rows
 *
 * WHY THIS EXISTS. The launch photographs (originals, close-ups, worn shots, and
 * the background-normalised files) were reviewed and placed in the local
 * database and the local MinIO bucket. Production has its own database ids and
 * its own bucket, so the files and the rows are carried across by this script
 * rather than re-placed from manifests.
 *
 * WHAT IT DOES, per product that exists in both (matched on slug):
 *   1. downloads each distinct local object (the current, normalised bytes),
 *   2. uploads it to the production bucket under a NEW key
 *      `public/products/<production product id>/<uuid>-<name>` - nothing that
 *      is already in the bucket is overwritten,
 *   3. in one transaction replaces the product's ProductImage rows with the
 *      local set, mapping each variant by SKU, never flagged as a simulation.
 *
 * Both environments are read from files, never from the process environment:
 *   local       .env
 *   production  .env.production.local
 *
 * A product whose rows already point at keys carrying its own production id
 * under this script's naming is left alone, so a second run does not duplicate
 * uploads.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';

const APPLY = process.argv.includes('--apply');

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]!] = match[2]!.trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const local = readEnv('.env');
const prod = readEnv('.env.production.local');
for (const key of [
  'DATABASE_URL',
  'MEDIA_S3_ENDPOINT',
  'MEDIA_S3_BUCKET',
  'MEDIA_S3_ACCESS_KEY_ID',
  'MEDIA_S3_SECRET_ACCESS_KEY',
]) {
  if (!prod[key]) throw new Error(`.env.production.local is missing ${key}`);
}
if (!local.DATABASE_URL || !local.MEDIA_PUBLIC_BASE_URL) throw new Error('.env is incomplete');
if (local.DATABASE_URL === prod.DATABASE_URL)
  throw new Error('local and production are the same database');

const localDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: local.DATABASE_URL }),
});
const prodDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: prod.DATABASE_URL }) });
const s3 = new S3Client({
  endpoint: new URL(prod.MEDIA_S3_ENDPOINT!).origin,
  region: 'auto',
  forcePathStyle: true,
  credentials: {
    accessKeyId: prod.MEDIA_S3_ACCESS_KEY_ID!,
    secretAccessKey: prod.MEDIA_S3_SECRET_ACCESS_KEY!,
  },
});

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** `public/products/<id>/<uuid>-<name>.ext` -> `<name>.ext` */
function nameOf(key: string): string {
  const file = key.split('/').pop() ?? 'image';
  return file.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
}

async function pool<T>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

const localProducts = await localDb.product.findMany({
  where: { archivedAt: null },
  select: {
    slug: true,
    variants: { select: { id: true, sku: true } },
    images: {
      orderBy: [{ position: 'asc' }],
      select: {
        variantId: true,
        storageKey: true,
        altHe: true,
        width: true,
        height: true,
        position: true,
        isPrimary: true,
        mediaType: true,
      },
    },
  },
});

const prodProducts = new Map(
  (
    await prodDb.product.findMany({
      select: {
        id: true,
        slug: true,
        variants: { select: { id: true, sku: true } },
        images: { select: { storageKey: true } },
      },
    })
  ).map((p) => [p.slug, p]),
);

let products = 0;
let rows = 0;
let uploads = 0;
const problems: string[] = [];
const missing: string[] = [];

for (const lp of localProducts) {
  const pp = prodProducts.get(lp.slug);
  if (!pp) {
    missing.push(lp.slug);
    continue;
  }
  if (lp.images.length === 0) continue;

  const already =
    pp.images.length > 0 &&
    pp.images.every(
      (i) =>
        i.storageKey.includes(`/${pp.id}/`) &&
        /\/[0-9a-f-]{36}-/.test(i.storageKey) &&
        lp.images.length === pp.images.length,
    );
  if (already) continue;

  const localSkuById = new Map(lp.variants.map((v) => [v.id, v.sku]));
  const prodIdBySku = new Map(pp.variants.map((v) => [v.sku, v.id]));

  const keys = [...new Set(lp.images.map((i) => i.storageKey))];
  const keyMap = new Map<string, string>();
  for (const k of keys) keyMap.set(k, `public/products/${pp.id}/${randomUUID()}-${nameOf(k)}`);

  const data: {
    productId: string;
    variantId: string | null;
    storageKey: string;
    altHe: string;
    width: number | null;
    height: number | null;
    position: number;
    isPrimary: boolean;
    isSimulation: boolean;
    mediaType: (typeof lp.images)[number]['mediaType'];
  }[] = [];

  for (const image of lp.images) {
    let variantId: string | null = null;
    if (image.variantId !== null) {
      const sku = localSkuById.get(image.variantId);
      variantId = sku ? (prodIdBySku.get(sku) ?? null) : null;
      if (variantId === null) {
        problems.push(
          `${lp.slug}: no production variant for ${sku ?? image.variantId} - image skipped`,
        );
        continue;
      }
    }
    data.push({
      productId: pp.id,
      variantId,
      storageKey: keyMap.get(image.storageKey)!,
      altHe: image.altHe.replace(/\s*\(הדמיה\)/g, '').trim(),
      width: image.width,
      height: image.height,
      position: image.position,
      isPrimary: image.isPrimary,
      isSimulation: false,
      mediaType: image.mediaType,
    });
  }

  products += 1;
  rows += data.length;
  uploads += keys.length;
  console.log(
    `${lp.slug.padEnd(30)} ${String(keys.length).padStart(2)} file(s)  ${String(data.length).padStart(2)} row(s)`,
  );
  if (!APPLY) continue;

  const used = new Set(data.map((d) => d.storageKey));
  const toUpload = keys.filter((k) => used.has(keyMap.get(k)!));
  let failed = false;
  await pool(toUpload, 4, async (k) => {
    try {
      const response = await fetch(`${local.MEDIA_PUBLIC_BASE_URL!.replace(/\/$/, '')}/${k}`);
      if (!response.ok) throw new Error(`local ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      await s3.send(
        new PutObjectCommand({
          Bucket: prod.MEDIA_S3_BUCKET!,
          Key: keyMap.get(k)!,
          Body: body,
          ContentType: TYPES[path.extname(k).toLowerCase()] ?? 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      failed = true;
      problems.push(`${lp.slug}: ${k} - ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  if (failed) {
    problems.push(`${lp.slug}: NOT rewritten (an upload failed); rows left as they were`);
    continue;
  }

  await prodDb.$transaction(
    async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: pp.id } });
      await tx.productImage.createMany({ data });
    },
    { maxWait: 15_000, timeout: 120_000 },
  );
}

console.log('');
console.log(APPLY ? 'APPLIED' : 'DRY RUN - nothing uploaded or written');
console.log(`products ${products}, files ${uploads}, rows ${rows}`);
if (missing.length > 0) console.log(`in local but not in production: ${missing.join(', ')}`);
if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
}

await localDb.$disconnect();
await prodDb.$disconnect();
