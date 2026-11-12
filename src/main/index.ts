import { app, BrowserWindow, nativeTheme, powerMonitor } from 'electron';
import path from 'node:path';
import { createAppContext } from './app-context';
import { registerIpcHandlers } from './ipc';
import { applyGlobalSecurityPolicies, applySecurityPolicies } from './security';
import { initLogger, logError, logInfo } from './services/log.service';
import { createMainWindow } from './window';
import { THEME_CHROME } from '@shared/constants';
import { IPC } from '@shared/types';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  const context = createAppContext(app.getPath('userData'));
  let mainWindow: BrowserWindow | null = null;
  let quitting = false;

  initLogger(path.join(context.paths.baseDir, 'logs'));
  logInfo('应用启动', { version: app.getVersion(), platform: process.platform });

  // 主进程兜底日志：任何未捕获异常都写入日志文件，避免静默退出。
  process.on('uncaughtException', (error) => {
    logError('[main] 未捕获异常', error);
  });
  process.on('unhandledRejection', (reason) => {
    logError('[main] 未处理的 Promise 拒绝', reason);
  });

  // 自动锁定依据「系统空闲 + 窗口失焦」，而不是只看密码库 IPC 调用：
  // 用户在生成器里操作、在编辑器里打字时也必须续期。
  context.vault.setActivitySource({
    idleSeconds: () => powerMonitor.getSystemIdleTime(),
    isWindowFocused: () =>
      Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()),
  });

  applyGlobalSecurityPolicies();

  context.vault.onLocked(() => {
    // 剪贴板清理在 createAppContext 里注册（所有锁库路径共用）；这里只负责通知界面。
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC.eventLocked);
    }
  });

  const resolveWindowChrome = async (): Promise<{
    backgroundColor: string;
    symbolColor: string;
  }> => {
    const preferences = await context.preferences.read();
    const dark =
      preferences.theme === 'dark' ||
      (preferences.theme === 'auto' && nativeTheme.shouldUseDarkColors);
    const chrome = dark ? THEME_CHROME.dark : THEME_CHROME.light;
    return { backgroundColor: chrome.bg, symbolColor: chrome.text };
  };

  const openMainWindow = async (): Promise<void> => {
    mainWindow = createMainWindow(await resolveWindowChrome(), context.windowState);
    applySecurityPolicies(mainWindow);
  };

  // 再次双击图标/重复启动时：有窗口就前置，没有任何窗口就重新开一个。
  // 旧逻辑在 mainWindow 为空时直接 return，用户看到的是「点了没反应」。
  app.on('second-instance', () => {
    if (!app.isReady()) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      return;
    }
    void openMainWindow();
  });

  void app.whenReady().then(async () => {
    await openMainWindow();
    registerIpcHandlers(context, () => mainWindow);

    powerMonitor.on('lock-screen', () => context.vault.lock());
    powerMonitor.on('suspend', () => context.vault.lock());
    powerMonitor.on('shutdown', () => {
      context.clipboard.dispose();
      context.vault.lock();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void openMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    void (async () => {
      context.clipboard.dispose();
      await context.vault.shutdown();
      logInfo('应用退出');
      app.exit(0);
    })();
  });
}
