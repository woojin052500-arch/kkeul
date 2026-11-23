import React, { useState } from 'react';
import { Flag, MessageCircle, ShieldOff } from 'lucide-react';
import { db, type PostQuestion } from '../supabaseClient';

interface PostQuestionsProps {
  postId: string;
  isMine: boolean;
  askerName: string;
  questions: PostQuestion[];
  onChanged: () => void;
  onReport: (questionId: string) => void;
  onBlock: (userId: string, name: string) => void;
}

const smallBtn: React.CSSProperties = {
  border: '1px solid #E4DFD4', background: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600,
  padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
};

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: '9px 10px', fontSize: '13px', border: '1px solid #E4DFD4', borderRadius: '8px', outline: 'none', background: '#FBF9F5'
};

const errText = (err: unknown) => (err instanceof Error ? err.message : '보내지 못했어요. 잠시 후 다시 시도해 주세요.');

// 합류 요청 전에 보내는 한 줄 질문. 질문한 사람과 글쓴이만 볼 수 있다.
export const PostQuestions: React.FC<PostQuestionsProps> = ({ postId, isMine, askerName, questions, onChanged, onReport, onBlock }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const mine = questions.filter(q => q.post_id === postId);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await db.askQuestion(postId, askerName, text.trim());
      setText('');
      onChanged();
    } catch (err) {
      alert(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const reply = async (q: PostQuestion) => {
    const a = (answers[q.id] || '').trim();
    if (!a || busy) return;
    setBusy(true);
    try {
      await db.answerQuestion(q.id, a);
      setAnswers(prev => ({ ...prev, [q.id]: '' }));
      onChanged();
    } catch (err) {
      alert(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (q: PostQuestion) => {
    if (busy || !window.confirm('이 질문을 지울까요?')) return;
    setBusy(true);
    try {
      await db.deleteQuestion(q.id);
      onChanged();
    } catch (err) {
      alert(errText(err));
    } finally {
      setBusy(false);
    }
  };

  // ---- 글쓴이: 받은 질문에 답하기 ----
  if (isMine) {
    if (mine.length === 0) return null;
    const waiting = mine.filter(q => !q.answer).length;
    return (
      <div className="post-questions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1EDE4', paddingTop: '10px' }}>
        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          받은 한 줄 질문 {mine.length}개
          {waiting > 0 && <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#FFFFFF', background: 'var(--color-red)', padding: '1px 6px', borderRadius: '8px' }}>답변 대기 {waiting}</span>}
        </div>
        {mine.map(q => (
          <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#FAF8F3', borderRadius: '10px', padding: '10px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}><strong>{q.asker_name}</strong> · {q.question}</div>
            {q.answer ? (
              <div style={{ fontSize: '12.5px', color: 'var(--color-indigo)', fontWeight: 600 }}>내 답변 · {q.answer}</div>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={answers[q.id] || ''}
                  maxLength={200}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="한 줄로 답해 주세요"
                  aria-label={`${q.asker_name}님 질문에 답하기`}
                  style={inputStyle}
                />
                <button type="button" disabled={busy || !(answers[q.id] || '').trim()} onClick={() => reply(q)} style={{ ...smallBtn, background: 'var(--color-indigo)', color: '#FFFFFF', border: 'none', opacity: !(answers[q.id] || '').trim() ? 0.5 : 1 }}>답변</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" disabled={busy} onClick={() => remove(q)} style={smallBtn}>지우기</button>
              <button type="button" disabled={busy} onClick={() => onReport(q.id)} style={smallBtn}><Flag size={11} /> 신고</button>
              <button type="button" disabled={busy} onClick={() => onBlock(q.asker_id, q.asker_name)} style={smallBtn}><ShieldOff size={11} /> 차단</button>
            </div>
          </div>
        ))}
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>연락처와 링크는 답변에 쓸 수 없어요. 합류를 수락하면 연락처가 공유돼요.</div>
      </div>
    );
  }

  // ---- 다른 사람: 질문하기 ----
  const unread = mine.filter(q => q.answer).length;
  return (
    <div className="post-questions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ ...smallBtn, alignSelf: 'flex-start', fontSize: '12px', padding: '6px 10px' }}>
        <MessageCircle size={12} /> 한 줄 질문{mine.length > 0 ? ` (${unread}/${mine.length} 답변)` : ''}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#FAF8F3', borderRadius: '10px', padding: '10px' }}>
          {mine.map(q => (
            <div key={q.id} style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
              <div style={{ color: 'var(--text-primary)' }}>나 · {q.question}</div>
              {q.answer
                ? <div style={{ color: 'var(--color-indigo)', fontWeight: 600 }}>답변 · {q.answer}</div>
                : <div style={{ color: 'var(--text-tertiary)' }}>답변을 기다리는 중이에요</div>}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={text}
              maxLength={100}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
              placeholder="예: 온라인으로만 진행하나요?"
              aria-label="한 줄 질문"
              style={inputStyle}
            />
            <button type="button" disabled={busy || !text.trim()} onClick={send} style={{ ...smallBtn, background: 'var(--color-ink)', color: '#FFFFFF', border: 'none', opacity: !text.trim() ? 0.5 : 1 }}>보내기</button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{text.length}/100 · 연락처와 링크는 쓸 수 없어요. 합류가 수락되면 공유돼요.</div>
        </div>
      )}
    </div>
  );
};
