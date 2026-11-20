import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/types';
import type { IpcResult, SecurePassApi } from '@shared/types';

async function invoke<TResult>(channel: string, ...args: unknown[]): Promise<TResult> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<TResult>;
  if (!result.ok) {
    const error = new Error(result.error.message) as Error & { code?: string };
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

const api: SecurePassApi = {
  vault: {
    exists: () => invoke<boolean>(IPC.vaultExists),
    status: () => invoke(IPC.vaultStatus),
    create: (masterPassword) => invoke(IPC.vaultCreate, masterPassword),
    unlock: (masterPassword) => invoke(IPC.vaultUnlock, masterPassword),
    lock: () => invoke(IPC.vaultLock),
    list: () => invoke(IPC.vaultList),
    get: (id) => invoke(IPC.vaultGet, id),
    createItem: (draft) => invoke(IPC.vaultCreateItem, draft),
    updateItem: (id, draft) => invoke(IPC.vaultUpdateItem, id, draft),
    deleteItem: (id) => invoke(IPC.vaultDeleteItem, id),
    changeMasterPassword: (input) => invoke(IPC.vaultChangeMasterPassword, input),
    exportBackup: () => invoke(IPC.vaultExportBackup),
    restoreBackup: (input) => invoke(IPC.vaultRestoreBackup, input),
  },
  generator: {
    generate: (config) => invoke(IPC.generatorGenerate, config),
  },
  password: {
    strength: (password) => invoke(IPC.passwordStrength, password),
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    update: (patch) => invoke(IPC.settingsUpdate, patch),
  },
  uiPreferences: {
    get: () => invoke(IPC.uiPreferencesGet),
    update: (patch) => invoke(IPC.uiPreferencesUpdate, patch),
  },
  clipboard: {
    copySecret: (value) => invoke(IPC.clipboardCopySecret, value),
  },
  titleBar: {
    sync: (options) => invoke(IPC.windowSyncTitleBar, options),
  },
  app: {
    info: () => invoke(IPC.appInfo),
    openDataDir: () => invoke(IPC.appOpenDataDir),
    checkUpdate: () => invoke(IPC.appCheckUpdate),
    openExternal: (url) => invoke(IPC.appOpenExternal, url),
  },
  events: {
    onLocked: (callback) => {
      const listener = () => callback();
      ipcRenderer.on(IPC.eventLocked, listener);
      return () => ipcRenderer.removeListener(IPC.eventLocked, listener);
    },
  },
};

contextBridge.exposeInMainWorld('securepass', api);
