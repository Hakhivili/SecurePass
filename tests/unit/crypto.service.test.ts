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
});
