import { BackupService } from './services/backup.service';
import { ClipboardService } from './services/clipboard.service';
import { CryptoService } from './services/crypto.service';
import { PasswordService } from './services/password.service';
import { PreferencesService } from './services/preferences.service';
import { createVaultPaths, type VaultPaths } from './services/paths';
import { StorageService } from './services/storage.service';
import { VaultService } from './services/vault.service';
import { WindowStateService } from './services/window-state.service';

export interface AppContext {
  paths: VaultPaths;
  storage: StorageService;
  crypto: CryptoService;
  password: PasswordService;
  vault: VaultService;
  backup: BackupService;
  clipboard: ClipboardService;
  preferences: PreferencesService;
  windowState: WindowStateService;
}

export type LockableVault = Pick<VaultService, 'onLocked'>;
export type ClipboardCleaner = Pick<ClipboardService, 'clearIfStillOwned'>;

/**
 * 锁库与剪贴板必须联动：手动锁定、自动锁定、系统锁屏与休眠最终都调用 `vault.lock()`，
 * 在这里统一清掉「仍属于本应用」的剪贴板内容，避免锁库后密码还躺在剪贴板里等定时器。
 * `clearIfStillOwned` 只清我们自己写进去且未被覆盖的内容，用户后来复制的东西不受影响。
 */
export function attachLockHandlers(
  vault: LockableVault,
  clipboard: ClipboardCleaner,
): void {
  vault.onLocked(() => clipboard.clearIfStillOwned());
}

export function createAppContext(userDataDir: string): AppContext {
  const paths = createVaultPaths(userDataDir);
  const storage = new StorageService(paths);
  const crypto = new CryptoService();
  const password = new PasswordService();
  const vault = new VaultService(storage, crypto, paths);
  const backup = new BackupService(vault, storage);
  const clipboard = new ClipboardService();
  const preferences = new PreferencesService(paths.uiPreferencesFilePath);
  const windowState = new WindowStateService(paths.windowStateFilePath);

  attachLockHandlers(vault, clipboard);

  return {
    paths,
    storage,
    crypto,
    password,
    vault,
    backup,
    clipboard,
    preferences,
    windowState,
  };
}
