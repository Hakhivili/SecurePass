import { promises as fs } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { parseVaultFile } from '@main/services/crypto.service';
import {
  MASTER_PASSWORD,
  createVaultFixture,
  type VaultFixture,
} from '../helpers/vault-fixture';

/**
 * 验收标准第 10 项：中断处理 —— 保存途中模拟中断后，至少保留一个完整可用版本。
 */
let fixture: VaultFixture | null = null;

afterEach(async () => {
  vi.restoreAllMocks();
  if (fixture) {
    await fixture.dispose();
    fixture = null;
  }
});

function draft(title: string) {
  return {
    title,
    username: 'user',
    password: `secret-${title}`,
    tags: [],
    isFavorite: false,
  };
}

describe('原子写入与中断恢复', () => {
  it('重命名失败时保留旧版本、清理临时文件，且旧版本仍可解锁', async () => {
    fixture = await createVaultFixture('securepass-interrupt-');
    const { vault, paths, baseDir } = fixture;

    await vault.create(MASTER_PASSWORD);
    await vault.createItem(draft('第一条'));
    const before = await fs.readFile(paths.vaultFilePath, 'utf8');

    // 模拟「写入过程中被中断」：临时文件已写好，但重命名替换正式文件失败
    const renameSpy = vi
      .spyOn(fs, 'rename')
      .mockRejectedValueOnce(new Error('simulated interruption'));
    await expect(vault.createItem(draft('第二条'))).rejects.toMatchObject({
      code: ErrorCode.StorageFailure,
    });
    renameSpy.mockRestore();

    // 正式文件保持旧版本，内容逐字节一致
    const after = await fs.readFile(paths.vaultFilePath, 'utf8');
    expect(after).toBe(before);

    // 中断不留下 .tmp 半成品
    const leftovers = (await fs.readdir(baseDir)).filter((name) => name.endsWith('.tmp'));
    expect(leftovers).toEqual([]);

    // 旧版本仍然可用（内存与磁盘一致）
    vault.lock();
    await vault.unlock(MASTER_PASSWORD);
    const summaries = await vault.list();
    expect(summaries.map((item) => item.title)).toEqual(['第一条']);
  });

  it('.bak 保留上一完整版本，并且可以用同一主密码打开', async () => {
    fixture = await createVaultFixture('securepass-interrupt-bak-');
    const { vault, paths, crypto } = fixture;

    await vault.create(MASTER_PASSWORD);
    await vault.createItem(draft('第一条'));
    await vault.createItem(draft('第二条'));

    const backupRaw = await fs.readFile(paths.vaultBackupPath, 'utf8');
    const opened = await crypto.openVaultFile(parseVaultFile(backupRaw), MASTER_PASSWORD);
    // .bak 是「上一版本」：只包含第一条
    expect(opened.payload.items.map((item) => item.title)).toEqual(['第一条']);
    opened.dataKey.fill(0);
  });

  it('写入前的备份失败会直接拒绝写入，不破坏正式文件', async () => {
    fixture = await createVaultFixture('securepass-interrupt-copy-');
    const { vault, paths } = fixture;

    await vault.create(MASTER_PASSWORD);
    await vault.createItem(draft('第一条'));
    const before = await fs.readFile(paths.vaultFilePath, 'utf8');

    const copySpy = vi
      .spyOn(fs, 'copyFile')
      .mockRejectedValueOnce(new Error('simulated backup failure'));
    await expect(vault.createItem(draft('第二条'))).rejects.toMatchObject({
      code: ErrorCode.StorageFailure,
    });
    copySpy.mockRestore();

    expect(await fs.readFile(paths.vaultFilePath, 'utf8')).toBe(before);
  });
});
