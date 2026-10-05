export const APP_NAME = 'SecurePass';
export const APP_ID = 'com.securepass.desktop';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
export const VAULT_PASSWORD_MIN_LENGTH = 15;
export const VAULT_PASSWORD_MAX_LENGTH = 1024;

export const MIN_AUTO_LOCK_MINUTES = 1;
export const MAX_AUTO_LOCK_MINUTES = 120;
export const MIN_CLIPBOARD_SECONDS = 5;
export const MAX_CLIPBOARD_SECONDS = 300;

export const VAULT_FILE_NAME = 'vault.securepass';
export const VAULT_BACKUP_SUFFIX = '.bak';
export const VAULT_LOCK_FILE_NAME = 'vault.lock';
export const MAX_SEARCH_RESULTS = 1000;

export const ARGON2ID_DEFAULTS = {
  iterations: 3,
  memorySizeKiB: 64 * 1024,
  parallelism: 4,
  hashLength: 32,
} as const;
