export const APP_NAME = 'SecurePass';
export const APP_ID = 'com.securepass.desktop';

/** 自绘标题栏（应用顶栏）高度，同时用于 Electron titleBarOverlay 的高度。 */
export const TITLE_BAR_HEIGHT = 56;

/**
 * 界面配色令牌（唯一来源）。
 * CSS 变量（src/renderer/index.css）与 antd 主题、窗口标题栏都从这里取值，
 * 避免三处颜色不一致。数值需与 index.css 中的 `--sp-*` 保持一致。
 */
export const THEME_CHROME = {
  light: {
    bg: '#f0eeea',
    surface: '#f8f6f2',
    text: '#2a2622',
    textSecondary: '#625b53',
    textTertiary: '#928b82',
    border: '#e6e2db',
    accent: '#5468d8',
    accentSoft: 'rgba(84, 104, 216, 0.10)',
    success: '#388e4a',
    warning: '#cf7d0a',
    danger: '#c94141',
    shadow: '0 10px 24px -16px rgba(28, 25, 23, 0.2)',
  },
  dark: {
    bg: '#15171b',
    surface: '#1c1f24',
    text: '#e6e9ee',
    textSecondary: '#a2abb8',
    textTertiary: '#6e7784',
    border: '#2b3037',
    accent: '#6b8afd',
    accentSoft: 'rgba(107, 138, 253, 0.16)',
    success: '#51cf66',
    warning: '#ffa94d',
    danger: '#ff6b6b',
    shadow: '0 8px 28px -14px rgba(0, 0, 0, 0.7)',
  },
} as const;

export type ThemeChrome = (typeof THEME_CHROME)['light'];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
export const VAULT_PASSWORD_MIN_LENGTH = 15;
export const VAULT_PASSWORD_MAX_LENGTH = 1024;

export const MIN_AUTO_LOCK_MINUTES = 1;
export const MAX_AUTO_LOCK_MINUTES = 120;
export const MIN_CLIPBOARD_SECONDS = 5;
export const MAX_CLIPBOARD_SECONDS = 300;

export const VAULT_FILE_NAME = 'vault.securepass';
export const VAULT_BACKUP_SUFFIX = '.bak';
export const VAULT_LOCK_FILE_NAME = 'vault.lock';
/** 明文界面偏好（主题 / 语言）：未解锁时也必须可读，因此不在加密负载内。 */
export const UI_PREFERENCES_FILE_NAME = 'ui-preferences.json';
export const MAX_SEARCH_RESULTS = 1000;

export const ARGON2ID_DEFAULTS = {
  iterations: 3,
  memorySizeKiB: 64 * 1024,
  parallelism: 4,
  hashLength: 32,
} as const;
