import path from 'node:path';
import { BrowserWindow, shell } from 'electron';
import { APP_NAME } from '@shared/constants';
import {
  DEV_LOAD_MAX_RETRIES,
  DEV_LOAD_RETRY_DELAY_MS,
  ERR_ABORTED,
  resolveRendererTarget,
} from './renderer-target';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 640,
    show: false,
    title: APP_NAME,
    backgroundColor: '#f4f5f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const target = resolveRendererTarget();

  // 打包 / `npm run start`：直接读本地文件，不需要任何本地服务器。
  if (target.kind === 'local-file') {
    void window.loadFile(target.file);
    return window;
  }

  // 开发模式：dev server 可能比 Electron 晚就绪，失败时重试若干次。
  let attempt = 0;
  const loadDevServer = () => {
    void window.loadURL(target.url).catch(() => {
      // 失败原因由 did-fail-load 统一处理
    });
  };

  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === ERR_ABORTED) return;
      if (attempt >= DEV_LOAD_MAX_RETRIES) {
        console.error(
          `[dev] 无法连接开发服务器 ${validatedURL}（${errorDescription}，code=${errorCode}）。` +
            `请确认 Vite 正在监听 ${target.url}，或改用桌面模式：npm run start`,
        );
        return;
      }
      attempt += 1;
      setTimeout(loadDevServer, DEV_LOAD_RETRY_DELAY_MS);
    },
  );

  loadDevServer();
  return window;
}
