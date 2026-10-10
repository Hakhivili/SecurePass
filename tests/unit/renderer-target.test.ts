import { describe, expect, it } from 'vitest';
import { normalizeDevServerUrl, resolveRendererTarget } from '@main/renderer-target';

/**
 * 回归：Windows 上 localhost 优先解析为 ::1，而 dev server 可能只监听 IPv4/IPv6 之一，
 * 必须统一成 IPv4 回环地址，避免出现“无法连接到 localhost”。
 */
describe('normalizeDevServerUrl', () => {
  it('把 localhost 规范为 127.0.0.1', () => {
    expect(normalizeDevServerUrl('http://localhost:5173/')).toBe(
      'http://127.0.0.1:5173/',
    );
    expect(normalizeDevServerUrl('http://localhost')).toBe('http://127.0.0.1');
    expect(normalizeDevServerUrl('https://localhost:5173/index.html')).toBe(
      'https://127.0.0.1:5173/index.html',
    );
  });

  it('不改动 localhost 的“同名主机”与已就绪的 IPv4/IPv6 地址', () => {
    expect(normalizeDevServerUrl('http://localhost.example.com:5173/')).toBe(
      'http://localhost.example.com:5173/',
    );
    expect(normalizeDevServerUrl('http://127.0.0.1:5173/')).toBe(
      'http://127.0.0.1:5173/',
    );
    expect(normalizeDevServerUrl('http://[::1]:5173/')).toBe('http://[::1]:5173/');
  });
});

describe('resolveRendererTarget', () => {
  it('有 dev server 地址时加载 URL（且已规范为 IPv4）', () => {
    expect(
      resolveRendererTarget('http://localhost:5173/', 'C:\\app\\dist-electron\\main'),
    ).toEqual({
      kind: 'dev-server',
      url: 'http://127.0.0.1:5173/',
    });
  });

  it('没有 dev server 时加载本地打包文件，不依赖服务器', () => {
    const target = resolveRendererTarget(undefined, 'C:\\app\\dist-electron\\main');
    expect(target.kind).toBe('local-file');
    if (target.kind === 'local-file') {
      expect(
        target.file.endsWith('dist\\index.html') ||
          target.file.endsWith('dist/index.html'),
      ).toBe(true);
    }
  });

  it('空字符串视为“无 dev server”，回退到本地文件', () => {
    expect(resolveRendererTarget('', 'C:\\app\\dist-electron\\main').kind).toBe(
      'local-file',
    );
  });
});
