import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src/renderer'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@main': path.resolve(rootDir, 'src/main'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['tests/unit/renderer/**', 'jsdom'],
      ['tests/**/*.test.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // 前端组件也是产品代码：一并统计，避免「只测主进程」的假象。
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main/index.ts',
        'src/preload/**',
        'src/shared/types/**',
      ],
      // 阈值按当前实测值（47.99% / 79.8% / 68.58%）留出余量，防止覆盖率悄悄回退。
      thresholds: {
        statements: 45,
        branches: 70,
        functions: 60,
        lines: 45,
      },
    },
  },
});
