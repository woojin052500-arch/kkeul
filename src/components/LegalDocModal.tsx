import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LegalDoc } from '../legal/terms';
import { TERMS_VERSION } from '../legal/terms';

interface LegalDocModalProps {
  doc: LegalDoc;
  onClose: () => void;
  // 동의가 필요한 문서면 "동의하고 닫기" 버튼을 보여준다
  onAgree?: () => void;
}

// 화면 아래에서 올라오는 약관 보기 시트
export const LegalDocModal: React.FC<LegalDocModalProps> = ({ doc, onClose, onAgree }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // 부모에 transform 애니메이션이 있어도 화면 전체를 덮도록 body 에 바로 붙인다
  return createPortal(
    <div className="legal-sheet-backdrop" onClick={onClose}>
      <div
        className="legal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="legal-sheet-handle" aria-hidden="true" />
        <header className="legal-sheet-header">
          <div>
            <h2 id="legal-sheet-title">{doc.title}</h2>
            <p>{doc.summary}</p>
          </div>
          <button ref={closeRef} type="button" className="legal-sheet-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="legal-sheet-body">
          {doc.sections.map((section) => {
            const items = section.lines.filter((l) => l.startsWith('- '));
            const paras = section.lines.filter((l) => !l.startsWith('- '));
            return (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                {paras.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {items.length > 0 && (
                  <ul>
                    {items.map((it) => (
                      <li key={it}>{it.slice(2)}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          <p className="legal-sheet-version">시행일 {TERMS_VERSION}</p>
        </div>

        <footer className="legal-sheet-footer">
          {onAgree ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onAgree();
                onClose();
              }}
            >
              동의하고 닫기
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              확인
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
};
