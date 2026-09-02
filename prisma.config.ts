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
 * So the CLI connection is resolved separately from the application's. The
 * application never reads this file; it connects through the driver adapter in
 * src/lib/db using DATABASE_URL, unchanged. See `migrationUrl` below for how
 * the CLI's connection is chosen.
 */

/**
 * Resolves the connection the Prisma CLI should use.
 *
 * Three sources, in order:
 *
 *   1. DIRECT_DATABASE_URL, if set. The explicit answer, and the one to prefer
 *      - it works whatever the provider and whatever their host naming.
 *   2. DATABASE_URL with the Neon pooler suffix removed, if it is recognisably
 *      a Neon pooled endpoint. Neon gives every project two endpoints that
 *      differ ONLY by a `-pooler` suffix on the first host label, so the direct
 *      one can be derived rather than configured.
 *   3. DATABASE_URL unchanged. Local development and any non-Neon host.
 *
 * Step 2 exists because step 1 is a manual step that has to happen in the
 * Vercel dashboard, and a deploy that fails until someone remembers it is a
 * trap. Deriving it means the build works out of the box and DIRECT_DATABASE_URL
 * becomes an override rather than a requirement.
 *
 * The rewrite is deliberately narrow: it fires only when the host both contains
 * `-pooler.` and ends in `.neon.tech`, it touches nothing but the hostname, and
 * it says so on stdout so the substitution is never invisible in a build log.
 */
function migrationUrl(): string {
  const explicit = process.env.DIRECT_DATABASE_URL;
  if (explicit !== undefined && explicit !== '') return explicit;

  const pooled = process.env.DATABASE_URL;
  if (pooled === undefined || pooled === '') {
    // Let env() below produce Prisma's own "variable not found" error rather
    // than inventing a worse one here.
    return env('DATABASE_URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(pooled);
  } catch {
    // Not a URL this can reason about - hand it over untouched.
    return pooled;
  }

  if (!parsed.hostname.includes('-pooler.') || !parsed.hostname.endsWith('.neon.tech')) {
    return pooled;
  }

  parsed.hostname = parsed.hostname.replace('-pooler.', '.');
  console.log(
    `[prisma.config] migrations will use the direct Neon endpoint ${parsed.hostname} ` +
      `(pooled endpoints cannot hold the advisory lock migrate deploy needs). ` +
      `Set DIRECT_DATABASE_URL to override.`,
  );

  return parsed.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationUrl(),
  },
});
