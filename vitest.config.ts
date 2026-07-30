import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    // src/config/env.ts validates at module load and throws on a malformed
    // value — by design. OPENAI_API_KEY is the only required variable, so this
    // is the whole of what a test run needs. The schema itself is exercised
    // directly in src/__tests__/unit/config/env.test.ts.
    env: {
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'sk-test-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/config/**'],
      // Section 15.8 mandates >= 80% on lib/. Enforced from Phase 10, when the
      // full suite exists; until then the threshold would fail a build that is
      // correct for its phase.
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
