import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Announcement } from '../types';
import { db, type ContestActivity, type ContestWeeklySignal } from '../supabaseClient';
import { getDDay, isClosed } from '../utils/dday';
import {
  localDayKey,
  movesFrom,
  orderIds,
  persistSnapshot,
  previousDayIds,
  rankSignals,
  readSnapshot,
  withToday,
  type RankMove,
  type RankSignal
} from '../utils/weeklyRanking';

interface WeeklyPopularRankingProps {
  announcements: Announcement[];
  onSelectAnnouncement: (announcement: Announcement) => void;
  // 몇 위까지 보여 줄지 (기본 5)
  limit?: number;
}

// 이번 주 활동을 이만큼까지만 한 번에 물어본다. 앱의 다른 집계와 같은 상한.
const MAX_IDS = 300;
// 어제 순위를 셀 때 쓰는 최근 7일
const WINDOW_DAYS = 7;

type Mode = 'week' | 'alltime' | 'interest';

const latestMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
};

const fromWeekly = (byId: Record<string, ContestWeeklySignal>): RankSignal[] =>
  Object.entries(byId).map(([id, r]) => ({
    id,
    interest: r.week_interest,
    posts: r.week_posts,
    openPosts: r.open_post_count,
    latestAt: latestMs(r.latest_post_at)
  }));

// 어제 같은 시각 기준 순위. 순위 변화만 보려는 것이라 모집 중 글 수는 쓰지 않는다.
const fromWeeklyPrevious = (byId: Record<string, ContestWeeklySignal>): RankSignal[] =>
  Object.entries(byId).map(([id, r]) => ({
    id,
    interest: r.prev_week_interest,
    posts: r.prev_week_posts,
    openPosts: 0,
    latestAt: null
  }));

// 함수가 없을 때 쓰는 누적 활동 기준
const fromActivity = (byId: Record<string, ContestActivity>): RankSignal[] =>
  Object.entries(byId).map(([id, r]) => ({
    id,
    interest: r.interest_total,
    posts: r.post_count,
    openPosts: r.open_post_count,
    latestAt: latestMs(r.latest_post_at)
  }));

// 그것도 없을 때: 이미 있는 '나도 나갈래요' 수만으로
const fromInterests = (counts: Record<string, { total: number }>): RankSignal[] =>
  Object.entries(counts).map(([id, r]) => ({
    id,
    interest: r.total,
    posts: 0,
    openPosts: 0,
    latestAt: null
  }));

const TITLES: Record<Mode, string> = {
  week: '이번 주 많이 본 공고·팀',
  alltime: '지금 많이 보는 공고·팀',
  interest: '지금 많이 보는 공고'
};

const SCALES: Record<Mode, string> = {
  week: '최근 7일',
  alltime: '누적',
  interest: '누적'
};

const moveText = (move: RankMove | undefined): string => {
  if (!move) return '-';
  if (move.kind === 'up') return `▲${move.amount}`;
  if (move.kind === 'down') return `▼${move.amount}`;
  if (move.kind === 'new') return 'NEW';
  return '-';
};

const moveLabel = (move: RankMove | undefined): string => {
  if (!move) return '비교할 지난 순위가 없어요';
  if (move.kind === 'up') return `지난 순위보다 ${move.amount}계단 올랐어요`;
  if (move.kind === 'down') return `지난 순위보다 ${move.amount}계단 내렸어요`;
  if (move.kind === 'new') return '지난 순위에는 없던 곳이에요';
  if (move.kind === 'same') return '지난 순위와 같아요';
  return '비교할 지난 순위가 없어요';
};

const moveColor = (move: RankMove | undefined): string => {
  if (move?.kind === 'up') return 'var(--color-indigo)';
  if (move?.kind === 'new') return 'var(--text-primary)';
  return 'var(--text-tertiary)';
};

const RankChange: React.FC<{ move: RankMove | undefined }> = ({ move }) => {
  const label = moveLabel(move);
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        flex: '0 0 auto',
        minWidth: '32px',
        marginTop: '1px',
        fontSize: '10.5px',
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: '17px',
        color: moveColor(move),
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {moveText(move)}
    </span>
  );
};

