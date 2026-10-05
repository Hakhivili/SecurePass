import path from 'node:path';
import { VAULT_FILE_NAME, VAULT_LOCK_FILE_NAME } from '@shared/constants';

export interface VaultPaths {
  baseDir: string;
  vaultFilePath: string;
  vaultBackupPath: string;
  lockFilePath: string;
}

export function createVaultPaths(baseDir: string): VaultPaths {
  return {
    baseDir,
    vaultFilePath: path.join(baseDir, VAULT_FILE_NAME),
    vaultBackupPath: path.join(baseDir, `${VAULT_FILE_NAME}.bak`),
    lockFilePath: path.join(baseDir, VAULT_LOCK_FILE_NAME),
  };
}
