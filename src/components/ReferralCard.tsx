import React, { useEffect, useState } from 'react';
import { Check, Copy, Share2, UserPlus } from 'lucide-react';
import { db, referralErrorText, type ReferralStats } from '../supabaseClient';
import { shareLink, SITE_URL } from '../utils/share';

interface ReferralCardProps {
  // 코드를 넣어 XP 를 받았을 때 화면의 XP 를 맞춘다
  onXpChange?: (xp: number) => void;
}

// 내 정보 탭: 내 추천인 코드와 내 코드로 가입한 친구, 그리고 친구 코드 입력
export const ReferralCard: React.FC<ReferralCardProps> = ({ onXpChange }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    db.getReferralStats()
      .then(s => alive && setStats(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed || !stats) {
    return failed ? null : <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>추천인 코드를 불러오는 중…</div>;
  }

  const link = `${SITE_URL}/?ref=${stats.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stats.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('추천인 코드를 복사해 주세요', stats.code);
    }
  };

  const share = () =>
    shareLink({
      title: '끌 추천인 코드',
      text: `끌에서 대회 같이 나갈 팀원 찾자! 가입할 때 추천인 코드 ${stats.code} 넣으면 둘 다 100XP 받아.`,
      url: link
    });

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      const result = await db.applyReferral(input.trim());
      if (result.ok) {
        setStats({ ...stats, used_code: true });
        setMessage({ ok: true, text: `${result.inviter_name || '친구'}님의 코드가 적용됐어요. 두 사람 모두 100XP를 받았어요.` });
        if (typeof result.xp === 'number') onXpChange?.(result.xp);
      } else {
        setMessage({ ok: false, text: referralErrorText(result.reason) });
      }
    } catch {
      setMessage({ ok: false, text: '확인하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  const smallBtn: React.CSSProperties = {
    border: '1px solid #E5E7EB', background: '#FFFFFF', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
    padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
  };

  return (
    <div className="referral-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
        <UserPlus size={16} color="var(--color-indigo)" /> 내 추천인 코드
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--color-bg-gray)', borderRadius: '10px', padding: '12px 14px' }}>
        <strong className="referral-code" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '3px', color: 'var(--text-primary)' }}>{stats.code}</strong>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={copy} style={smallBtn}>{copied ? <Check size={13} color="#059669" /> : <Copy size={13} />} {copied ? '복사됨' : '복사'}</button>
          <button type="button" onClick={share} style={smallBtn}><Share2 size={13} /> 공유</button>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
        친구가 가입할 때 이 코드를 넣으면 두 사람 모두 100XP를 받아요.
      </p>

      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
        내 코드로 가입한 친구 <strong style={{ color: 'var(--color-indigo)' }}>{stats.invited_count}명</strong>
        {stats.invited.length > 0 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}> · {stats.invited.slice(0, 5).map(i => i.name || '이름 없음').join(', ')}{stats.invited.length > 5 ? ' 외' : ''}</span>
        )}
      </div>

      {!stats.used_code && (
        <form onSubmit={apply} style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
          <input
            type="text"
            placeholder="친구의 추천인 코드 8자리"
            aria-label="친구의 추천인 코드"
            value={input}
            maxLength={12}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: '13px', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', backgroundColor: '#FAFBFC' }}
          />
          <button type="submit" disabled={busy || !input.trim()} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700, backgroundColor: 'var(--color-indigo)', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>
            적용
          </button>
        </form>
      )}
      {message && <p role="status" style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: message.ok ? '#059669' : 'var(--color-red)' }}>{message.text}</p>}
    </div>
  );
};
