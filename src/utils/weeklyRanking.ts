// 홈 '이번 주 많이 본 공고·팀' 의 순위와 순위 변화 계산.
// 조회수를 따로 쌓지 않고, 이미 있는 활동 지표('나도 나갈래요' 수, 팀원 모집 글 수)로 순위를 매긴다.
// 어제(없으면 지난번 볼 때) 순위와 비교해 ▲/▼/NEW 를 만든다.

export interface RankSignal {
  id: string;
  // 이번 주(또는 누적) 새로 눌린 '나도 나갈래요' 수
  interest: number;
  // 이번 주(또는 누적) 올라온 팀원 모집 글 수
  posts: number;
  // 지금 자리가 남아 있는 모집 글 수. 점수가 같으면 이걸 앞세운다.
  openPosts: number;
  // 가장 최근 모집 글 시각(ms). 그것도 같으면 최신을 앞세운다.
  latestAt: number | null;
}

// 관심 표시가 모집 글보다 먼저 보이는 신호라 조금 더 무겁게 둔다.
export const SIGNAL_WEIGHTS = { interest: 3, posts: 2 } as const;

// 비교할 어제 순위가 이만큼도 없으면 순위 변화를 단정하지 않는다.
export const MIN_PREV_FOR_COMPARE = 3;

export const scoreOf = (s: RankSignal): number =>
  s.interest * SIGNAL_WEIGHTS.interest + s.posts * SIGNAL_WEIGHTS.posts;

export interface RankedEntry {
  id: string;
  rank: number;
  score: number;
}

// 점수 > 0 인 것만, 점수 → 모집 중 글 수 → 최근 글 → id 순으로 정렬한 전체 순서.
const orderSignals = (signals: RankSignal[]): Array<{ id: string; score: number }> =>
  signals
    .map(s => ({ signal: s, score: scoreOf(s) }))
    .filter(e => e.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.signal.openPosts - a.signal.openPosts ||
        (b.signal.latestAt ?? 0) - (a.signal.latestAt ?? 0) ||
        a.signal.id.localeCompare(b.signal.id)
    )
    .map(e => ({ id: e.signal.id, score: e.score }));

// 화면에 보여 줄 상위 limit 개
export const rankSignals = (signals: RankSignal[], limit: number): RankedEntry[] =>
  orderSignals(signals)
    .slice(0, Math.max(limit, 0))
    .map((e, i) => ({ id: e.id, rank: i + 1, score: e.score }));

// 어제 순위에서 '이 대회가 몇 위였나'를 찾을 때 쓰는 전체 순서
export const orderIds = (signals: RankSignal[]): string[] => orderSignals(signals).map(e => e.id);

export type RankMoveKind = 'up' | 'down' | 'same' | 'new' | 'unknown';

export interface RankMove {
  kind: RankMoveKind;
  // 오르내린 계단 수 (up/down 일 때만 1 이상)
  amount: number;
}

// prevIds: 어제 활동이 있던 대회를 위에서부터 늘어놓은 목록. 여기 없으면 '어제는 순위에 없던 곳'이다.
// prevIds 가 없으면(비교할 기록이 없으면) 모두 unknown 이고 화면은 '-' 로 표시한다.
export function movesFrom(prevIds: string[] | null | undefined, current: RankedEntry[]): Record<string, RankMove> {
  const out: Record<string, RankMove> = {};
  const prev = new Map<string, number>();
  (prevIds || []).forEach((id, i) => prev.set(id, i + 1));
  const comparable = prev.size >= MIN_PREV_FOR_COMPARE;

  for (const entry of current) {
    if (!comparable) {
      out[entry.id] = { kind: 'unknown', amount: 0 };
      continue;
    }
    const before = prev.get(entry.id);
    if (before === undefined) {
      out[entry.id] = { kind: 'new', amount: 0 };
      continue;
    }
    const diff = before - entry.rank;
    if (diff === 0) out[entry.id] = { kind: 'same', amount: 0 };
    else if (diff > 0) out[entry.id] = { kind: 'up', amount: diff };
    else out[entry.id] = { kind: 'down', amount: -diff };
  }
  return out;
}

// ---- 지난 방문 때 순위 (기기 저장) ----
// 서버가 어제 순위를 못 주는 경우(마이그레이션 전)를 위한 안전망이자, 서버 값이 있어도 남겨 두는 백업.
const SNAPSHOT_KEY = 'kkeul_weekly_rank_v1';
const KEEP_DAYS = 8;
const MAX_IDS = 30;

export interface RankSnapshot {
  v: 1;
  days: Record<string, string[]>;
}

const emptySnapshot = (): RankSnapshot => ({ v: 1, days: {} });

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

// 기기 시간대 기준 YYYY-MM-DD
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const dayMs = (key: string): number => Date.parse(`${key}T00:00:00Z`);

export function readSnapshot(): RankSnapshot {
  const storage = getStorage();
  if (!storage) return emptySnapshot();
  try {
    const raw = JSON.parse(storage.getItem(SNAPSHOT_KEY) || 'null') as RankSnapshot | null;
    if (!raw || raw.v !== 1 || !raw.days || typeof raw.days !== 'object') return emptySnapshot();
    const days: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(value)) continue;
      days[key] = value.filter((id): id is string => typeof id === 'string').slice(0, MAX_IDS);
    }
    return { v: 1, days };
  } catch {
    return emptySnapshot();
  }
}

// 오늘보다 앞선 마지막 기록. 너무 오래된 기록(8일 초과)은 비교하지 않는다.
export function previousDayIds(
  snapshot: RankSnapshot,
  todayKey: string,
  maxAgeDays: number = KEEP_DAYS
): string[] | null {
  const today = dayMs(todayKey);
  let bestKey: string | null = null;
  let bestAt = -Infinity;

  for (const key of Object.keys(snapshot.days)) {
    if (key >= todayKey) continue;
    const at = dayMs(key);
    if (isNaN(at)) continue;
    if (!isNaN(today) && (today - at) / 86_400_000 > maxAgeDays) continue;
    if (at > bestAt) {
      bestAt = at;
      bestKey = key;
    }
  }

  const ids = bestKey ? snapshot.days[bestKey] : null;
  return ids && ids.length >= MIN_PREV_FOR_COMPARE ? ids : null;
}

export function withToday(snapshot: RankSnapshot, todayKey: string, ids: string[]): RankSnapshot {
  const days: Record<string, string[]> = { ...snapshot.days, [todayKey]: ids.slice(0, MAX_IDS) };
  const today = dayMs(todayKey);
  for (const key of Object.keys(days)) {
    const at = dayMs(key);
    if (isNaN(at) || (!isNaN(today) && (today - at) / 86_400_000 > KEEP_DAYS)) delete days[key];
  }
  return { v: 1, days };
}

export function persistSnapshot(snapshot: RankSnapshot): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // 저장 공간이 없어도 화면은 그대로 둔다
  }
}
