import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootDocumentScript } from './src/bootstrap/bootDocument';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string };

const injectVersionInServiceWorker = (version: string): Plugin => {
  // closeBundle also runs when the build failed, and reading a dist/ that was never
  // written masked the real error with an ENOENT.
  let written = false;
  return {
    name: 'mintza-sw-version',
    apply: 'build',
    writeBundle() {
      written = true;
    },
    closeBundle() {
      if (!written) return;
      const swPath = resolve('dist/sw.js');
      const original = readFileSync(swPath, 'utf-8');
      writeFileSync(swPath, original.replace(/__APP_VERSION__/g, version));
    },
  };
};

const inlineBootDocument = (): Plugin => ({
  name: 'mintza-boot-document',
  transformIndexHtml: () => [{ tag: 'script', children: bootDocumentScript(), injectTo: 'head' }],
});

export default defineConfig({
  base: '/mintza/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [tailwindcss(), inlineBootDocument(), injectVersionInServiceWorker(pkg.version)],
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
