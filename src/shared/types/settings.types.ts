export type AppTheme = 'light' | 'dark' | 'auto';
export type AppLanguage = 'en' | 'zh-CN';

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
