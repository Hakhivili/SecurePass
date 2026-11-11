import { vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  DEFAULT_UI_PREFERENCES,
  type AppInfo,
  type GeneratedPassword,
  type PasswordStrengthResult,
  type SecurePassApi,
  type VaultItem,
  type VaultItemDraft,
  type VaultStatus,
  type VaultSummary,
} from '@shared/types';

export const TEST_MASTER_PASSWORD = 'correct horse battery staple';
export const TEST_GENERATED_PASSWORD = 'Aa1!Bb2@Cc3#Dd4$';
export const NOW = Date.UTC(2026, 10, 11, 9, 30);

export function makeSummary(overrides: Partial<VaultSummary> = {}): VaultSummary {
  return {
    id: 'item-1',
    title: '示例站点',
    username: 'demo@example.com',
    url: 'https://example.com',
    category: '工作',
    tags: ['常用'],
    createdAt: NOW,
    updatedAt: NOW,
    isFavorite: false,
    ...overrides,
  };
}

export function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    ...makeSummary(overrides),
    password: 'S3cret!pass',
    notes: '备注内容',
    ...overrides,
  };
}

export function itemFromDraft(draft: VaultItemDraft, id = 'created-1'): VaultItem {
  return {
    id,
    title: draft.title,
    username: draft.username,
    password: draft.password,
    url: draft.url,
    notes: draft.notes,
    category: draft.category,
    tags: draft.tags,
    isFavorite: draft.isFavorite,
    createdAt: NOW,
    updatedAt: NOW,
    lastUsed: draft.lastUsed,
  };
}

export function generatedPassword(
  overrides: Partial<GeneratedPassword> = {},
): GeneratedPassword {
  return {
    password: TEST_GENERATED_PASSWORD,
    entropyBits: 105.1,
    charsetSize: 94,
    warningCodes: [],
    ...overrides,
  };
}

export function strengthResult(
  overrides: Partial<PasswordStrengthResult> = {},
): PasswordStrengthResult {
  return { score: 4, entropyBits: 105.1, suggestionCodes: [], ...overrides };
}

export function appInfo(overrides: Partial<AppInfo> = {}): AppInfo {
  return {
    name: 'SecurePass',
    version: '0.1.0',
    electron: '33.4.11',
    chrome: '130.0.0',
    node: '20.18.0',
    dataDir: 'C:\\Users\\demo\\AppData\\Roaming\\SecurePass',
    platform: 'win32',
    ...overrides,
  };
}

export interface ApiMock {
  vault: {
    exists: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    unlock: ReturnType<typeof vi.fn>;
    lock: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    createItem: ReturnType<typeof vi.fn>;
    updateItem: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
    changeMasterPassword: ReturnType<typeof vi.fn>;
    exportBackup: ReturnType<typeof vi.fn>;
    restoreBackup: ReturnType<typeof vi.fn>;
  };
  generator: { generate: ReturnType<typeof vi.fn> };
  password: { strength: ReturnType<typeof vi.fn> };
  settings: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  uiPreferences: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  clipboard: { copySecret: ReturnType<typeof vi.fn> };
  titleBar: { sync: ReturnType<typeof vi.fn> };
  app: { info: ReturnType<typeof vi.fn>; openDataDir: ReturnType<typeof vi.fn> };
  events: { onLocked: ReturnType<typeof vi.fn> };
}

/** 与 preload 暴露的桥接同形状的测试替身（每个方法都是 vi.fn）。 */
export function createApiMock(): ApiMock {
  const api: ApiMock = {
    vault: {
      exists: vi.fn(async () => true),
      status: vi.fn(async (): Promise<VaultStatus> => ({
        initialized: true,
        unlocked: false,
        itemCount: 0,
        autoLockAt: null,
      })),
      create: vi.fn(async () => undefined),
      unlock: vi.fn(async () => undefined),
      lock: vi.fn(async () => undefined),
      list: vi.fn(async (): Promise<VaultSummary[]> => []),
      get: vi.fn(async (): Promise<VaultItem | null> => null),
      createItem: vi.fn(async (draft: VaultItemDraft) => itemFromDraft(draft)),
      updateItem: vi.fn(async (id: string, draft: VaultItemDraft) =>
        itemFromDraft(draft, id),
      ),
      deleteItem: vi.fn(async () => undefined),
      changeMasterPassword: vi.fn(async () => undefined),
      exportBackup: vi.fn(async () => ({
        path: 'C:\\backup.securepass',
        canceled: false,
      })),
      restoreBackup: vi.fn(async () => ({ restored: true, canceled: false })),
    },
    generator: { generate: vi.fn(async () => generatedPassword()) },
    password: { strength: vi.fn(async () => strengthResult()) },
    settings: {
      get: vi.fn(async () => ({ ...DEFAULT_SETTINGS })),
      update: vi.fn(async (patch: object) => ({ ...DEFAULT_SETTINGS, ...patch })),
    },
    uiPreferences: {
      get: vi.fn(async () => ({ ...DEFAULT_UI_PREFERENCES })),
      update: vi.fn(async (patch: object) => ({ ...DEFAULT_UI_PREFERENCES, ...patch })),
    },
    clipboard: { copySecret: vi.fn(async () => undefined) },
    titleBar: { sync: vi.fn(async () => undefined) },
    app: {
      info: vi.fn(async () => appInfo()),
      openDataDir: vi.fn(async () => undefined),
    },
    events: { onLocked: vi.fn(() => () => undefined) },
  };

  return api;
}

/** 把替身安装成 window.securepass（组件通过 getApi() 使用）。 */
export function installApi(api: ApiMock = createApiMock()): ApiMock {
  Object.defineProperty(window, 'securepass', {
    value: api as unknown as SecurePassApi,
    configurable: true,
    writable: true,
  });
  return api;
}

export function removeApi(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).securepass;
}
