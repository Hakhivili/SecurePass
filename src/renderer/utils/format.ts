export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function truncate(value: string, maxLength = 48): string {
  const characters = [...value];
  if (characters.length <= maxLength) return value;
  return `${characters.slice(0, maxLength).join('')}...`;
}
