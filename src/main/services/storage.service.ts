import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError, ErrorCode } from '@shared/errors';
import type { VaultFile } from '@shared/types';
import { parseVaultFile } from './crypto.service';
import type { VaultPaths } from './paths';

/** 持有锁期间定期刷新锁文件的 mtime，作为「持有者仍然活着」的心跳。 */
const LOCK_HEARTBEAT_INTERVAL_MS = 15_000;
/** 心跳超过这个时长没更新，才认为持有者已卡死（进程在但不再调度）。 */
const LOCK_STALE_AFTER_MS = 60_000;

interface LockFileContent {
  pid: number;
  createdAt: number;
}

export class StorageService {
  private lockHandle: fs.FileHandle | null = null;
  private lockHeartbeat: NodeJS.Timeout | null = null;

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
        this.startLockHeartbeat();
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
    this.stopLockHeartbeat();
    try {
      await this.lockHandle.close();
    } finally {
      this.lockHandle = null;
      await fs.rm(this.paths.lockFilePath, { force: true });
    }
  }

  /**
   * 判断磁盘上的锁是否已经失效。
   *
   * 关键点：**持锁进程还活着时，锁永远是有效的**，与持有多久无关
   * （解锁后整个会话都会持锁，几小时是正常状态）。
   * 只有下面两种情况才允许回收：
   * 1. 持有者进程已退出（pid 不再存在，或 pid 被系统复用给了别的进程）；
   * 2. 进程还在，但心跳已经停摆超过 60 秒（卡死 / 被调试器挂起）。
   */
  private async isLockStale(): Promise<boolean> {
    let content: LockFileContent;
    let heartbeatAt: number;
    try {
      content = JSON.parse(
        await fs.readFile(this.paths.lockFilePath, 'utf8'),
      ) as LockFileContent;
      heartbeatAt = (await fs.stat(this.paths.lockFilePath)).mtimeMs;
    } catch {
      return true;
    }

    if (typeof content.pid !== 'number' || !Number.isFinite(content.pid)) {
      return true;
    }

    if (!isProcessAlive(content.pid)) {
      return true;
    }

    return Date.now() - heartbeatAt > LOCK_STALE_AFTER_MS;
  }

  private startLockHeartbeat(): void {
    this.stopLockHeartbeat();
    const timer = setInterval(() => {
      void this.beatLock();
    }, LOCK_HEARTBEAT_INTERVAL_MS);
    // 心跳不能阻止进程退出
    timer.unref?.();
    this.lockHeartbeat = timer;
  }

  private stopLockHeartbeat(): void {
    if (!this.lockHeartbeat) return;
    clearInterval(this.lockHeartbeat);
    this.lockHeartbeat = null;
  }

  private async beatLock(): Promise<void> {
    if (!this.lockHandle) return;
    const now = new Date();
    try {
      await fs.utimes(this.paths.lockFilePath, now, now);
    } catch {
      // 心跳失败不致命：下一次会重试；最坏情况是别的进程误判为陈旧锁。
    }
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
