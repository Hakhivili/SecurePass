import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { translate } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import Settings from '@/components/Settings';
import {
  installApi,
  removeApi,
  TEST_MASTER_PASSWORD,
  type ApiMock,
} from '../../../helpers/api-mock';
import { renderWithProviders, resetStores } from '../../../helpers/render';

const t = (
  key: Parameters<typeof translate>[1],
  params?: Record<string, string | number>,
) => translate('zh-CN', key, params);

let api: ApiMock;

beforeEach(() => {
  resetStores();
  api = installApi();
});

afterEach(() => {
  removeApi();
  vi.clearAllMocks();
});

describe('Settings 设置页', () => {
  it('锁定时给出提示并把受保护选项置为不可用', async () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText(t('settings.lockedNotice'))).toBeInTheDocument();
    await waitFor(() => expect(api.uiPreferences.get).toHaveBeenCalled());
    expect(
      document.querySelectorAll('.ant-select-disabled').length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(t('settings.lockedValue')).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(api.settings.get).not.toHaveBeenCalled();
  });

  it('关于区块展示版本、运行环境与数据目录，并可打开目录', async () => {
    renderWithProviders(<Settings />);

    expect(await screen.findByText('SecurePass v0.1.0')).toBeInTheDocument();
    expect(
      screen.getByText('Electron 33.4.11 · Chromium 130.0.0 · Node 20.18.0'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('C:\\Users\\demo\\AppData\\Roaming\\SecurePass'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.openDataDir')) }),
    );
    await waitFor(() => expect(api.app.openDataDir).toHaveBeenCalledTimes(1));
  });

  it('手动检查更新：点击后才请求，并给出发布页入口', async () => {
    api.app.checkUpdate.mockResolvedValue({
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      hasUpdate: true,
      releaseUrl: 'https://github.com/example/securepass/releases/tag/v0.2.0',
      publishedAt: '2026-12-01T10:00:00Z',
      notes: null,
    });

    renderWithProviders(<Settings />);
    expect(api.app.checkUpdate).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.checkUpdate')) }),
    );

    await waitFor(() => expect(api.app.checkUpdate).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(t('settings.updateAvailable', { version: '0.2.0' })),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /0\.2\.0/ }));
    await waitFor(() =>
      expect(api.app.openExternal).toHaveBeenCalledWith(
        'https://github.com/example/securepass/releases/tag/v0.2.0',
      ),
    );
  });

  it('检查更新失败时展示错误文案', async () => {
    api.app.checkUpdate.mockRejectedValue(new Error('无法连接 GitHub'));

    renderWithProviders(<Settings />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.checkUpdate')) }),
    );

    await waitFor(() => expect(api.app.checkUpdate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('无法连接 GitHub')).toBeInTheDocument();
  });

  it('切换主题与强调色写入界面偏好', async () => {
    renderWithProviders(<Settings />);
    await waitFor(() => expect(api.uiPreferences.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText(t('settings.themeDark')));
    await waitFor(() =>
      expect(api.uiPreferences.update).toHaveBeenCalledWith({ theme: 'dark' }),
    );
    expect(useSettingsStore.getState().ui.theme).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: t('accent.blue' as never) }));
    await waitFor(() =>
      expect(api.uiPreferences.update).toHaveBeenCalledWith({ accent: 'blue' }),
    );
    expect(useSettingsStore.getState().ui.accent).toBe('blue');
  });

  it('解锁后修改自动锁定时间会写入保险库设置', async () => {
    useAuthStore.setState({ unlocked: true });
    api.settings.get.mockResolvedValue({
      autoLockTimeoutMinutes: 5,
      clearClipboardSeconds: 30,
    });

    renderWithProviders(<Settings />);
    await waitFor(() => expect(api.settings.get).toHaveBeenCalled());

    const selects = document.querySelectorAll('.ant-select-selector');
    fireEvent.mouseDown(selects[0]);
    const options = await screen.findAllByText(t('settings.minutes', { value: 15 }));
    fireEvent.click(options[options.length - 1]);

    await waitFor(() =>
      expect(api.settings.update).toHaveBeenCalledWith({ autoLockTimeoutMinutes: 15 }),
    );
  });

  it('修改主密码时校验长度与一致性，成功后调用主进程', async () => {
    useAuthStore.setState({ unlocked: true });

    renderWithProviders(<Settings />);
    await waitFor(() => expect(api.uiPreferences.get).toHaveBeenCalled());

    const form = document.querySelector('.settings-section form') as HTMLFormElement;
    const submit = document.querySelector(
      '.settings-section button[type="submit"]',
    ) as HTMLButtonElement;

    const [current, next, confirm] = Array.from(
      document.querySelectorAll('.settings-section form input[type="password"]'),
    ) as HTMLInputElement[];

    fireEvent.change(current, { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.change(next, { target: { value: 'short' } });
    fireEvent.change(confirm, { target: { value: 'short' } });
    fireEvent.click(submit);

    expect(
      await screen.findByText(t('validation.masterTooShort', { min: 15 })),
    ).toBeInTheDocument();
    expect(api.vault.changeMasterPassword).not.toHaveBeenCalled();

    fireEvent.change(next, { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.change(confirm, { target: { value: `${TEST_MASTER_PASSWORD}-2` } });
    fireEvent.click(submit);

    expect(await screen.findByText(t('settings.newMasterMismatch'))).toBeInTheDocument();
    expect(api.vault.changeMasterPassword).not.toHaveBeenCalled();
    expect(form).not.toBeNull();

    fireEvent.change(next, { target: { value: `${TEST_MASTER_PASSWORD}-new` } });
    fireEvent.change(confirm, { target: { value: `${TEST_MASTER_PASSWORD}-new` } });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(api.vault.changeMasterPassword).toHaveBeenCalledWith({
        currentPassword: TEST_MASTER_PASSWORD,
        newPassword: `${TEST_MASTER_PASSWORD}-new`,
      }),
    );
  });

  it('导出备份调用主进程并提示成功', async () => {
    useAuthStore.setState({ unlocked: true });
    renderWithProviders(<Settings />);

    await waitFor(() => expect(api.uiPreferences.get).toHaveBeenCalled());
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('settings.export')) }),
    );

    await waitFor(() => expect(api.vault.exportBackup).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(t('settings.exported'))).toBeInTheDocument();
  });

  it('恢复备份必须填写密码并二次确认', async () => {
    useAuthStore.setState({ unlocked: true });
    renderWithProviders(<Settings />);
    await waitFor(() => expect(api.uiPreferences.get).toHaveBeenCalled());

    const restoreButton = screen.getByRole('button', {
      name: new RegExp(t('settings.restore')),
    });

    fireEvent.click(restoreButton);
    expect(
      await screen.findByText(t('settings.restorePasswordRequired')),
    ).toBeInTheDocument();
    expect(api.vault.restoreBackup).not.toHaveBeenCalled();

    const passwordInput = document.querySelector(
      '.settings-actions input[type="password"]',
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.click(restoreButton);

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    expect(api.vault.restoreBackup).not.toHaveBeenCalled();

    fireEvent.click(
      document.querySelector('.ant-modal-confirm-btns .ant-btn-primary') as HTMLElement,
    );

    await waitFor(() =>
      expect(api.vault.restoreBackup).toHaveBeenCalledWith({
        password: TEST_MASTER_PASSWORD,
      }),
    );
  });
});
