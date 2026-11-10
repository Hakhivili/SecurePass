import {
  DEFAULT_UI_PREFERENCES,
  type AccentId,
  type AppLanguage,
  type AppTheme,
  type GeneratorPosition,
  type UiPreferences,
} from '@shared/types';

/**
 * 界面偏好的「首帧缓存」。
 *
 * 权威数据在主进程的 ui-preferences.json（未解锁也可读），
 * 这里用 localStorage 缓存一份，避免应用刚启动、IPC 还没返回时主题/布局闪一下。
 */
const STORAGE_KEY = 'securepass.ui-preferences';

const THEMES: AppTheme[] = ['light', 'dark', 'auto'];
const LANGUAGES: AppLanguage[] = ['en', 'zh-CN'];
const ACCENTS: AccentId[] = ['indigo', 'blue', 'emerald', 'violet', 'amber', 'rose'];
const POSITIONS: GeneratorPosition[] = ['top', 'left', 'right'];

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

export function normalizeAccent(value: unknown): AccentId {
  return ACCENTS.includes(value as AccentId)
    ? (value as AccentId)
    : DEFAULT_UI_PREFERENCES.accent;
}

export function normalizeGeneratorPosition(value: unknown): GeneratorPosition {
  return POSITIONS.includes(value as GeneratorPosition)
    ? (value as GeneratorPosition)
    : DEFAULT_UI_PREFERENCES.generatorPosition;
}

export function readUiPreferences(): UiPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UI_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      theme: normalizeTheme(parsed.theme),
      language: normalizeLanguage(parsed.language),
      accent: normalizeAccent(parsed.accent),
      generatorPosition: normalizeGeneratorPosition(parsed.generatorPosition),
    };
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
}

export function writeUiPreferences(preferences: Partial<UiPreferences>): void {
  try {
    const current = readUiPreferences();
    const next: UiPreferences = {
      theme: normalizeTheme(preferences.theme ?? current.theme),
      language: normalizeLanguage(preferences.language ?? current.language),
      accent: normalizeAccent(preferences.accent ?? current.accent),
      generatorPosition: normalizeGeneratorPosition(
        preferences.generatorPosition ?? current.generatorPosition,
      ),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用时静默忽略：界面偏好不是关键数据。
  }
}
