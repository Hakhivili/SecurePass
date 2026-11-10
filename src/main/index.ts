import { app, BrowserWindow, nativeTheme, powerMonitor } from 'electron';
import { createAppContext } from './app-context';
import { registerIpcHandlers } from './ipc';
import { applyGlobalSecurityPolicies, applySecurityPolicies } from './security';
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

  applyGlobalSecurityPolicies();

  context.vault.onLocked(() => {
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
      app.exit(0);
    })();
  });
}
