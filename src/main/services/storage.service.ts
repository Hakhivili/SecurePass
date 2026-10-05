import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError, ErrorCode } from '@shared/errors';
import type { VaultFile } from '@shared/types';
import { parseVaultFile } from './crypto.service';
import type { VaultPaths } from './paths';

const LOCK_STALE_AFTER_MS = 30_000;

interface LockFileContent {
  pid: number;
  createdAt: number;
}

export class StorageService {
  private lockHandle: fs.FileHandle | null = null;

  constructor(private readonly paths: VaultPaths) {}

  async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.paths.baseDir, { recursive: true });
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.paths.vaultFilePath);
      return true;
    } catch {
      return false;
    }
  }

  isLockHeld(): boolean {
    return this.lockHandle !== null;
  }

  async readVaultFile(): Promise<VaultFile> {
    let raw: string;
    try {
      raw = await fs.readFile(this.paths.vaultFilePath, 'utf8');
    } catch (error) {
      throw new AppError(ErrorCode.VaultNotFound, '未找到密码库文件', error);
    }
    return parseVaultFile(raw);
  }

  async writeVaultFile(vaultFile: VaultFile): Promise<void> {
    if (await this.exists()) {
      try {
        await fs.copyFile(this.paths.vaultFilePath, this.paths.vaultBackupPath);
      } catch (error) {
        throw new AppError(ErrorCode.StorageFailure, '写入前无法保留上一版本备份', error);
      }
    }
    await this.writeJsonFileAtomic(this.paths.vaultFilePath, vaultFile);
  }

  async writeJsonFileAtomic(filePath: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const handle = await fs.open(temporaryPath, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(value, null, 2), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }

    try {
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      throw new AppError(ErrorCode.StorageFailure, '写入磁盘失败，原文件未被修改', error);
    }
  }

  async copyCurrentTo(destinationPath: string): Promise<boolean> {
    if (!(await this.exists())) return false;
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(this.paths.vaultFilePath, destinationPath);
    return true;
  }

  async acquireLock(): Promise<void> {
    if (this.lockHandle) return;
    await this.ensureBaseDir();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        this.lockHandle = await fs.open(this.paths.lockFilePath, 'wx', 0o600);
        const content: LockFileContent = { pid: process.pid, createdAt: Date.now() };
        await this.lockHandle.writeFile(JSON.stringify(content), 'utf8');
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw new AppError(ErrorCode.StorageFailure, '无法创建密码库锁文件', error);
        }
      }

      if (!(await this.isLockStale())) {
        throw new AppError(ErrorCode.VaultBusy, '密码库正被另一个进程使用');
      }
      await fs.rm(this.paths.lockFilePath, { force: true });
    }

    throw new AppError(ErrorCode.VaultBusy, '无法获取密码库写入锁');
  }

  async releaseLock(): Promise<void> {
    if (!this.lockHandle) return;
    try {
      await this.lockHandle.close();
    } finally {
      this.lockHandle = null;
      await fs.rm(this.paths.lockFilePath, { force: true });
    }
  }

  private async isLockStale(): Promise<boolean> {
    let content: LockFileContent;
    try {
      content = JSON.parse(await fs.readFile(this.paths.lockFilePath, 'utf8')) as LockFileContent;
    } catch {
      return true;
    }

    if (
      typeof content.pid !== 'number' ||
      typeof content.createdAt !== 'number' ||
      Date.now() - content.createdAt > LOCK_STALE_AFTER_MS
    ) {
      return true;
    }

    return !isProcessAlive(content.pid);
  }
}

function isProcessAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
