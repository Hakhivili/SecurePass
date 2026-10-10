import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { DEFAULT_SETTINGS } from '@shared/types';
import { CryptoService } from '@main/services/crypto.service';
import { createVaultPaths, type VaultPaths } from '@main/services/paths';
import { StorageService } from '@main/services/storage.service';
import { VaultService } from '@main/services/vault.service';

const MASTER_PASSWORD = 'correct horse battery staple';

let baseDir: string;
let paths: VaultPaths;
let vault: VaultService;

beforeEach(async () => {
  baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'securepass-vault-'));
  paths = createVaultPaths(baseDir);
  const storage = new StorageService(paths);
  const crypto = new CryptoService({
    iterations: 1,
    memorySizeKiB: 1024,
    parallelism: 1,
  });
  vault = new VaultService(storage, crypto, paths);
});

afterEach(async () => {
  await vault.shutdown();
  await fs.rm(baseDir, { recursive: true, force: true });
});

describe('VaultService', () => {
  it('creates, locks and unlocks a vault', async () => {
    await vault.create(MASTER_PASSWORD);
    await expect(vault.status()).resolves.toMatchObject({
      initialized: true,
      unlocked: true,
      itemCount: 0,
    });

    vault.lock();
    await expect(vault.list()).rejects.toMatchObject({ code: ErrorCode.VaultLocked });
    await expect(vault.unlock('wrong password value')).rejects.toMatchObject({
      code: ErrorCode.InvalidMasterPassword,
    });
    await vault.unlock(MASTER_PASSWORD);
    await expect(vault.list()).resolves.toEqual([]);
  });

  it('preserves external passwords exactly, including spaces and unicode', async () => {
    await vault.create(MASTER_PASSWORD);
    const password = '  Pa55 word 中文😀  ';
    const created = await vault.createItem({
      title: '外部账户',
      username: 'user@example.com',
      password,
      tags: ['工作'],
      isFavorite: false,
    });
    const loaded = await vault.get(created.id);
    expect(loaded?.password).toBe(password);
  });

  it('accepts passwords up to 1024 unicode characters without truncation', async () => {
    await vault.create(MASTER_PASSWORD);
    const password = '密'.repeat(1024);
    const created = await vault.createItem({
      title: '长密码',
      username: '',
      password,
      tags: [],
      isFavorite: false,
    });
    expect((await vault.get(created.id))?.password).toBe(password);
  });

  it('updates and deletes records', async () => {
    await vault.create(MASTER_PASSWORD);
    const created = await vault.createItem({
      title: '站点',
      username: 'a',
      password: 'secret-value',
      tags: [],
      isFavorite: false,
    });
    await vault.updateItem(created.id, {
      title: '站点（已改）',
      username: 'b',
      password: 'secret-value-2',
      tags: ['更新'],
      isFavorite: true,
    });
    expect((await vault.list())[0]).toMatchObject({
      title: '站点（已改）',
      isFavorite: true,
    });
    await vault.deleteItem(created.id);
    await expect(vault.list()).resolves.toEqual([]);
  });

  it('编辑记录时保留 lastUsed，除非显式传入新值', async () => {
    await vault.create(MASTER_PASSWORD);
    const created = await vault.createItem({
      title: '站点',
      username: 'a',
      password: 'secret-value',
      tags: [],
      isFavorite: false,
      lastUsed: 1_700_000_000_000,
    });
    expect(created.lastUsed).toBe(1_700_000_000_000);

    // 渲染层的编辑表单不会回传 lastUsed，编辑后必须保留原值
    const edited = await vault.updateItem(created.id, {
      title: '站点（已改）',
      username: 'a',
      password: 'secret-value',
      tags: [],
      isFavorite: false,
    });
    expect(edited.lastUsed).toBe(1_700_000_000_000);
    expect((await vault.get(created.id))?.lastUsed).toBe(1_700_000_000_000);

    // 显式传入新值时应覆盖
    const explicit = await vault.updateItem(created.id, {
      title: '站点（已改）',
      username: 'a',
      password: 'secret-value',
      tags: [],
      isFavorite: false,
      lastUsed: 1_800_000_000_000,
    });
    expect(explicit.lastUsed).toBe(1_800_000_000_000);
  });

  it('changes the master password without re-encrypting old backups', async () => {
    await vault.create(MASTER_PASSWORD);
    const backup = vault.getVaultFileSnapshot();
    const newPassword = 'a completely new master password';
    await vault.changeMasterPassword(MASTER_PASSWORD, newPassword);
    await expect(
      vault.changeMasterPassword(MASTER_PASSWORD, 'another password value'),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidMasterPassword });

    vault.lock();
    await expect(vault.unlock(MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.InvalidMasterPassword,
    });
    await vault.unlock(newPassword);

    const crypto = new CryptoService({
      iterations: 1,
      memorySizeKiB: 1024,
      parallelism: 1,
    });
    await expect(crypto.openVaultFile(backup, MASTER_PASSWORD)).resolves.toBeDefined();
  });

  it('restores a backup and keeps an encrypted copy of the previous vault', async () => {
    await vault.create(MASTER_PASSWORD);
    const snapshot = vault.getVaultFileSnapshot();
    await vault.createItem({
      title: '之后新增',
      username: '',
      password: 'later-secret',
      tags: [],
      isFavorite: false,
    });

    const previousBackupPath = await vault.replaceFromBackupFile(
      snapshot,
      MASTER_PASSWORD,
    );
    await expect(vault.list()).resolves.toEqual([]);
    expect(previousBackupPath).toBeTruthy();
    await expect(fs.access(previousBackupPath as string)).resolves.toBeUndefined();
  });

  it('emits a lock event and rejects invalid settings', async () => {
    await vault.create(MASTER_PASSWORD);
    const listener = vi.fn();
    vault.onLocked(listener);
    vault.lock();
    expect(listener).toHaveBeenCalledTimes(1);

    await vault.unlock(MASTER_PASSWORD);
    await expect(
      vault.updateSettings({ autoLockTimeoutMinutes: 0 }),
    ).rejects.toMatchObject({
      code: ErrorCode.InvalidInput,
    });
    await expect(
      vault.updateSettings({ clearClipboardSeconds: 30 }),
    ).resolves.toMatchObject({
      ...DEFAULT_SETTINGS,
    });
  });
});
