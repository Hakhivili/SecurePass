import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { THEME_CHROME, TITLE_BAR_HEIGHT } from '@shared/constants';
import MainLayout from './components/Common/Layout';
import { useAuthStore } from './store/auth.store';
import { useVaultStore } from './store/vault.store';
import { useSettingsStore } from './store/settings.store';
import { applyResolvedTheme, resolveTheme, useSystemTheme } from './utils/theme';
import type { ResolvedTheme } from './utils/theme';

const FONT_STACK =
  '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif';

/**
 * antd 主题：从共享的配色令牌生成，保证组件库与自绘样式同源。
 */
function buildThemeConfig(resolved: ResolvedTheme): ThemeConfig {
  const dark = resolved === 'dark';
  const chrome = dark ? THEME_CHROME.dark : THEME_CHROME.light;

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: chrome.accent,
      colorInfo: chrome.accent,
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
        rowHoverBg: chrome.accentSoft,
        borderColor: chrome.border,
        headerSplitColor: 'transparent',
        cellPaddingBlock: 12,
        cellPaddingInline: 12,
      },
      Button: { primaryShadow: 'none', defaultShadow: 'none' },
      Segmented: {
        itemSelectedBg: chrome.accentSoft,
        itemSelectedColor: chrome.accent,
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

  const theme = useSettingsStore((state) => state.settings.theme);
  const language = useSettingsStore((state) => state.settings.language);
  const loadSettings = useSettingsStore((state) => state.load);

  const systemTheme = useSystemTheme();
  const resolvedTheme = resolveTheme(theme, systemTheme);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
    // 让系统窗口按钮区域跟随主题，避免出现一条颜色不一致的标题栏
    const chrome = resolvedTheme === 'dark' ? THEME_CHROME.dark : THEME_CHROME.light;
    void window.securepass.titleBar
      .sync({ color: chrome.bg, symbolColor: chrome.text, height: TITLE_BAR_HEIGHT })
      .catch(() => undefined);
  }, [resolvedTheme]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = window.securepass.events.onLocked(() => {
      handleLocked();
      useVaultStore.getState().clear();
      // 锁定后自动锁定/剪贴板回落到默认值，但主题与语言保持
      void useSettingsStore.getState().load();
    });
    return unsubscribe;
  }, [bootstrap, handleLocked]);

  // 解锁状态变化时重新加载设置：界面偏好始终可读，保险库设置仅解锁后可读。
  useEffect(() => {
    void loadSettings();
  }, [unlocked, loadSettings]);

  return (
    <ConfigProvider
      locale={language === 'en' ? enUS : zhCN}
      theme={buildThemeConfig(resolvedTheme)}
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
