import path from 'node:path';
import {
  UI_PREFERENCES_FILE_NAME,
  VAULT_FILE_NAME,
  VAULT_LOCK_FILE_NAME,
} from '@shared/constants';

export interface VaultPaths {
  baseDir: string;
  vaultFilePath: string;
  vaultBackupPath: string;
  lockFilePath: string;
  /** 明文界面偏好（主题 / 语言），未解锁时也可读写。 */
  uiPreferencesFilePath: string;
}

export function createVaultPaths(baseDir: string): VaultPaths {
  return {
    baseDir,
    vaultFilePath: path.join(baseDir, VAULT_FILE_NAME),
    vaultBackupPath: path.join(baseDir, `${VAULT_FILE_NAME}.bak`),
    lockFilePath: path.join(baseDir, VAULT_LOCK_FILE_NAME),
    uiPreferencesFilePath: path.join(baseDir, UI_PREFERENCES_FILE_NAME),
  };
}
