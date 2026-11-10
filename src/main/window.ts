import path from 'node:path';
import { BrowserWindow, screen, shell } from 'electron';
import { APP_NAME, TITLE_BAR_HEIGHT } from '@shared/constants';
import {
  DEV_LOAD_MAX_RETRIES,
  DEV_LOAD_RETRY_DELAY_MS,
  ERR_ABORTED,
  resolveRendererTarget,
} from './renderer-target';

export interface WindowChromeOptions {
  /** 窗口/标题栏底色，与当前主题一致，避免启动时白闪。 */
  backgroundColor: string;
  /** 窗口按钮（最小化/最大化/关闭）的符号颜色。 */
  symbolColor: string;
}

const DEFAULT_CHROME: WindowChromeOptions = {
  backgroundColor: '#f4f5f7',
  symbolColor: '#1f2937',
};

/** 默认窗口按约 3:2 的比例、并限制在屏幕可用区域内（参考 VS Code / Notion 的默认尺寸）。 */
export function resolveWindowBounds(): { width: number; height: number } {
  const { workAreaSize } = screen.getPrimaryDisplay();
  const availableWidth = Math.round(workAreaSize.width * 0.88);
  const availableHeight = Math.round(workAreaSize.height * 0.92);

  const width = Math.min(1440, Math.max(1080, availableWidth));
  // 3:2 是长文本/表格都舒服的比例；屏幕不够高时以可用高度为准
  const height = Math.max(660, Math.min(Math.round(width / 1.5), availableHeight));

  return { width, height };
}

/**
 * 主窗口：隐藏系统标题栏，用应用自己的顶栏充当标题栏
 * （`titleBarOverlay` 保留系统的最小化/最大化/关闭按钮，
 *  但底色与符号颜色可由渲染层按主题实时更新，做到与页面风格统一）。
 */
export function createMainWindow(
  chrome: WindowChromeOptions = DEFAULT_CHROME,
): BrowserWindow {
  const window = new BrowserWindow({
    ...resolveWindowBounds(),
    minWidth: 1000,
    minHeight: 660,
    show: false,
    title: APP_NAME,
    backgroundColor: chrome.backgroundColor,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: chrome.backgroundColor,
      symbolColor: chrome.symbolColor,
      height: TITLE_BAR_HEIGHT,
    },
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
