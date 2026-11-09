export type AppTheme = 'light' | 'dark' | 'auto';
export type AppLanguage = 'en' | 'zh-CN';

/**
 * 界面偏好：主题与语言不是机密数据，且必须在**未解锁**时也能读写，
 * 因此单独存放在明文 `ui-preferences.json` 中，不放进加密的密码库负载。
 */
export interface UiPreferences {
  theme: AppTheme;
  language: AppLanguage;
}

/**
 * 保险库相关设置（自动锁定、剪贴板）属于私密业务配置，仍保存在加密负载里。
 *
 * `theme` / `language` 字段为历史遗留：早期版本把它们存在负载内，
 * 现已由 `UiPreferences` 接管，读取时会被覆盖，保留字段仅用于兼容旧数据。
 */
export interface AppSettings {
  autoLockTimeoutMinutes: number;
  clearClipboardSeconds: number;
  theme: AppTheme;
  language: AppLanguage;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockTimeoutMinutes: 5,
  clearClipboardSeconds: 30,
  theme: 'auto',
  language: 'zh-CN',
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'auto',
  language: 'zh-CN',
};
