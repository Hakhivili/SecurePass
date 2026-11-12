import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@shared/errors';
import type { VaultItemDraft } from '@shared/types';
import { BackupService } from '@main/services/backup.service';
import {
  createTempDir,
  createVaultFixture,
  MASTER_PASSWORD,
  removeDir,
} from '../helpers/vault-fixture';

const dialogStub = vi.hoisted(() => ({
  openPaths: [] as string[],
  savePath: null as string | null,
}));

vi.mock('electron', () => ({
  app: { getPath: () => 'C:\\Users\\test\\Documents' },
  dialog: {
    showOpenDialog: vi.fn(async () => ({
      canceled: dialogStub.openPaths.length === 0,
      filePaths: dialogStub.openPaths,
    })),
    showSaveDialog: vi.fn(async () => ({
      canceled: dialogStub.savePath === null,
      filePath: dialogStub.savePath,
    })),
  },
}));

const draft: VaultItemDraft = {
  title: '原始记录',
  username: 'alice@example.com',
  password: 'S3cret-Pa55word!',
  url: '',
  notes: '',
  category: '',
  tags: [],
  isFavorite: false,
};

let dir: string;

beforeEach(async () => {
  dir = await createTempDir('securepass-restore-interrupt-');
  dialogStub.openPaths = [];
  dialogStub.savePath = null;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await removeDir(dir);
});

describe('恢复中断时旧库保持完好', () => {
  it('写入新库失败时不破坏旧库', async () => {
    const fixture = await createVaultFixture();
    const service = new BackupService(fixture.vault, fixture.storage);
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      await fixture.vault.createItem(draft);

      const exportPath = path.join(dir, 'backup.securepass');
      dialogStub.savePath = exportPath;
      await service.exportBackup(null);

      // 恢复前旧库再写入一条，确保内容与备份不同
      await fixture.vault.createItem({ ...draft, title: '恢复前新增' });
      const before = await fs.readFile(fixture.paths.vaultFilePath, 'utf8');
      fixture.vault.lock();

      const renameSpy = vi
        .spyOn(fs, 'rename')
        .mockRejectedValueOnce(
          Object.assign(new Error('EACCES: rename failed'), { code: 'EACCES' }),
        );
      dialogStub.openPaths = [exportPath];

      await expect(service.restoreBackup(null, MASTER_PASSWORD)).rejects.toMatchObject({
        code: ErrorCode.StorageFailure,
      });
      expect(renameSpy).toHaveBeenCalled();

      const after = await fs.readFile(fixture.paths.vaultFilePath, 'utf8');
      expect(after).toBe(before);

      const leftovers = (await fs.readdir(fixture.baseDir)).filter((name) =>
        name.endsWith('.tmp'),
      );
      expect(leftovers).toEqual([]);

      // 旧库仍用原密码可解锁，且保留恢复前的内容
      await fixture.vault.unlock(MASTER_PASSWORD);
      const titles = (await fixture.vault.list()).map((item) => item.title);
      expect(titles).toContain('恢复前新增');
      expect(titles).toContain('原始记录');
    } finally {
      await fixture.dispose();
    }
  });

  it('恢复成功后保留旧库副本，可回退', async () => {
    const fixture = await createVaultFixture();
    const service = new BackupService(fixture.vault, fixture.storage);
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      await fixture.vault.createItem(draft);

      const exportPath = path.join(dir, 'backup.securepass');
      dialogStub.savePath = exportPath;
      await service.exportBackup(null);

      await fixture.vault.createItem({ ...draft, title: '恢复前新增' });
      dialogStub.openPaths = [exportPath];

      const result = await service.restoreBackup(null, MASTER_PASSWORD);
      expect(result.restored).toBe(true);
      expect(result.backupOfPreviousPath).toBeTruthy();
      const previous = await fs.readFile(result.backupOfPreviousPath as string, 'utf8');
      expect(JSON.parse(previous)).toMatchObject({ magic: 'SECUREPASS' });

      const titles = (await fixture.vault.list()).map((item) => item.title);
      expect(titles).toEqual(['原始记录']);
    } finally {
      await fixture.dispose();
    }
  });
});
