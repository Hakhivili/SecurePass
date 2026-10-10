import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { parseVaultFile } from '@main/services/crypto.service';
import {
  MASTER_PASSWORD,
  createTempDir,
  createVaultFixture,
  removeDir,
  type VaultFixture,
} from '../helpers/vault-fixture';

/**
 * 验收标准第 9 项：备份与恢复 —— 在全新环境中可恢复；错误文件不破坏当前密码库。
 * 流程与 BackupService 保持一致：快照 → JSON 文件 → 解析 → 替换恢复。
 */
const EXTERNAL_PASSWORD = '  Pa55 word 中文😀  ';

const disposers: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (disposers.length > 0) {
    const dispose = disposers.pop();
    if (dispose) await dispose();
  }
});

async function track<T extends VaultFixture>(fixture: T): Promise<T> {
  disposers.push(fixture.dispose);
  return fixture;
}

async function makeBackupFile(source: VaultFixture): Promise<string> {
  const dir = await createTempDir('securepass-backup-');
  disposers.push(() => removeDir(dir));
  const backupPath = path.join(dir, 'SecurePass-backup-test.securepass');
  await fs.writeFile(
    backupPath,
    JSON.stringify(source.vault.getVaultFileSnapshot(), null, 2),
    'utf8',
  );
  return backupPath;
}

describe('加密备份与恢复', () => {
  it('可在全新环境中恢复全部记录，且恢复后重新加密', async () => {
    const source = await track(await createVaultFixture('securepass-restore-src-'));
    await source.vault.create(MASTER_PASSWORD);
    await source.vault.createItem({
      title: '工作邮箱',
      username: 'alice@example.com',
      password: EXTERNAL_PASSWORD,
      url: 'https://mail.example.com',
      category: '工作',
      notes: '两行备注\n第二行',
      tags: ['重要'],
      isFavorite: true,
    });
    await source.vault.createItem({
      title: '论坛',
      username: 'bob',
      password: 'plain-secret',
      tags: [],
      isFavorite: false,
    });
    const sourceVaultId = source.vault.getVaultFileSnapshot().vaultId;
    const backupPath = await makeBackupFile(source);

    const target = await track(await createVaultFixture('securepass-restore-new-'));
    expect(await target.vault.exists()).toBe(false);

    const backupFile = parseVaultFile(await fs.readFile(backupPath, 'utf8'));
    const previous = await target.vault.replaceFromBackupFile(
      backupFile,
      MASTER_PASSWORD,
    );

    // 全新环境没有旧库，因此不会产生 pre-restore 副本
    expect(previous).toBeUndefined();
    expect(await target.vault.exists()).toBe(true);

    const summaries = await target.vault.list();
    expect(summaries.map((item) => item.title).sort()).toEqual(['工作邮箱', '论坛']);
    const restored = await target.vault.get(
      (summaries.find((item) => item.title === '工作邮箱') as { id: string }).id,
    );
    expect(restored?.password).toBe(EXTERNAL_PASSWORD);
    expect(restored).toMatchObject({
      username: 'alice@example.com',
      url: 'https://mail.example.com',
      category: '工作',
      notes: '两行备注\n第二行',
      tags: ['重要'],
      isFavorite: true,
    });

    // 恢复后的库是完全独立的新密文：新的 vaultId、新的盐
    const restoredFile = parseVaultFile(
      await fs.readFile(target.paths.vaultFilePath, 'utf8'),
    );
    expect(restoredFile.vaultId).not.toBe(sourceVaultId);
    expect(restoredFile.kdf.salt).not.toBe(backupFile.kdf.salt);

    // 恢复后的库可以独立锁定 / 解锁
    target.vault.lock();
    await expect(target.vault.list()).rejects.toMatchObject({
      code: ErrorCode.VaultLocked,
    });
    await target.vault.unlock(MASTER_PASSWORD);
    expect(await target.vault.list()).toHaveLength(2);
  });

  it('备份密码错误时拒绝恢复，且不创建任何密码库文件', async () => {
    const source = await track(await createVaultFixture('securepass-restore-wrong-'));
    await source.vault.create(MASTER_PASSWORD);
    await source.vault.createItem({
      title: '记录',
      username: 'user',
      password: 'secret',
      tags: [],
      isFavorite: false,
    });
    const backupPath = await makeBackupFile(source);
    const backupFile = parseVaultFile(await fs.readFile(backupPath, 'utf8'));

    const target = await track(
      await createVaultFixture('securepass-restore-wrong-target-'),
    );
    await expect(
      target.vault.replaceFromBackupFile(backupFile, 'definitely not the password'),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidMasterPassword });

    expect(await target.vault.exists()).toBe(false);
    const entries = await fs.readdir(target.baseDir);
    expect(entries.filter((name) => name.startsWith('vault.securepass'))).toEqual([]);
  });

  it('文件损坏或版本不兼容时拒绝恢复，当前密码库保持可用', async () => {
    const current = await track(await createVaultFixture('securepass-restore-current-'));
    await current.vault.create(MASTER_PASSWORD);
    await current.vault.createItem({
      title: '当前记录',
      username: 'me',
      password: 'current-secret',
      tags: [],
      isFavorite: false,
    });
    const before = await fs.readFile(current.paths.vaultFilePath, 'utf8');

    // 版本不兼容：在读取阶段（parseVaultFile）就会被拒绝，不会进入恢复流程
    expect(() =>
      parseVaultFile(
        JSON.stringify({ ...current.vault.getVaultFileSnapshot(), formatVersion: 99 }),
      ),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.UnsupportedFormat }));

    // 密文被篡改：认证失败，恢复被拒绝
    const tampered = current.vault.getVaultFileSnapshot();
    tampered.payload.ciphertext = `${tampered.payload.ciphertext.slice(0, -4)}AAAA`;
    await expect(
      current.vault.replaceFromBackupFile(tampered, MASTER_PASSWORD),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidMasterPassword });

    // 当前库文件未被修改，仍可正常解锁
    expect(await fs.readFile(current.paths.vaultFilePath, 'utf8')).toBe(before);
    current.vault.lock();
    await current.vault.unlock(MASTER_PASSWORD);
    const summaries = await current.vault.list();
    expect(summaries.map((item) => item.title)).toEqual(['当前记录']);
  });
});
