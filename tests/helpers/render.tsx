import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DEFAULT_SETTINGS, DEFAULT_UI_PREFERENCES } from '@shared/types';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useVaultStore } from '@/store/vault.store';
import { useVaultGateStore } from '@/store/vault-gate.store';

/** antd 依赖的浏览器 API 在 jsdom 中缺失，这里给出最小实现。 */
function installBrowserStubs(): void {
  if (typeof window === 'undefined') return;

  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  const globalScope = window as unknown as { ResizeObserver?: unknown };
  if (!globalScope.ResizeObserver) {
    globalScope.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
}

installBrowserStubs();

export function resetStores(): void {
  useAuthStore.setState({
    initialized: true,
    unlocked: false,
    loading: false,
    busy: false,
    error: null,
  });
  useVaultStore.setState({ items: [], loading: false, loaded: false, error: null });
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS },
    ui: { ...DEFAULT_UI_PREFERENCES },
    loading: false,
    error: null,
  });
  useVaultGateStore.setState({ open: false, reason: null, pending: null });
}

/** 组件树需要 antd 的 App（useApp 提供 message/modal）与 ConfigProvider。 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <ConfigProvider locale={zhCN}>
      <AntApp>{ui}</AntApp>
    </ConfigProvider>,
  );
}

/** hook 测试用同样的 Provider 包裹，否则 useApp/useI18n 取不到上下文。 */
export function providersWrapper({ children }: { children: ReactNode }): ReactElement {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
