import { BackupService } from './services/backup.service';
import { ClipboardService } from './services/clipboard.service';
import { CryptoService } from './services/crypto.service';
import { PasswordService } from './services/password.service';
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
}

export function createAppContext(userDataDir: string): AppContext {
  const paths = createVaultPaths(userDataDir);
  const storage = new StorageService(paths);
  const crypto = new CryptoService();
  const password = new PasswordService();
  const vault = new VaultService(storage, crypto, paths);
  const backup = new BackupService(vault, storage);
  const clipboard = new ClipboardService();

  return { paths, storage, crypto, password, vault, backup, clipboard };
}
