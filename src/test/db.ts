import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * Database access for integration tests.
 *
 * Integration tests run against a REAL PostgreSQL, in a database of their own
 * (`jewelry_test` by default). That is deliberate: the invariants this phase
 * cares about most — the reservation race, the CHECK constraints, the
 * NULLS NOT DISTINCT wishlist index, the order-number sequence — live in the
 * database and cannot be tested against a mock. A mocked Prisma client would
 * assert only that the code calls itself the way it was written.
 *
 * A separate database keeps `npm run db:seed` demo data intact, and lets each
 * test truncate freely.
 *
 * Requires a running database: `npm run db:up`. Tests fail loudly if it is
 * missing rather than silently skipping, because a silently skipped
 * concurrency test is worse than no test at all.
 */

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://jewelry:jewelry_local_dev@localhost:5433/jewelry_test?schema=public';

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
  log: ['error'],
});

/**
 * Empty every table between tests.
 *
 * `RESTART IDENTITY` also resets the order-number and custom-request sequences,
 * because both are OWNED BY their columns — so each test file starts from a
 * known first public number.
 *
 * The table list is read from the catalog rather than hard-coded, so a model
 * added in a later phase is truncated automatically instead of leaking rows
 * into an unrelated test.
 */
export async function resetDb(): Promise<void> {
  const tables = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((table) => `"public"."${table.tablename}"`).join(', ');
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Current inventory counters for a variant. */
export async function readInventory(variantId: string): Promise<{
  onHand: number;
  reserved: number;
}> {
  const inventory = await testPrisma.inventory.findUniqueOrThrow({
    where: { variantId },
    select: { onHand: true, reserved: true },
  });
  return inventory;
}
