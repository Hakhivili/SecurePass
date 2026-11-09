import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Spin, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/Common/Layout';
import { useAuthStore } from './store/auth.store';
import { useVaultStore } from './store/vault.store';
import { useSettingsStore } from './store/settings.store';
import { applyResolvedTheme, resolveTheme, useSystemTheme } from './utils/theme';

/**
 * 应用根组件。
 *
 * 鉴权模型：启动即进入工作台（密码生成器可直接使用），
 * 只有涉及密码库的操作才按需解锁 —— 因此这里不再有「创建/解锁」全屏门禁，
 * 解锁界面由密码库区块与按需解锁对话框承载。
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
