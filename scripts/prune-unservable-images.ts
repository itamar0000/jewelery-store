/**
 * Deletes ProductImage rows whose storage key can never be served.
 *
 *   node scripts/prune-unservable-images.ts            # report only
 *   node scripts/prune-unservable-images.ts --delete   # actually remove them
 *
 * WHY THESE ROWS EXIST. `prisma/seed.ts` writes placeholder rows - keys like
 * `demo/aurora/hand.jpg` - standing in for photography that had not been shot
 * yet. Nothing ever uploads a file to those keys, and the resolver in
 * src/lib/catalog/images.ts refuses any key outside the `public/` prefix, so
 * each one renders as a grey captioned stand-in sitting in the gallery beside
 * the real photographs.
 *
 * That was the right behaviour while the catalog had no photography at all. It
 * is the wrong behaviour once a product HAS pictures, because the stand-in then
 * reads as a broken frame rather than as an honest gap - it appeared in the
 * aurora ring's gallery and in the tennis bracelet's hover frame.
 *
 * DELETING IS SAFE AND REVERSIBLE. These rows point at nothing; removing one
 * destroys no image. Re-running the seed recreates them.
 *
 * REPORTING BEFORE DELETING IS THE DEFAULT, because this runs against remote
 * databases and the count is the thing worth seeing first.
 */
import process from 'node:process';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString === '') {
  throw new Error('DATABASE_URL is not set.');
}

/** The one prefix the resolver will serve. Keep in step with src/lib/catalog/images.ts. */
const PUBLIC_PREFIX = 'public/';

async function main(): Promise<void> {
  const commit = process.argv.includes('--delete');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const where = { NOT: { storageKey: { startsWith: PUBLIC_PREFIX } } };

  try {
    console.log(`\ndatabase: ${new URL(connectionString!).host}\n`);

    const doomed = await prisma.productImage.findMany({
      where,
      select: { storageKey: true, position: true },
      orderBy: [{ storageKey: 'asc' }],
    });

    if (doomed.length === 0) {
      console.log('No unservable image rows. Nothing to do.');
      return;
    }

    for (const row of doomed) {
      console.log(`  position ${row.position}  ${row.storageKey}`);
    }
    console.log(`\n${doomed.length} row(s) point at keys that cannot be served.`);

    if (!commit) {
      console.log('\nReport only. Re-run with --delete to remove them.');
      return;
    }

    const { count } = await prisma.productImage.deleteMany({ where });
    console.log(`\nDeleted ${count} row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
