import type { Announcement } from '../types';
import { isClosed } from './dday';

// 세특 핏 진단: 희망 계열·학년·역할로 대회를 고른다.
// 점수는 아래 규칙으로만 계산하고, 왜 그 점수인지 이유를 함께 돌려준다.

export type Track = '공학·IT' | '자연·의약' | '인문·사회' | '경영·경제' | '예체능' | '교육';
export type Level = '중학생' | '고1' | '고2' | '고3' | '대학생';
export type Role = '개발' | '디자인' | '기획';

export const TRACKS: Track[] = ['공학·IT', '자연·의약', '인문·사회', '경영·경제', '예체능', '교육'];
export const LEVELS: Level[] = ['중학생', '고1', '고2', '고3', '대학생'];
export const ROLES: Role[] = ['개발', '디자인', '기획'];

// 계열 → 대회 분야별 관련도 (0~1)
const TRACK_WEIGHTS: Record<Track, Record<string, number>> = {
  '공학·IT': { 'IT/개발': 1, '수학/과학': 0.8, '창업': 0.5, '기획/아이디어': 0.4, '디자인': 0.3 },
  '자연·의약': { '수학/과학': 1, '봉사활동': 0.6, 'IT/개발': 0.5, '기획/아이디어': 0.3 },
  '인문·사회': { '인문학': 1, '봉사활동': 0.7, '기획/아이디어': 0.6, '예술/문화': 0.4 },
  '경영·경제': { '창업': 1, '기획/아이디어': 0.9, '인문학': 0.4, 'IT/개발': 0.4 },
  '예체능': { '예술/문화': 1, '디자인': 1, '체육': 1, '기획/아이디어': 0.3 },
  '교육': { '봉사활동': 1, '인문학': 0.8, '수학/과학': 0.5, '기획/아이디어': 0.5 }
};

// 계열과 이어지는 교과
const TRACK_SUBJECT: Record<Track, string> = {
  '공학·IT': '정보·수학',
  '자연·의약': '과학·수학',
  '인문·사회': '국어·사회',
  '경영·경제': '경제·사회',
  '예체능': '미술·음악·체육',
  '교육': '사회·교과 탐구'
};

const ROLE_CATEGORIES: Record<Role, string[]> = {
  개발: ['IT/개발'],
  디자인: ['디자인', '예술/문화'],
  기획: ['기획/아이디어', '창업', '인문학', '봉사활동']
};

export const categoriesOf = (a: Announcement) =>
  String(a.category || '').split(',').map(c => c.trim()).filter(Boolean);

const daysLeft = (deadline: string) => {
  const d = new Date(deadline).getTime();
  return isNaN(d) ? null : Math.ceil((d - Date.now()) / 86400000);
};

// 참가 대상 글에서 학교급을 읽는다. 아무 표시도 없으면 누구나로 본다.
const targetFit = (target: string | null | undefined, level: Level): 'match' | 'open' | 'mismatch' => {
  const t = (target || '').replace(/\s/g, '');
  if (!t) return 'open';
  const mid = /중학|중등|중·고|중고|청소년|초·중|초중/.test(t);
  const high = /고등|고교|중·고|중고|청소년|고1|고2|고3/.test(t);
  const univ = /대학|청년/.test(t);
  const anyone = /누구나|제한없|전국민|일반|전연령|국민|학생/.test(t);
  const mine = level === '중학생' ? mid : level === '대학생' ? univ : high;
  if (mine) return 'match';
  if (mid || high || univ) return anyone && !/대학생|중학생|고등학생/.test(t) ? 'open' : 'mismatch';
  return 'open';
};

export interface FitResult {
  announcement: Announcement;
  score: number;
  reasons: string[];
  points: string[];
  draft: string;
}

