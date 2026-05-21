import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string };

const injectVersionInServiceWorker = (version: string): Plugin => ({
  name: 'mintza-sw-version',
  apply: 'build',
  closeBundle() {
    const swPath = resolve('dist/sw.js');
    const original = readFileSync(swPath, 'utf-8');
    writeFileSync(swPath, original.replace(/__APP_VERSION__/g, version));
  },
});

export default defineConfig({
  base: '/mintza/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [injectVersionInServiceWorker(pkg.version)],
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
