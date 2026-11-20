import type { AccentId } from './types/settings.types';

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

/** 一套强调色（浅色与深色各一套）。 */
export interface AccentColors {
  readonly accent: string;
  readonly strong: string;
  readonly soft: string;
  readonly ring: string;
}

/**
 * 强调色预设。每种颜色给出浅色/深色两套：
 * 浅色主题用较深、低饱和的色值；深色主题用较亮、低饱和的色值，
 * 保证在各自背景上都够清晰且不刺眼。
 */
export const ACCENT_PRESETS: Record<
  AccentId,
  { light: AccentColors; dark: AccentColors }
> = {
  indigo: {
    light: {
      accent: '#5468d8',
      strong: '#4356bd',
      soft: 'rgba(84, 104, 216, 0.10)',
      ring: 'rgba(84, 104, 216, 0.18)',
    },
    dark: {
      accent: '#7b8cf0',
      strong: '#93a1f5',
      soft: 'rgba(123, 140, 240, 0.16)',
      ring: 'rgba(123, 140, 240, 0.22)',
    },
  },
  blue: {
    light: {
      accent: '#3b7ef0',
      strong: '#2c66d4',
      soft: 'rgba(59, 126, 240, 0.10)',
      ring: 'rgba(59, 126, 240, 0.18)',
    },
    dark: {
      accent: '#6aa5f8',
      strong: '#8bb9fa',
      soft: 'rgba(106, 165, 248, 0.16)',
      ring: 'rgba(106, 165, 248, 0.22)',
    },
  },
  emerald: {
    light: {
      accent: '#2f9e6e',
      strong: '#248a5f',
      soft: 'rgba(47, 158, 110, 0.10)',
      ring: 'rgba(47, 158, 110, 0.18)',
    },
    dark: {
      accent: '#4bbd8b',
      strong: '#6bcfa2',
      soft: 'rgba(75, 189, 139, 0.16)',
      ring: 'rgba(75, 189, 139, 0.22)',
    },
  },
  violet: {
    light: {
      accent: '#8661e0',
      strong: '#7350cb',
      soft: 'rgba(134, 97, 224, 0.10)',
      ring: 'rgba(134, 97, 224, 0.18)',
    },
    dark: {
      accent: '#a78bfa',
      strong: '#c0a8fc',
      soft: 'rgba(167, 139, 250, 0.16)',
      ring: 'rgba(167, 139, 250, 0.22)',
    },
  },
  amber: {
    light: {
      accent: '#c07a12',
      strong: '#a4630a',
      soft: 'rgba(192, 122, 18, 0.10)',
      ring: 'rgba(192, 122, 18, 0.18)',
    },
    dark: {
      accent: '#e0a13a',
      strong: '#eeb75f',
      soft: 'rgba(224, 161, 58, 0.16)',
      ring: 'rgba(224, 161, 58, 0.22)',
    },
  },
  rose: {
    light: {
      accent: '#cf4a7c',
      strong: '#b73b69',
      soft: 'rgba(207, 74, 124, 0.10)',
      ring: 'rgba(207, 74, 124, 0.18)',
    },
    dark: {
      accent: '#ec7ba3',
      strong: '#f29cba',
      soft: 'rgba(236, 123, 163, 0.16)',
      ring: 'rgba(236, 123, 163, 0.22)',
    },
  },
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
export const VAULT_PASSWORD_MIN_LENGTH = 15;
export const VAULT_PASSWORD_MAX_LENGTH = 1024;

/**
 * 手动检查更新所用的 GitHub 仓库（owner/repo）。
 * 由 `node tools/set-repo.mjs <owner>/<repo>` 写入；仍是占位符时检查更新会直接报错，
 * 保证应用不会向未知地址发请求。
 */
export const REPOSITORY_SLUG = '__REPO_SLUG__';
/** 检查更新的请求超时：超过即放弃，界面提示稍后重试。 */
export const UPDATE_CHECK_TIMEOUT_MS = 8_000;

export const MIN_AUTO_LOCK_MINUTES = 1;
export const MAX_AUTO_LOCK_MINUTES = 120;
export const MIN_CLIPBOARD_SECONDS = 5;
export const MAX_CLIPBOARD_SECONDS = 300;

export const VAULT_FILE_NAME = 'vault.securepass';
export const VAULT_BACKUP_SUFFIX = '.bak';
export const VAULT_LOCK_FILE_NAME = 'vault.lock';
/** 明文界面偏好（主题 / 语言）：未解锁时也必须可读，因此不在加密负载内。 */
export const UI_PREFERENCES_FILE_NAME = 'ui-preferences.json';
/** 记住上次的窗口大小与位置。 */
export const WINDOW_STATE_FILE_NAME = 'window-state.json';

export const ARGON2ID_DEFAULTS = {
  iterations: 3,
  memorySizeKiB: 64 * 1024,
  parallelism: 4,
  hashLength: 32,
} as const;
