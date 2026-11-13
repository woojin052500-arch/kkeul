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
}

const chip: React.CSSProperties = {
  border: '1px solid #E4DFD4', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700,
  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer'
};

// "나도 나갈래요": 구인글을 쓰지 않아도 한 번 눌러 이 대회에 나갈 사람으로 표시한다.
// 다른 사람에게는 역할별 인원수만 보인다.
export const InterestBar: React.FC<InterestBarProps> = ({ announcementId, isGuest = false, onRequireLogin, defaultRole, initialCount, initialRole, compact = false }) => {
  const [count, setCount] = useState<InterestCount>(initialCount || EMPTY);
  const [myRole, setMyRole] = useState<TeamRole | null>(initialRole ?? null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await db.setInterest(announcementId, role);
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
    <div className="interest-bar" data-compact={compact ? 'true' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: compact ? 'transparent' : '#FFFFFF', border: compact ? 'none' : '1px solid #E4DFD4', borderRadius: '12px', padding: compact ? 0 : '16px', textAlign: 'left' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {count.total > 0 ? (
          <>
            <strong style={{ color: 'var(--text-primary)' }}>같이 나갈 사람 {count.total}명</strong>
            <span>· {ROLES.map(r => `${r} ${count[r]}`).join(' · ')}</span>
            {wanted.map(r => (
              <span key={r} style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-red)', background: 'var(--color-red-light)', padding: '2px 6px', borderRadius: '5px' }}>{r} 급구</span>
            ))}
          </>
        ) : (
          <span>아직 표시한 사람이 없어요. 먼저 눌러 두면 같은 대회를 준비하는 학생이 찾아와요.</span>
        )}
      </div>

      {myRole ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '8px 12px', borderRadius: '10px' }}>
            <Check size={14} /> {myRole} 역할로 나갈래요
          </span>
          <button type="button" disabled={busy} onClick={() => apply(null)} style={{ ...chip, fontWeight: 600 }}>취소</button>
        </div>
      ) : picking ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>어떤 역할로 나갈래요?</span>
          {ROLES.map(r => (
            <button key={r} type="button" disabled={busy} onClick={() => apply(r)} style={{ ...chip, color: 'var(--color-indigo)', borderColor: 'var(--color-indigo)' }}>{r}</button>
          ))}
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={onJoin} className="btn btn-primary" style={{ height: '42px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Hand size={15} /> 나도 나갈래요
        </button>
      )}
    </div>
  );
};
