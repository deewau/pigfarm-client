/**
 * Форматирование относительного времени
 * "18 ч. назад", "2 мин. назад", "только что" и т.д.
 */
export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHour < 24) return `${diffHour} ч. назад`;
  if (diffDay < 7) return `${diffDay} д. назад`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} нед. назад`;
  return `${Math.floor(diffDay / 30)} мес. назад`;
}
