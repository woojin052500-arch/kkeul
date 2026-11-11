import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Announcement, ClubAnnouncement } from '../types';
import { db, type AdminReport, type AdminSuspendedUser, type AdminTeamPost, type AdminUser } from '../supabaseClient';
import { getDDay } from '../utils/dday';

interface AdminPanelProps {
  announcements: Announcement[];
  onAnnouncementDeleted: (id: string) => void;
  onClose: () => void;
}

type Tab = 'reports' | 'posts' | 'users' | 'suspended' | 'announcements' | 'clubs';

const USERS_PAGE = 50;

const TABS: { id: Tab; label: string }[] = [
  { id: 'reports', label: '신고' },
  { id: 'posts', label: '구인글' },
  { id: 'users', label: '회원' },
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

  // 회원 탭
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userLimit, setUserLimit] = useState(USERS_PAGE);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // 구인글 탭
  const [posts, setPosts] = useState<AdminTeamPost[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [postInput, setPostInput] = useState('');
  const [postQuery, setPostQuery] = useState('');
  const [postLimit, setPostLimit] = useState(USERS_PAGE);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

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

  // 검색어 입력이 멈추면 조회한다
  useEffect(() => {
    const t = window.setTimeout(() => {
      setUserQuery(userInput.trim());
      setUserLimit(USERS_PAGE);
    }, 300);
    return () => window.clearTimeout(t);
  }, [userInput]);

  useEffect(() => {
    if (tab !== 'users') return;
    let alive = true;
    Promise.resolve().then(() => alive && setUsersLoading(true));
    db.adminListUsers(userQuery, false, userLimit, 0)
      .then((res) => {
        if (!alive) return;
        setUsers(res.users);
        setUserTotal(res.total);
        setUsersError(null);
      })
      .catch((err) => alive && setUsersError(errorText(err)))
      .finally(() => alive && setUsersLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, userQuery, userLimit, reloadKey]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPostQuery(postInput.trim());
      setPostLimit(USERS_PAGE);
    }, 300);
    return () => window.clearTimeout(t);
  }, [postInput]);

  useEffect(() => {
    if (tab !== 'posts') return;
    let alive = true;
    Promise.resolve().then(() => alive && setPostsLoading(true));
    db.adminListTeamPosts(postQuery, postLimit, 0)
      .then((res) => {
        if (!alive) return;
        setPosts(res.posts);
        setPostTotal(res.total);
        setPostsError(null);
      })
      .catch((err) => alive && setPostsError(errorText(err)))
      .finally(() => alive && setPostsLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, postQuery, postLimit, reloadKey]);

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

          {!loading && !error && tab === 'posts' && (
            <>
              <input className="admin-search" type="search" value={postInput} onChange={(e) => setPostInput(e.target.value)} placeholder="작성자·내용·역할로 찾기" aria-label="구인글 검색" />
              {postsError && <p className="admin-error">불러오지 못했어요: {postsError}</p>}
              {!postsError && (
                <p className="admin-hint">
                  {postQuery ? `'${postQuery}' 검색 결과 ` : '전체 구인글 '}{postTotal.toLocaleString()}개 · 최근 순 · 숨긴 글도 보여요{postsLoading ? ' · 불러오는 중…' : ''}
                </p>
              )}
              {!postsError && !postsLoading && posts.length === 0 && <p className="admin-empty">구인글이 없어요.</p>}
              {posts.map(p => (
                <article key={p.id} className="admin-card">
                  <div className="admin-card-top">
                    <span>
                      <span className="admin-tag">구인글</span>
                      {p.is_hidden && <span className="admin-tag" data-kind="warn">숨김</span>}
                    </span>
                    <span className="admin-meta">{formatDate(p.created_at)}</span>
                  </div>
                  <p className="admin-content">{p.comment || '(내용 없음)'}</p>
                  <dl className="admin-facts">
                    <div><dt>작성자</dt><dd>{p.user_name || '알 수 없음'}{p.author_suspended && <span className="admin-tag" data-kind="warn">정지됨</span>}</dd></div>
                    <div><dt>대회</dt><dd>{titleOf(p.announcement_id) || `(목록에 없는 대회 · ${p.announcement_id})`}</dd></div>
                    {(p.my_role || p.role_wanted) && <div><dt>역할</dt><dd>{[p.my_role && `내 역할 ${p.my_role}`, p.role_wanted && `구함 ${p.role_wanted}`].filter(Boolean).join(' · ')}</dd></div>}
                    <div><dt>현황</dt><dd>합류 요청 {p.request_count}건{p.report_count > 0 ? ` · 신고 ${p.report_count}건` : ''}</dd></div>
                  </dl>
                  <div className="admin-actions">
                    {p.is_hidden ? (
                      <button type="button" disabled={busy} onClick={() => run(() => db.adminSetTeamPostHidden(p.id, false))}>다시 공개</button>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => run(() => db.adminSetTeamPostHidden(p.id, true))}>숨기기</button>
                    )}
                    <button type="button" data-kind="danger" disabled={busy} onClick={() => { if (window.confirm('이 구인글을 삭제할까요? 받은 합류 요청도 함께 지워지고 되돌릴 수 없어요.')) run(() => db.adminDeleteTeamPost(p.id)); }}>삭제</button>
                    {!p.author_suspended && (
                      <button type="button" data-kind="danger" disabled={busy} onClick={() => suspend(p.user_id, p.user_name)}>작성자 이용 정지</button>
                    )}
                  </div>
                </article>
              ))}
              {!postsError && posts.length < postTotal && (
                <div className="admin-actions" style={{ justifyContent: 'center' }}>
                  <button type="button" disabled={postsLoading} onClick={() => setPostLimit(l => l + USERS_PAGE)}>더 보기 ({posts.length}/{postTotal.toLocaleString()})</button>
                </div>
              )}
            </>
          )}

          {!loading && !error && tab === 'users' && (
            <>
              <input className="admin-search" type="search" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="이름이나 학교로 찾기" aria-label="회원 검색" />
              {usersError && <p className="admin-error">불러오지 못했어요: {usersError}</p>}
              {!usersError && (
                <p className="admin-hint">
                  {userQuery ? `'${userQuery}' 검색 결과 ` : '전체 회원 '}{userTotal.toLocaleString()}명 · 최근 가입 순{usersLoading ? ' · 불러오는 중…' : ''}
                </p>
              )}
              {!usersError && !usersLoading && users.length === 0 && <p className="admin-empty">찾는 회원이 없어요.</p>}
              {users.map(u => (
                <article key={u.id} className="admin-card" data-compact="true">
                  <div className="admin-row">
                    <div className="admin-row-text">
                      <strong>
                        {u.name || '이름 없음'}
                        {u.is_admin && <span className="admin-tag" style={{ marginLeft: '6px' }}>관리자</span>}
                        {u.suspended && <span className="admin-tag" data-kind="warn">정지됨</span>}
                      </strong>
                      <span className="admin-meta">
                        {[u.role === 'host' ? '주최 회원' : '학생 회원', [u.school, u.grade].filter(Boolean).join(' '), u.location, u.created_at ? `${formatDate(u.created_at)} 가입` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {u.suspended && u.suspend_reason && <span className="admin-meta">정지 사유: {u.suspend_reason}</span>}
                    </div>
                    {u.suspended ? (
                      <button type="button" disabled={busy} onClick={() => { if (window.confirm(`${u.name || '이 사용자'}님의 이용 정지를 풀까요?`)) run(() => db.adminSetSuspension(u.id, false)); }}>정지 해제</button>
                    ) : !u.is_admin ? (
                      <button type="button" data-kind="danger" disabled={busy} onClick={() => suspend(u.id, u.name)}>이용 정지</button>
                    ) : null}
                  </div>
                </article>
              ))}
              {!usersError && users.length < userTotal && (
                <div className="admin-actions" style={{ justifyContent: 'center' }}>
                  <button type="button" disabled={usersLoading} onClick={() => setUserLimit(l => l + USERS_PAGE)}>더 보기 ({users.length}/{userTotal.toLocaleString()})</button>
                </div>
              )}
            </>
          )}

          {!loading && !error && tab === 'suspended' && (
            <>
              <p className="admin-hint">회원 탭이나 신고 탭에서 정지한 사용자가 여기에 나타나요.</p>
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
