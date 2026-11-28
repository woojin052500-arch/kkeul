import React, { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldOff, UserPlus } from 'lucide-react';
import type { Profile } from '../types';
import { db, type MyInterestInfo, type RosterEntry, type TeamupRequest } from '../supabaseClient';

interface TeamupRosterProps {
  announcementId: string;
  profile: Profile;
  // "나도 나갈래요"를 누르거나 취소할 때마다 바뀌는 값. 바뀌면 다시 불러온다.
  tick: number;
}

const errText = (err: unknown) => (err instanceof Error ? err.message : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');

const smallBtn: React.CSSProperties = {
  border: '1px solid #E5E7EB', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600,
  padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 10px', fontSize: '13px', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', background: '#FAFBFC'
};
const roleColors: Record<string, { bg: string; txt: string }> = {
  개발: { bg: '#E5F6FF', txt: '#0070F3' },
  기획: { bg: '#FFF3E0', txt: '#E65100' },
  디자인: { bg: '#E8F5E9', txt: '#2E7D32' }
};

// 대회 상세: 함께 나갈 사람 명단. 한 줄 소개를 직접 올린 사람만 나오고,
// 연락처는 "같이 나갈래요"가 수락된 사람에게만 보인다.
export const TeamupRoster: React.FC<TeamupRosterProps> = ({ announcementId, profile, tick }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [requests, setRequests] = useState<TeamupRequest[]>([]);
  const [mine, setMine] = useState<MyInterestInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState(profile.contact || '');
  const [contacts, setContacts] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    try {
      const [r, q, m] = await Promise.all([
        db.getRoster(announcementId),
        db.getTeamupRequests(announcementId),
        db.getMyInterestInfo(announcementId)
      ]);
      setRoster(r);
      setRequests(q);
      setMine(m);
      setIntro(m?.intro || '');
      setFailed(false);
      // 수락된 사이의 연락처
      const found: Record<string, string | null> = {};
      for (const req of q.filter(x => x.status === 'accepted')) {
        const other = req.from_user_id === profile.id ? req.to_user_id : req.from_user_id;
        found[other] = await db.getContact(other).catch(() => null);
      }
      setContacts(found);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, [announcementId, profile.id]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) load(); });
    return () => {
      alive = false;
    };
  }, [load, tick]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      alert(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const saveIntro = (value: string) =>
    run(async () => {
      await db.setMyIntro(announcementId, value);
      await load();
    });

  const send = (entry: RosterEntry) => {
    if (!contact.trim()) {
      alert('내 연락처를 적어 주세요. 수락한 사람에게만 보여요.');
      return;
    }
    run(async () => {
      await db.saveMyContact(contact.trim());
      await db.sendTeamupRequest(announcementId, entry.user_id, profile.name, message);
      setOpenId(null);
      setMessage('');
      await load();
    });
  };

  const respond = (req: TeamupRequest, status: 'accepted' | 'declined') => {
    if (status === 'accepted' && !contact.trim()) {
      alert('수락하려면 내 연락처를 적어 주세요. 수락한 사람에게만 보여요.');
      return;
    }
    run(async () => {
      if (status === 'accepted') await db.saveMyContact(contact.trim());
      await db.respondTeamup(req.id, status);
      await load();
    });
  };

  const report = (type: 'contest_interest' | 'teamup_request', id: string) => {
    const reason = window.prompt('신고 사유를 적어 주세요. (선택)\n신고하면 이 내용은 바로 숨겨지고 운영자가 확인해요.', '');
    if (reason === null) return;
    run(async () => {
      await db.reportContent(type, id, reason.trim());
      if (type === 'contest_interest') setRoster(prev => prev.filter(e => e.id !== id));
      else setRequests(prev => prev.filter(r => r.id !== id));
      alert('신고가 접수됐어요. 해당 내용은 숨김 처리됐어요.');
    });
  };

  const block = (userId: string, name: string) => {
    if (!window.confirm(`${name}님을 차단할까요?\n차단하면 서로의 명단과 요청이 보이지 않아요. 상대에게는 알리지 않아요.`)) return;
    run(async () => {
      await db.blockUser(userId);
      await load();
    });
  };

  if (!loaded) return null;
  if (failed) return null;

  const received = requests.filter(r => r.to_user_id === profile.id);
  const pendingIn = received.filter(r => r.status === 'pending');
  const acceptedIn = received.filter(r => r.status === 'accepted');
  const sentTo = (userId: string) => requests.find(r => r.from_user_id === profile.id && r.to_user_id === userId);

  return (
    <section className="teamup-roster" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={16} color="var(--color-indigo)" /> 함께 나갈 사람
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          이 대회에 나가고 싶다며 한 줄 소개를 올린 회원이에요. 마음에 들면 "같이 나갈래요"를 보내 보세요.
        </p>
      </div>

      {/* 내 소개 */}
      {mine ? (
        <div className="roster-mine" style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F8FAFC', borderRadius: '10px', padding: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }} htmlFor="roster-intro">
            내 한 줄 소개 {mine.listed && <span style={{ color: '#047857' }}>· 명단에 올라가 있어요</span>}
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input id="roster-intro" value={intro} maxLength={60} onChange={(e) => setIntro(e.target.value)} placeholder="예: 파이썬 백엔드 가능해요. 주말 위주" style={inputStyle} />
            <button type="button" disabled={busy || !intro.trim()} onClick={() => saveIntro(intro)} style={{ ...smallBtn, background: 'var(--color-ink)', color: '#FFFFFF', border: 'none', flexShrink: 0, opacity: !intro.trim() ? 0.5 : 1 }}>
              {mine.listed ? '수정' : '명단에 올리기'}
            </button>
            {mine.listed && <button type="button" disabled={busy} onClick={() => saveIntro('')} style={{ ...smallBtn, flexShrink: 0 }}>내리기</button>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {intro.length}/60 · 올리면 이 대회를 보는 회원에게 이름·역할·소개가 보여요. 연락처와 링크는 쓸 수 없고, 수락된 사람에게만 연락처가 공유돼요.
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: '#F8FAFC', borderRadius: '10px', padding: '10px' }}>
          위의 <strong>나도 나갈래요</strong>를 누르면 내 소개를 명단에 올릴 수 있어요.
        </div>
      )}

      {/* 받은 요청 */}
      {(pendingIn.length > 0 || acceptedIn.length > 0) && (
        <div className="teamup-received" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            받은 같이 나갈래요
            {pendingIn.length > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: 'var(--color-red)', padding: '1px 6px', borderRadius: '8px' }}>대기 {pendingIn.length}</span>}
          </div>
          {pendingIn.length > 0 && (
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="내 연락처 (수락한 사람에게만 보여요)" aria-label="내 연락처" style={inputStyle} />
          )}
          {pendingIn.map(req => (
            <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F8FAFC', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}><strong>{req.from_name}</strong>{req.message ? ` · ${req.message}` : ' · 같이 나가요!'}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" disabled={busy} onClick={() => respond(req, 'accepted')} style={{ ...smallBtn, background: 'var(--color-indigo)', color: '#FFFFFF', border: 'none' }}>수락</button>
                <button type="button" disabled={busy} onClick={() => respond(req, 'declined')} style={smallBtn}>거절</button>
                <button type="button" disabled={busy} onClick={() => report('teamup_request', req.id)} style={smallBtn}><Flag size={11} /> 신고</button>
                <button type="button" disabled={busy} onClick={() => block(req.from_user_id, req.from_name)} style={smallBtn}><ShieldOff size={11} /> 차단</button>
              </div>
            </div>
          ))}
          {acceptedIn.map(req => (
            <div key={req.id} style={{ fontSize: '13px', color: 'var(--text-primary)', background: '#ECFDF5', borderRadius: '10px', padding: '10px' }}>
              <strong>{req.from_name}</strong> 님과 같이 나가요 · 연락처: <strong>{contacts[req.from_user_id] || '상대가 연락처를 적지 않았어요'}</strong>
            </div>
          ))}
        </div>
      )}

      {/* 명단 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
        {roster.length === 0 && (
          <div style={{ textAlign: 'center', padding: '14px 0', fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            아직 명단에 오른 사람이 없어요.<br />먼저 소개를 올리면 같은 대회를 준비하는 사람이 찾아와요.
          </div>
        )}
        {roster.map(entry => {
          const sent = sentTo(entry.user_id);
          const color = roleColors[entry.role] || roleColors.기획;
          return (
            <div key={entry.id} className="roster-entry" style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '13px' }}>{entry.user_name}</strong>
                <span style={{ fontSize: '10px', fontWeight: 700, background: color.bg, color: color.txt, padding: '2px 6px', borderRadius: '4px' }}>{entry.role}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{entry.intro}</div>

              {sent?.status === 'accepted' ? (
                <div style={{ fontSize: '13px', background: '#ECFDF5', borderRadius: '8px', padding: '8px 10px' }}>
                  수락됐어요 · 연락처: <strong>{contacts[entry.user_id] || '상대가 연락처를 적지 않았어요'}</strong>
                </div>
              ) : sent?.status === 'declined' ? (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>이번에는 어렵대요.</div>
              ) : sent ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>요청을 보냈어요. 답을 기다리는 중이에요.</span>
                  <button type="button" disabled={busy} onClick={() => run(async () => { await db.cancelTeamup(sent.id); await load(); })} style={smallBtn}>취소</button>
                </div>
              ) : openId === entry.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                  <input value={message} maxLength={60} onChange={(e) => setMessage(e.target.value)} placeholder="한마디 (선택) 예: 기획 맡을게요" aria-label="한마디" style={inputStyle} />
                  <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="내 연락처 (수락한 사람에게만 보여요)" aria-label="내 연락처" style={inputStyle} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" disabled={busy} onClick={() => send(entry)} style={{ ...smallBtn, background: 'var(--color-ink)', color: '#FFFFFF', border: 'none', padding: '7px 12px' }}>보내기</button>
                    <button type="button" onClick={() => setOpenId(null)} style={smallBtn}>닫기</button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>연락처와 링크는 한마디에 쓸 수 없어요. 상대가 수락하면 서로의 연락처가 보여요.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setOpenId(entry.id); setMessage(''); }} className="btn btn-primary" style={{ width: 'auto', height: '34px', padding: '0 14px', fontSize: '13px', borderRadius: '8px' }}>같이 나갈래요</button>
                  <button type="button" disabled={busy} onClick={() => report('contest_interest', entry.id)} style={smallBtn}><Flag size={11} /> 신고</button>
                  <button type="button" disabled={busy} onClick={() => block(entry.user_id, entry.user_name)} style={smallBtn}><ShieldOff size={11} /> 차단</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
