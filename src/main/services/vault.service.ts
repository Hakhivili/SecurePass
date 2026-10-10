import { randomUUID } from 'node:crypto';
import {
  MAX_CLIPBOARD_SECONDS,
  MAX_AUTO_LOCK_MINUTES,
  MIN_CLIPBOARD_SECONDS,
  MIN_AUTO_LOCK_MINUTES,
  VAULT_PASSWORD_MAX_LENGTH,
  VAULT_PASSWORD_MIN_LENGTH,
} from '@shared/constants';
import { AppError, ErrorCode } from '@shared/errors';
import { DEFAULT_SETTINGS } from '@shared/types';
import type {
  AppSettings,
  VaultFile,
  VaultItem,
  VaultItemDraft,
  VaultPayload,
  VaultStatus,
  VaultSummary,
} from '@shared/types';
import type { CryptoService } from './crypto.service';
import type { VaultPaths } from './paths';
import type { StorageService } from './storage.service';

const PAYLOAD_SCHEMA_VERSION = 1;
const MAX_TITLE_LENGTH = 200;
const MAX_USERNAME_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_CATEGORY_LENGTH = 100;
const MAX_NOTES_LENGTH = 5000;
const MAX_TAG_LENGTH = 50;
const MAX_TAG_COUNT = 20;

export interface VaultServiceOptions {
  now?: () => number;
}

export class VaultService {
  private vaultFile: VaultFile | null = null;
  private payload: VaultPayload | null = null;
  private dataKey: Buffer | null = null;
  private autoLockTimer: NodeJS.Timeout | null = null;
  private autoLockAt: number | null = null;
  private readonly lockListeners = new Set<() => void>();
  private readonly now: () => number;

  constructor(
    private readonly storage: StorageService,
    private readonly crypto: CryptoService,
    private readonly paths: VaultPaths,
    options: VaultServiceOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
  }

  onLocked(listener: () => void): () => void {
    this.lockListeners.add(listener);
    return () => this.lockListeners.delete(listener);
  }

  async exists(): Promise<boolean> {
    return this.storage.exists();
  }

  async status(): Promise<VaultStatus> {
    return {
      initialized: await this.storage.exists(),
      unlocked: this.payload !== null,
      itemCount: this.payload?.items.length ?? 0,
      autoLockAt: this.autoLockAt,
    };
  }

  async create(masterPassword: string): Promise<void> {
    if (await this.storage.exists()) {
      throw new AppError(ErrorCode.VaultAlreadyExists, '密码库已存在，请直接解锁');
    }
    validateNewMasterPassword(masterPassword);
    await this.storage.acquireLock();

    try {
      const payload: VaultPayload = {
        schemaVersion: PAYLOAD_SCHEMA_VERSION,
        items: [],
        settings: { ...DEFAULT_SETTINGS },
      };
      const vaultFile = await this.crypto.createVaultFile(payload, masterPassword);
      await this.storage.writeVaultFile(vaultFile);
      const opened = await this.crypto.openVaultFile(vaultFile, masterPassword);
      this.setSession(opened.vaultFile, opened.payload, opened.dataKey);
    } catch (error) {
      await this.storage.releaseLock();
      throw error;
    }
  }

  async unlock(masterPassword: string): Promise<void> {
    if (this.payload) {
      throw new AppError(ErrorCode.VaultAlreadyUnlocked, '密码库已解锁');
    }

    const alreadyLocked = this.storage.isLockHeld();
    if (!alreadyLocked) {
      await this.storage.acquireLock();
    }

    try {
      const vaultFile = await this.storage.readVaultFile();
      const opened = await this.crypto.openVaultFile(vaultFile, masterPassword);
      this.setSession(opened.vaultFile, opened.payload, opened.dataKey);
    } catch (error) {
      if (!alreadyLocked) {
        await this.storage.releaseLock();
      }
      throw error;
    }
  }

  lock(): void {
    if (!this.payload && !this.dataKey) return;
    this.dataKey?.fill(0);
    this.dataKey = null;
    this.payload = null;
    this.vaultFile = null;
    this.clearAutoLockTimer();
    this.autoLockAt = null;
    for (const listener of this.lockListeners) {
      listener();
    }
  }

  async shutdown(): Promise<void> {
    this.lock();
    await this.storage.releaseLock();
  }

  async list(): Promise<VaultSummary[]> {
    this.touch();
    const payload = this.requirePayload();
    return [...payload.items]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((item) => ({
        id: item.id,
        title: item.title,
        username: item.username,
        url: item.url,
        category: item.category,
        tags: [...item.tags],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isFavorite: item.isFavorite,
      }));
  }

  async get(id: string): Promise<VaultItem | null> {
    this.touch();
    const item = this.requirePayload().items.find((candidate) => candidate.id === id);
    return item ? structuredClone(item) : null;
  }

