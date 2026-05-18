import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      '**/tests/**/*.test.{js,ts,mjs,mts}',
      '**/tests/**/*.spec.{js,ts,mjs,mts}',
    ],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
    },
  },
});

