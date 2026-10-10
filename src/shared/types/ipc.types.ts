import type {
  GeneratedPassword,
  PasswordConfig,
  PasswordStrengthResult,
} from './password.types';
import type { AppSettings } from './settings.types';
import type { VaultItem, VaultItemDraft, VaultSummary } from './vault.types';

export const IPC = {
  vaultExists: 'vault:exists',
  vaultStatus: 'vault:status',
  vaultCreate: 'vault:create',
  vaultUnlock: 'vault:unlock',
  vaultLock: 'vault:lock',
  vaultList: 'vault:list',
  vaultGet: 'vault:get',
  vaultCreateItem: 'vault:create-item',
  vaultUpdateItem: 'vault:update-item',
  vaultDeleteItem: 'vault:delete-item',
  vaultChangeMasterPassword: 'vault:change-master-password',
  vaultExportBackup: 'vault:export-backup',
  vaultRestoreBackup: 'vault:restore-backup',
  generatorGenerate: 'generator:generate',
  passwordStrength: 'password:strength',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  clipboardCopySecret: 'clipboard:copy-secret',
  eventLocked: 'event:locked',
} as const;

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload };

export interface IpcErrorPayload {
  code: string;
  message: string;
}

export interface VaultStatus {
  initialized: boolean;
  unlocked: boolean;
  itemCount: number;
  autoLockAt: number | null;
}

export interface VaultChangeMasterPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface BackupResult {
  path: string | null;
  canceled: boolean;
}

export interface RestoreBackupInput {
  password: string;
}

export interface RestoreResult {
  restored: boolean;
  canceled: boolean;
  backupOfPreviousPath?: string;
}

export interface SecurePassApi {
  vault: {
    exists(): Promise<boolean>;
    status(): Promise<VaultStatus>;
    create(masterPassword: string): Promise<void>;
    unlock(masterPassword: string): Promise<void>;
    lock(): Promise<void>;
    list(): Promise<VaultSummary[]>;
    get(id: string): Promise<VaultItem | null>;
    createItem(draft: VaultItemDraft): Promise<VaultItem>;
    updateItem(id: string, draft: VaultItemDraft): Promise<VaultItem>;
    deleteItem(id: string): Promise<void>;
    changeMasterPassword(input: VaultChangeMasterPasswordInput): Promise<void>;
    exportBackup(): Promise<BackupResult>;
    restoreBackup(input: RestoreBackupInput): Promise<RestoreResult>;
  };
  generator: {
    generate(config: PasswordConfig): Promise<GeneratedPassword>;
  };
  password: {
    strength(password: string): Promise<PasswordStrengthResult>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  clipboard: {
    copySecret(value: string): Promise<void>;
  };
  events: {
    onLocked(callback: () => void): () => void;
  };
}
