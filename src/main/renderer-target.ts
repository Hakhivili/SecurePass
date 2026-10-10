import path from 'node:path';

export type RendererTarget =
  { kind: 'dev-server'; url: string } | { kind: 'local-file'; file: string };

/**
 * 开发模式下，加载失败后的重试策略（Vite 可能比 Electron 晚就绪）。
 */
export const DEV_LOAD_MAX_RETRIES = 20;
export const DEV_LOAD_RETRY_DELAY_MS = 500;
/** Chromium 的 ERR_ABORTED：正常导航中断，不计入失败重试。 */
export const ERR_ABORTED = -3;

/**
 * dev server 地址统一规范为 IPv4 回环地址。
 *
 * Windows + Node 17+ 下 `localhost` 会优先解析为 `::1`：若 Vite 只监听了 IPv6，
 * Chromium 走 127.0.0.1 就会连接被拒，界面表现为“无法连接到 localhost”。
 */
export function normalizeDevServerUrl(rawUrl: string): string {
  return rawUrl.replace(/^https?:\/\/localhost(?=[:/]|$)/i, (match) =>
    match.replace('localhost', '127.0.0.1'),
  );
}

/**
 * 渲染层加载目标：
 * - 设置了 `VITE_DEV_SERVER_URL`（vite-plugin-electron 在 dev 模式注入）→ 加载 dev server；
 * - 否则（打包产物、`npm run start`）→ 直接加载本地 HTML，**不依赖任何本地服务器**。
 */
export function resolveRendererTarget(
  devServerUrl: string | undefined = process.env.VITE_DEV_SERVER_URL,
  mainDir: string = __dirname,
): RendererTarget {
  if (devServerUrl) {
    return { kind: 'dev-server', url: normalizeDevServerUrl(devServerUrl) };
  }
  return { kind: 'local-file', file: path.join(mainDir, '../../dist/index.html') };
}
