import { defineConfig, env } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 removed `url` from `datasource` blocks in `schema.prisma` and no
 * longer auto-loads `.env`. Connection details for CLI commands (migrate,
 * db push, studio) live here instead; the application itself connects through
 * a driver adapter in `src/lib/db` and never reads this file.
 *
 * See docs/DECISIONS.md D1.7.
 */

// Node's built-in .env loader (>= 20.12) — no dotenv dependency needed.
// Absent in CI and in production, where variables are already in the
// environment, so a missing file is not an error.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file; fall through to the ambient environment.
}

/**
 * MIGRATIONS MUST NOT RUN THROUGH A CONNECTION POOLER.
 *
 * `prisma migrate deploy` takes a SESSION-level Postgres advisory lock
 * (`SELECT pg_advisory_lock(...)`) so that two deploys cannot migrate the same
 * database at once. Neon's pooled endpoint - the host ending `-pooler` - is
 * PgBouncer in transaction mode, which hands out a different backend
 * connection per transaction and therefore has no stable session to hold that
 * lock. The lock call simply never returns and the migration dies after ten
 * seconds:
 *
 *   Error: P1002 ... Timed out trying to acquire a postgres advisory lock
 *
 * That is what broke the Vercel build: DATABASE_URL there points at the pooled
 * endpoint, which is the RIGHT choice for the running application - serverless
 * functions need pooling - and the wrong one for the CLI.
 *
 * So the two are separated. DIRECT_DATABASE_URL, when set, is the unpooled
 * endpoint (the same host with `-pooler` removed) and is used only by the
 * Prisma CLI. The application never reads this file; it connects through the
 * driver adapter in src/lib/db using DATABASE_URL, unchanged.
 *
 * Falls back to DATABASE_URL so local development, where Postgres is reached
 * directly and no pooler exists, needs no extra variable.
 */
const MIGRATION_URL_VAR = process.env.DIRECT_DATABASE_URL ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env(MIGRATION_URL_VAR),
  },
});
