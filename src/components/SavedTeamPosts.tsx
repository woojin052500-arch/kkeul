import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Share2, Users } from 'lucide-react';
import type { Announcement, TeamPost } from '../types';
import { db } from '../supabaseClient';
import { shareLink, teamPostUrl } from '../utils/share';
import { getDDay } from '../utils/dday';

interface SavedTeamPostsProps {
  announcements: Announcement[];
  onOpen: (announcementId: string, postId: string) => void;
}

const smallBtn: React.CSSProperties = {
  border: '1px solid #E4DFD4',
  background: '#FFFFFF',
  color: 'var(--text-secondary)',
  fontSize: '11.5px',
  fontWeight: 600,
  padding: '5px 9px',
  borderRadius: '7px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px'
};

// 보관함 탭: 내가 저장한 구인글
export const SavedTeamPosts: React.FC<SavedTeamPostsProps> = ({ announcements, onOpen }) => {
  const [posts, setPosts] = useState<TeamPost[] | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    db.getSavedTeamPosts()
      .then(list => alive && setPosts(list))
      .catch(() => {
        if (!alive) return;
        setError(true);
        setPosts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const annById = useMemo(() => new Map(announcements.map(a => [a.id, a])), [announcements]);

  const unsave = async (post: TeamPost) => {
    setPosts(prev => (prev || []).filter(p => p.id !== post.id));
    try {
      await db.setTeamPostSaved(post.id, false);
    } catch {
      setPosts(prev => [post, ...(prev || [])]);
    }
  };

  const share = async (post: TeamPost) => {
    const title = annById.get(post.announcement_id)?.title;
    const contest = title ? `[${title}] ` : '';
    const result = await shareLink({
      title: `${contest}팀원 모집`,
      text: `${contest}${post.role_wanted} 팀원 구해요 (${post.user_name} · ${post.my_role})\n${post.comment}`,
      url: teamPostUrl(post.announcement_id, post.id)
    });
    if (result === 'copied') {
      setCopied(post.id);
      window.setTimeout(() => setCopied(c => (c === post.id ? null : c)), 2000);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Users size={18} color="var(--color-indigo)" /> 저장한 구인글
      </h2>
      {posts === null && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>불러오는 중…</p>}
      {posts !== null && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #F1EDE4', borderRadius: '14px' }}>
          {error ? '저장한 구인글을 불러오지 못했어요.' : <>아직 저장한 구인글이 없어요.<br />대회 팀 빌딩 게시판에서 <Bookmark size={12} style={{ verticalAlign: '-2px' }} /> 저장을 눌러 보세요.</>}
        </div>
      )}
      {posts?.map(post => {
        const ann = annById.get(post.announcement_id);
        return (
          <div
            key={post.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(post.announcement_id, post.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(post.announcement_id, post.id); }}
            className="toss-card-spring"
            style={{ backgroundColor: 'var(--color-card-bg)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', border: '1px solid #E4DFD4', opacity: ann ? 1 : 0.6 }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {ann ? <><span style={{ color: 'var(--color-red)', fontWeight: 700 }}>{getDDay(ann.deadline)}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.title}</span></> : '마감되어 내려간 대회'}
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {post.role_wanted} 팀원 구해요 <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>· {post.user_name} ({post.my_role})</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{post.comment}</p>
            <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              <button type="button" style={smallBtn} onClick={() => share(post)}><Share2 size={11} /> {copied === post.id ? '링크 복사됨' : '공유'}</button>
              <button type="button" style={smallBtn} onClick={() => unsave(post)}><Bookmark size={11} fill="currentColor" /> 저장 취소</button>
            </div>
          </div>
        );
      })}
    </section>
  );
};
