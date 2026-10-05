import { ipcMain, type BrowserWindow } from 'electron';
import { DEFAULT_SETTINGS } from '@shared/types';
import type {
  AppSettings,
  PasswordConfig,
  VaultChangeMasterPasswordInput,
  VaultItemDraft,
  VaultStatus,
  IpcResult,
} from '@shared/types';
import { ErrorCode, isAppError } from '@shared/errors';
import { IPC } from '@shared/types';
import type { AppContext } from '../app-context';

type MainWindowProvider = () => BrowserWindow | null;

export function registerIpcHandlers(context: AppContext, getMainWindow: MainWindowProvider): void {
  const handle = <TResult>(
    channel: string,
    handler: (...args: unknown[]) => Promise<TResult> | TResult,
  ): void => {
    ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
      try {
        return { ok: true, data: await handler(...args) } satisfies IpcResult<TResult>;
      } catch (error) {
        const payload = toErrorPayload(error);
        console.error(`[ipc] ${channel} failed: ${payload.code}`);
        return { ok: false, error: payload } satisfies IpcResult<TResult>;
      }
    });
  };

  handle(IPC.vaultExists, () => context.vault.exists());
  handle(IPC.vaultStatus, () => context.vault.status());
  handle(IPC.vaultCreate, async (masterPassword) => {
    await context.vault.create(assertString(masterPassword, '主密码'));
  });
  handle(IPC.vaultUnlock, async (masterPassword) => {
    await context.vault.unlock(assertString(masterPassword, '主密码'));
  });
  handle(IPC.vaultLock, () => {
    context.vault.lock();
  });
  handle(IPC.vaultList, () => context.vault.list());
  handle(IPC.vaultGet, (id) => context.vault.get(assertString(id, '记录编号')));
  handle(IPC.vaultCreateItem, (draft) => context.vault.createItem(assertDraft(draft)));
  handle(IPC.vaultUpdateItem, (id, draft) =>
    context.vault.updateItem(assertString(id, '记录编号'), assertDraft(draft)),
  );
  handle(IPC.vaultDeleteItem, (id) =>
    context.vault.deleteItem(assertString(id, '记录编号')),
  );
  handle(IPC.vaultChangeMasterPassword, async (input) => {
    const payload = assertObject(input, '输入') as unknown as VaultChangeMasterPasswordInput;
    await context.vault.changeMasterPassword(
      assertString(payload.currentPassword, '当前主密码'),
      assertString(payload.newPassword, '新主密码'),
    );
  });
  handle(IPC.vaultExportBackup, () => context.backup.exportBackup(getMainWindow()));
  handle(IPC.vaultRestoreBackup, async (input) => {
    const payload = assertObject(input, '输入') as unknown as { password?: unknown };
    return context.backup.restoreBackup(
      getMainWindow(),
      assertString(payload.password, '备份主密码'),
    );
  });
  handle(IPC.generatorGenerate, (config) =>
    context.password.generatePassword(assertObject(config, '生成参数') as unknown as PasswordConfig),
  );
  handle(IPC.passwordStrength, (password) =>
    context.password.calculateStrength(assertString(password, '密码')),
  );
  handle(IPC.settingsGet, () => readSettings(context));
  handle(IPC.settingsUpdate, (patch) =>
    context.vault.updateSettings(assertObject(patch, '设置') as Partial<AppSettings>),
  );
  handle(IPC.clipboardCopySecret, async (value) => {
    const settings = await readSettings(context);
    context.clipboard.copySecret(
      assertString(value, '待复制内容'),
      settings.clearClipboardSeconds,
    );
  });

}

async function readSettings(context: AppContext): Promise<AppSettings> {
  const status: VaultStatus = await context.vault.status();
  if (!status.unlocked) return { ...DEFAULT_SETTINGS };
  return context.vault.getSettings();
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName}必须是字符串`);
  }
  return value;
}

function assertObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName}格式无效`);
  }
  return value as Record<string, unknown>;
}

function assertDraft(value: unknown): VaultItemDraft {
  return assertObject(value, '记录内容') as unknown as VaultItemDraft;
}

function toErrorPayload(error: unknown): { code: string; message: string } {
  if (isAppError(error)) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error && error.message) {
    return { code: ErrorCode.InvalidInput, message: error.message };
  }
  return { code: ErrorCode.Internal, message: '发生未知错误' };
}
