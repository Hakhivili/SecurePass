import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { APP_NAME } from '@shared/constants';
import { translate } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import PasswordVault from '@/components/PasswordVault';
import {
  installApi,
  makeItem,
  makeSummary,
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

describe('PasswordVault 面板', () => {
  it('锁定时只渲染解锁表单，输入主密码可完成解锁', async () => {
    renderWithProviders(<PasswordVault />);

    expect(screen.getByText(t('unlock.title', { app: APP_NAME }))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(t('vault.searchPlaceholder'))).toBeNull();

    const passwordInput = document.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: TEST_MASTER_PASSWORD } });
    const submitButton = document.querySelector(
      '.vault-access button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(api.vault.unlock).toHaveBeenCalledWith(TEST_MASTER_PASSWORD),
    );
    await waitFor(() => expect(useAuthStore.getState().unlocked).toBe(true));
  });

  it('解锁后加载列表并展示记录与自动锁定倒计时', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list.mockResolvedValue([
      makeSummary({ title: '公司邮箱', username: 'me@corp.cn' }),
    ]);
    api.vault.status.mockResolvedValue({
      initialized: true,
      unlocked: true,
      itemCount: 1,
      autoLockAt: Date.now() + 5 * 60_000,
    });

    renderWithProviders(<PasswordVault />);

    expect(await screen.findByText('公司邮箱')).toBeInTheDocument();
    expect(screen.getByText('me@corp.cn')).toBeInTheDocument();
    expect(
      await screen.findByText(t('vault.autoLockIn', { minutes: 5 })),
    ).toBeInTheDocument();
  });

  it('搜索只匹配名称/账号/网址/标签，不匹配密码', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list.mockResolvedValue([
      makeSummary({ id: 'a', title: 'GitHub', username: 'octocat' }),
      makeSummary({
        id: 'b',
        title: '公司邮箱',
        username: 'me@corp.cn',
        category: '工作',
      }),
    ]);

    renderWithProviders(<PasswordVault />);
    await screen.findByText('GitHub');

    const search = screen.getByPlaceholderText(t('vault.searchPlaceholder'));
    fireEvent.change(search, { target: { value: '公司' } });

    expect(screen.queryByText('GitHub')).toBeNull();
    expect(screen.getByText('公司邮箱')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'octocat' } });
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.queryByText('公司邮箱')).toBeNull();
  });

  it('记录按分类筛选，且分类下拉只列出已有分类', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list.mockResolvedValue([
      makeSummary({ id: 'a', title: 'GitHub', category: '开发' }),
      makeSummary({ id: 'b', title: '公司邮箱', category: '工作' }),
    ]);

    renderWithProviders(<PasswordVault />);
    await screen.findByText('GitHub');

    const filter = screen.getByRole('combobox', { name: t('vault.allCategories') });
    fireEvent.mouseDown(filter);
    const options = await screen.findAllByText('工作');
    fireEvent.click(options[options.length - 1]);

    await waitFor(() => expect(screen.queryByText('GitHub')).toBeNull());
    expect(screen.getByText('公司邮箱')).toBeInTheDocument();
  });

  it('删除需要二次确认，删除后可通过「撤销」重建记录', async () => {
    useAuthStore.setState({ unlocked: true });
    const summary = makeSummary({ id: 'a', title: 'GitHub' });
    api.vault.list.mockResolvedValue([summary]);
    api.vault.get.mockResolvedValue(makeItem({ id: 'a', title: 'GitHub' }));

    renderWithProviders(<PasswordVault />);
    await screen.findByText('GitHub');

    fireEvent.click(screen.getByRole('button', { name: t('vault.actionDelete') }));

    const confirmBox = await screen.findByRole('tooltip');
    fireEvent.click(
      confirmBox.querySelector('.ant-popconfirm-buttons .ant-btn-primary') as HTMLElement,
    );

    await waitFor(() => expect(api.vault.deleteItem).toHaveBeenCalledWith('a'));

    const undoButton = await screen.findByRole('button', { name: /撤销/ });
    fireEvent.click(undoButton);

    await waitFor(() =>
      expect(api.vault.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'GitHub' }),
      ),
    );
  });

  it('读取失败时展示错误与重试按钮，重试调用列表接口', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list
      .mockRejectedValueOnce(new Error('保险库文件损坏'))
      .mockResolvedValue([]);

    renderWithProviders(<PasswordVault />);

    expect(await screen.findByText('保险库文件损坏')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('error.retry')) }));

    await waitFor(() => expect(api.vault.list).toHaveBeenCalledTimes(2));
  });

  it('Ctrl+N 打开新增记录对话框', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list.mockResolvedValue([]);

    renderWithProviders(<PasswordVault />);
    await waitFor(() => expect(api.vault.list).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t('vault.editorCreate'))).toBeInTheDocument();
  });

  it('「锁定密码库」按钮调用主进程并清除解锁状态', async () => {
    useAuthStore.setState({ unlocked: true });
    api.vault.list.mockResolvedValue([makeSummary()]);

    renderWithProviders(<PasswordVault />);
    await screen.findByText('示例站点');

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('vault.lock')) }));

    await waitFor(() => expect(api.vault.lock).toHaveBeenCalled());
    await waitFor(() => expect(useAuthStore.getState().unlocked).toBe(false));
  });
});
