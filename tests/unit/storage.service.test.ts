import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { createVaultPaths, type VaultPaths } from '@main/services/paths';
import { StorageService } from '@main/services/storage.service';

let baseDir: string;
let paths: VaultPaths;

beforeEach(async () => {
  baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'securepass-storage-'));
  paths = createVaultPaths(baseDir);
});

afterEach(async () => {
  await fs.rm(baseDir, { recursive: true, force: true });
});

describe('StorageService', () => {
  it('writes and reads a JSON document atomically', async () => {
    const storage = new StorageService(paths);
    await storage.writeJsonFileAtomic(paths.vaultFilePath, { hello: 'world' });
    const raw = await fs.readFile(paths.vaultFilePath, 'utf8');
    expect(JSON.parse(raw)).toEqual({ hello: 'world' });
  });

  it('prevents two processes from holding the same vault lock', async () => {
    const first = new StorageService(paths);
    const second = new StorageService(paths);
    await first.acquireLock();
    await expect(second.acquireLock()).rejects.toMatchObject({
      code: ErrorCode.VaultBusy,
    });
    await first.releaseLock();
    await expect(second.acquireLock()).resolves.toBeUndefined();
    await second.releaseLock();
  });

  it('keeps the lock while the owning process is alive, however long it runs', async () => {
    await fs.mkdir(paths.baseDir, { recursive: true });
    // 会话已经持锁一小时（createdAt 很旧），但心跳一直在更新 mtime：
    // 旧实现只看 createdAt，这里会被误判为「陈旧」而抢锁。
    await fs.writeFile(
      paths.lockFilePath,
      JSON.stringify({ pid: process.pid, createdAt: Date.now() - 3_600_000 }),
      'utf8',
    );

    await expect(new StorageService(paths).acquireLock()).rejects.toMatchObject({
      code: ErrorCode.VaultBusy,
    });
  });

  it('reclaims the lock once the owning process is gone', async () => {
    await fs.mkdir(paths.baseDir, { recursive: true });
    await fs.writeFile(
      paths.lockFilePath,
      JSON.stringify({ pid: 4_194_303, createdAt: Date.now() }),
      'utf8',
    );

    const storage = new StorageService(paths);
    await expect(storage.acquireLock()).resolves.toBeUndefined();
    await storage.releaseLock();
  });

  it('reclaims a lock whose heartbeat stopped even if the pid is still alive', async () => {
    await fs.mkdir(paths.baseDir, { recursive: true });
    // pid 被系统复用 / 进程被挂起：心跳两分钟没更新
    await fs.writeFile(
      paths.lockFilePath,
      JSON.stringify({ pid: process.pid, createdAt: Date.now() - 120_000 }),
      'utf8',
    );
    const stale = new Date(Date.now() - 120_000);
    await fs.utimes(paths.lockFilePath, stale, stale);

    const storage = new StorageService(paths);
    await expect(storage.acquireLock()).resolves.toBeUndefined();
    await storage.releaseLock();
  });
});
