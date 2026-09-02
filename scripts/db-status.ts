/**
 * Read-only inventory of whatever database DATABASE_URL points at.
 *
 * Exists to answer one question before a destructive command is run: what is
 * actually IN the database I am about to write to? `prisma/seed.ts` opens by
 * deleting every product, category, collection and coupon, and the only safe
 * way to run it against a remote database is to have looked first.
 *
 * Writes nothing. Safe to run against production at any time.
 *
 *   DATABASE_URL="postgresql://..." node scripts/db-status.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const host = new URL(connectionString!).host;
  console.log(`\ndatabase: ${host}\n`);

  const counts = {
    categories: await prisma.category.count(),
    collections: await prisma.collection.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    images: await prisma.productImage.count(),
    diamondSpecs: await prisma.diamondSpec.count(),
    coupons: await prisma.coupon.count(),
    // Not touched by the seed's reset, but shown because they are the rows
    // that would make a reset genuinely destructive.
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
  };

  for (const [label, value] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(16)} ${value}`);
  }

  const catalogEmpty = counts.categories === 0 && counts.products === 0;
  const hasRealTrade = counts.orders > 0 || counts.customers > 0;

  console.log('');
  if (hasRealTrade) {
    console.log('⚠ THIS DATABASE HAS CUSTOMERS OR ORDERS. Do not run the demo seed here.');
  } else if (catalogEmpty) {
    console.log('Catalog is empty. Seeding would create rows without deleting anything.');
  } else {
    console.log(`Catalog is NOT empty. The seed would DELETE ${counts.products} product(s)`);
    console.log(`and ${counts.categories} categor(y/ies) before inserting demo data.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
