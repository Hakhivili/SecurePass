import { useCallback } from 'react';
import { App } from 'antd';
import { describeDuplicate, useI18n } from '../i18n';
import { useVaultStore } from '../store/vault.store';
import { findDuplicateItems } from './duplicates';

export interface DuplicateCheckInput {
  title?: string;
  username?: string;
  url?: string;
}

/**
 * 保存前的重复录入提醒（任务书 §3.2）：
 * 只在发现疑似重复时弹出确认框，用户选择「仍然保存」才继续。
 */
export function useDuplicateGuard(): (
  input: DuplicateCheckInput,
  excludeId?: string,
) => Promise<boolean> {
  const { modal } = App.useApp();
  const { t } = useI18n();
  const items = useVaultStore((state) => state.items);

  return useCallback(
    (input, excludeId) => {
      const duplicates = findDuplicateItems(items, input, excludeId);
      if (duplicates.length === 0) return Promise.resolve(true);

      return new Promise<boolean>((resolve) => {
        modal.confirm({
          title: t('vault.duplicate.title'),
          content: (
            <div>
              <div>{t('vault.duplicate.body', { count: duplicates.length })}</div>
              <ul className="duplicate-list">
                {duplicates.slice(0, 5).map((candidate) => (
                  <li key={candidate.item.id}>{describeDuplicate(candidate, t)}</li>
                ))}
              </ul>
            </div>
          ),
          okText: t('vault.duplicate.keep'),
          cancelText: t('vault.duplicate.back'),
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },
    [items, modal, t],
  );
}
