import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@gaming-platform/database': path.resolve(import.meta.dirname, '../../packages/database/dist/index.js'),
      '@prisma/client': path.resolve(import.meta.dirname, '../../packages/database/src/generated/client/index.js'),
      '@gaming-platform/auth': path.resolve(import.meta.dirname, '../../packages/auth/dist/index.js'),
      '@gaming-platform/types': path.resolve(import.meta.dirname, '../../packages/types/dist/index.js'),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
