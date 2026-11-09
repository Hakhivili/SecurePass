import { BackupService } from './services/backup.service';
import { ClipboardService } from './services/clipboard.service';
import { CryptoService } from './services/crypto.service';
import { PasswordService } from './services/password.service';
import { PreferencesService } from './services/preferences.service';
import { createVaultPaths, type VaultPaths } from './services/paths';
import { StorageService } from './services/storage.service';
import { VaultService } from './services/vault.service';

export interface AppContext {
  paths: VaultPaths;
  storage: StorageService;
  crypto: CryptoService;
  password: PasswordService;
  vault: VaultService;
  backup: BackupService;
  clipboard: ClipboardService;
  preferences: PreferencesService;
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

  return { paths, storage, crypto, password, vault, backup, clipboard, preferences };
}
