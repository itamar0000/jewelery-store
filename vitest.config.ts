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
    // checked through `react-dom/server`, which also needs no DOM. A browser
    // environment gets added per-file if component tests ever require one.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
