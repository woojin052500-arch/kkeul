import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2, Send, Users, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  contestInviteMessage,
  contestInviteText,
  contestInviteUrl,
  copyToClipboard,
  shareLink
} from '../utils/share';

// 휴대폰 공유창을 쓸 수 있는지 (앱이면 네이티브 공유, 웹이면 Web Share API)
const canShareFromDevice = () =>
  typeof navigator !== 'undefined' &&
  (Capacitor.isNativePlatform() || typeof navigator.share === 'function');

type Feedback = 'idle' | 'copied' | 'shared';

// "나도 나갈래요"를 누르거나 구인글을 올린 직후에 띄우는 카드.
// 링크를 보내면 받은 사람은 이 대회 상세로 바로 들어온다.
export const InviteFriendCard: React.FC<{
  announcementId: string;
  announcementTitle: string;
  inviterName?: string;
  postId?: string;
  onClose: () => void;
}> = ({ announcementId, announcementTitle, inviterName, postId, onClose }) => {
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [busy, setBusy] = useState(false);

  const message = contestInviteMessage({ title: announcementTitle, postId });
  const url = contestInviteUrl(announcementId, { inviterName, postId });
  const text = contestInviteText(announcementId, { title: announcementTitle, inviterName, postId });

  useEffect(() => {
    if (feedback === 'idle') return;
    const t = window.setTimeout(() => setFeedback('idle'), 2200);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const handleCopy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await copyToClipboard(text);
      setFeedback(ok ? 'copied' : 'idle');
      if (!ok) alert(`링크를 직접 복사해 주세요\n${url}`);
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await shareLink({ title: announcementTitle, text: message, url });
      if (result === 'shared') setFeedback('shared');
      else if (result === 'copied') setFeedback('copied');
      else if (result === 'failed') alert(`링크를 직접 보내 주세요\n${url}`);
    } finally {
      setBusy(false);
    }
  };

  const done = feedback !== 'idle';

  return (
    <div
      id="friend-invite-card"
      className="animate-fade-in"
      style={{
        scrollMarginTop: '80px',
        borderRadius: '14px',
        border: '1px solid #C9D3FF',
        backgroundColor: 'var(--color-indigo-light)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        textAlign: 'left'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <Users size={15} color="var(--color-indigo)" /> 이 대회 같이 나갈 친구 부르기
          </span>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {postId ? '방금 올린 구인글로 바로 들어와요.' : '보낸 친구는 이 대회 상세를 바로 열어요.'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="친구 부르기 닫기"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #DCE3FF',
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</span>
        <span style={{ fontSize: '11.5px', color: 'var(--color-indigo)', fontWeight: 600, wordBreak: 'break-all' }}>{url}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleCopy}
          disabled={busy}
          className="btn btn-primary"
          style={{
            flex: 1,
            height: '42px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            backgroundColor: done ? '#059669' : 'var(--color-indigo)'
          }}
        >
          {done ? <Check size={14} /> : <Copy size={14} />}
          {feedback === 'copied' ? '복사됐어요' : feedback === 'shared' ? '보냈어요' : '문구와 링크 복사'}
        </button>
        {canShareFromDevice() && (
          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="btn btn-secondary"
            style={{
              flexShrink: 0,
              width: 'auto',
              height: '42px',
              padding: '0 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #C9D3FF'
            }}
          >
            <Send size={13} /> 친구에게 보내기
          </button>
        )}
      </div>
    </div>
  );
};

// 초대 링크로 들어온 친구가 보는 안내 배너
export const InviteLandingBanner: React.FC<{
  announcementTitle: string;
  inviterName?: string;
  onJoin: () => void;
  onSeePosts: () => void;
  onDismiss: () => void;
}> = ({ announcementTitle, inviterName, onJoin, onSeePosts, onDismiss }) => (
  <div
    className="animate-fade-in"
    style={{
      margin: '12px 20px 0 20px',
      borderRadius: '14px',
      border: '1px solid #C9D3FF',
      backgroundColor: 'var(--color-indigo-light)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      textAlign: 'left'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
          <Link2 size={15} color="var(--color-indigo)" /> 친구가 같이 나가자고 초대했어요
        </span>
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {inviterName
            ? `${inviterName}님이 '${announcementTitle}'에 함께 나가자고 불렀어요.`
            : `'${announcementTitle}'에 함께 나가자고 초대받았어요.`}
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="초대 안내 닫기"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>

    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        type="button"
        onClick={onJoin}
        className="btn btn-primary"
        style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}
      >
        나도 나갈래요
      </button>
      <button
        type="button"
        onClick={onSeePosts}
        className="btn btn-secondary"
        style={{
          flex: 1,
          height: '40px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          backgroundColor: '#FFFFFF',
          border: '1px solid #C9D3FF'
        }}
      >
        팀원 글 보기
      </button>
    </div>
  </div>
);
