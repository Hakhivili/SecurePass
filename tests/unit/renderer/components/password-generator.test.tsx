import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { translate } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { useVaultGateStore } from '@/store/vault-gate.store';
import PasswordGenerator from '@/components/PasswordGenerator';
import {
  installApi,
  removeApi,
  TEST_GENERATED_PASSWORD,
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

describe('PasswordGenerator 面板', () => {
  it('挂载后自动生成密码并展示强度与熵值', async () => {
    renderWithProviders(<PasswordGenerator />);

    await waitFor(() => expect(api.generator.generate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(api.password.strength).toHaveBeenCalledWith(TEST_GENERATED_PASSWORD),
    );

    const meter = await screen.findByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '5');
    expect(meter).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText(t('strength.entropy', { bits: 105.1 }))).toBeInTheDocument();
  });

  it('提示码渲染为警告条', async () => {
    api.generator.generate.mockResolvedValue({
      password: 'abc',
      entropyBits: 14,
      charsetSize: 26,
      warningCodes: ['low-entropy', 'letters-only'],
    });

    renderWithProviders(<PasswordGenerator />);

    expect(
      await screen.findByText(t('warning.low-entropy' as never)),
    ).toBeInTheDocument();
    expect(screen.getByText(t('warning.letters-only' as never))).toBeInTheDocument();
  });

  it('复制按钮把生成的密码交给剪贴板服务', async () => {
    renderWithProviders(<PasswordGenerator />);

    const resultArea = document.querySelector('.generator-result') as HTMLElement;
    const copyButton = within(resultArea).getByRole('button', {
      name: new RegExp(t('generator.copy')),
    });
    await waitFor(() => expect(copyButton).toBeEnabled());

    fireEvent.click(copyButton);

    await waitFor(() =>
      expect(api.clipboard.copySecret).toHaveBeenCalledWith(TEST_GENERATED_PASSWORD),
    );
  });

  it('修改字符类型后按新配置重新生成', async () => {
    renderWithProviders(<PasswordGenerator />);
    await waitFor(() => expect(api.generator.generate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('checkbox', { name: t('generator.symbols') }));

    await waitFor(() =>
      expect(api.generator.generate).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeSymbols: false }),
      ),
    );
  });

  it('生成失败时展示错误提示而不是空结果', async () => {
    api.generator.generate.mockRejectedValueOnce(new Error('系统随机数不可用'));

    renderWithProviders(<PasswordGenerator />);

    expect(await screen.findByText('系统随机数不可用')).toBeInTheDocument();
  });

  it('已解锁时「保存」直接打开录入对话框并写入密码库', async () => {
    useAuthStore.setState({ unlocked: true });
    renderWithProviders(<PasswordGenerator />);
    await waitFor(() => expect(api.generator.generate).toHaveBeenCalled());

    const resultArea = document.querySelector('.generator-result') as HTMLElement;
    const saveButton = within(resultArea).getByRole('button', {
      name: new RegExp(t('generator.save')),
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(t('form.title')), {
      target: { value: '公司邮箱' },
    });
    // antd 会在两个汉字的按钮文字之间插入空格，按角色名匹配不可靠，取主按钮
    const okButton = dialog.querySelector(
      '.ant-modal-footer .ant-btn-primary',
    ) as HTMLButtonElement;
    fireEvent.click(okButton);

    await waitFor(() =>
      expect(api.vault.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '公司邮箱',
          password: TEST_GENERATED_PASSWORD,
        }),
      ),
    );
  });

  it('未解锁时「保存」先请求解锁，取消后不写入', async () => {
    renderWithProviders(<PasswordGenerator />);
    await waitFor(() => expect(api.generator.generate).toHaveBeenCalled());

    const resultArea = document.querySelector('.generator-result') as HTMLElement;
    const saveButton = within(resultArea).getByRole('button', {
      name: new RegExp(t('generator.save')),
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(useVaultGateStore.getState().open).toBe(true));
    expect(api.vault.createItem).not.toHaveBeenCalled();

    useVaultGateStore.getState().settle(false);
    await waitFor(() => expect(useVaultGateStore.getState().open).toBe(false));
    expect(api.vault.createItem).not.toHaveBeenCalled();
  });
});
