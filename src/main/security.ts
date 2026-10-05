import { app, type BrowserWindow } from 'electron';

const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

export function applySecurityPolicies(window: BrowserWindow): void {
  const currentSession = window.webContents.session;
  currentSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  window.webContents.on('will-navigate', (event, url) => {
    const isDevServer = process.env.VITE_DEV_SERVER_URL && ALLOWED_DEV_ORIGINS.has(url);
    if (!isDevServer) {
      event.preventDefault();
    }
  });

  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

export function applyGlobalSecurityPolicies(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}
