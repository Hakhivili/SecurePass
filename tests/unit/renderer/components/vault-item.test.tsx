import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { translate } from '@/i18n';
import VaultItem from '@/components/PasswordVault/VaultItem';
import { installApi, makeItem, removeApi, type ApiMock } from '../../../helpers/api-mock';
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

describe('VaultItem 记录详情', () => {
  it('展示全部字段、标签与时间戳，密码默认遮罩', () => {
    renderWithProviders(
      <VaultItem
        open
        item={makeItem({
          title: '公司邮箱',
          username: 'me@corp.cn',
          password: 'S3cret!pass',
          url: 'https://mail.corp.cn',
          category: '工作',
          tags: ['常用', '邮箱'],
          notes: '每周更换',
        })}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('公司邮箱')).toBeInTheDocument();
    expect(screen.getByText('me@corp.cn')).toBeInTheDocument();
    expect(screen.getByText('https://mail.corp.cn')).toBeInTheDocument();
    expect(screen.getByText('工作')).toBeInTheDocument();
    expect(screen.getByText('常用')).toBeInTheDocument();
    expect(screen.getByText('每周更换')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toHaveAttribute(
      'value',
      'S3cret!pass',
    );
    expect(screen.getByText(t('vault.labelTags'))).toBeInTheDocument();
  });

  it('复制密码与账号都经过剪贴板服务并提示成功', async () => {
    const item = makeItem({ username: 'me@corp.cn', password: 'S3cret!pass' });
    renderWithProviders(
      <VaultItem open item={item} onClose={vi.fn()} onEdit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('vault.actionCopyPassword') }));
    await waitFor(() =>
      expect(api.clipboard.copySecret).toHaveBeenCalledWith('S3cret!pass'),
    );
    expect(await screen.findByText(t('vault.passwordCopied'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('vault.actionCopyUsername') }));
    await waitFor(() =>
      expect(api.clipboard.copySecret).toHaveBeenCalledWith('me@corp.cn'),
    );
    expect(await screen.findByText(t('vault.usernameCopied'))).toBeInTheDocument();
  });

  it('剪贴板失败时展示本地化错误而不是静默', async () => {
    api.clipboard.copySecret.mockRejectedValue(
      Object.assign(new Error('clipboard unavailable'), { code: 'INTERNAL_ERROR' }),
    );
    renderWithProviders(
      <VaultItem open item={makeItem()} onClose={vi.fn()} onEdit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('vault.actionCopyPassword') }));

    expect(
      await screen.findByText(t('error.INTERNAL_ERROR' as never)),
    ).toBeInTheDocument();
  });

  it('空字段显示占位符，账号为空时不显示复制按钮', () => {
    renderWithProviders(
      <VaultItem
        open
        item={makeItem({ username: '', url: '', category: '', tags: [], notes: '' })}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(4);
    expect(
      screen.queryByRole('button', { name: t('vault.actionCopyUsername') }),
    ).toBeNull();
  });

  it('底部按钮分别触发编辑与关闭', () => {
    const onClose = vi.fn();
    const onEdit = vi.fn();
    renderWithProviders(
      <VaultItem open item={makeItem()} onClose={onClose} onEdit={onEdit} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(t('vault.actionEdit')) }),
    );
    expect(onEdit).toHaveBeenCalledTimes(1);

    const footerButtons = document.querySelectorAll('.ant-modal-footer button');
    fireEvent.click(footerButtons[footerButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
