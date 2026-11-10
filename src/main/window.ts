import path from 'node:path';
import { BrowserWindow, screen, shell } from 'electron';
import { APP_NAME, TITLE_BAR_HEIGHT } from '@shared/constants';
import {
  DEV_LOAD_MAX_RETRIES,
  DEV_LOAD_RETRY_DELAY_MS,
  ERR_ABORTED,
  resolveRendererTarget,
} from './renderer-target';
import type { WindowStateService } from './services/window-state.service';

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

const MIN_WIDTH = 1000;
const MIN_HEIGHT = 660;
/** 拖动/缩放停止后再落盘，避免频繁写文件。 */
const PERSIST_DEBOUNCE_MS = 400;

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

/** 上一次的窗口位置是否仍落在某块屏幕上（防止换显示器后窗口跑到看不见的地方）。 */
function isVisibleOnSomeDisplay(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return screen.getAllDisplays().some(({ workArea }) => {
    const overlapX =
      Math.min(x + width, workArea.x + workArea.width) - Math.max(x, workArea.x);
    const overlapY =
      Math.min(y + height, workArea.y + workArea.height) - Math.max(y, workArea.y);
    // 至少露出 120x48 的可抓取区域
    return overlapX >= 120 && overlapY >= 48;
  });
}

/**
 * 主窗口：隐藏系统标题栏，用应用自己的顶栏充当标题栏
 * （`titleBarOverlay` 保留系统的最小化/最大化/关闭按钮，
 *  但底色与符号颜色可由渲染层按主题实时更新，做到与页面风格统一）。
 *
 * 窗口大小/位置优先复用 `windowState` 里记录的上一状态，没有或不可用时回退到 3:2 默认值。
 */
export function createMainWindow(
  chrome: WindowChromeOptions = DEFAULT_CHROME,
  windowState?: WindowStateService,
): BrowserWindow {
  const saved = windowState?.read() ?? null;
  const defaultBounds = resolveWindowBounds();
  const useSaved =
    saved !== null &&
    saved.x !== undefined &&
    saved.y !== undefined &&
    isVisibleOnSomeDisplay(saved.x, saved.y, saved.width, saved.height);

  const window = new BrowserWindow({
    width: useSaved ? saved.width : defaultBounds.width,
    height: useSaved ? saved.height : defaultBounds.height,
    ...(useSaved ? { x: saved.x, y: saved.y } : {}),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
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

  if (useSaved && saved?.maximized) {
    window.maximize();
  }

  // 记录窗口状态：最大化时保存「还原后」的尺寸，避免下次从最大化尺寸起步
  if (windowState) {
    let timer: NodeJS.Timeout | null = null;
    const persist = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const bounds = window.isMaximized()
          ? window.getNormalBounds()
          : window.getBounds();
        windowState.save({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          maximized: window.isMaximized(),
        });
      }, PERSIST_DEBOUNCE_MS);
    };
    window.on('resize', persist);
    window.on('move', persist);
    window.on('maximize', persist);
    window.on('unmaximize', persist);
    window.on('close', () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();
      windowState.save({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized: window.isMaximized(),
      });
    });
  }

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
