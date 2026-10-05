import { app, BrowserWindow, powerMonitor } from 'electron';
import { createAppContext } from './app-context';
import { registerIpcHandlers } from './ipc';
import { applyGlobalSecurityPolicies, applySecurityPolicies } from './security';
import { createMainWindow } from './window';
import { IPC } from '@shared/types';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  const context = createAppContext(app.getPath('userData'));
  let mainWindow: BrowserWindow | null = null;
  let quitting = false;

  applyGlobalSecurityPolicies();

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  context.vault.onLocked(() => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC.eventLocked);
    }
  });

  void app.whenReady().then(() => {
    mainWindow = createMainWindow();
    applySecurityPolicies(mainWindow);
    registerIpcHandlers(context, () => mainWindow);

    powerMonitor.on('lock-screen', () => context.vault.lock());
    powerMonitor.on('suspend', () => context.vault.lock());
    powerMonitor.on('shutdown', () => {
      context.clipboard.dispose();
      context.vault.lock();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
        applySecurityPolicies(mainWindow);
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
