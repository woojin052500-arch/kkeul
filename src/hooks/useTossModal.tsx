import { useState, useCallback } from 'react';

type ModalState = {
  isOpen: boolean;
  type: 'alert' | 'prompt';
  title: string;
  message?: string;
  defaultValue?: string;
  resolve?: (value: string | null) => void;
};

export function useTossModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
  });

  const [inputValue, setInputValue] = useState('');

  const showAlert = useCallback((title: string, message?: string) => {
    return new Promise<void>((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        resolve: () => resolve(),
      });
    });
  }, []);

  const showPrompt = useCallback((title: string, defaultValue?: string, message?: string) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(defaultValue || '');
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(null);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const handleSubmit = useCallback(() => {
    if (modalState.resolve) {
      if (modalState.type === 'prompt') {
        modalState.resolve(inputValue);
      } else {
        modalState.resolve(null);
      }
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, [modalState, inputValue]);

  const TossModal = () => {
    if (!modalState.isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'tossFadeIn 0.2s ease-out'
      }} onClick={handleClose}>
        
        <style>
          {`
            @keyframes tossSlideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes tossFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
        </style>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '24px 20px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'tossSlideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)'
        }} onClick={e => e.stopPropagation()}>
          
          <div style={{ width: '40px', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', margin: '0 auto 20px auto' }} />

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#191F28', margin: '0 0 8px 0', wordBreak: 'keep-all' }}>
            {modalState.title}
          </h3>
          
          {modalState.message && (
            <p style={{ fontSize: '15px', color: '#4E5968', margin: '0 0 20px 0', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              {modalState.message}
            </p>
          )}

          {modalState.type === 'prompt' && (
            <div style={{ marginBottom: '24px', marginTop: '16px' }}>
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#F2F4F6',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  color: '#191F28',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="입력해주세요"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: modalState.type === 'alert' ? '24px' : '0' }}>
            {modalState.type === 'prompt' && (
              <button
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#F2F4F6',
                  color: '#4E5968',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
            )}
            <button
              onClick={handleSubmit}
              style={{
                flex: 2,
                padding: '16px',
                backgroundColor: '#3182F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { TossModal, showAlert, showPrompt };
}
