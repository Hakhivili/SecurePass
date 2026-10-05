import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { BrowserWindow} from 'electron';
import { app, dialog } from 'electron';
import { AppError, ErrorCode } from '@shared/errors';
import type { BackupResult, RestoreResult } from '@shared/types';
import { parseVaultFile } from './crypto.service';
import type { StorageService } from './storage.service';
import type { VaultService } from './vault.service';

export class BackupService {
  constructor(
    private readonly vaultService: VaultService,
    private readonly storage: StorageService,
  ) {}

  async exportBackup(parent: BrowserWindow | null): Promise<BackupResult> {
    const snapshot = this.vaultService.getVaultFileSnapshot();
    const defaultName = `SecurePass-backup-${formatStamp(new Date())}.securepass`;
    const options = {
      title: '导出加密备份',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'SecurePass 加密备份', extensions: ['securepass'] }],
    };
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return { path: null, canceled: true };
    }

    await this.storage.writeJsonFileAtomic(result.filePath, snapshot);
    return { path: result.filePath, canceled: false };
  }

  async restoreBackup(parent: BrowserWindow | null, password: string): Promise<RestoreResult> {
    const options = {
      title: '选择加密备份',
      properties: ['openFile'] as Array<'openFile'>,
      filters: [
        { name: 'SecurePass 加密备份', extensions: ['securepass', 'bak'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    };
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return { restored: false, canceled: true };
    }

    const sourcePath = result.filePaths[0] as string;
    let backupFile;
    try {
      const raw = await fs.readFile(sourcePath, 'utf8');
      backupFile = parseVaultFile(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.RestoreFailed, '无法读取备份文件', error);
    }

    const backupOfPreviousPath = await this.vaultService.replaceFromBackupFile(
      backupFile,
      password,
    );
    return { restored: true, canceled: false, backupOfPreviousPath };
  }
}

function formatStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join('');
}
