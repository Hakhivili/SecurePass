import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { argon2id } from 'hash-wasm';
import { ARGON2ID_DEFAULTS } from '@shared/constants';
import { AppError, ErrorCode } from '@shared/errors';
import { VAULT_FORMAT_VERSION, VAULT_MAGIC } from '@shared/types';
import type { Argon2idParams, EncryptedBlob, VaultFile, VaultPayload } from '@shared/types';

const DATA_KEY_AAD = 'securepass:v1:data-key';
const PAYLOAD_AAD = 'securepass:v1:payload';
const GCM_IV_BYTES = 12;
const DATA_KEY_BYTES = 32;
const GCM_TAG_BYTES = 16;

export interface OpenedVault {
  vaultFile: VaultFile;
  payload: VaultPayload;
  dataKey: Buffer;
}

export class CryptoService {
  constructor(readonly kdfOverrides: Partial<Omit<Argon2idParams, 'algorithm' | 'salt'>> = {}) {}

  async createKdfParams(): Promise<Argon2idParams> {
    return {
      algorithm: 'argon2id',
      salt: randomBytes(16).toString('base64'),
      ...ARGON2ID_DEFAULTS,
      ...this.kdfOverrides,
    };
  }

  async deriveKey(masterPassword: string, params: Argon2idParams): Promise<Buffer> {
    try {
      const result = await argon2id({
        password: masterPassword,
        salt: Buffer.from(params.salt, 'base64'),
        iterations: params.iterations,
        memorySize: params.memorySizeKiB,
        parallelism: params.parallelism,
        hashLength: params.hashLength,
        outputType: 'binary',
      });
      return Buffer.from(result as unknown as Uint8Array);
    } catch (error) {
      throw new AppError(ErrorCode.CryptoFailure, '主密码密钥派生失败', error);
    }
  }

  generateDataKey(): Buffer {
    return randomBytes(DATA_KEY_BYTES);
  }

