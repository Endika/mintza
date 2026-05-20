import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: '/mintza/',
  resolve: {
    alias: {
      '@domain': r('./src/domain'),
      '@application': r('./src/application'),
      '@infrastructure': r('./src/infrastructure'),
      '@presentation': r('./src/presentation'),
      '@shared': r('./src/shared'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
