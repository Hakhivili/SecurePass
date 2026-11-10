export const ErrorCode = {
  InvalidInput: 'INVALID_INPUT',
  VaultNotFound: 'VAULT_NOT_FOUND',
  VaultAlreadyExists: 'VAULT_ALREADY_EXISTS',
  VaultLocked: 'VAULT_LOCKED',
  VaultAlreadyUnlocked: 'VAULT_ALREADY_UNLOCKED',
  InvalidMasterPassword: 'INVALID_MASTER_PASSWORD',
  WeakMasterPassword: 'WEAK_MASTER_PASSWORD',
  CorruptedVault: 'CORRUPTED_VAULT',
  UnsupportedFormat: 'UNSUPPORTED_FORMAT',
  VaultBusy: 'VAULT_BUSY',
  ItemNotFound: 'ITEM_NOT_FOUND',
  BackupFailed: 'BACKUP_FAILED',
  RestoreFailed: 'RESTORE_FAILED',
  CryptoFailure: 'CRYPTO_FAILURE',
  StorageFailure: 'STORAGE_FAILURE',
  UntrustedSender: 'UNTRUSTED_SENDER',
  Internal: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly cause?: unknown;

  constructor(code: ErrorCodeValue, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
