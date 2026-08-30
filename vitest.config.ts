import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // tsconfig sets `jsx: "preserve"` because Next.js does its own JSX
  // transform. Vitest has no such downstream step, so it needs the automatic
  // runtime spelled out here - otherwise esbuild emits classic `React.
  // createElement` calls into files that never import React.
  esbuild: {
    jsx: 'automatic',
  },

  test: {
    // Node is the correct default: the highest-value tests in this project are
    // money, pricing, inventory and validation (ARCHITECTURE section 15), none
    // of which need a DOM. The few component contracts worth asserting are
    // checked through `react-dom/server`, which also needs no DOM.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,

    // Creates the test database and runs `prisma migrate deploy` against it,
    // so integration tests exercise the real migration - including the raw SQL
    // constraints Prisma cannot express.
    globalSetup: ['./src/test/global-setup.ts'],

    // Integration tests truncate shared tables, so files must not run
    // concurrently against the same database. The suite is small; serial
    // execution costs a few seconds and removes a whole class of flakiness.
    fileParallelism: false,

    // Spawning the Prisma CLI and connecting to PostgreSQL is slower than a
    // unit test, and slower still on a cold CI runner.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
