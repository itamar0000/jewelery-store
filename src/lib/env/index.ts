import { parseEnv } from './schema';

/**
 * The validated environment. Import as `env` from `@/lib/env`.
 *
 * Reading `process.env` directly anywhere else is a bug: it bypasses
 * validation, has type `string | undefined` at every use site, and hides which
 * variables the application actually depends on.
 *
 * Validation runs at module load, so the first import fails loudly and
 * immediately rather than at the first query.
 *
 * SERVER ONLY, for now. `NEXT_PUBLIC_SITE_URL` is read as a static property so
 * Next can inline it if this module is ever pulled into a client bundle, but
 * `DATABASE_URL` must never reach the browser. When a client component first
 * needs public configuration, split this into client and server schemas rather
 * than relaxing the rule.
 *
 * This is deliberately NOT imported from `next.config.ts`. Doing so would make
 * every `next build` require a database URL, and a production build in CI has
 * no database. Validation belongs at run time, where the value is actually
 * needed.
 */
export const env = parseEnv({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export { EnvironmentError, envSchema, parseEnv, type Env } from './schema';
