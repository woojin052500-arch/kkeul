import type { Announcement } from '../types';

// 외부에서 끌로 들어오는 링크
//   /contest/<끌 공고 ID>          → 그 대회의 팀 빌딩 게시판
//   /team?name=<대회명>            → 대회명으로 찾아서 팀 빌딩 게시판 (콘테스트코리아 연동용)
//   /p/<프로필 ID 앞 8자리>         → 명함 QR 공개 프로필
export type DeepLink =
  | { kind: 'contest'; id: string }
  | { kind: 'team'; name: string }
  | { kind: 'profile'; shortId: string };

const PENDING_KEY = 'kkeul_pending_deeplink';

export const parseDeepLink = (loc: Pick<Location, 'pathname' | 'search'>): DeepLink | null => {
  const path = decodeURIComponent(loc.pathname).replace(/\/+$/, '');
  const params = new URLSearchParams(loc.search);

  const contest = /^\/contest\/([^/]+)$/.exec(path);
  if (contest) return { kind: 'contest', id: contest[1] };

  if (path === '/team') {
    const name = (params.get('name') || params.get('q') || '').trim();
    if (name) return { kind: 'team', name };
  }

  const profile = /^\/p\/([0-9a-f]{8})$/i.exec(path);
  if (profile) return { kind: 'profile', shortId: profile[1].toLowerCase() };

  return null;
};

// 띄어쓰기·기호·"제n회"·연도를 무시하고 비교
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/제\s*\d+\s*회/g, '')
    .replace(/20\d{2}/g, '')
    .replace(/[\s()[\]{}·・,.\-_'"「」『』:]/g, '');

export const findAnnouncementForLink = (link: DeepLink, announcements: Announcement[]): Announcement | null => {
  if (link.kind === 'contest') return announcements.find(a => a.id === link.id) || null;
  if (link.kind === 'team') {
    const q = normalize(link.name);
    if (!q) return null;
    const exact = announcements.find(a => normalize(a.title) === q);
    if (exact) return exact;
    return announcements.find(a => {
      const t = normalize(a.title);
      return t.includes(q) || q.includes(t);
    }) || null;
  }
  return null;
};

// 로그인 전에 들어온 대회 링크는 가입/로그인 후 이어서 연다
export const savePendingDeepLink = (link: DeepLink) => {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(link));
  } catch {
    // 저장 못 해도 홈으로 진행
  }
};

export const takePendingDeepLink = (): DeepLink | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as DeepLink) : null;
  } catch {
    return null;
  }
};

export const clearDeepLinkFromUrl = () => {
  try {
    window.history.replaceState(null, '', '/');
  } catch {
    // 무시
  }
};
