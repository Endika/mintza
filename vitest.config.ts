import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@domain': r('./src/domain'),
      '@application': r('./src/application'),
      '@infrastructure': r('./src/infrastructure'),
      '@presentation': r('./src/presentation'),
      '@shared': r('./src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.d.ts'],
    },
  },
});