// 분야별로 생기부에 남기기 좋은 역량
const POINTS: Record<string, string[]> = {
  'IT/개발': ['문제를 정의하고 코드로 해결한 과정', '알고리즘·데이터를 실제 문제에 적용한 경험'],
  '수학/과학': ['가설을 세우고 검증한 탐구 과정', '자료를 분석해 결론을 이끈 경험'],
  '인문학': ['주제를 깊이 읽고 자기 관점으로 정리한 글', '근거를 들어 주장한 논증'],
  '기획/아이디어': ['문제를 발견하고 해결 아이디어를 기획한 과정', '조사·인터뷰로 근거를 모은 경험'],
  '디자인': ['사용자를 고려한 시각 설계', '아이디어를 시안으로 구체화한 과정'],
  '예술/문화': ['작품의 기획 의도와 제작 과정', '피드백을 반영해 다듬은 경험'],
  '창업': ['시장·사용자 문제를 찾은 과정', '사업 모델을 세우고 검증한 경험'],
  '봉사활동': ['공동체 문제를 발견한 계기', '꾸준히 참여하며 배운 점'],
  '체육': ['목표를 세우고 꾸준히 훈련한 과정', '팀워크와 리더십']
};

const ROLE_POINT: Record<Role, string> = {
  개발: '팀에서 개발을 맡아 구현을 책임진 협업 경험',
  디자인: '팀에서 디자인을 맡아 결과물을 시각화한 협업 경험',
  기획: '팀에서 기획을 맡아 방향을 잡고 조율한 협업 경험'
};

const ROLE_DRAFT: Record<Role, string> = {
  개발: '핵심 기능을 직접 설계·구현하며 문제 해결 과정을 주도함',
  디자인: '사용자 관점에서 화면과 자료를 설계해 팀의 아이디어를 구체화함',
  기획: '문제를 정의하고 자료 조사와 역할 분담을 이끌어 팀의 방향을 잡음'
};

export const scoreAnnouncement = (a: Announcement, track: Track, level: Level, role: Role): FitResult | null => {
  if (!a.deadline || isClosed(a.deadline)) return null;
  const cats = categoriesOf(a);
  const weights = TRACK_WEIGHTS[track];
  let best = 0;
  let bestCat = '';
  for (const c of cats) {
    const w = weights[c] || 0;
    if (w > best) {
      best = w;
      bestCat = c;
    }
  }
  if (best === 0) return null;

  const fit = targetFit(a.target, level);
  if (fit === 'mismatch') return null;

  const reasons: string[] = [];
  let score = 50 + Math.round(35 * best);
  reasons.push(best >= 0.8 ? `${track} 계열과 잘 맞는 ${bestCat} 분야` : `${track} 계열과 이어지는 ${bestCat} 분야`);

  if (fit === 'match') {
    score += 6;
    reasons.push(`${level} 참가 가능`);
  } else {
    score += 2;
    reasons.push('참가 대상 제한 없음');
  }

  const left = daysLeft(a.deadline);
  if (left !== null) {
    if (left >= 7 && left <= 45) {
      score += 5;
      reasons.push(`마감까지 ${left}일, 준비하기 좋은 기간`);
    } else if (left > 45) {
      score += 3;
      reasons.push(`마감까지 ${left}일로 여유 있음`);
    } else {
      reasons.push(`마감까지 ${Math.max(left, 0)}일, 서둘러야 해요`);
    }
  }

  if (cats.some(c => ROLE_CATEGORIES[role].includes(c))) {
    score += 3;
    reasons.push(`${role} 역할이 필요한 대회`);
  }

  score = Math.min(score, 99);

  const points = [...(POINTS[bestCat] || POINTS['기획/아이디어']), ROLE_POINT[role]].slice(0, 3);
  const draft = `${a.title}에 참가하여 ${ROLE_DRAFT[role]}. 이 과정에서 ${TRACK_SUBJECT[track]} 교과에서 배운 내용을 실제 문제에 적용함.`;

  return { announcement: a, score, reasons, points, draft };
};

export const findBestFits = (announcements: Announcement[], track: Track, level: Level, role: Role, limit = 3): FitResult[] =>
  announcements
    .map(a => scoreAnnouncement(a, track, level, role))
    .filter((r): r is FitResult => !!r)
    .sort((x, y) => y.score - x.score || new Date(x.announcement.deadline).getTime() - new Date(y.announcement.deadline).getTime())
    .slice(0, limit);
