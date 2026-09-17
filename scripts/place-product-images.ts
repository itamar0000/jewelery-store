/**
 * Uploads real product photography and points the catalog at it.
 *
 *   node scripts/place-product-images.ts --dir <folder> --manifest <file.json>
 *   node scripts/place-product-images.ts --dir ./picks --manifest ./picks/map.json --dry-run
 *
 * IT FILLS A SLOT, CREATING THE ROW ONLY IF NOTHING IS THERE.
 *
 * A slot is a (variant, position) pair: "the main image for the white-gold 18K
 * variant", "the detail image shared by the whole product". The seed already
 * occupies some of them - `demo-aurora-ring` has a complete set of fifteen -
 * but most products were given a single product-level row and nothing else, so
 * a script that only UPDATED would silently drop four fifths of a delivered
 * photo set on the floor.
 *
 * So: match the slot, and update it if it exists or create it if it does not.
 * Re-running is still safe, because a slot is matched on (variantId, position)
 * rather than on the file - the second run overwrites the same rows instead of
 * appending duplicates.
 *
 * ALT TEXT IS COMPOSED, NOT INVENTED. A created row needs `altHe`, which the
 * schema makes non-nullable precisely so an undescribed image cannot enter the
 * catalog. It is built from the product's real Hebrew name plus the gold colour
 * the photograph actually shows - the same shape the seed uses - so it
 * describes the picture rather than decorating the column.
 *
 * ONE UPLOAD PER FILE, MANY ROWS PER UPLOAD. A single white-gold photograph is
 * the correct image for every white-gold VARIANT of that product - 14K and 18K
 * both - so the bytes go to storage once and several rows reference the same
 * key. Uploading per row would put identical objects in the bucket under
 * different names.
 *
 * IT GOES THROUGH THE PRESIGNED-UPLOAD PATH rather than writing to the bucket
 * directly, because that is the path the admin UI will use. Exercising it here
 * means the credentials, the key shape, the content-type validation and the
 * bucket policy are all proven by the act of loading the catalog, instead of
 * being discovered later by the first person to use the real upload form.
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { requireMediaStorage } from '../src/lib/media/index.ts';
import type { ImageContentType } from '../src/lib/media/index.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

/** What a manifest entry says about one file. */
interface Entry {
  /** Filename inside `--dir`. */
  readonly file: string;
  readonly slug: string;
  /** `main` fills position 1, `detail` fills position 2. */
  readonly role: 'main' | 'detail';
  /** Gold colour this photograph shows, matching ProductOptionValue.value. */
  readonly colour: string;
  /**
   * Whether this also fills the PRODUCT-level row (`variantId: null`).
   *
   * Those rows are what the catalog card and the gallery fallback use, so
   * exactly one colour per product should claim them - normally the one the
   * piece is most often sold in.
   */
  readonly productLevel?: boolean;
}

/** Hebrew for the gold colours, for composed alt text. */
const COLOUR_HE: Readonly<Record<string, string>> = {
  YELLOW: 'זהב צהוב',
  WHITE: 'זהב לבן',
  ROSE: 'זהב אדום',
};

