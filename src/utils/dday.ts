// 마감일 표시 공통 함수. 날짜만 비교한다(시간대·브라우저 차이에 안전).

const parseDate = (deadlineStr: string): Date | null => {
  if (!deadlineStr) return null;
  let d = new Date(deadlineStr);
  if (isNaN(d.getTime())) d = new Date(deadlineStr.replace(/-/g, '/'));
  return isNaN(d.getTime()) ? null : d;
};

// 오늘부터 마감일까지 남은 날 수. 오늘 마감이면 0, 지났으면 음수. 날짜를 모르면 null.
export const daysLeft = (deadlineStr: string): number | null => {
  const d = parseDate(deadlineStr);
  if (!d) return null;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / (24 * 60 * 60 * 1000));
};

// 마감일이 지났는가
export const isClosed = (deadlineStr: string): boolean => {
  const left = daysLeft(deadlineStr);
  return left !== null && left < 0;
};

// 'D-12' / 'D-Day' / '마감'
export const getDDay = (deadlineStr: string): string => {
  const left = daysLeft(deadlineStr);
  if (left === null) return '기한 확인';
  if (left < 0) return '마감';
  if (left === 0) return 'D-Day';
  return `D-${left}`;
};
