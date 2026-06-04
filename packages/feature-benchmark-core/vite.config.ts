import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'feature-benchmark-core',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
