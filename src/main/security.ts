import { app, type BrowserWindow } from 'electron';

const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

/**
 * 与 index.html 中的 meta CSP 保持一致；区别在于这里额外禁止 object/base/form/frame，
 * 并在开发服务器响应上以响应头形式下发（生产环境走 file://，由 meta 生效）。
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export function applySecurityPolicies(window: BrowserWindow): void {
  const currentSession = window.webContents.session;
  currentSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  // 双保险：某些权限路径只走 check handler，不会触发 request handler。
  currentSession.setPermissionCheckHandler(() => false);

  if (process.env.VITE_DEV_SERVER_URL) {
    currentSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
        },
      });
    });
  }

  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
    }
  });

  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

/**
 * 只允许开发模式下导航到 Vite dev server 的同源地址。
 * 打包后（或没有 dev server 时）任何导航都会被拒绝，避免被诱导跳转到外部页面。
 */
export function isAllowedNavigation(url: string): boolean {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!devServerUrl) return false;

  try {
    const target = new URL(url);
    const devOrigin = new URL(devServerUrl).origin;
    return target.origin === devOrigin || ALLOWED_DEV_ORIGINS.has(target.origin);
  } catch {
    return false;
  }
}

export function applyGlobalSecurityPolicies(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}
