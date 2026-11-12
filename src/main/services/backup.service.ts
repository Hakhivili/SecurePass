import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import { app, dialog } from 'electron';
import { AppError, ErrorCode } from '@shared/errors';
import type { BackupResult, RestoreResult } from '@shared/types';
import { parseVaultFile } from './crypto.service';
import type { StorageService } from './storage.service';
import type { VaultService } from './vault.service';

/**
 * 单个备份文件的读取上限。
 *
 * 备份是用户从磁盘挑选的文件，可能是任意内容：先限制大小再读，避免一次 `readFile`
 * 把几个 GB 的无关文件整个读进内存（1000 条记录的库也只有约 1 MB）。
 */
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;

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

  async restoreBackup(
    parent: BrowserWindow | null,
    password: string,
  ): Promise<RestoreResult> {
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
    await assertReadableBackup(sourcePath);

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

/**
 * 读取前先看元数据：拒绝空文件与超大文件，避免为无效输入付出内存与时间成本。
 */
async function assertReadableBackup(sourcePath: string): Promise<void> {
  let stats;
  try {
    stats = await fs.stat(sourcePath);
  } catch (error) {
    throw new AppError(ErrorCode.RestoreFailed, '无法读取备份文件', error);
  }
  if (!stats.isFile()) {
    throw new AppError(ErrorCode.RestoreFailed, '请选择一个备份文件');
  }
  if (stats.size === 0) {
    throw new AppError(ErrorCode.RestoreFailed, '备份文件为空');
  }
  if (stats.size > MAX_BACKUP_BYTES) {
    throw new AppError(
      ErrorCode.RestoreFailed,
      `备份文件超过 ${Math.round(MAX_BACKUP_BYTES / (1024 * 1024))} MB，已拒绝读取`,
    );
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
