import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import type { ContestActivity } from '../supabaseClient';

import { recentLabel } from '../utils/activity';

interface ActivityLineProps {
  activity?: ContestActivity;
  // 이 대회로 팀원 모집 글을 올릴 수 있는지 (마감된 공고에는 첫 팀장 되기를 걸지 않는다)
  allowStart?: boolean;
  // 모집 중인 글이 있을 때: 그 대회의 팀원 모집 목록으로
  onOpenRoster?: () => void;
  // 모집 중인 글이 없을 때: 이 대회로 팀원 모집 글 쓰기
  onStartTeam?: () => void;
}

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  border: 'none',
  borderRadius: '30px',
  padding: '4px 9px',
  fontSize: '12px',
  lineHeight: 1,
  fontWeight: 700
};

// 대회 카드 아래 한 줄: 지금 모집 중인 팀원 글 수, 나갈래요 수, 최근 새 글.
// 모집 중인 글이 있으면 그 대회의 팀원 모집 목록으로, 없으면 이 대회 첫 팀장이 되는 글로 이어진다.
// 집계 행이 없는 대회는 글이 없는 대회로 본다. 집계 자체를 못 받았을 때는 호출부가 버튼을 넘기지 않는다.
export const ActivityLine: React.FC<ActivityLineProps> = ({ activity, allowStart = true, onOpenRoster, onStartTeam }) => {
  const openCount = activity?.open_post_count ?? 0;
  const postCount = activity?.post_count ?? 0;
  const interestTotal = activity?.interest_total ?? 0;
  const recent = recentLabel(activity?.latest_post_at);

  const showRoster = openCount > 0;
  const showStart = !showRoster && allowStart && !!onStartTeam;
  if (!showRoster && !showStart && interestTotal <= 0 && postCount <= 0) return null;

  const handle = (e: React.MouseEvent, action?: () => void) => {
    // 카드 전체를 누르면 상세로 가는 기존 동선을 건드리지 않는다
    e.stopPropagation();
    action?.();
  };

  return (
    <div
      className="activity-line"
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}
    >
      {showRoster && (
        onOpenRoster ? (
          <button
            type="button"
            onClick={(e) => handle(e, onOpenRoster)}
            className="spring-active"
            aria-label={`팀원 모집 ${openCount}건 보기`}
            style={{ ...badgeBase, background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', cursor: 'pointer' }}
          >
            팀원 모집 {openCount}건
            <ArrowRight size={11} strokeWidth={3} aria-hidden="true" />
          </button>
        ) : (
          <span style={{ ...badgeBase, background: 'var(--color-indigo-light)', color: 'var(--color-indigo)' }}>
            팀원 모집 {openCount}건
          </span>
        )
      )}

      {!showRoster && postCount > 0 && (
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>모집 마감 {postCount}건</span>
      )}

      {showStart && (
        <button
          type="button"
          onClick={(e) => handle(e, onStartTeam)}
          className="spring-active"
          aria-label="이 대회 첫 팀장 되어 팀원 모집 글 쓰기"
          style={{ ...badgeBase, background: '#FFFFFF', color: 'var(--text-secondary)', border: '1px solid #E5E7EB', cursor: 'pointer' }}
        >
          <Plus size={11} strokeWidth={3} aria-hidden="true" />
          첫 팀장 되기
        </button>
      )}

      {interestTotal > 0 && <span>나갈래요 {interestTotal}명</span>}

      {recent && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857' }}>
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
          {recent}
        </span>
      )}
    </div>
  );
};
