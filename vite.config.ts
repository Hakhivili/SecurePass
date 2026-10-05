import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  '@': path.resolve(rootDir, 'src/renderer'),
  '@shared': path.resolve(rootDir, 'src/shared'),
  '@main': path.resolve(rootDir, 'src/main'),
};

export default defineConfig({
  resolve: { alias },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'hash-wasm'],
              output: { format: 'cjs', entryFileNames: 'index.js' },
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
              output: { format: 'cjs', entryFileNames: 'index.cjs' },
            },
          },
        },
      },
    }),
    renderer(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
