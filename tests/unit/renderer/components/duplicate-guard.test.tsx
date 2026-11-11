import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { translate } from '@/i18n';
import { useVaultStore } from '@/store/vault.store';
import { useDuplicateGuard } from '@/utils/use-duplicate-guard';
import { copySecret } from '@/utils/clipboard';
import {
  installApi,
  makeSummary,
  removeApi,
  TEST_MASTER_PASSWORD,
  type ApiMock,
} from '../../../helpers/api-mock';
import { providersWrapper, resetStores } from '../../../helpers/render';

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

describe('useDuplicateGuard 重复录入提醒', () => {
  it('没有重复记录时直接放行', async () => {
    useVaultStore.setState({
      loaded: true,
      items: [makeSummary({ id: 'a', title: 'GitHub', url: 'https://github.com' })],
    });

    const { result } = renderHook(() => useDuplicateGuard(), {
      wrapper: providersWrapper,
    });

    await expect(
      result.current({ title: '公司邮箱', url: 'https://mail.corp.cn' }),
    ).resolves.toBe(true);
    expect(document.querySelector('.ant-modal-confirm')).toBeNull();
  });

  it('发现重复时弹出确认框，「仍然保存」返回 true', async () => {
    useVaultStore.setState({
      loaded: true,
      items: [makeSummary({ id: 'a', title: 'GitHub', url: 'https://github.com' })],
    });

    const { result } = renderHook(() => useDuplicateGuard(), {
      wrapper: providersWrapper,
    });

    const pending = result.current({ title: 'GitHub 镜像', url: 'https://github.com' });

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    expect(screen.getAllByText(t('vault.duplicate.title')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(t('vault.duplicate.body', { count: 1 })).length,
    ).toBeGreaterThan(0);

    fireEvent.click(
      document.querySelector('.ant-modal-confirm-btns .ant-btn-primary') as HTMLElement,
    );

    await expect(pending).resolves.toBe(true);
  });

  it('选择「返回修改」时返回 false', async () => {
    useVaultStore.setState({
      loaded: true,
      items: [makeSummary({ id: 'a', title: 'GitHub', url: 'https://github.com' })],
    });

    const { result } = renderHook(() => useDuplicateGuard(), {
      wrapper: providersWrapper,
    });

    const pending = result.current({ title: 'GitHub', url: 'https://github.com' });

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    fireEvent.click(
      document.querySelector(
        '.ant-modal-confirm-btns .ant-btn:not(.ant-btn-primary)',
      ) as HTMLElement,
    );

    await expect(pending).resolves.toBe(false);
  });

  it('列表尚未加载时先拉取一次再判断', async () => {
    api.vault.list.mockResolvedValue([
      makeSummary({ id: 'a', title: 'GitHub', url: 'https://github.com' }),
    ]);

    const { result } = renderHook(() => useDuplicateGuard(), {
      wrapper: providersWrapper,
    });

    const pending = result.current({ title: 'GitHub', url: 'https://github.com' });

    await waitFor(() =>
      expect(document.querySelector('.ant-modal-confirm')).not.toBeNull(),
    );
    expect(api.vault.list).toHaveBeenCalledTimes(1);
    fireEvent.click(
      document.querySelector(
        '.ant-modal-confirm-btns .ant-btn:not(.ant-btn-primary)',
      ) as HTMLElement,
    );
    await expect(pending).resolves.toBe(false);
  });

  it('编辑自身时通过 excludeId 排除自己', async () => {
    useVaultStore.setState({
      loaded: true,
      items: [makeSummary({ id: 'a', title: 'GitHub', url: 'https://github.com' })],
    });

    const { result } = renderHook(() => useDuplicateGuard(), {
      wrapper: providersWrapper,
    });

    await expect(
      result.current({ title: 'GitHub', url: 'https://github.com' }, 'a'),
    ).resolves.toBe(true);
    expect(document.querySelector('.ant-modal-confirm')).toBeNull();
  });
});

describe('copySecret 剪贴板工具', () => {
  it('把明文交给主进程剪贴板服务', async () => {
    await copySecret(TEST_MASTER_PASSWORD);
    expect(api.clipboard.copySecret).toHaveBeenCalledWith(TEST_MASTER_PASSWORD);
  });
});
