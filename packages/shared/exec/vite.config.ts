import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'exec',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
