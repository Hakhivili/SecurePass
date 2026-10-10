import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CryptoService } from '@main/services/crypto.service';
import { createVaultPaths, type VaultPaths } from '@main/services/paths';
import { StorageService } from '@main/services/storage.service';
import { VaultService } from '@main/services/vault.service';

export const MASTER_PASSWORD = 'correct horse battery staple';

/**
 * 测试专用的低成本 KDF 参数：Argon2id 默认值（3 轮 / 64 MiB）在单元测试里太慢，
 * 加解密逻辑完全一致，只是派生成本降低。生产代码仍使用 `ARGON2ID_DEFAULTS`。
 */
export function createTestCrypto(): CryptoService {
  return new CryptoService({ iterations: 1, memorySizeKiB: 1024, parallelism: 1 });
}

export interface VaultFixture {
  baseDir: string;
  paths: VaultPaths;
  storage: StorageService;
  crypto: CryptoService;
  vault: VaultService;
  dispose: () => Promise<void>;
}

export async function createVaultFixture(
  prefix = 'securepass-test-',
): Promise<VaultFixture> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const paths = createVaultPaths(baseDir);
  const storage = new StorageService(paths);
  const crypto = createTestCrypto();
  const vault = new VaultService(storage, crypto, paths);

  return {
    baseDir,
    paths,
    storage,
    crypto,
    vault,
    dispose: async () => {
      await vault.shutdown().catch(() => undefined);
      await fs.rm(baseDir, { recursive: true, force: true });
    },
  };
}

export async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/** 递归读取目录下所有普通文件的文本内容，用于「落盘扫描」。 */
export async function readAllFileTexts(
  dir: string,
): Promise<Array<{ path: string; text: string }>> {
  const results: Array<{ path: string; text: string }> = [];

  const walk = async (current: string): Promise<void> => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        results.push({ path: full, text: await fs.readFile(full, 'utf8') });
      }
    }
  };

  await walk(dir);
  return results;
}
