import { describe, expect, it } from 'vitest';
import { ErrorCode } from '@shared/errors';
import { DEFAULT_SETTINGS } from '@shared/types';
import type { VaultPayload } from '@shared/types';
import { CryptoService } from '@main/services/crypto.service';

const MASTER_PASSWORD = 'correct horse battery staple';
const crypto = new CryptoService({ iterations: 1, memorySizeKiB: 1024, parallelism: 1 });
const payload: VaultPayload = {
  schemaVersion: 1,
  items: [],
  settings: { ...DEFAULT_SETTINGS },
};

describe('CryptoService', () => {
  it('round-trips an encrypted vault payload', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    const opened = await crypto.openVaultFile(vaultFile, MASTER_PASSWORD);
    expect(opened.payload).toEqual(payload);
    expect(opened.dataKey).toHaveLength(32);
  });

  it('is not decryptable with the wrong master password', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    await expect(
      crypto.openVaultFile(vaultFile, 'wrong master password value'),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidMasterPassword });
  });

  it('detects ciphertext tampering', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    const original = vaultFile.payload.ciphertext;
    const tampered = `${original.slice(0, -4)}AAAA`;
    await expect(
      crypto.openVaultFile(
        { ...vaultFile, payload: { ...vaultFile.payload, ciphertext: tampered } },
        MASTER_PASSWORD,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.InvalidMasterPassword });
  });

  it('verifies a master password without exposing the data key', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    await expect(crypto.verifyMasterPassword(vaultFile, MASTER_PASSWORD)).resolves.toBe(
      true,
    );
    await expect(
      crypto.verifyMasterPassword(vaultFile, 'not the password'),
    ).resolves.toBe(false);
  });

  it('treats a wrong-length IV as file corruption instead of a bad password', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    await expect(
      crypto.openVaultFile(
        { ...vaultFile, payload: { ...vaultFile.payload, iv: 'AAAA' } },
        MASTER_PASSWORD,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.CorruptedVault });
  });

  it('treats a wrong-length auth tag as file corruption', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    const truncated = Buffer.from(vaultFile.wrappedDataKey.authTag, 'base64')
      .subarray(0, 8)
      .toString('base64');
    await expect(
      crypto.openVaultFile(
        {
          ...vaultFile,
          wrappedDataKey: { ...vaultFile.wrappedDataKey, authTag: truncated },
        },
        MASTER_PASSWORD,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.CorruptedVault });
  });
});

describe('密钥派生参数校验', () => {
  async function withKdf(overrides: Record<string, unknown>) {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    return {
      ...vaultFile,
      kdf: { ...vaultFile.kdf, ...overrides } as unknown as typeof vaultFile.kdf,
    };
  }

  it('rejects an out-of-range memory size', async () => {
    const file = await withKdf({ memorySizeKiB: 4 * 1024 * 1024 });
    await expect(crypto.openVaultFile(file, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.UnsupportedFormat,
    });
  });

  it('rejects an out-of-range iteration count', async () => {
    const file = await withKdf({ iterations: 10_000 });
    await expect(crypto.openVaultFile(file, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.UnsupportedFormat,
    });
  });

  it('rejects a non-numeric or non-integer parameter', async () => {
    const file = await withKdf({ parallelism: 1.5 });
    await expect(crypto.openVaultFile(file, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.UnsupportedFormat,
    });
  });

  it('rejects a salt that is too short', async () => {
    const file = await withKdf({ salt: Buffer.alloc(4, 7).toString('base64') });
    await expect(crypto.openVaultFile(file, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.UnsupportedFormat,
    });
  });

  it('fails fast without paying the Argon2 cost', async () => {
    // 4 GiB 内存参数若真的进入 Argon2 会立刻失败或长时间卡住，这里要求先被范围校验挡住
    const file = await withKdf({ memorySizeKiB: 4 * 1024 * 1024, iterations: 10 });
    const startedAt = Date.now();
    await expect(crypto.openVaultFile(file, MASTER_PASSWORD)).rejects.toMatchObject({
      code: ErrorCode.UnsupportedFormat,
    });
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it('still accepts the parameters it wrote itself', async () => {
    const vaultFile = await crypto.createVaultFile(payload, MASTER_PASSWORD);
    await expect(crypto.openVaultFile(vaultFile, MASTER_PASSWORD)).resolves.toBeTruthy();
  });
});
