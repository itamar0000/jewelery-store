import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Node is the correct default: the highest-value tests in this project are
    // pricing, money arithmetic, inventory and validation (ARCHITECTURE §15),
    // none of which need a DOM. A browser-like environment is added per-file
    // when component tests actually arrive.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
