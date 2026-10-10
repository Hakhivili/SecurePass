import type { VaultSummary } from '@shared/types';

/**
 * 重复录入判定（任务书 §3.2：允许同一网站存在多个账户，重复录入时提醒，由用户决定是否保留）。
 * 这里只做「疑似重复」提示，不做拦截。
 */
export type DuplicateReason =
  'same-url-and-username' | 'same-url' | 'same-title-and-username' | 'same-title';

export interface DuplicateCandidate {
  item: VaultSummary;
  reason: DuplicateReason;
  /** 越大越确定，用于排序与展示。 */
  score: number;
}

export interface DuplicateCheckInput {
  title?: string;
  username?: string;
  url?: string;
}

const REASON_SCORE: Record<DuplicateReason, number> = {
  'same-url-and-username': 3,
  'same-url': 2,
  'same-title-and-username': 2,
  'same-title': 1,
};

export function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** 去掉协议、www. 前缀、查询串与末尾斜杠，便于比较“同一个站点”。 */
export function normalizeUrl(value: string | undefined): string {
  let url = normalizeText(value);
  if (!url) return '';
  url = url.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  url = url.split(/[?#]/)[0] ?? '';
  url = url.replace(/\/+$/, '');
  url = url.replace(/^www\./, '');
  return url;
}

export function findDuplicateItems(
  items: VaultSummary[],
  input: DuplicateCheckInput,
  excludeId?: string,
): DuplicateCandidate[] {
  const title = normalizeText(input.title);
  const username = normalizeText(input.username);
  const url = normalizeUrl(input.url);
  if (!title && !username && !url) return [];

  const candidates: DuplicateCandidate[] = [];
  for (const item of items) {
    if (excludeId && item.id === excludeId) continue;

    const itemTitle = normalizeText(item.title);
    const itemUsername = normalizeText(item.username);
    const itemUrl = normalizeUrl(item.url);

    let reason: DuplicateReason | null = null;
    if (url && itemUrl && url === itemUrl && username && username === itemUsername) {
      reason = 'same-url-and-username';
    } else if (url && itemUrl && url === itemUrl) {
      reason = 'same-url';
    } else if (title && username && title === itemTitle && username === itemUsername) {
      reason = 'same-title-and-username';
    } else if (title && title === itemTitle) {
      reason = 'same-title';
    }

    if (reason) {
      candidates.push({ item, reason, score: REASON_SCORE[reason] });
    }
  }

  return candidates.sort((left, right) => right.score - left.score);
}
