import type { Announcement } from '../types';

// 외부에서 끌로 들어오는 링크
//   /contest/<끌 공고 ID>          → 그 대회의 팀 빌딩 게시판 (?post=<구인글 ID> 면 그 글로 이동)
//   /contest/<ID>?invite=1&from=<이름> → 친구 초대 링크 (상세 위에 초대 안내 배너)
//   /team?name=<대회명>            → 대회명으로 찾아서 팀 빌딩 게시판 (콘테스트코리아 연동용)
//   /p/<프로필 ID 앞 8자리>         → 명함 QR 공개 프로필
export type DeepLink =
  | { kind: 'contest'; id: string; postId?: string; compose?: boolean; invite?: boolean; inviterName?: string }
  | { kind: 'team'; name: string }
  | { kind: 'profile'; shortId: string };

const PENDING_KEY = 'kkeul_pending_deeplink';

// 링크에 실어 보내는 이름은 한글·영문·숫자·띄어쓰기와 몇 가지 기호만 남긴다 (20자까지)
export const cleanInviterName = (raw: string) =>
  (raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ ._·-]/g, '')
    .trim();

export const parseDeepLink = (loc: Pick<Location, 'pathname' | 'search'>): DeepLink | null => {
  const path = decodeURIComponent(loc.pathname).replace(/\/+$/, '');
  const params = new URLSearchParams(loc.search);

  const contest = /^\/contest\/([^/]+)$/.exec(path);
  if (contest) {
    const postId = (params.get('post') || '').trim();
    const base = { kind: 'contest' as const, id: contest[1], ...(/^[0-9a-f-]{36}$/i.test(postId) ? { postId } : {}) };
    // 친구 초대 링크 (?invite=1). 보낸 사람 이름이 있으면 배너에 그대로 쓴다.
    const invite = ['1', 'true', 'yes'].includes((params.get('invite') || '').toLowerCase());
    if (!invite) return base;
    const inviterName = cleanInviterName(params.get('from') || '');
    return { ...base, invite: true, ...(inviterName ? { inviterName } : {}) };
  }

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

// 꺼내지 않고 확인만 한다 (비회원에게 가입 안내를 띄울 때 사용)
export const peekPendingDeepLink = (): DeepLink | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as DeepLink) : null;
  } catch {
    return null;
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

// 추천 링크(?ref=코드)로 들어오면 가입 화면에서 코드를 미리 채워 준다
const REF_KEY = 'kkeul_ref_code';
export const captureReferralFromUrl = () => {
  try {
    const ref = (new URLSearchParams(window.location.search).get('ref') || '').replace(/[^0-9a-fA-F]/g, '').slice(0, 8);
    if (ref.length === 8) sessionStorage.setItem(REF_KEY, ref.toUpperCase());
  } catch {
    // 무시
  }
};
export const getPendingReferral = (): string => {
  try {
    return sessionStorage.getItem(REF_KEY) || '';
  } catch {
    return '';
  }
};
export const clearPendingReferral = () => {
  try {
    sessionStorage.removeItem(REF_KEY);
  } catch {
    // 무시
  }
};
