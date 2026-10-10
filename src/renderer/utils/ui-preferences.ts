import type { AppLanguage, AppTheme } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';
import type { ErrorCodeValue } from '@shared/errors';

/**
 * 主题与语言属于「界面偏好」，不是机密数据：
 * 解锁前无法从加密负载中读取设置，因此这里用 localStorage 缓存上一次的选择，
 * 让锁屏界面与新一次启动也能保持一致的界面外观。
 */
const STORAGE_KEY = 'securepass.ui-preferences';

export interface UiPreferences {
  theme: AppTheme;
  language: AppLanguage;
}

const THEMES: AppTheme[] = ['light', 'dark', 'auto'];
const LANGUAGES: AppLanguage[] = ['en', 'zh-CN'];

export function normalizeTheme(value: unknown): AppTheme {
  return THEMES.includes(value as AppTheme)
    ? (value as AppTheme)
    : DEFAULT_SETTINGS.theme;
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return LANGUAGES.includes(value as AppLanguage)
    ? (value as AppLanguage)
    : DEFAULT_SETTINGS.language;
}

export function readUiPreferences(): UiPreferences {
  const fallback: UiPreferences = {
    theme: DEFAULT_SETTINGS.theme,
    language: DEFAULT_SETTINGS.language,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      theme: normalizeTheme(parsed.theme),
      language: normalizeLanguage(parsed.language),
    };
  } catch {
    return fallback;
  }
}

export function writeUiPreferences(preferences: Partial<UiPreferences>): void {
  try {
    const current = readUiPreferences();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: normalizeTheme(preferences.theme ?? current.theme),
        language: normalizeLanguage(preferences.language ?? current.language),
      }),
    );
  } catch {
    // localStorage 不可用时静默忽略：界面偏好不是关键数据。
  }
}

/** 把主进程返回的错误码映射为本地化文案所需的字典键。 */
export function errorMessageKey(code: ErrorCodeValue | undefined): string {
  return code ? `error.${code}` : 'error.UNKNOWN';
}
