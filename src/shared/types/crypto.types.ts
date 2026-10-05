export const VAULT_FORMAT_VERSION = 1;
export const VAULT_MAGIC = 'SECUREPASS';

export interface Argon2idParams {
  algorithm: 'argon2id';
  salt: string;
  iterations: number;
  memorySizeKiB: number;
  parallelism: number;
  hashLength: number;
}

export interface EncryptedBlob {
  algorithm: 'aes-256-gcm';
  iv: string;
  ciphertext: string;
  authTag: string;
}

export interface VaultFile {
  magic: typeof VAULT_MAGIC;
  formatVersion: typeof VAULT_FORMAT_VERSION;
  vaultId: string;
  kdf: Argon2idParams;
  wrappedDataKey: EncryptedBlob;
  payload: EncryptedBlob;
  createdAt: number;
  updatedAt: number;
}
