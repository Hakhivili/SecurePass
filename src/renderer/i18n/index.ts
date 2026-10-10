import { useCallback } from 'react';
import type { AppLanguage } from '@shared/types';
import { useSettingsStore } from '../store/settings.store';
import { MESSAGES, type MessageKey } from './messages';
import type { DuplicateCandidate } from '../utils/duplicates';

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** 当前界面语言：来自设置（未解锁时回退到上次使用的本地缓存）。 */
export function useLanguage(): AppLanguage {
  return useSettingsStore((state) => state.settings.language);
}

export function useI18n(): { t: Translate; language: AppLanguage } {
  const language = useLanguage();

  const t = useCallback<Translate>(
    (key, params) => {
      const dictionary = MESSAGES[language] ?? MESSAGES['zh-CN'];
      const template = dictionary[key] ?? MESSAGES['zh-CN'][key] ?? key;
      return interpolate(template, params);
    },
    [language],
  );

  return { t, language };
}

/** 重复录入提醒中单个候选记录的描述文本。 */
export function describeDuplicate(candidate: DuplicateCandidate, t: Translate): string {
  const { item, reason } = candidate;
  const account = item.username ? ` · ${item.username}` : '';
  const url = item.url ? ` · ${item.url}` : '';
  return `${item.title}${account}${url} —— ${t(
    `vault.duplicate.reason.${reason}` as MessageKey,
  )}`;
}
