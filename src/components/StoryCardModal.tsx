import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Download, Send, X } from 'lucide-react';
import { downloadStoryImage, drawStoryCard, shareStoryImage, type StoryCardData } from '../utils/storyCard';
import { SITE_URL } from '../utils/share';

interface StoryCardModalProps {
  data: StoryCardData;
  announcementId: string;
  onClose: () => void;
}

// 진단 결과를 인스타 스토리용 이미지로 만들어 공유한다
export const StoryCardModal: React.FC<StoryCardModalProps> = ({ data, announcementId, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const link = `${SITE_URL}/contest/${encodeURIComponent(announcementId)}`;

  useEffect(() => {
    let alive = true;
    drawStoryCard(data)
      .then(canvas => {
        if (!alive) return;
        canvasRef.current = canvas;
        setPreview(canvas.toDataURL('image/png'));
      })
      .catch(err => alive && setError(err instanceof Error ? err.message : '이미지를 만들지 못했어요.'));
    return () => {
      alive = false;
    };
  }, [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 스토리에는 링크가 자동으로 붙지 않으므로, 링크 스티커에 붙여넣을 수 있게 미리 복사해 둔다
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    const copied = await copyLink();
    const result = await shareStoryImage(canvas);
    if (result === 'shared') {
      setNote(copied ? '대회 링크를 복사해 뒀어요. 스토리에서 링크 스티커에 붙여넣으세요.' : null);
    } else if (result === 'unsupported') {
      if (Capacitor.isNativePlatform()) {
        setNote('공유창을 열지 못했어요. 화면을 캡처해서 올려 주세요.');
      } else {
        await downloadStoryImage(canvas);
        setNote('이 브라우저에서는 바로 공유할 수 없어 이미지를 저장했어요. 인스타그램에서 스토리로 올려 주세요.');
      }
    }
    setBusy(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      await downloadStoryImage(canvas);
      setNote('이미지를 저장했어요.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="login-prompt-backdrop" onClick={onClose}>
      <div className="login-prompt story-card-modal" role="dialog" aria-modal="true" aria-labelledby="story-card-title" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="story-card-title">스토리 카드</h2>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ border: 'none', background: '#F2F4F6', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', background: '#F2F4F6', borderRadius: '16px', padding: '12px' }}>
          {preview ? (
            <img src={preview} alt={`${data.title} 핏 ${data.score}점 스토리 카드`} style={{ height: 'min(46vh, 420px)', aspectRatio: '9 / 16', borderRadius: '12px', display: 'block' }} />
          ) : (
            <div style={{ height: 'min(46vh, 420px)', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>{error || '카드를 만드는 중…'}</div>
          )}
        </div>

        {note && <p role="status" style={{ fontSize: '12.5px', color: 'var(--color-indigo)', margin: 0 }}>{note}</p>}
        {!note && <p style={{ fontSize: '12.5px', margin: 0 }}>공유창에서 <strong>Instagram 스토리</strong>를 고르면 돼요.</p>}

        <button type="button" className="btn btn-primary" disabled={!preview || busy} onClick={share} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Send size={15} /> 인스타 스토리에 공유
        </button>
        {!Capacitor.isNativePlatform() && (
          <button type="button" className="btn btn-gray" disabled={!preview || busy} onClick={save} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Download size={15} /> 이미지 저장
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
