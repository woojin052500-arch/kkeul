// 가장 최근 팀 모집 글이 올라온 때를 대략적으로 말한다. 오래된 글은 말하지 않는다(낙인 방지).
export const recentLabel = (iso: string | null | undefined, now = Date.now()): string | null => {
  if (!iso) return null;
  const diff = now - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return '방금 새 글';
  if (diff < 3600_000) return '방금 새 글';
  if (diff < 86_400_000) return '오늘 새 글';
  if (diff < 7 * 86_400_000) return '이번 주 새 글';
  return null;
};
