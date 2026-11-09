import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError, ErrorCode } from '@shared/errors';
import {
  DEFAULT_UI_PREFERENCES,
  type AppLanguage,
  type AppTheme,
  type UiPreferences,
} from '@shared/types';

const THEMES: readonly AppTheme[] = ['light', 'dark', 'auto'];
const LANGUAGES: readonly AppLanguage[] = ['en', 'zh-CN'];

export function normalizeTheme(value: unknown): AppTheme {
  return THEMES.includes(value as AppTheme)
    ? (value as AppTheme)
    : DEFAULT_UI_PREFERENCES.theme;
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return LANGUAGES.includes(value as AppLanguage)
    ? (value as AppLanguage)
    : DEFAULT_UI_PREFERENCES.language;
}

/**
 * 界面偏好（主题 / 语言）以明文 JSON 保存在 userData 目录。
 *
 * 与 `StorageService` 分开的原因：这些偏好**不参与加密**，且必须在密码库
 * 未解锁（甚至尚未创建）时也能读写——应用启动后即可使用密码生成器。
 */
export class PreferencesService {
  constructor(private readonly filePath: string) {}

  async read(): Promise<UiPreferences> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<UiPreferences>;
      return {
        theme: normalizeTheme(parsed.theme),
        language: normalizeLanguage(parsed.language),
      };
    } catch {
      // 文件不存在或内容损坏时回退默认值：界面偏好不是关键数据
      return { ...DEFAULT_UI_PREFERENCES };
    }
  }

  async update(patch: Partial<UiPreferences>): Promise<UiPreferences> {
    const current = await this.read();
    const next: UiPreferences = {
      theme: normalizeTheme(patch.theme ?? current.theme),
      language: normalizeLanguage(patch.language ?? current.language),
    };
    await this.write(next);
    return next;
  }

  private async write(value: UiPreferences): Promise<void> {
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const handle = await fs.open(temporaryPath, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify(value, null, 2), 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw new AppError(ErrorCode.StorageFailure, '保存界面偏好失败', error);
    }
  }
}