// 홈 상단: 이번 주 '나도 나갈래요'와 팀원 모집 활동이 많은 공고 5개와, 어제 대비 순위 변화.
// 집계를 못 받으면 아무것도 그리지 않는다(0건으로 단정하지 않는다).
export const WeeklyPopularRanking: React.FC<WeeklyPopularRankingProps> = ({
  announcements,
  onSelectAnnouncement,
  limit = 5
}) => {
  const [mode, setMode] = useState<Mode>('week');
  const [signals, setSignals] = useState<Record<string, RankSignal> | null>(null);
  const [previousIds, setPreviousIds] = useState<string[] | null>(null);

  // 마감이 지난 공고는 빼고, 최근에 올라온 것부터 상한까지만 본다.
  const candidates = useMemo(() => {
    return announcements
      .filter(ann => ann.id !== 'ann-premium-locked' && !isClosed(ann.deadline))
      .sort((a, b) => (latestMs(b.created_at) ?? 0) - (latestMs(a.created_at) ?? 0))
      .slice(0, MAX_IDS);
  }, [announcements]);

  const candidateKey = useMemo(() => candidates.map(a => a.id).join(','), [candidates]);

  useEffect(() => {
    if (!candidateKey) return;
    let alive = true;

    (async () => {
      const ids = candidateKey.split(',');

      // 1) 이번 주 활동 (20261127_contest_weekly_signal.sql 이 들어간 DB)
      const weekly = await db.getContestWeeklySignal(ids, WINDOW_DAYS);
      if (!alive) return;
      if (weekly.ok) {
        const list = fromWeekly(weekly.byId);
        setMode('week');
        setSignals(Object.fromEntries(list.map(s => [s.id, s])));
        setPreviousIds(orderIds(fromWeeklyPrevious(weekly.byId)));
        return;
      }

      // 2) 아직 함수가 없는 DB: 누적 활동으로 순위만 보여 준다
      const activity = await db.getContestActivity(ids);
      if (!alive) return;
      if (activity.ok) {
        const list = fromActivity(activity.byId);
        setMode('alltime');
        setSignals(Object.fromEntries(list.map(s => [s.id, s])));
        setPreviousIds(null);
        return;
      }

      // 3) 그 함수도 없으면 이미 있는 '나도 나갈래요' 수만으로 (위 함수는 최대 200개까지 본다)
      try {
        const counts = await db.getInterestCounts(ids);
        if (!alive) return;
        if (Object.keys(counts).length > 0) {
          const list = fromInterests(counts);
          setMode('interest');
          setSignals(Object.fromEntries(list.map(s => [s.id, s])));
          setPreviousIds(null);
          return;
        }
      } catch {
        // 아래에서 아무것도 그리지 않는다
      }
      if (!alive) return;

      // 4) 다 못 받으면 섹션을 그리지 않는다
      setSignals(null);
    })();

    return () => {
      alive = false;
    };
  }, [candidateKey]);

  const ranked = useMemo(
    () => (signals ? rankSignals(Object.values(signals), limit) : []),
    [signals, limit]
  );

  const byId = useMemo(() => {
    const map: Record<string, Announcement> = {};
    for (const ann of announcements) map[ann.id] = ann;
    return map;
  }, [announcements]);

  // 오늘 순위는 화면에 그릴 때 계산한다. 지난 순위는 서버(어제 같은 시각)를 먼저 믿고,
  // 없으면 이 기기에 남겨 둔 지난 방문 기록을 쓴다.
  const moves = useMemo(() => {
    const saved = previousDayIds(readSnapshot(), localDayKey());
    const prev = previousIds && previousIds.length ? previousIds : saved;
    return movesFrom(prev, ranked);
  }, [previousIds, ranked]);

  const todayKey = localDayKey();
  const savedToday = useRef<string | null>(null);
  useEffect(() => {
    if (ranked.length === 0) return;
    const ids = ranked.map(entry => entry.id).join(',');
    if (savedToday.current === `${todayKey}|${ids}`) return;
    persistSnapshot(withToday(readSnapshot(), todayKey, ranked.map(entry => entry.id)));
    savedToday.current = `${todayKey}|${ids}`;
  }, [ranked, todayKey]);

  if (ranked.length === 0) return null;

  const visible = ranked.filter(entry => byId[entry.id]);
  if (visible.length === 0) return null;

  const note =
    mode === 'week'
      ? `최근 ${WINDOW_DAYS}일 '나도 나갈래요'와 새 팀원 모집 글로 매일 순위를 매겨요. 화살표는 어제와 비교한 값이에요.`
      : mode === 'alltime'
        ? "'나도 나갈래요'와 팀원 모집 글이 많은 순서예요. 화살표는 지난번 볼 때와 비교한 값이에요."
        : "'나도 나갈래요'를 많이 누른 순서예요. 화살표는 지난번 볼 때와 비교한 값이에요.";

  return (
    <section
      aria-labelledby="weekly-popular-title"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4DFD4',
        borderRadius: '14px',
        padding: '16px 16px 4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <h2
          id="weekly-popular-title"
          style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          {TITLES[mode]}
        </h2>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
          {SCALES[mode]}
        </span>
      </div>
      <p style={{ margin: '5px 0 4px', fontSize: '11.5px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        {note}
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {visible.map((entry, index) => {
          const ann = byId[entry.id];
          const signal = signals?.[entry.id];
          const meta: string[] = [];
          const dday = getDDay(ann.deadline);
          if (dday !== '마감') meta.push(dday);
          if (signal && signal.interest > 0) meta.push(`나갈래요 ${signal.interest}명`);
          if (signal && signal.posts > 0) meta.push(mode === 'week' ? `새 모집 글 ${signal.posts}건` : `모집 글 ${signal.posts}건`);
          if (signal && signal.openPosts > 0) meta.push(`모집 중 ${signal.openPosts}건`);

          return (
            <li key={entry.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #F1EDE4' }}>
              <button
                type="button"
                onClick={() => onSelectAnnouncement(ann)}
                className="spring-active"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '11px 0 12px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    width: '14px',
                    marginTop: '1px',
                    fontSize: '14px',
                    fontWeight: 800,
                    lineHeight: '17px',
                    color: entry.rank === 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {entry.rank}
                </span>
                <RankChange move={moves[entry.id]} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      lineHeight: 1.4,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {ann.title}
                  </span>
                  {meta.length > 0 && (
                    <span style={{ display: 'block', marginTop: '3px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                      {meta.join(' · ')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
