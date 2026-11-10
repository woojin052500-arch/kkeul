import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Announcement, ClubAnnouncement } from '../types';
import { db, type AdminReport, type AdminSuspendedUser } from '../supabaseClient';
import { getDDay } from '../utils/dday';

interface AdminPanelProps {
  announcements: Announcement[];
  onAnnouncementDeleted: (id: string) => void;
  onClose: () => void;
}

type Tab = 'reports' | 'suspended' | 'announcements' | 'clubs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'reports', label: '신고' },
  { id: 'suspended', label: '이용 정지' },
  { id: 'announcements', label: '대회 공고' },
  { id: 'clubs', label: '동아리 공고' }
];

const errorText = (err: unknown) => (err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.');
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 관리자 전용 화면. 모든 작업은 DB 함수가 관리자인지 다시 확인한다.
export const AdminPanel: React.FC<AdminPanelProps> = ({ announcements, onAnnouncementDeleted, onClose }) => {
  const [tab, setTab] = useState<Tab>('reports');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [suspended, setSuspended] = useState<AdminSuspendedUser[]>([]);
  const [clubs, setClubs] = useState<ClubAnnouncement[]>([]);
  const [query, setQuery] = useState('');

  // 값이 바뀌면 목록을 다시 불러온다
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([db.adminListReports(showResolved), db.adminListSuspended(), db.adminListClubAnnouncements()])
      .then(([r, s, c]) => {
        if (!alive) return;
        setReports(r);
        setSuspended(s);
        setClubs(c);
        setError(null);
      })
      .catch((err) => alive && setError(errorText(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [showResolved, reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setReloadKey(k => k + 1);
    } catch (err) {
      alert(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const titleOf = useMemo(() => {
    const map = new Map(announcements.map(a => [a.id, a.title]));
    return (id: string | null) => (id ? map.get(id) || null : null);
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? announcements.filter(a => `${a.title} ${a.host}`.toLowerCase().includes(q)) : announcements;
    return list.slice(0, 50);
  }, [announcements, query]);

  const suspend = (userId: string, name: string | null) => {
    const reason = window.prompt(`${name || '이 사용자'}님을 이용 정지할까요?\n정지되면 구인글·합류 요청·동아리 공고와 지원을 할 수 없어요.\n\n정지 사유를 적어 주세요.`, '');
    if (reason === null) return;
    run(() => db.adminSetSuspension(userId, true, reason));
  };

  const openCount = reports.filter(r => !r.resolved).length;

  return createPortal(
    <div className="admin-backdrop" onClick={onClose}>
      <div className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(e) => e.stopPropagation()}>
        <header className="admin-header">
          <h2 id="admin-title">관리자</h2>
          <button type="button" className="legal-sheet-close" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        </header>

        <nav className="admin-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'reports' && openCount > 0 && <span className="admin-count">{openCount}</span>}
              {t.id === 'suspended' && suspended.length > 0 && <span className="admin-count" data-muted="true">{suspended.length}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-body">
          {loading && <p className="admin-empty">불러오는 중…</p>}
          {error && <p className="admin-error">불러오지 못했어요: {error}</p>}

          {!loading && !error && tab === 'reports' && (
            <>
              <label className="admin-toggle">
                <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
                처리한 신고도 보기
              </label>
              {reports.length === 0 && <p className="admin-empty">처리할 신고가 없어요.</p>}
              {reports.map(r => (
                <article key={`${r.target_type}-${r.target_id}`} className="admin-card">
                  <div className="admin-card-top">
                    <span className="admin-tag">{r.target_type === 'team_post' ? '구인글' : '합류 요청'}</span>
                    <span className="admin-meta">신고 {r.report_count}건 · {formatDate(r.last_reported_at)}</span>
                  </div>
                  <p className="admin-content">{r.target_exists ? r.content || '(내용 없음)' : '(이미 삭제된 글)'}</p>
                  <dl className="admin-facts">
                    <div><dt>작성자</dt><dd>{r.author_name || '알 수 없음'}{r.author_suspended && <span className="admin-tag" data-kind="warn">정지됨</span>}</dd></div>
                    {titleOf(r.announcement_id) && <div><dt>대회</dt><dd>{titleOf(r.announcement_id)}</dd></div>}
                    <div><dt>사유</dt><dd>{r.reasons.length > 0 ? r.reasons.join(' / ') : '(사유 없음)'}</dd></div>
                    {r.resolved && <div><dt>처리</dt><dd>{r.resolution === 'restored' ? '다시 공개함' : '삭제함'}</dd></div>}
                  </dl>
                  {!r.resolved && (
                    <div className="admin-actions">
                      {r.target_exists && (
                        <>
                          <button type="button" disabled={busy} onClick={() => run(() => db.adminResolveReport(r.target_type, r.target_id, 'restore'))}>문제없음 · 다시 공개</button>
                          <button type="button" data-kind="danger" disabled={busy} onClick={() => { if (window.confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) run(() => db.adminResolveReport(r.target_type, r.target_id, 'delete')); }}>삭제</button>
                        </>
                      )}
                      {!r.target_exists && (
                        <button type="button" disabled={busy} onClick={() => run(() => db.adminResolveReport(r.target_type, r.target_id, 'delete'))}>처리 완료로 표시</button>
                      )}
                      {r.author_id && !r.author_suspended && (
                        <button type="button" data-kind="danger" disabled={busy} onClick={() => suspend(r.author_id as string, r.author_name)}>작성자 이용 정지</button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </>
          )}

          {!loading && !error && tab === 'suspended' && (
            <>
              <p className="admin-hint">이용 정지는 신고 탭에서 작성자를 정지하면 여기에 나타나요.</p>
              {suspended.length === 0 && <p className="admin-empty">정지된 사용자가 없어요.</p>}
              {suspended.map(s => (
                <article key={s.user_id} className="admin-card">
                  <div className="admin-card-top">
                    <strong>{s.name || '이름 없음'}</strong>
                    <span className="admin-meta">{formatDate(s.created_at)}부터</span>
                  </div>
                  <dl className="admin-facts">
                    <div><dt>사유</dt><dd>{s.reason || '(사유 없음)'}</dd></div>
                  </dl>
                  <div className="admin-actions">
                    <button type="button" disabled={busy} onClick={() => { if (window.confirm(`${s.name || '이 사용자'}님의 이용 정지를 풀까요?`)) run(() => db.adminSetSuspension(s.user_id, false)); }}>정지 해제</button>
                  </div>
                </article>
              ))}
            </>
          )}

          {!loading && !error && tab === 'announcements' && (
            <>
              <input className="admin-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="대회명이나 주최로 찾기" aria-label="대회 공고 검색" />
              <p className="admin-hint">
                {announcements.length}개 중 {filteredAnnouncements.length}개를 보여 줘요. 콘테스트코리아 공고는 지워도 그쪽에 남아 있으면 다음 날 다시 들어와요.
              </p>
              {filteredAnnouncements.map(a => (
                <article key={a.id} className="admin-card" data-compact="true">
                  <div className="admin-row">
                    <div className="admin-row-text">
                      <strong>{a.title}</strong>
                      <span className="admin-meta">{a.host} · {getDDay(a.deadline)}{a.source === 'contestkorea' ? ' · 콘테스트코리아' : ''}</span>
                    </div>
                    <button type="button" data-kind="danger" disabled={busy} onClick={() => {
                      if (!window.confirm(`'${a.title}' 공고를 삭제할까요?\n이 대회의 찜 기록과 구인글도 함께 지워져요.`)) return;
                      run(async () => { await db.adminDeleteAnnouncement(a.id); onAnnouncementDeleted(a.id); });
                    }}>삭제</button>
                  </div>
                </article>
              ))}
            </>
          )}

          {!loading && !error && tab === 'clubs' && (
            <>
              {clubs.length === 0 && <p className="admin-empty">등록된 동아리 모집 공고가 없어요.</p>}
              {clubs.map(c => (
                <article key={c.id} className="admin-card" data-compact="true">
                  <div className="admin-row">
                    <div className="admin-row-text">
                      <strong>[{c.club_name}] {c.title}</strong>
                      <span className="admin-meta">{c.school} · {formatDate(c.created_at)}</span>
                      {c.details && <span className="admin-clip">{c.details}</span>}
                    </div>
                    <button type="button" data-kind="danger" disabled={busy} onClick={() => {
                      if (!window.confirm(`'${c.club_name}' 모집 공고를 삭제할까요?\n받은 지원서도 함께 지워져요.`)) return;
                      run(() => db.adminDeleteClubAnnouncement(c.id));
                    }}>삭제</button>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
