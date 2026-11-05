import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  ssr: {
    external: ['node:sqlite', 'sqlite']
  }
});