  encryptBlob(plaintext: Buffer, key: Buffer, aad: string): EncryptedBlob {
    if (key.length !== DATA_KEY_BYTES) {
      throw new AppError(ErrorCode.CryptoFailure, '加密密钥长度无效');
    }

    try {
      const iv = randomBytes(GCM_IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: GCM_TAG_BYTES });
      cipher.setAAD(Buffer.from(aad, 'utf8'));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return {
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
      };
    } catch (error) {
      throw new AppError(ErrorCode.CryptoFailure, '数据加密失败', error);
    }
  }

  decryptBlob(blob: EncryptedBlob, key: Buffer, aad: string): Buffer {
    if (blob.algorithm !== 'aes-256-gcm' || key.length !== DATA_KEY_BYTES) {
      throw new AppError(ErrorCode.CorruptedVault, '加密数据格式无效');
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(blob.iv, 'base64'),
        { authTagLength: GCM_TAG_BYTES },
      );
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(Buffer.from(blob.authTag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(blob.ciphertext, 'base64')),
        decipher.final(),
      ]);
    } catch (error) {
      throw new AppError(ErrorCode.InvalidMasterPassword, '密码错误或密码库文件已损坏', error);
    }
  }

  async createVaultFile(payload: VaultPayload, masterPassword: string): Promise<VaultFile> {
    const kdf = await this.createKdfParams();
    const kek = await this.deriveKey(masterPassword, kdf);
    const dataKey = this.generateDataKey();

    try {
      const wrappedDataKey = this.encryptBlob(dataKey, kek, DATA_KEY_AAD);
      const payloadBlob = this.encryptBlob(
        Buffer.from(JSON.stringify(payload), 'utf8'),
        dataKey,
        PAYLOAD_AAD,
      );
      const now = Date.now();
      return {
        magic: VAULT_MAGIC,
        formatVersion: VAULT_FORMAT_VERSION,
        vaultId: randomUUID(),
        kdf,
        wrappedDataKey,
        payload: payloadBlob,
        createdAt: now,
        updatedAt: now,
      };
    } finally {
      kek.fill(0);
      dataKey.fill(0);
    }
  }

  async openVaultFile(vaultFile: VaultFile, masterPassword: string): Promise<OpenedVault> {
    const kek = await this.deriveKey(masterPassword, vaultFile.kdf);
    let dataKey: Buffer;
    try {
      dataKey = this.decryptBlob(vaultFile.wrappedDataKey, kek, DATA_KEY_AAD);
    } finally {
      kek.fill(0);
    }

    try {
      const plaintext = this.decryptBlob(vaultFile.payload, dataKey, PAYLOAD_AAD);
      const payload = parseVaultPayload(plaintext.toString('utf8'));
      return { vaultFile, payload, dataKey };
    } catch (error) {
      dataKey.fill(0);
      throw error;
    }
  }

  async rewrapDataKey(
    dataKey: Buffer,
    newMasterPassword: string,
  ): Promise<{ kdf: Argon2idParams; wrappedDataKey: EncryptedBlob }> {
    const kdf = await this.createKdfParams();
    const kek = await this.deriveKey(newMasterPassword, kdf);
    try {
      return { kdf, wrappedDataKey: this.encryptBlob(dataKey, kek, DATA_KEY_AAD) };
    } finally {
      kek.fill(0);
    }
  }

  async verifyMasterPassword(vaultFile: VaultFile, masterPassword: string): Promise<boolean> {
    let dataKey: Buffer;
    try {
      const kek = await this.deriveKey(masterPassword, vaultFile.kdf);
      try {
        dataKey = this.decryptBlob(vaultFile.wrappedDataKey, kek, DATA_KEY_AAD);
      } finally {
        kek.fill(0);
      }
    } catch {
      return false;
    }
    dataKey.fill(0);
    return true;
  }

  encryptPayload(payload: VaultPayload, dataKey: Buffer): EncryptedBlob {
    return this.encryptBlob(
      Buffer.from(JSON.stringify(payload), 'utf8'),
      dataKey,
      PAYLOAD_AAD,
    );
  }
}

export function parseVaultFile(raw: string | unknown): VaultFile {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new AppError(ErrorCode.CorruptedVault, '密码库文件不是有效的 JSON', error);
    }
  }

  if (!isRecord(value)) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库文件结构无效');
  }
  if (value.magic !== VAULT_MAGIC) {
    throw new AppError(ErrorCode.UnsupportedFormat, '不是 SecurePass 密码库文件');
  }
  if (value.formatVersion !== VAULT_FORMAT_VERSION) {
    throw new AppError(ErrorCode.UnsupportedFormat, '密码库文件版本不受支持');
  }
  if (
    typeof value.vaultId !== 'string' ||
    !isKdfParams(value.kdf) ||
    !isEncryptedBlob(value.wrappedDataKey) ||
    !isEncryptedBlob(value.payload) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库文件必要字段缺失或类型错误');
  }

  return value as unknown as VaultFile;
}

export function parseVaultPayload(raw: string): VaultPayload {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库内容解密后不是有效 JSON', error);
  }

  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库内容结构无效');
  }

  return value as unknown as VaultPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isKdfParams(value: unknown): value is Argon2idParams {
  if (!isRecord(value)) return false;
  return (
    value.algorithm === 'argon2id' &&
    typeof value.salt === 'string' &&
    typeof value.iterations === 'number' &&
    typeof value.memorySizeKiB === 'number' &&
    typeof value.parallelism === 'number' &&
    typeof value.hashLength === 'number'
  );
}

function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  if (!isRecord(value)) return false;
  return (
    value.algorithm === 'aes-256-gcm' &&
    typeof value.iv === 'string' &&
    typeof value.ciphertext === 'string' &&
    typeof value.authTag === 'string'
  );
}

export function constantTimeEqual(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
