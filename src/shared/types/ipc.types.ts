import type {
  GeneratedPassword,
  PasswordConfig,
  PasswordStrengthResult,
} from './password.types';
import type { AppSettings, UiPreferences } from './settings.types';
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
  uiPreferencesGet: 'ui-preferences:get',
  uiPreferencesUpdate: 'ui-preferences:update',
  windowSyncTitleBar: 'window:sync-title-bar',
  clipboardCopySecret: 'clipboard:copy-secret',
  appInfo: 'app:info',
  appOpenDataDir: 'app:open-data-dir',
  appCheckUpdate: 'app:check-update',
  appOpenExternal: 'app:open-external',
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

export interface TitleBarOverlayOptions {
  color: string;
  symbolColor: string;
  height?: number;
}

/** 关于信息：版本号与运行环境，用于「关于」区块与问题反馈。 */
export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  dataDir: string;
  platform: string;
}

/** 手动检查更新的结果：只包含公开的版本信息，不含任何用户数据。 */
export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  publishedAt: string | null;
  notes: string | null;
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
    /** 保险库设置（自动锁定、剪贴板）：锁定状态下返回默认值。 */
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  uiPreferences: {
    /** 主题与语言：无需解锁即可读写。 */
    get(): Promise<UiPreferences>;
    update(patch: Partial<UiPreferences>): Promise<UiPreferences>;
  };
  clipboard: {
    copySecret(value: string): Promise<void>;
  };
  titleBar: {
    /** 主题变化时同步系统窗口按钮区域（overlay）的底色与符号颜色。 */
    sync(options: TitleBarOverlayOptions): Promise<void>;
  };
  app: {
    /** 版本号、运行环境与数据目录（关于/反馈信息）。 */
    info(): Promise<AppInfo>;
    /** 在系统文件管理器中打开数据目录。 */
    openDataDir(): Promise<void>;
    /** 手动检查更新：仅由用户点击触发，只请求 GitHub 公开版本接口。 */
    checkUpdate(): Promise<UpdateCheckResult>;
    /** 用系统浏览器打开链接：只接受 https://github.com 下的地址。 */
    openExternal(url: string): Promise<void>;
  };
  events: {
    onLocked(callback: () => void): () => void;
  };
}
