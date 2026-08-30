import { z } from 'zod';

/**
 * Environment schema.
 *
 * ARCHITECTURE section 14: configuration is validated by a schema that fails
 * fast. A missing database URL should stop the process with a legible message,
 * not surface hours later as an unexplained query error.
 *
 * This file is deliberately pure - it declares and parses, and has no side
 * effects - so the schema can be tested without the test run itself depending
 * on a valid environment. `../env` (the module next door) is the one that
 * actually reads `process.env` at import time.
 *
 * ONLY VARIABLES THE CODE ACTUALLY USES BELONG HERE. Payment, invoicing, email
 * and storage providers are all TBD (TBD.md B1, B2, I1, I2); adding their keys
 * now would be inventing configuration for integrations that do not exist, and
 * would make the schema reject environments that are perfectly valid today.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * PostgreSQL connection string.
   *
   * Required, with no default. A fallback here would silently point a
   * misconfigured production deployment at the wrong database, which is far
   * worse than refusing to start.
   */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required. Copy .env.example to .env and start the local database.')
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string (postgresql://...).',
    ),

  /**
   * Canonical public origin, used for canonical URLs, sitemap, robots and
   * Open Graph images (MASTER_SPECIFICATION section 44).
   *
   * Defaulted, because the local development origin is not a secret and every
   * developer's is identical. The production domain is TBD.
   */
  NEXT_PUBLIC_SITE_URL: z
    .url('NEXT_PUBLIC_SITE_URL must be an absolute URL.')
    .default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

/** Thrown when the environment is not usable. Never contains a variable's value. */
export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

/**
 * Validate a raw environment.
 *
 * Throws `EnvironmentError` listing every problem at once, so a developer
 * fixes one round of errors rather than rediscovering them one restart at a
 * time.
 *
 * The message names the offending variables but NEVER their values: this text
 * reaches logs and crash reports, and `DATABASE_URL` contains a password
 * (MASTER_SPECIFICATION section 48).
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new EnvironmentError(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}
