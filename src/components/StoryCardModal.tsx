import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Check, Copy, Download, Link2, Send, X } from 'lucide-react';
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
  const [linkCopied, setLinkCopied] = useState(false);
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
      setLinkCopied(true);
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
      setNote(copied ? '대회 링크를 복사했어요. 스토리에서 스티커 → 링크에 붙여넣으세요.' : '스토리에서 스티커 → 링크에 아래 주소를 넣어 주세요.');
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
          <button type="button" onClick={onClose} aria-label="닫기" style={{ border: 'none', background: '#F1EDE4', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', background: '#F1EDE4', borderRadius: '12px', padding: '12px' }}>
          {preview ? (
            <div style={{ position: 'relative', height: 'min(40vh, 380px)', aspectRatio: '9 / 16' }}>
              <img src={preview} alt={`${data.title} 핏 ${data.score}점 스토리 카드`} style={{ width: '100%', height: '100%', borderRadius: '12px', display: 'block' }} />
              {/* 미리보기에만 보이는 안내. 저장되는 이미지에는 들어가지 않는다 */}
              <div className="story-sticker-spot" aria-hidden="true" style={{ position: 'absolute', left: '50%', bottom: '3%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', background: '#FFFFFF', color: '#2563EB', fontSize: '11px', fontWeight: 800, padding: '5px 10px', borderRadius: '8px', border: '1.5px dashed #2563EB', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <Link2 size={12} /> 링크 스티커는 여기에
              </div>
            </div>
          ) : (
            <div style={{ height: 'min(40vh, 380px)', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>{error || '카드를 만드는 중…'}</div>
          )}
        </div>

        {note && <p role="status" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-indigo)', margin: 0 }}>{note}</p>}

        <ol className="story-guide" style={{ listStyle: 'none', margin: 0, padding: '14px', background: '#FAF8F3', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            <>아래 <strong>인스타 스토리에 공유</strong>를 누르고, 공유창에서 <strong>Instagram → 스토리</strong>를 골라요.</>,
            <>스토리 화면 위쪽 <strong>스티커 버튼</strong>을 누르고 <strong>링크</strong>를 골라요.</>,
            <>주소 칸에 <strong>붙여넣기</strong> 하고, 스티커를 <strong>화살표(↓) 아래 빈 곳</strong>에 놓아요. 친구가 누르면 이 대회로 바로 와요.</>
          ].map((text, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-indigo)', color: '#FFFFFF', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span>{text}</span>
            </li>
          ))}
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #E4DFD4', borderRadius: '10px', padding: '8px 10px' }}>
            <Link2 size={14} color="var(--color-indigo)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.replace('https://', '')}</span>
            <button type="button" onClick={async () => { if (!(await copyLink())) window.prompt('이 주소를 복사해 주세요', link); }} style={{ flexShrink: 0, border: 'none', background: linkCopied ? '#ECFDF5' : 'var(--color-indigo-light)', color: linkCopied ? '#059669' : 'var(--color-indigo)', fontSize: '12px', fontWeight: 800, padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {linkCopied ? <Check size={12} /> : <Copy size={12} />} {linkCopied ? '복사됨' : '링크 복사'}
            </button>
          </li>
        </ol>

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
