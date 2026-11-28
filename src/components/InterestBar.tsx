import React, { useEffect, useState } from 'react';
import { Check, Hand } from 'lucide-react';
import { db, type InterestCount, type TeamRole } from '../supabaseClient';

const ROLES: TeamRole[] = ['개발', '디자인', '기획'];
const EMPTY: InterestCount = { total: 0, 개발: 0, 디자인: 0, 기획: 0 };

interface InterestBarProps {
  announcementId: string;
  isGuest?: boolean;
  onRequireLogin?: (reason: string) => void;
  // 진단에서 고른 역할이 있으면 역할을 다시 묻지 않는다
  defaultRole?: TeamRole;
  // 바깥에서 이미 불러온 값이 있으면 넘겨받는다
  initialCount?: InterestCount;
  initialRole?: TeamRole | null;
  compact?: boolean;
  // 나갈래요를 누르거나 취소해서 값이 바뀐 뒤에 부른다 (함께 나갈 사람 명단을 다시 불러오는 데 쓴다)
  onChanged?: () => void;
  // '나도 나갈래요'를 처음 누르고 역할이 정해졌을 때 (친구 초대 카드를 띄우는 데 쓴다)
  onJoined?: (role: TeamRole) => void;
  // 값이 바뀔 때마다 역할 고르기를 다시 연다 (초대 배너의 '나도 나갈래요')
  joinPrompt?: number;
}

const chip: React.CSSProperties = {
  border: '1px solid #E5E7EB', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700,
  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer'
};

// "나도 나갈래요": 구인글을 쓰지 않아도 한 번 눌러 이 대회에 나갈 사람으로 표시한다.
// 다른 사람에게는 역할별 인원수만 보인다.
export const InterestBar: React.FC<InterestBarProps> = ({ announcementId, isGuest = false, onRequireLogin, defaultRole, initialCount, initialRole, compact = false, onChanged, onJoined, joinPrompt = 0 }) => {
  const [count, setCount] = useState<InterestCount>(initialCount || EMPTY);
  const [myRole, setMyRole] = useState<TeamRole | null>(initialRole ?? null);
  const [picking, setPicking] = useState(false);
  // 초대 배너가 열어 달라고 한 역할 고르기 중 이미 처리한 횟수 (effect 없이 계산)
  const [handledPrompt, setHandledPrompt] = useState(0);
  const [busy, setBusy] = useState(false);
  const showPicker = !myRole && (picking || joinPrompt > handledPrompt);

  useEffect(() => {
    if (initialCount !== undefined || initialRole !== undefined) return;
    let alive = true;
    db.getInterestCounts([announcementId])
      .then(res => alive && setCount(res[announcementId] || EMPTY))
      .catch(() => {});
    if (!isGuest) {
      db.getMyInterests()
        .then(res => alive && setMyRole(res[announcementId] || null))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [announcementId, isGuest, initialCount, initialRole]);

  const apply = async (role: TeamRole | null) => {
    if (busy) return;
    const prevRole = myRole;
    const prevCount = count;
    const next = { ...count };
    if (prevRole) {
      next[prevRole] = Math.max(0, next[prevRole] - 1);
      next.total = Math.max(0, next.total - 1);
    }
    if (role) {
      next[role] += 1;
      next.total += 1;
    }
    setMyRole(role);
    setCount(next);
    setPicking(false);
    setHandledPrompt(joinPrompt);
    setBusy(true);
    try {
      await db.setInterest(announcementId, role);
      onChanged?.();
      // 이 대회에 처음 나가겠다고 표시했으면 친구 초대 카드를 띄운다
      if (role && !prevRole) onJoined?.(role);
    } catch (err) {
      setMyRole(prevRole);
      setCount(prevCount);
      alert(err instanceof Error ? err.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = () => {
    if (isGuest) {
      onRequireLogin?.('가입하면 한 번 눌러서 이 대회에 같이 나갈 사람으로 표시할 수 있어요.');
      return;
    }
    if (defaultRole) apply(defaultRole);
    else setPicking(true);
  };

  // 두 명 이상 모였는데 아무도 없는 역할
  const wanted = count.total >= 2 ? ROLES.filter(r => count[r] === 0) : [];

  return (
    <div className="interest-bar" data-compact={compact ? 'true' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: compact ? 'transparent' : '#FFFFFF', border: compact ? 'none' : '1px solid #E5E7EB', borderRadius: '12px', padding: compact ? 0 : '16px', textAlign: 'left' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {count.total > 0 ? (
          <>
            <strong style={{ color: 'var(--text-primary)' }}>같이 나갈 사람 {count.total}명</strong>
            <span>· {ROLES.map(r => `${r} ${count[r]}`).join(' · ')}</span>
            {wanted.map(r => (
              <span key={r} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-red)', background: 'var(--color-red-light)', padding: '2px 6px', borderRadius: '5px' }}>{r} 급구</span>
            ))}
          </>
        ) : (
          <span>아직 표시한 사람이 없어요. 먼저 눌러 두면 같은 대회를 준비하는 학생이 찾아와요.</span>
        )}
      </div>

      {myRole ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '8px 12px', borderRadius: '10px' }}>
            <Check size={14} /> {myRole} 역할로 나갈래요
          </span>
          <button type="button" disabled={busy} onClick={() => apply(null)} style={{ ...chip, fontWeight: 600 }}>취소</button>
        </div>
      ) : showPicker ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>어떤 역할로 나갈래요?</span>
          {ROLES.map(r => (
            <button key={r} type="button" disabled={busy} onClick={() => apply(r)} style={{ ...chip, color: 'var(--color-indigo)', borderColor: 'var(--color-indigo)' }}>{r}</button>
          ))}
          <button type="button" disabled={busy} onClick={() => { setPicking(false); setHandledPrompt(joinPrompt); }} style={{ ...chip, fontWeight: 600, color: 'var(--text-tertiary)' }}>취소</button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={onJoin} className="btn btn-primary" style={{ height: '42px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Hand size={15} /> 나도 나갈래요
        </button>
      )}
    </div>
  );
};
