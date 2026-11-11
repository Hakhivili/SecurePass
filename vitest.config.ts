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
    // 组件测试要等 antd 的动画/Portal 落在 jsdom 里，并行跑时 5s 默认值不够用
    testTimeout: 15_000,
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
      // 阈值按当前实测值（82.55% / 87.04% / 81.05%）留出余量，防止覆盖率悄悄回退。
      thresholds: {
        statements: 78,
        branches: 85,
        functions: 78,
        lines: 78,
      },
    },
  },
});
