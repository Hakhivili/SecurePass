import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { VaultItemDraft } from '@shared/types';
import { translate } from '@/i18n';
import VaultEditor from '@/components/PasswordVault/VaultEditor';
import { makeItem, removeApi } from '../../../helpers/api-mock';
import { renderWithProviders, resetStores } from '../../../helpers/render';

const t = (
  key: Parameters<typeof translate>[1],
  params?: Record<string, string | number>,
) => translate('zh-CN', key, params);

const noop = (): void => undefined;

const clickCancel = (): void => {
  fireEvent.click(
    document.querySelector(
      '.ant-modal-footer .ant-btn:not(.ant-btn-primary)',
    ) as HTMLElement,
  );
};

const clickSubmit = (): void => {
  fireEvent.click(
    document.querySelector('.ant-modal-footer .ant-btn-primary') as HTMLElement,
  );
};

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  removeApi();
  vi.clearAllMocks();
});

describe('VaultEditor 录入对话框', () => {
  it('编辑已有记录时预填全部字段', () => {
    const item = makeItem({
      title: '公司邮箱',
      username: 'me@corp.cn',
      password: 'S3cret!pass',
      url: 'https://mail.corp.cn',
      category: '工作',
      tags: ['常用'],
      notes: '每周更换',
    });

    renderWithProviders(
      <VaultEditor
        open
        item={item}
        busy={false}
        onCancel={noop}
        onSubmit={async () => true}
      />,
    );

    expect(screen.getByLabelText(t('form.title'))).toHaveValue('公司邮箱');
    expect(screen.getByLabelText(t('form.username'))).toHaveValue('me@corp.cn');
    expect(screen.getByLabelText(t('form.url'))).toHaveValue('https://mail.corp.cn');
    expect(screen.getByLabelText(t('form.notes'))).toHaveValue('每周更换');
    expect(screen.getByText(t('vault.editorEdit'))).toBeInTheDocument();
  });

  it('提交成功后清空表单（保存完毕，输入不再保留）', async () => {
    const onSubmit = vi.fn(async (draft: VaultItemDraft) => draft.title === '新记录');
    renderWithProviders(
      <VaultEditor open item={null} busy={false} onCancel={noop} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText(t('form.title')), {
      target: { value: '新记录' },
    });
    fireEvent.change(screen.getByLabelText(t('vault.labelPassword')), {
      target: { value: 'Pa55word!' },
    });
    clickSubmit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: '新记录',
      password: 'Pa55word!',
      username: '',
      tags: [],
      isFavorite: false,
    });
    await waitFor(() => expect(screen.getByLabelText(t('form.title'))).toHaveValue(''));
  });

  it('提交失败时保留已填写内容（用户可直接重试）', async () => {
    const onSubmit = vi.fn(
      async (draft: VaultItemDraft) => draft.title !== '会失败的记录',
    );
    renderWithProviders(
      <VaultEditor open item={null} busy={false} onCancel={noop} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText(t('form.title')), {
      target: { value: '会失败的记录' },
    });
    fireEvent.change(screen.getByLabelText(t('vault.labelPassword')), {
      target: { value: 'Pa55word!' },
    });
    clickSubmit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(t('form.title'))).toHaveValue('会失败的记录');
  });

  it('未修改时关闭不打扰', async () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <VaultEditor
        open
        item={null}
        busy={false}
        onCancel={onCancel}
        onSubmit={async () => true}
      />,
    );

    clickCancel();

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(document.querySelector('.ant-modal-confirm')).toBeNull();
  });

  it('修改后关闭需确认，取消确认则继续编辑', async () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <VaultEditor
        open
        item={null}
        busy={false}
        onCancel={onCancel}
        onSubmit={async () => true}
      />,
    );

    fireEvent.change(screen.getByLabelText(t('form.title')), {
      target: { value: '改了一半' },
    });
    clickCancel();

    const confirmation = await waitFor(() => {
      const element = document.querySelector('.ant-modal-confirm');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    // antd 的确认框会把标题渲染两次（头部 + 正文标题），这里断言存在即可
    expect(screen.getAllByText(t('editor.discardTitle')).length).toBeGreaterThan(0);

    fireEvent.click(
      confirmation.querySelector(
        '.ant-modal-confirm-btns .ant-btn:not(.ant-btn-primary)',
      ) as HTMLElement,
    );

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByLabelText(t('form.title'))).toHaveValue('改了一半');
  });
});