  async createItem(draft: VaultItemDraft): Promise<VaultItem> {
    this.touch();
    const payload = this.requirePayload();
    const now = this.now();
    const item: VaultItem = {
      ...normalizeDraft(draft),
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    payload.items.push(item);
    await this.persist();
    return structuredClone(item);
  }

  async updateItem(id: string, draft: VaultItemDraft): Promise<VaultItem> {
    this.touch();
    const payload = this.requirePayload();
    const index = payload.items.findIndex((candidate) => candidate.id === id);
    if (index < 0) {
      throw new AppError(ErrorCode.ItemNotFound, '未找到要编辑的记录');
    }

    const existing = payload.items[index] as VaultItem;
    const item: VaultItem = {
      ...normalizeDraft(draft),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.now(),
    };
    payload.items[index] = item;
    await this.persist();
    return structuredClone(item);
  }

  async deleteItem(id: string): Promise<void> {
    this.touch();
    const payload = this.requirePayload();
    const index = payload.items.findIndex((candidate) => candidate.id === id);
    if (index < 0) {
      throw new AppError(ErrorCode.ItemNotFound, '未找到要删除的记录');
    }
    payload.items.splice(index, 1);
    await this.persist();
  }

  async changeMasterPassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    this.touch();
    const vaultFile = this.requireVaultFile();
    const dataKey = this.requireDataKey();
    validateNewMasterPassword(newPassword);
    if (currentPassword === newPassword) {
      throw new AppError(ErrorCode.InvalidInput, '新主密码不能与当前主密码相同');
    }

    const verified = await this.crypto.verifyMasterPassword(vaultFile, currentPassword);
    if (!verified) {
      throw new AppError(ErrorCode.InvalidMasterPassword, '当前主密码不正确');
    }

    const { kdf, wrappedDataKey } = await this.crypto.rewrapDataKey(dataKey, newPassword);
    const nextVaultFile: VaultFile = {
      ...vaultFile,
      kdf,
      wrappedDataKey,
      payload: this.crypto.encryptPayload(this.requirePayload(), dataKey),
      updatedAt: this.now(),
    };
    await this.storage.writeVaultFile(nextVaultFile);
    this.vaultFile = nextVaultFile;
  }

  async getSettings(): Promise<AppSettings> {
    this.touch();
    return { ...this.requirePayload().settings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.touch();
    const payload = this.requirePayload();
    const next: AppSettings = { ...payload.settings, ...patch };
    validateSettings(next);
    payload.settings = next;
    await this.persist();
    return { ...next };
  }

  getVaultFileSnapshot(): VaultFile {
    this.requirePayload();
    return structuredClone(this.requireVaultFile());
  }

  async replaceFromBackupFile(
    backupFile: VaultFile,
    masterPassword: string,
  ): Promise<string | undefined> {
    const opened = await this.crypto.openVaultFile(backupFile, masterPassword);
    opened.dataKey.fill(0);
    validatePayload(opened.payload);

    let backupOfPreviousPath: string | undefined;
    if (await this.storage.exists()) {
      const stamp = new Date(this.now()).toISOString().replace(/[:.]/g, '-');
      backupOfPreviousPath = `${this.paths.vaultFilePath}.pre-restore-${stamp}.bak`;
      await this.storage.copyCurrentTo(backupOfPreviousPath);
    }

    const nextVaultFile = await this.crypto.createVaultFile(
      opened.payload,
      masterPassword,
    );
    await this.storage.writeVaultFile(nextVaultFile);
    const reopened = await this.crypto.openVaultFile(nextVaultFile, masterPassword);
    this.setSession(reopened.vaultFile, reopened.payload, reopened.dataKey);
    return backupOfPreviousPath;
  }

  private setSession(vaultFile: VaultFile, payload: VaultPayload, dataKey: Buffer): void {
    validatePayload(payload);
    this.dataKey?.fill(0);
    this.clearAutoLockTimer();
    this.vaultFile = vaultFile;
    this.payload = payload;
    this.dataKey = dataKey;
    this.scheduleAutoLock();
  }

  private async persist(): Promise<void> {
    const vaultFile = this.requireVaultFile();
    const nextVaultFile: VaultFile = {
      ...vaultFile,
      payload: this.crypto.encryptPayload(this.requirePayload(), this.requireDataKey()),
      updatedAt: this.now(),
    };
    await this.storage.writeVaultFile(nextVaultFile);
    this.vaultFile = nextVaultFile;
  }

  private requirePayload(): VaultPayload {
    if (!this.payload) {
      throw new AppError(ErrorCode.VaultLocked, '密码库已锁定');
    }
    return this.payload;
  }

  private requireVaultFile(): VaultFile {
    if (!this.vaultFile) {
      throw new AppError(ErrorCode.VaultLocked, '密码库已锁定');
    }
    return this.vaultFile;
  }

  private requireDataKey(): Buffer {
    if (!this.dataKey) {
      throw new AppError(ErrorCode.VaultLocked, '密码库已锁定');
    }
    return this.dataKey;
  }

  private touch(): void {
    if (!this.payload) return;
    this.scheduleAutoLock();
  }

  private scheduleAutoLock(): void {
    this.clearAutoLockTimer();
    const minutes =
      this.payload?.settings.autoLockTimeoutMinutes ??
      DEFAULT_SETTINGS.autoLockTimeoutMinutes;
    this.autoLockAt = this.now() + minutes * 60_000;
    this.autoLockTimer = setTimeout(() => this.lock(), minutes * 60_000);
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }
}

export function validateNewMasterPassword(masterPassword: string): void {
  const length = [...masterPassword].length;
  if (length < VAULT_PASSWORD_MIN_LENGTH) {
    throw new AppError(
      ErrorCode.WeakMasterPassword,
      `主密码至少需要 ${VAULT_PASSWORD_MIN_LENGTH} 个字符`,
    );
  }
  if (length > VAULT_PASSWORD_MAX_LENGTH) {
    throw new AppError(
      ErrorCode.WeakMasterPassword,
      `主密码不能超过 ${VAULT_PASSWORD_MAX_LENGTH} 个字符`,
    );
  }
}

export function validatePayload(payload: VaultPayload): void {
  if (
    !payload ||
    payload.schemaVersion !== PAYLOAD_SCHEMA_VERSION ||
    !Array.isArray(payload.items)
  ) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库数据结构版本不受支持');
  }
  for (const item of payload.items) {
    normalizeDraft(item);
  }
  validateSettings(payload.settings);
}

