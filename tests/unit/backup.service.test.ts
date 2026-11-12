import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { BackupService, MAX_BACKUP_BYTES } from '@main/services/backup.service';
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

let dir: string;

beforeEach(async () => {
  dir = await createTempDir('securepass-backup-');
  dialogStub.openPaths = [];
  dialogStub.savePath = null;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await removeDir(dir);
});

async function createService() {
  const fixture = await createVaultFixture();
  const service = new BackupService(fixture.vault, fixture.storage);
  return { fixture, service };
}

describe('BackupService.restoreBackup 资源限制', () => {
  it('拒绝空文件', async () => {
    const { fixture, service } = await createService();
    const emptyPath = path.join(dir, 'empty.securepass');
    await fs.writeFile(emptyPath, '');
    dialogStub.openPaths = [emptyPath];

    await expect(service.restoreBackup(null, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.RestoreFailed,
      message: expect.stringContaining('备份文件为空'),
    });
    await fixture.dispose();
  });

  it('拒绝超过上限的文件，且不做解析', async () => {
    const { fixture, service } = await createService();
    const hugePath = path.join(dir, 'huge.securepass');
    await fs.writeFile(hugePath, '{}');
    // 稀疏文件：占位大小但几乎不占磁盘
    await fs.truncate(hugePath, MAX_BACKUP_BYTES + 1);
    dialogStub.openPaths = [hugePath];

    await expect(service.restoreBackup(null, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.RestoreFailed,
      message: expect.stringContaining('已拒绝读取'),
    });
    await fixture.dispose();
  });

  it('拒绝目录与不可读路径', async () => {
    const { fixture, service } = await createService();
    dialogStub.openPaths = [dir];
    await expect(service.restoreBackup(null, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.RestoreFailed,
      message: expect.stringContaining('请选择一个备份文件'),
    });

    dialogStub.openPaths = [path.join(dir, 'missing.securepass')];
    await expect(service.restoreBackup(null, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.RestoreFailed,
      message: expect.stringContaining('无法读取备份文件'),
    });
    await fixture.dispose();
  });

  it('上限之内的正常备份仍可恢复', async () => {
    const { fixture, service } = await createService();
    await fixture.vault.create(MASTER_PASSWORD);
    await fixture.vault.createItem({
      title: '备份来源',
      username: 'alice@example.com',
      password: 'S3cret-Pa55word!',
      url: '',
      notes: '',
      category: '',
      tags: [],
      isFavorite: false,
    });

    const exportPath = path.join(dir, 'backup.securepass');
    dialogStub.savePath = exportPath;
    const exported = await service.exportBackup(null);
    expect(exported.canceled).toBe(false);
    expect((await fs.stat(exportPath)).size).toBeLessThan(MAX_BACKUP_BYTES);

    dialogStub.openPaths = [exportPath];
    const restored = await service.restoreBackup(null, MASTER_PASSWORD);
    expect(restored.restored).toBe(true);
    expect(await fixture.vault.list()).toHaveLength(1);
    await fixture.dispose();
  });
});
