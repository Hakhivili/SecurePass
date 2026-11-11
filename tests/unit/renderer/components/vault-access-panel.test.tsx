import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { APP_NAME, VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { translate } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import VaultAccessPanel from '@/components/Auth/VaultAccessPanel';
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

const passwordInputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll('.vault-access input[type="password"]'));

const submitForm = (): void => {
  fireEvent.click(
    document.querySelector('.vault-access button[type="submit"]') as HTMLButtonElement,
  );
};

let api: ApiMock;

beforeEach(() => {
  resetStores();
  api = installApi();
});

afterEach(() => {
  removeApi();
  vi.clearAllMocks();
});

describe('VaultAccessPanel 创建/解锁面板', () => {
  it('创建模式下校验长度与两次输入一致', async () => {
    useAuthStore.setState({ initialized: false });
    renderWithProviders(<VaultAccessPanel />);

    expect(screen.getByText(t('setup.title', { app: APP_NAME }))).toBeInTheDocument();
    expect(passwordInputs()).toHaveLength(2);

    fireEvent.change(passwordInputs()[0], { target: { value: 'short' } });
    fireEvent.change(passwordInputs()[1], { target: { value: 'short' } });
    submitForm();

    expect(
      await screen.findByText(
        t('validation.masterTooShort', { min: VAULT_PASSWORD_MIN_LENGTH }),
      ),
    ).toBeInTheDocument();
    expect(api.vault.create).not.toHaveBeenCalled();

    fireEvent.change(passwordInputs()[0], { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.change(passwordInputs()[1], {
      target: { value: `${TEST_MASTER_PASSWORD}x` },
    });
    submitForm();

    expect(await screen.findByText(t('setup.mismatch'))).toBeInTheDocument();
    expect(api.vault.create).not.toHaveBeenCalled();
  });

  it('创建前必须确认「已记住主密码」，确认后才创建', async () => {
    useAuthStore.setState({ initialized: false });
    const onDone = vi.fn();
    renderWithProviders(<VaultAccessPanel onDone={onDone} />);

    fireEvent.change(passwordInputs()[0], { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.change(passwordInputs()[1], { target: { value: TEST_MASTER_PASSWORD } });
    submitForm();

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    expect(api.vault.create).not.toHaveBeenCalled();

    fireEvent.click(
      document.querySelector('.ant-modal-confirm-btns .ant-btn-primary') as HTMLElement,
    );

    await waitFor(() =>
      expect(api.vault.create).toHaveBeenCalledWith(TEST_MASTER_PASSWORD),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().unlocked).toBe(true);
  });

  it('取消确认时不创建密码库', async () => {
    useAuthStore.setState({ initialized: false });
    renderWithProviders(<VaultAccessPanel />);

    fireEvent.change(passwordInputs()[0], { target: { value: TEST_MASTER_PASSWORD } });
    fireEvent.change(passwordInputs()[1], { target: { value: TEST_MASTER_PASSWORD } });
    submitForm();

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    fireEvent.click(
      document.querySelector(
        '.ant-modal-confirm-btns .ant-btn:not(.ant-btn-primary)',
      ) as HTMLElement,
    );

    await waitFor(() => expect(document.querySelector('.ant-modal-confirm')).toBeNull());
    expect(api.vault.create).not.toHaveBeenCalled();
  });

  it('解锁失败时显示本地化错误码文案', async () => {
    useAuthStore.setState({ initialized: true, unlocked: false });
    api.vault.unlock.mockRejectedValue(
      Object.assign(new Error('bad password'), { code: 'INVALID_MASTER_PASSWORD' }),
    );

    renderWithProviders(<VaultAccessPanel />);
    expect(passwordInputs()).toHaveLength(1);

    fireEvent.change(passwordInputs()[0], { target: { value: TEST_MASTER_PASSWORD } });
    submitForm();

    expect(
      await screen.findByText(t('error.INVALID_MASTER_PASSWORD' as never)),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().unlocked).toBe(false);
  });

  it('解锁成功后回调 onDone', async () => {
    useAuthStore.setState({ initialized: true, unlocked: false });
    const onDone = vi.fn();

    renderWithProviders(<VaultAccessPanel onDone={onDone} />);
    fireEvent.change(passwordInputs()[0], { target: { value: TEST_MASTER_PASSWORD } });
    submitForm();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(api.vault.unlock).toHaveBeenCalledWith(TEST_MASTER_PASSWORD);
  });
});