function normalizeDraft(draft: VaultItemDraft): VaultItemDraft {
  if (!draft || typeof draft !== 'object') {
    throw new AppError(ErrorCode.InvalidInput, '记录内容无效');
  }

  const title = requireText(draft.title, '名称', MAX_TITLE_LENGTH, true);
  const username = requireText(
    draft.username ?? '',
    '登录账号',
    MAX_USERNAME_LENGTH,
    false,
  );
  const password = requirePassword(draft.password);
  const url = optionalText(draft.url, '网站或应用地址', MAX_URL_LENGTH);
  const category = optionalText(draft.category, '分类', MAX_CATEGORY_LENGTH);
  const notes = optionalText(draft.notes, '备注', MAX_NOTES_LENGTH);
  const tags = normalizeTags(draft.tags);

  return {
    title,
    username,
    password,
    url,
    category,
    notes,
    tags,
    isFavorite: Boolean(draft.isFavorite),
    lastUsed: typeof draft.lastUsed === 'number' ? draft.lastUsed : undefined,
  };
}

function requireText(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required: boolean,
): string {
  if (typeof value !== 'string') {
    throw new AppError(ErrorCode.InvalidInput, `${fieldName}格式无效`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new AppError(ErrorCode.InvalidInput, `${fieldName}为必填项`);
  }
  if ([...value].length > maxLength) {
    throw new AppError(
      ErrorCode.InvalidInput,
      `${fieldName}不能超过 ${maxLength} 个字符`,
    );
  }
  return value;
}

function requirePassword(value: unknown): string {
  if (typeof value !== 'string' || [...value].length === 0) {
    throw new AppError(ErrorCode.InvalidInput, '密码不能为空');
  }
  if ([...value].length > VAULT_PASSWORD_MAX_LENGTH) {
    throw new AppError(
      ErrorCode.InvalidInput,
      `密码不能超过 ${VAULT_PASSWORD_MAX_LENGTH} 个字符`,
    );
  }
  return value;
}

function optionalText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireText(value, fieldName, maxLength, false);
}

function normalizeTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AppError(ErrorCode.InvalidInput, '标签格式无效');
  }
  if (value.length > MAX_TAG_COUNT) {
    throw new AppError(ErrorCode.InvalidInput, `标签数量不能超过 ${MAX_TAG_COUNT} 个`);
  }
  return value.map((tag) => requireText(tag, '标签', MAX_TAG_LENGTH, true));
}

function validateSettings(settings: AppSettings): void {
  if (!settings || typeof settings !== 'object') {
    throw new AppError(ErrorCode.CorruptedVault, '设置数据无效');
  }
  if (
    !Number.isFinite(settings.autoLockTimeoutMinutes) ||
    settings.autoLockTimeoutMinutes < MIN_AUTO_LOCK_MINUTES ||
    settings.autoLockTimeoutMinutes > MAX_AUTO_LOCK_MINUTES
  ) {
    throw new AppError(
      ErrorCode.InvalidInput,
      `自动锁定时间必须在 ${MIN_AUTO_LOCK_MINUTES} 到 ${MAX_AUTO_LOCK_MINUTES} 分钟之间`,
    );
  }
  if (!['light', 'dark', 'auto'].includes(settings.theme)) {
    throw new AppError(ErrorCode.InvalidInput, '主题设置无效');
  }
  if (
    !Number.isFinite(settings.clearClipboardSeconds) ||
    settings.clearClipboardSeconds < MIN_CLIPBOARD_SECONDS ||
    settings.clearClipboardSeconds > MAX_CLIPBOARD_SECONDS
  ) {
    throw new AppError(
      ErrorCode.InvalidInput,
      `剪贴板清理时间必须在 ${MIN_CLIPBOARD_SECONDS} 到 ${MAX_CLIPBOARD_SECONDS} 秒之间`,
    );
  }
  if (!['en', 'zh-CN'].includes(settings.language)) {
    throw new AppError(ErrorCode.InvalidInput, '语言设置无效');
  }
}
