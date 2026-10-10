import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import SetupMaster from './components/Auth/SetupMaster';
import UnlockVault from './components/Auth/UnlockVault';
import MainLayout from './components/Common/Layout';
import { useAuthStore } from './store/auth.store';
import { useVaultStore } from './store/vault.store';
import { useSettingsStore } from './store/settings.store';
import { applyResolvedTheme, resolveTheme, useSystemTheme } from './utils/theme';

export default function App(): JSX.Element {
  const initialized = useAuthStore((state) => state.initialized);
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
  }, [resolvedTheme]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = window.securepass.events.onLocked(() => {
      handleLocked();
      useVaultStore.getState().clear();
    });
    return unsubscribe;
  }, [bootstrap, handleLocked]);

  // 锁定状态下 settings:get 只返回默认值，因此解锁后再加载真实设置。
  useEffect(() => {
    if (unlocked) void loadSettings();
  }, [unlocked, loadSettings]);

  const content = loading ? (
    <div className="app-loading">
      <Spin size="large" />
    </div>
  ) : !initialized ? (
    <SetupMaster />
  ) : !unlocked ? (
    <UnlockVault />
  ) : (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );

  return (
    <ConfigProvider
      locale={language === 'en' ? enUS : zhCN}
      theme={{
        algorithm:
          resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          fontFamily:
            '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
        },
      }}
    >
      <AntApp>{content}</AntApp>
    </ConfigProvider>
  );
}
