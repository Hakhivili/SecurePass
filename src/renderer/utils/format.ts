import type { AppLanguage } from '@shared/types';

export function formatDateTime(
  timestamp: number,
  language: AppLanguage = 'zh-CN',
): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
