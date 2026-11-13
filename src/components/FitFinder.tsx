import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Copy, Check, RotateCcw, Sparkles } from 'lucide-react';
import type { Announcement } from '../types';
import { db, type InterestCount, type TeamRole } from '../supabaseClient';
import { LEVELS, ROLES, TRACKS, findBestFits, type Level, type Role, type Track } from '../utils/fit';
import { getDDay } from '../utils/dday';
import { InterestBar } from './InterestBar';

interface FitFinderProps {
  announcements: Announcement[];
  isGuest?: boolean;
  onRequireLogin?: (reason: string) => void;
  onSelectAnnouncement: (a: Announcement) => void;
}

const STORE_KEY = 'kkeul_fit_choice';
type Choice = { track: Track | null; level: Level | null; role: Role | null };

const loadChoice = (): Choice => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') as Partial<Choice> | null;
    return {
      track: raw && TRACKS.includes(raw.track as Track) ? (raw.track as Track) : null,
      level: raw && LEVELS.includes(raw.level as Level) ? (raw.level as Level) : null,
      role: raw && ROLES.includes(raw.role as Role) ? (raw.role as Role) : null
    };
  } catch {
    return { track: null, level: null, role: null };
  }
};

const optBtn = (on: boolean): React.CSSProperties => ({
  border: on ? '1.5px solid var(--color-indigo)' : '1px solid #E5E8EB',
  background: on ? 'var(--color-indigo-light)' : '#FFFFFF',
  color: on ? 'var(--color-indigo)' : 'var(--text-secondary)',
  fontSize: '13px', fontWeight: on ? 800 : 600, padding: '9px 12px', borderRadius: '10px', cursor: 'pointer'
});

// 홈 맨 위: 계열·학년·역할 세 번만 누르면 맞는 대회 3개와 세특 포인트, 같이 나갈 사람 수를 보여 준다.
export const FitFinder: React.FC<FitFinderProps> = ({ announcements, isGuest = false, onRequireLogin, onSelectAnnouncement }) => {
  const [choice, setChoice] = useState<Choice>(loadChoice);
  const [counts, setCounts] = useState<Record<string, InterestCount> | null>(null);
  const [mine, setMine] = useState<Record<string, TeamRole>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const done = !!(choice.track && choice.level && choice.role);
  const results = useMemo(
    () => (done ? findBestFits(announcements, choice.track as Track, choice.level as Level, choice.role as Role) : []),
    [announcements, choice, done]
  );
  const ids = results.map(r => r.announcement.id).join(',');

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(choice));
    } catch {
      // 저장 못 해도 진행
    }
  }, [choice]);

  useEffect(() => {
    if (!ids) return;
    let alive = true;
    Promise.all([
      db.getInterestCounts(ids.split(',')).catch(() => ({} as Record<string, InterestCount>)),
      isGuest ? Promise.resolve({} as Record<string, TeamRole>) : db.getMyInterests().catch(() => ({} as Record<string, TeamRole>))
    ]).then(([c, m]) => {
      if (!alive) return;
      setCounts(c);
      setMine(m);
    });
    return () => {
      alive = false;
    };
  }, [ids, isGuest]);

  const pick = (patch: Partial<Choice>) => {
    setCounts(null);
    setChoice(prev => ({ ...prev, ...patch }));
  };

  const copyDraft = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(c => (c === id ? null : c)), 2000);
    } catch {
      alert(text);
    }
  };

  return (
    <section className="fit-finder" style={{ background: '#FFFFFF', border: '1px solid #E5E8EB', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
      <div>
        <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={18} color="var(--color-indigo)" /> 나한테 맞는 대회 찾기
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          세 가지만 누르면 생기부에 맞는 대회와 같이 나갈 팀원을 바로 보여 드려요.
        </p>
      </div>

      {!done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>1. 희망 계열</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TRACKS.map(t => <button key={t} type="button" style={optBtn(choice.track === t)} aria-pressed={choice.track === t} onClick={() => pick({ track: t })}>{t}</button>)}
            </div>
          </div>
          {choice.track && (
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>2. 학년</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {LEVELS.map(l => <button key={l} type="button" style={optBtn(choice.level === l)} aria-pressed={choice.level === l} onClick={() => pick({ level: l })}>{l}</button>)}
              </div>
            </div>
          )}
          {choice.track && choice.level && (
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>3. 팀에서 맡고 싶은 역할</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ROLES.map(r => <button key={r} type="button" style={optBtn(choice.role === r)} aria-pressed={choice.role === r} onClick={() => pick({ role: r })}>{r}</button>)}
              </div>
            </div>
          )}
        </div>
      )}

      {done && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-indigo)', background: 'var(--color-indigo-light)', padding: '5px 10px', borderRadius: '8px' }}>
              {choice.track} · {choice.level} · {choice.role}
            </span>
            <button type="button" onClick={() => pick({ track: null, level: null, role: null })} style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <RotateCcw size={12} /> 다시 고르기
            </button>
          </div>

          {results.length === 0 && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
              지금 접수 중인 대회 중에는 딱 맞는 대회가 없어요. 계열을 바꿔서 다시 찾아보세요.
            </p>
          )}

          {results.map((r, i) => {
            const a = r.announcement;
            return (
              <article key={a.id} className="fit-result" style={{ border: i === 0 ? '1.5px solid var(--color-indigo)' : '1px solid #E5E8EB', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: i === 0 ? '#FFFFFF' : 'var(--color-indigo)', background: i === 0 ? 'var(--color-indigo)' : 'var(--color-indigo-light)', padding: '3px 8px', borderRadius: '6px' }}>
                    핏 {i + 1}위 · {r.score}점
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-red)' }}>{getDDay(a.deadline)}</span>
                </div>
                <button type="button" onClick={() => onSelectAnnouncement(a)} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <strong style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>{a.title}</strong>
                  <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                </button>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{a.host}</div>

                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>이 점수인 이유</strong> {r.reasons.join(' · ')}
                </div>

                {i === 0 && (
                  <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>생기부에 남기기 좋은 점</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {r.points.map(p => <li key={p}>{p}</li>)}
                    </ul>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>선생님께 드릴 활동 요약 초안</span>
                      <button type="button" onClick={() => copyDraft(a.id, r.draft)} style={{ border: '1px solid #E5E8EB', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {copied === a.id ? <Check size={11} color="#10B981" /> : <Copy size={11} />} {copied === a.id ? '복사됨' : '복사'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{r.draft}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>대회에서 실제로 한 일에 맞게 고쳐서 쓰세요.</p>
                  </div>
                )}

                {counts !== null && (
                  <InterestBar
                    key={`${a.id}-${mine[a.id] || ''}`}
                    compact
                    announcementId={a.id}
                    isGuest={isGuest}
                    onRequireLogin={onRequireLogin}
                    defaultRole={choice.role as TeamRole}
                    initialCount={counts[a.id] || { total: 0, 개발: 0, 디자인: 0, 기획: 0 }}
                    initialRole={mine[a.id] || null}
                  />
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
};
