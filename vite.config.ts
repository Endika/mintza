import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string };

export default defineConfig({
  base: '/mintza/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
