import { execSync } from 'node:child_process';

import { Client } from 'pg';

import { TEST_DATABASE_URL } from './db';

/**
 * Vitest global setup.
 *
 * Creates the test database if it does not exist and brings it up to the
 * current migration. Runs once per `vitest` invocation, not per file.
 *
 * `prisma migrate deploy` is used rather than `db push`, so the tests exercise
 * THE ACTUAL MIGRATION — including the hand-written raw SQL for CHECK
 * constraints, the NULLS NOT DISTINCT wishlist index and the order-number
 * sequence. A schema pushed from `schema.prisma` would silently omit all of
 * them and every constraint test would pass against a database that production
 * will never resemble.
 */

function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}

function adminUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = '/postgres';
  parsed.search = '';
  return parsed.toString();
}

export default async function setup(): Promise<void> {
  const name = databaseName(TEST_DATABASE_URL);

  const admin = new Client({ connectionString: adminUrl(TEST_DATABASE_URL) });

  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach PostgreSQL for integration tests at ${adminUrl(TEST_DATABASE_URL)}.\n` +
        'Start it with: npm run db:up\n' +
        `Underlying error: ${(error as Error).message}`,
    );
  }

  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (existing.rowCount === 0) {
      // Identifier cannot be parameterised; `name` comes from our own
      // configuration, not from user input.
      await admin.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await admin.end();
  }

  execSync('npx --no-install prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
