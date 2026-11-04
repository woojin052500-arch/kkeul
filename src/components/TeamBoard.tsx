import React, { useCallback, useEffect, useState } from 'react';
import type { JoinRequest, Profile, TeamPost } from '../types';
import { Check, Flag, Plus, ShieldOff, Users } from 'lucide-react';
import { db } from '../supabaseClient';

type Role = '기획' | '디자인' | '개발';

interface TeamBoardProps {
  announcementId: string;
  profile?: Profile;
}

const roleColor = (role: string) => {
  if (role === '개발') return { bg: '#E5F6FF', txt: '#0070F3' };
  if (role === '기획') return { bg: '#FFF3E0', txt: '#E65100' };
  return { bg: '#E8F5E9', txt: '#2E7D32' };
};

const statusLabel: Record<string, string> = {
  pending: '대기 중',
  accepted: '수락됨',
  rejected: '거절됨'
};

const smallBtn: React.CSSProperties = {
  border: '1px solid #E5E8EB',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  fontWeight: 600,
  padding: '4px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px'
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.');

export const TeamBoard: React.FC<TeamBoardProps> = ({ announcementId, profile }) => {
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [incoming, setIncoming] = useState<Record<string, JoinRequest[]>>({});
  const [contacts, setContacts] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [myRole, setMyRole] = useState<Role>('개발');
  const [wantedRole, setWantedRole] = useState<Role>('기획');
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await db.getTeamPosts(announcementId);
      setPosts(list);
      if (!profile) return;

      const mine = await db.getMyJoinRequests(profile.id);
      setMyRequests(mine);

      const inbox: Record<string, JoinRequest[]> = {};
      for (const post of list.filter(p => p.user_id === profile.id)) {
        inbox[post.id] = await db.getJoinRequests(post.id);
      }
      setIncoming(inbox);

      // 수락된 관계의 상대 연락처만 불러온다 (DB가 그 외에는 돌려주지 않음)
      const counterpartIds = new Set<string>();
      Object.values(inbox).flat().filter(r => r.status === 'accepted').forEach(r => counterpartIds.add(r.user_id));
      mine.filter(r => r.status === 'accepted').forEach(r => {
        const post = list.find(p => p.id === r.post_id);
        if (post) counterpartIds.add(post.user_id);
      });
      const found: Record<string, string | null> = {};
      for (const id of counterpartIds) {
        found[id] = await db.getContact(id);
      }
      setContacts(found);
    } catch (err) {
      console.error('팀 빌딩 데이터 조회 실패:', err);
      setLoadError('구인글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [announcementId, profile]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setContact(profile?.contact || '');
  }, [profile?.contact]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      alert(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      alert('로그인 후 구인글을 올릴 수 있어요.');
      return;
    }
    if (!comment.trim()) {
      alert('한 줄 소개를 입력해 주세요.');
      return;
    }
    if (!contact.trim()) {
      alert('연락처를 입력해 주세요. 합류를 수락한 팀원에게만 보여요.');
      return;
    }
    run(async () => {
      await db.saveMyContact(contact.trim());
      const created = await db.createTeamPost({
        announcement_id: announcementId,
        user_id: profile.id,
        user_name: profile.name,
        role_wanted: wantedRole,
        my_role: myRole,
        comment: comment.trim()
      });
      setPosts(prev => [created, ...prev]);
      setIncoming(prev => ({ ...prev, [created.id]: [] }));
      setComment('');
      setShowModal(false);
    });
  };

  const handleJoin = (post: TeamPost) => {
    if (!profile) return;
    run(async () => {
      const req = await db.sendJoinRequest({
        post_id: post.id,
        user_id: profile.id,
        user_name: profile.name,
        user_role: '기획/개발/디자인',
        message: `${profile.name}님이 팀 합류를 신청했습니다.`
      });
      setMyRequests(prev => [...prev, req]);
    });
  };

  const handleRespond = (req: JoinRequest, status: 'accepted' | 'rejected') => {
    run(async () => {
      await db.updateJoinRequestStatus(req.id, status);
      setIncoming(prev => ({
        ...prev,
        [req.post_id]: (prev[req.post_id] || []).map(r => (r.id === req.id ? { ...r, status } : r))
      }));
      if (status === 'accepted') {
        const c = await db.getContact(req.user_id);
        setContacts(prev => ({ ...prev, [req.user_id]: c }));
      }
    });
  };

  const handleReport = (targetType: 'team_post' | 'join_request', targetId: string, postId?: string) => {
    if (!profile) {
      alert('로그인 후 신고할 수 있어요.');
      return;
    }
    const reason = window.prompt('신고 사유를 적어 주세요. (선택)\n신고하면 이 내용은 바로 숨겨지고 운영자가 확인해요.', '');
    if (reason === null) return;
    run(async () => {
      await db.reportContent(targetType, targetId, reason.trim());
      if (targetType === 'team_post') {
        setPosts(prev => prev.filter(p => p.id !== targetId));
      } else if (postId) {
        setIncoming(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(r => r.id !== targetId) }));
      }
      alert('신고가 접수됐어요. 해당 내용은 숨김 처리됐어요.');
    });
  };

  const handleBlock = (userId: string, userName: string) => {
    if (!profile || userId === profile.id) return;
    if (!window.confirm(`${userName}님을 차단할까요?\n차단하면 이 사람의 구인글과 합류 요청이 더 이상 보이지 않아요. 상대에게는 알리지 않아요.`)) return;
    run(async () => {
      await db.blockUser(userId);
      setPosts(prev => prev.filter(p => p.user_id !== userId));
      setIncoming(prev => {
        const next: Record<string, JoinRequest[]> = {};
        for (const [k, v] of Object.entries(prev)) next[k] = v.filter(r => r.user_id !== userId);
        return next;
      });
    });
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 14px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} color="var(--color-indigo)" /> 대회 팀 빌딩
        </h3>
        <button
          onClick={() => setShowModal(true)}
          style={{ border: 'none', background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', fontSize: '11.5px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
        >
          <Plus size={12} /> 구인글 등록
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loadError && <div style={{ fontSize: '12.5px', color: 'var(--color-red)' }}>{loadError}</div>}
        {!loadError && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #F2F4F6', borderRadius: '12px' }}>
            아직 이 대회에 등록된 팀 구인글이 없습니다.<br />
            첫 구인글을 올리고 함께할 팀원을 찾아보세요!
          </div>
        )}

        {posts.map(post => {
          const isMine = post.user_id === profile?.id;
          const myReq = myRequests.find(r => r.post_id === post.id);
          const requests = incoming[post.id] || [];
          const mineColor = roleColor(post.my_role);
          const wantColor = roleColor(post.role_wanted);

          return (
            <div key={post.id} style={{ border: '1px solid #E5E8EB', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#FFFFFF', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>{post.user_name}</span>
                  {isMine && <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#F2F4F6', color: 'var(--text-secondary)', padding: '2px 5px', borderRadius: '4px' }}>내 구인글</span>}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, backgroundColor: mineColor.bg, color: mineColor.txt, padding: '2px 6px', borderRadius: '4px' }}>직무: {post.my_role}</span>
                  <span style={{ fontSize: '9.5px', fontWeight: 800, backgroundColor: wantColor.bg, color: wantColor.txt, padding: '2px 6px', borderRadius: '4px', border: '1px solid currentColor' }}>구함: {post.role_wanted}</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{post.comment}</p>

              {isMine && post.is_hidden && (
                <div style={{ fontSize: '11.5px', color: 'var(--color-red)', background: 'var(--color-red-light)', borderRadius: '8px', padding: '8px 10px' }}>
                  신고가 접수되어 다른 사람에게는 숨겨진 글이에요.
                </div>
              )}

              {/* 내 구인글: 받은 합류 요청 */}
              {isMine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F2F4F6', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>받은 합류 요청 {requests.length}건</div>
                  {requests.map(req => (
                    <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F9FAFB', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{req.user_name}</span>
                        <span style={{ fontSize: '11px', color: req.status === 'accepted' ? '#059669' : 'var(--text-tertiary)' }}>{statusLabel[req.status || 'pending']}</span>
                      </div>
                      {req.message && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{req.message}</div>}
                      {req.status === 'accepted' && (
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          연락처: <strong>{contacts[req.user_id] || '상대가 연락처를 등록하지 않았어요'}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(req.status || 'pending') === 'pending' && (
                          <>
                            <button disabled={busy} onClick={() => handleRespond(req, 'accepted')} style={{ ...smallBtn, background: 'var(--color-indigo)', color: '#FFFFFF', border: 'none' }}>수락</button>
                            <button disabled={busy} onClick={() => handleRespond(req, 'rejected')} style={smallBtn}>거절</button>
                          </>
                        )}
                        <button disabled={busy} onClick={() => handleReport('join_request', req.id, post.id)} style={smallBtn}><Flag size={11} /> 신고</button>
                        <button disabled={busy} onClick={() => handleBlock(req.user_id, req.user_name)} style={smallBtn}><ShieldOff size={11} /> 차단</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 남의 구인글: 합류 요청 + 신고/차단 */}
              {!isMine && (
                <>
                  <button
                    onClick={() => handleJoin(post)}
                    disabled={!!myReq || busy || !profile}
                    style={{ border: 'none', borderRadius: '8px', height: '36px', fontSize: '12px', fontWeight: 700, cursor: myReq ? 'default' : 'pointer', backgroundColor: myReq ? '#ECFDF5' : 'var(--color-indigo)', color: myReq ? '#10B981' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                  >
                    {myReq ? <Check size={12} /> : null}
                    {myReq ? `합류 요청 ${statusLabel[myReq.status || 'pending']}` : '팀 합류 요청 보내기'}
                  </button>
                  {myReq?.status === 'accepted' && (
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', background: '#ECFDF5', borderRadius: '8px', padding: '8px 10px' }}>
                      연락처: <strong>{contacts[post.user_id] || '상대가 연락처를 등록하지 않았어요'}</strong>
                    </div>
                  )}
                  {profile && (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button disabled={busy} onClick={() => handleReport('team_post', post.id)} style={smallBtn}><Flag size={11} /> 신고</button>
                      <button disabled={busy} onClick={() => handleBlock(post.user_id, post.user_name)} style={smallBtn}><ShieldOff size={11} /> 차단</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="calendar-success-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 130, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', maxWidth: 'calc(100vw - 32px)', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0' }}>팀원 구인글 올리기</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                내 직무 역할
                <select value={myRole} onChange={(e) => setMyRole(e.target.value as Role)} style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', background: '#FFFFFF' }}>
                  <option value="개발">개발</option>
                  <option value="기획">기획</option>
                  <option value="디자인">디자인</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                찾는 팀원 역할
                <select value={wantedRole} onChange={(e) => setWantedRole(e.target.value as Role)} style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', background: '#FFFFFF' }}>
                  <option value="기획">기획</option>
                  <option value="디자인">디자인</option>
                  <option value="개발">개발</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                한 줄 소개 및 포부
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="예: 기획안이 준비된 팀이에요. 피그마 쓰는 디자이너 한 분 모십니다." style={{ padding: '10px', fontSize: '13px', border: '1px solid #E5E8EB', borderRadius: '8px', resize: 'none', fontWeight: 400 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                내 연락처
                <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="예: 카카오톡 ID 또는 전화번호" style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', fontWeight: 400 }} />
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}>합류 요청을 수락한 사람에게만 보여요.</span>
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-gray" style={{ flex: 1, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}>취소</button>
                <button type="submit" disabled={busy} className="btn btn-primary" style={{ flex: 2, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}>등록하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
