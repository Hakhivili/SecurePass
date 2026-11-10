import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import {
  ACCENT_PRESETS,
  APP_NAME,
  THEME_CHROME,
  TITLE_BAR_HEIGHT,
} from '@shared/constants';
import type { AccentColors } from '@shared/constants';
import type { AccentId } from '@shared/types';
import MainLayout from './components/Common/Layout';
import { useAuthStore } from './store/auth.store';
import { useVaultStore } from './store/vault.store';
import { useSettingsStore } from './store/settings.store';
import { applyResolvedTheme, resolveTheme, useSystemTheme } from './utils/theme';
import type { ResolvedTheme } from './utils/theme';

const FONT_STACK =
  '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif';

/** 取当前主题下应该使用的强调色（每种预设都有浅色/深色两套）。 */
function resolveAccent(accent: AccentId, resolved: ResolvedTheme): AccentColors {
  const preset = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS.indigo;
  return resolved === 'dark' ? preset.dark : preset.light;
}

/**
 * antd 主题：从共享的配色令牌生成，保证组件库与自绘样式同源。
 */
function buildThemeConfig(resolved: ResolvedTheme, accent: AccentColors): ThemeConfig {
  const dark = resolved === 'dark';
  const chrome = dark ? THEME_CHROME.dark : THEME_CHROME.light;

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: accent.accent,
      colorInfo: accent.accent,
      colorSuccess: chrome.success,
      colorWarning: chrome.warning,
      colorError: chrome.danger,
      colorBgBase: chrome.bg,
      colorBgLayout: chrome.bg,
      colorBgContainer: chrome.surface,
      colorBgElevated: chrome.surface,
      colorText: chrome.text,
      colorTextSecondary: chrome.textSecondary,
      colorTextTertiary: chrome.textTertiary,
      colorBorder: chrome.border,
      colorBorderSecondary: chrome.border,
      borderRadius: 8,
      borderRadiusLG: 12,
      controlHeight: 36,
      fontSize: 14,
      fontFamily: FONT_STACK,
      boxShadowSecondary: chrome.shadow,
    },
    components: {
      Card: { paddingLG: 18 },
      Table: {
        headerBg: 'transparent',
        headerColor: chrome.textTertiary,
        rowHoverBg: accent.soft,
        borderColor: chrome.border,
        headerSplitColor: 'transparent',
        cellPaddingBlock: 12,
        cellPaddingInline: 12,
      },
      Button: { primaryShadow: 'none', defaultShadow: 'none' },
      Slider: {
        railSize: 8,
        handleSize: 20,
        handleSizeHover: 22,
        handleLineWidth: 2,
      },
      Segmented: {
        itemSelectedBg: accent.soft,
        itemSelectedColor: accent.accent,
        trackBg: chrome.surface,
      },
      Modal: { contentBg: chrome.surface, headerBg: chrome.surface },
    },
  };
}

/**
 * 应用根组件。
 *
 * 鉴权模型：启动即进入工作台（密码生成器可直接使用），
 * 只有涉及密码库的操作才按需解锁。
 */
export default function App(): JSX.Element {
  const unlocked = useAuthStore((state) => state.unlocked);
  const loading = useAuthStore((state) => state.loading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const handleLocked = useAuthStore((state) => state.handleLocked);

  const ui = useSettingsStore((state) => state.ui);
  const loadSettings = useSettingsStore((state) => state.load);

  const systemTheme = useSystemTheme();
  const resolvedTheme = resolveTheme(ui.theme, systemTheme);
  const accent = resolveAccent(ui.accent, resolvedTheme);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);

    // 强调色以 CSS 变量下发，自定义配色只改这几个变量即可全局生效
    const root = document.documentElement;
    root.style.setProperty('--sp-accent', accent.accent);
    root.style.setProperty('--sp-accent-strong', accent.strong);
    root.style.setProperty('--sp-accent-soft', accent.soft);
    root.style.setProperty('--sp-ring', accent.ring);

    // 让系统窗口按钮区域跟随主题，避免出现一条颜色不一致的标题栏
    const chrome = resolvedTheme === 'dark' ? THEME_CHROME.dark : THEME_CHROME.light;
    void window.securepass.titleBar
      .sync({ color: chrome.bg, symbolColor: chrome.text, height: TITLE_BAR_HEIGHT })
      .catch(() => undefined);
  }, [resolvedTheme, accent]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = window.securepass.events.onLocked(() => {
      handleLocked();
      useVaultStore.getState().clear();
      // 锁定后自动锁定/剪贴板回落到默认值，但界面偏好保持
      void useSettingsStore.getState().load();
    });
    return unsubscribe;
  }, [bootstrap, handleLocked]);

  // 解锁状态变化时重新加载设置：界面偏好始终可读，保险库设置仅解锁后可读。
  useEffect(() => {
    void loadSettings();
  }, [unlocked, loadSettings]);

  // 文档语言要跟随界面语言：屏幕阅读器与拼写检查依赖它。
  useEffect(() => {
    document.documentElement.lang = ui.language === 'en' ? 'en' : 'zh-CN';
    document.title = APP_NAME;
  }, [ui.language]);

  return (
    <ConfigProvider
      locale={ui.language === 'en' ? enUS : zhCN}
      theme={buildThemeConfig(resolvedTheme, accent)}
    >
      <AntApp>
        {loading ? (
          <div className="app-loading">
            <Spin size="large" />
          </div>
        ) : (
          <HashRouter>
            <MainLayout />
          </HashRouter>
        )}
      </AntApp>
    </ConfigProvider>
  );
}
