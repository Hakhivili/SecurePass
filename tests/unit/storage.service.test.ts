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
    await expect(second.acquireLock()).rejects.toMatchObject({ code: ErrorCode.VaultBusy });
    await first.releaseLock();
    await expect(second.acquireLock()).resolves.toBeUndefined();
    await second.releaseLock();
  });
});
