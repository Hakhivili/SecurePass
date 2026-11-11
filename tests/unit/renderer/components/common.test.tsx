import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { translate } from '@/i18n';
import { useSettingsStore } from '@/store/settings.store';
import { useVaultGateStore } from '@/store/vault-gate.store';
import ErrorBoundary from '@/components/Common/ErrorBoundary';
import ErrorFallback from '@/components/Common/ErrorFallback';
import PasswordStrength from '@/components/Common/PasswordStrength';
import TitleBar from '@/components/Common/TitleBar';
import VaultAccessGate from '@/components/Auth/VaultAccessGate';
import Workbench from '@/components/Workbench';
import { installApi, removeApi, strengthResult } from '../../../helpers/api-mock';
import { renderWithProviders, resetStores } from '../../../helpers/render';

const t = (
  key: Parameters<typeof translate>[1],
  params?: Record<string, string | number>,
) => translate('zh-CN', key, params);

beforeEach(() => {
  resetStores();
  installApi();
});

afterEach(() => {
  removeApi();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('PasswordStrength', () => {
  it('无结果时不渲染强度计', () => {
    renderWithProviders(<PasswordStrength strength={null} />);
    expect(document.querySelector('.strength-meter')).toBeNull();
  });

  it('按分数渲染进度条语义、等级、熵值与建议', () => {
    renderWithProviders(
      <PasswordStrength
        strength={strengthResult({
          score: 2,
          entropyBits: 42.5,
          suggestionCodes: ['too-short', 'mix-character-classes'],
        })}
      />,
    );

    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuemin', '1');
    expect(meter).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText(t('strength.2' as never))).toBeInTheDocument();
    expect(screen.getByText(t('strength.entropy', { bits: 42.5 }))).toBeInTheDocument();
    expect(
      screen.getByText(
        `${t('strength.suggestion.too-short' as never)} · ${t(
          'strength.suggestion.mix-character-classes' as never,
        )}`,
      ),
    ).toBeInTheDocument();
  });
});

describe('ErrorBoundary / ErrorFallback', () => {
  it('子组件抛错时展示兜底界面并记录日志', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function Broken(): JSX.Element {
      throw new Error('渲染崩了');
    }

    renderWithProviders(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText(t('error.boundaryTitle'))).toBeInTheDocument();
    expect(screen.getByText('渲染崩了')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it('兜底界面的两个按钮分别触发重载与重试', () => {
    const onReload = vi.fn();
    const onRetry = vi.fn();

    renderWithProviders(
      <ErrorFallback error={new Error('boom')} onReload={onReload} onRetry={onRetry} />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('error.boundaryReload') }));
    fireEvent.click(screen.getByRole('button', { name: t('error.boundaryRetry') }));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('TitleBar 导航', () => {
  it('工作台点击齿轮进入设置页，设置页点击返回箭头回到工作台', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/workbench']}>
        <Routes>
          <Route
            path="/workbench"
            element={
              <>
                <TitleBar />
                <span>WORKBENCH_PAGE</span>
              </>
            }
          />
          <Route
            path="/settings"
            element={
              <>
                <TitleBar />
                <span>SETTINGS_PAGE</span>
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('nav.settings')) }));
    expect(screen.getByText('SETTINGS_PAGE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('nav.back')) }));
    expect(screen.getByText('WORKBENCH_PAGE')).toBeInTheDocument();
  });
});

describe('Workbench 布局与按需解锁', () => {
  it('按界面偏好切换生成器位置样式', () => {
    useSettingsStore.setState((state) => ({
      ...state,
      ui: { ...state.ui, generatorPosition: 'left' },
    }));

    renderWithProviders(<Workbench />);

    expect(document.querySelector('.workbench--left')).not.toBeNull();
    expect(screen.getByText(t('generator.title'))).toBeInTheDocument();
    expect(screen.getByText(t('vault.title'))).toBeInTheDocument();
  });

  it('门控打开时渲染按需解锁对话框', () => {
    useVaultGateStore.setState({ open: true, reason: 'save', pending: null });

    renderWithProviders(<VaultAccessGate />);

    expect(screen.getByText(t('vault.unlockRequired'))).toBeInTheDocument();
    expect(document.querySelector('.vault-access')).not.toBeNull();
  });
});
