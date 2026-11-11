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

/** 自动锁定的采样间隔：每 5 秒评估一次「用户离开了多久」。 */
const AUTO_LOCK_POLL_INTERVAL_MS = 5_000;

/**
 * 系统级活动来源。
 *
 * 自动锁定不能只看「有没有 IPC 调用」：用户可能一直在生成器里操作、
 * 只在编辑器里打字，这些都不产生密码库 IPC。商业级做法是看
 * 系统空闲时间 + 窗口是否在前台，两者取较大值。
 */
export interface VaultActivitySource {
  /** 距上一次系统级鼠标/键盘输入的秒数（Electron: powerMonitor.getSystemIdleTime）。 */
  idleSeconds(): number;
  /** 应用窗口是否处于前台。 */
  isWindowFocused(): boolean;
}

export interface VaultServiceOptions {
  now?: () => number;
}

export class VaultService {
  private vaultFile: VaultFile | null = null;
  private payload: VaultPayload | null = null;
  private dataKey: Buffer | null = null;
  private autoLockTimer: NodeJS.Timeout | null = null;
  private autoLockAt: number | null = null;
  private lastActivityAt: number | null = null;
  private unfocusedSince: number | null = null;
  private activitySource: VaultActivitySource | null = null;
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

  /**
   * 注入系统活动来源（Electron 层提供）。未注入时退化为
   * 「从最后一次密码库操作开始计时」，便于单元测试。
   */
  setActivitySource(source: VaultActivitySource | null): void {
    this.activitySource = source;
    if (this.payload) this.evaluateAutoLock();
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
      await this.applyOpened(opened);
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
      await this.applyOpened(opened);
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
    this.lastActivityAt = null;
    this.unfocusedSince = null;
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
    const normalized = normalizeDraft(draft);
    const item: VaultItem = {
      ...normalized,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.now(),
      // 渲染层不会回传 lastUsed，编辑时必须保留原值，否则「最近使用时间」会被清空。
      lastUsed: normalized.lastUsed ?? existing.lastUsed,
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
    // 「无操作多久后锁定」可能刚被改短，立即按新值重新评估
    this.evaluateAutoLock();
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
    await this.applyOpened(reopened);
    return backupOfPreviousPath;
  }

  /**
   * 应用已解开的会话；若负载结构被修补过（缺失 id / 时间戳），
   * 立刻写回磁盘，避免每次解锁都重新生成 id。
   */
  private async applyOpened(opened: {
    vaultFile: VaultFile;
    payload: VaultPayload;
    dataKey: Buffer;
  }): Promise<void> {
    const repaired = this.setSession(opened.vaultFile, opened.payload, opened.dataKey);
    if (!repaired) return;
    try {
      await this.persist();
    } catch {
      // 写回失败不阻塞解锁：内存中的结构已经修好，下一次写入会一并落盘。
    }
  }

  private setSession(
    vaultFile: VaultFile,
    payload: VaultPayload,
    dataKey: Buffer,
  ): boolean {
    const repaired = validatePayload(payload);
    this.dataKey?.fill(0);
    this.vaultFile = vaultFile;
    this.payload = payload;
    this.dataKey = dataKey;
    this.lastActivityAt = this.now();
    this.unfocusedSince = null;
    this.startAutoLockWatch();
    return repaired;
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
    this.lastActivityAt = this.now();
    this.evaluateAutoLock();
  }

  private startAutoLockWatch(): void {
    this.clearAutoLockTimer();
    this.evaluateAutoLock();
    if (!this.payload) return;
    const timer = setInterval(() => this.evaluateAutoLock(), AUTO_LOCK_POLL_INTERVAL_MS);
    timer.unref?.();
    this.autoLockTimer = timer;
  }

  /**
   * 评估「用户离开多久了」，刷新 `autoLockAt`，到点立即锁定。
   *
   * 离开时长 = max(系统空闲时间, 窗口失焦时长)。前者覆盖「人不在电脑前」，
   * 后者覆盖「人还在用电脑，但切到别的应用里打字」。如果没有注入活动来源
   * （单元测试、纯服务端构造），退化为「距离最后一次密码库操作」。
   *
   * 结果再被「本次解锁会话已持续多久」封顶：系统空闲时间可能早于解锁动作
   * （解锁前用户就离开过电脑），直接用它会让人刚解锁就被锁回去。真正可计量的
   * 离开时长不可能超过会话本身的时长。
   */
  private evaluateAutoLock(): void {
    const payload = this.payload;
    if (!payload) {
      this.clearAutoLockTimer();
      this.autoLockAt = null;
      return;
    }

    const minutes =
      payload.settings.autoLockTimeoutMinutes ?? DEFAULT_SETTINGS.autoLockTimeoutMinutes;
    const timeoutMs = minutes * 60_000;
    if (timeoutMs <= 0) {
      this.autoLockAt = null;
      return;
    }

    const awayMs = this.resolveAwayMs();
    this.autoLockAt = this.now() + Math.max(0, timeoutMs - awayMs);
    if (awayMs >= timeoutMs) {
      this.lock();
    }
  }

  private resolveAwayMs(): number {
    const now = this.now();
    const sessionSince = this.lastActivityAt ?? now;
    const sessionMs = Math.max(0, now - sessionSince);
    const source = this.activitySource;
    if (!source) {
      return sessionMs;
    }

    if (source.isWindowFocused()) {
      this.unfocusedSince = null;
    } else if (this.unfocusedSince === null) {
      this.unfocusedSince = now;
    }

    const idleMs = Math.max(0, source.idleSeconds() * 1_000);
    const unfocusedMs =
      this.unfocusedSince === null ? 0 : Math.max(0, now - this.unfocusedSince);
    return Math.min(Math.max(idleMs, unfocusedMs), sessionMs);
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

/**
 * 校验并修补负载结构。
 *
 * 返回 `true` 表示修补过（缺 id 或时间戳被补齐），调用方应把修补结果落盘。
 * 之前的实现只调用 `normalizeDraft` 来「探测」是否合法却丢弃返回值，
 * 于是 `id`/`createdAt`/`updatedAt` 从未被验证：排序会得到 NaN、
 * 缺失 id 的记录无法被 get/delete 精确定位。
 */
export function validatePayload(payload: VaultPayload): boolean {
  if (
    !payload ||
    payload.schemaVersion !== PAYLOAD_SCHEMA_VERSION ||
    !Array.isArray(payload.items)
  ) {
    throw new AppError(ErrorCode.CorruptedVault, '密码库数据结构版本不受支持');
  }

  const itemsRepaired = repairItems(payload);
  const { settings, changed } = normalizeSettings(payload.settings);
  if (changed) payload.settings = settings;
  return itemsRepaired || changed;
}

/** 逐条校验记录，并补齐缺失/重复的 id 与非法时间戳。 */
function repairItems(payload: VaultPayload): boolean {
  const now = Date.now();
  const seenIds = new Set<string>();
  const items: VaultItem[] = [];
  let repaired = false;

  for (const raw of payload.items as unknown[]) {
    const draft = normalizeDraft(raw as VaultItemDraft);
    const source = (raw ?? {}) as Partial<VaultItem>;

    const sourceId = typeof source.id === 'string' ? source.id : null;
    const id =
      sourceId && sourceId.length > 0 && !seenIds.has(sourceId) ? sourceId : randomUUID();
    if (id !== sourceId) repaired = true;
    seenIds.add(id);

    const createdAt =
      typeof source.createdAt === 'number' && Number.isFinite(source.createdAt)
        ? source.createdAt
        : now;
    const updatedAt =
      typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : createdAt;
    if (createdAt !== source.createdAt || updatedAt !== source.updatedAt) {
      repaired = true;
    }

    items.push({ ...draft, id, createdAt, updatedAt });
  }

  if (repaired) {
    payload.items = items;
  }
  return repaired;
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
}

/**
 * 只保留当前版本认识的字段：早期版本把 `theme` / `language` 存在加密负载里，
 * 现在由明文的 `UiPreferences` 接管，读取旧库时顺手丢弃这两个遗留字段。
 */
function normalizeSettings(raw: unknown): { settings: AppSettings; changed: boolean } {
  validateSettings(raw as AppSettings);
  const source = raw as Record<string, unknown>;
  const settings: AppSettings = {
    autoLockTimeoutMinutes: source.autoLockTimeoutMinutes as number,
    clearClipboardSeconds: source.clearClipboardSeconds as number,
  };
  const changed = Object.keys(source).length !== Object.keys(settings).length;
  return { settings, changed };
}