const CONTENT_TYPE: Readonly<Record<string, ImageContentType>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const dir = flag('dir');
  const manifestPath = flag('manifest');
  const dryRun = process.argv.includes('--dry-run');

  if (!dir || !manifestPath) {
    console.log(
      [
        'Place product photography.',
        '',
        '  node scripts/place-product-images.ts --dir <folder> --manifest <file.json>',
        '',
        'Options:',
        '  --dry-run   Report what would change, upload and write nothing.',
        '',
        'Manifest is a JSON array of:',
        '  { "file", "slug", "role": "main"|"detail", "colour", "productLevel"? }',
      ].join('\n'),
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set.');

  const storage = requireMediaStorage();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const entries = JSON.parse(await readFile(manifestPath, 'utf8')) as Entry[];

  /**
   * Existence is checked per entry rather than against a flat listing of
   * `--dir`, so a manifest may name a file in a SUBDIRECTORY. Photography
   * arrives in batches, each in its own folder, and a catalog-wide load - the
   * one that seeds a fresh environment - has to span all of them. A flat
   * readdir made that impossible and forced one invocation per batch, which is
   * how a slot gets missed.
   *
   * Every file is still checked BEFORE anything is uploaded or written, so a
   * typo in the manifest fails the run rather than leaving it half applied.
   */
  const missing = (
    await Promise.all(
      entries.map(async (entry) => {
        try {
          await stat(path.join(dir, entry.file));
          return null;
        } catch {
          return entry;
        }
      }),
    )
  ).filter((entry): entry is Entry => entry !== null);

  let uploaded = 0;
  let rowsUpdated = 0;
  let rowsCreated = 0;
  const problems: string[] = [];

  try {
    for (const entry of entries) {
      if (missing.includes(entry)) {
        problems.push(`${entry.slug}: file not found - ${entry.file}`);
        continue;
      }

      const product = await prisma.product.findUnique({
        where: { slug: entry.slug },
        select: {
          id: true,
          nameHe: true,
          images: { select: { id: true, position: true, variantId: true } },
          variants: {
            select: {
              id: true,
              optionValues: {
                select: { value: { select: { value: true, option: { select: { code: true } } } } },
              },
            },
          },
        },
      });

      if (!product) {
        problems.push(`no product with slug ${entry.slug}`);
        continue;
      }

      /*
       * Which variants wear this colour. A variant is a colour AND a karat, so
       * one photograph legitimately belongs to several of them.
       */
      const variantIds = new Set(
        product.variants
          .filter((variant) =>
            variant.optionValues.some(
              (link) =>
                link.value.option.code === 'gold_color' && link.value.value === entry.colour,
            ),
          )
          .map((variant) => variant.id),
      );

      /*
       * The slots this photograph belongs in. `null` is the product-level slot
       * that the catalog card and the gallery fallback read.
       */
      const wantedPosition = entry.role === 'main' ? 1 : 2;
      const slots: (string | null)[] = [
        ...(entry.productLevel === true ? [null] : []),
        ...variantIds,
      ];

      if (slots.length === 0) {
        problems.push(`${entry.slug}: no variant in ${entry.colour}, and not product-level`);
        continue;
      }

      const extension = path.extname(entry.file).toLowerCase();
      const contentType = CONTENT_TYPE[extension];
      if (!contentType) {
        problems.push(`${entry.slug}: unsupported file type ${extension}`);
        continue;
      }

      const bytes = await readFile(path.join(dir, entry.file));

      console.log(
        `${entry.slug.padEnd(26)} ${entry.role.padEnd(6)} ${entry.colour.padEnd(6)} ` +
          `${String(slots.length).padStart(2)} slot(s)  ${entry.file}`,
      );

      if (dryRun) continue;

      /*
       * The presigned PUT. `createUpload` validates the size and content type
       * and signs for exactly that pair, so the headers below are not optional
       * decoration - a mismatch fails the signature.
       */
      const target = await storage.createUpload({
        contentType,
        bytes: bytes.length,
        originalFilename: `${entry.slug}-${entry.colour.toLowerCase()}-${entry.role}`,
        productId: product.id,
        visibility: 'public',
      });

      const put = await fetch(target.url, {
        method: 'PUT',
        body: new Uint8Array(bytes),
        headers: target.headers,
      });

      if (!put.ok) {
        problems.push(`${entry.slug}: upload failed ${put.status} ${await put.text()}`);
        continue;
      }

      uploaded += 1;

      /*
       * Recorded so the browser can reserve the box before the bytes arrive.
       * `next/image` needs intrinsic dimensions to avoid layout shift, and the
       * moment the file is in hand is the only cheap time to read them.
       */
      const meta = await sharp(bytes).metadata();
      const altHe =
        `${product.nameHe}, ${COLOUR_HE[entry.colour] ?? entry.colour}` +
        (entry.role === 'detail' ? ' — תקריב' : '');

      for (const variantId of slots) {
        const existing = product.images.find(
          (image) => image.variantId === variantId && image.position === wantedPosition,
        );

        if (existing) {
          await prisma.productImage.update({
            where: { id: existing.id },
            data: { storageKey: target.key, width: meta.width, height: meta.height },
          });
          rowsUpdated += 1;
        } else {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              variantId,
              storageKey: target.key,
              altHe,
              position: wantedPosition,
              isPrimary: wantedPosition === 1,
              width: meta.width,
              height: meta.height,
            },
          });
          rowsCreated += 1;
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log(dryRun ? 'DRY RUN - nothing uploaded or written.' : `uploaded ${uploaded} file(s)`);
  if (!dryRun) console.log(`rows: ${rowsUpdated} updated, ${rowsCreated} created`);

  if (problems.length > 0) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  ${p}`);
  }
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
