import React from 'react';
import type { ContestActivity } from '../supabaseClient';

import { recentLabel } from '../utils/activity';

interface ActivityLineProps {
  activity?: ContestActivity;
}

// 대회 카드 아래 한 줄: 실제 팀 모집 글 수, 나갈래요 수, 최근 새 글. 0인 항목은 말하지 않는다.
export const ActivityLine: React.FC<ActivityLineProps> = ({ activity }) => {
  if (!activity) return null;
  const parts: string[] = [];
  if (activity.post_count > 0) parts.push(`팀 모집 글 ${activity.post_count}개`);
  if (activity.interest_total > 0) parts.push(`나갈래요 ${activity.interest_total}명`);
  const recent = recentLabel(activity.latest_post_at);
  if (parts.length === 0) return null;
  return (
    <div className="activity-line" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
      <span>{parts.join(' · ')}</span>
      {recent && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857' }}>
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
          {recent}
        </span>
      )}
    </div>
  );
};
