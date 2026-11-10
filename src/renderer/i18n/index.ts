import { useCallback } from 'react';
import type { AppLanguage } from '@shared/types';
import { useSettingsStore } from '../store/settings.store';
import { MESSAGES, type MessageKey } from './messages';
import type { DuplicateCandidate } from '../utils/duplicates';

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

export interface TranslateParams {
  [name: string]: string | number | undefined;
}

/** 渲染后仍残留的 `{xxx}` 说明调用方漏传了插值参数。 */
const UNRESOLVED_PLACEHOLDER = /\{[a-zA-Z_]\w*\}/;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * 纯函数版翻译（可在测试与非组件代码中直接调用）。
 * 若渲染结果仍残留 `{占位符}`，说明漏传参数——开发期告警，避免把 `{min}` 直接显示给用户。
 */
export function translate(
  language: AppLanguage,
  key: MessageKey,
  params?: TranslateParams,
): string {
  const dictionary = MESSAGES[language] ?? MESSAGES['zh-CN'];
  const template = dictionary[key] ?? MESSAGES['zh-CN'][key] ?? key;
  const rendered = interpolate(template, params);
  if (import.meta.env.DEV && UNRESOLVED_PLACEHOLDER.test(rendered)) {
    console.warn(`[i18n] 文案 "${key}" 缺少插值参数，已原样输出：${rendered}`);
  }
  return rendered;
}

/** 当前界面语言：界面偏好是唯一真源（settings.language 只是历史镜像）。 */
export function useLanguage(): AppLanguage {
  return useSettingsStore((state) => state.ui.language);
}

export function useI18n(): { t: Translate; language: AppLanguage } {
  const language = useLanguage();

  const t = useCallback<Translate>(
    (key, params) => translate(language, key, params),
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
