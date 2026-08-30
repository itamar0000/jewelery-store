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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
