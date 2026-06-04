import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'reporting',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
