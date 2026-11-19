import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text', 'lcov'],
      // RNF-020: as regras de negócio em `src/domain` precisam de >= 90% de cobertura.
      thresholds: {
        'src/domain/**': { lines: 90, statements: 90, functions: 90, branches: 90 },
      },
    },
  },
});
