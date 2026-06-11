import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';

interface InAppBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
  userEmail: string;
  userGrade: string;
  userLocation: string;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({
  url,
  title,
  onClose,
  userEmail,
  userGrade,
  userLocation
}) => {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [applicantName, setApplicantName] = useState<string>(userEmail.split('@')[0]);
  const [phone, setPhone] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const cleanUrl = url.replace('https://', '').replace('http://', '');

  const handleSubmitMockForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      alert('연락처를 입력해 주세요!');
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="in-app-browser-overlay" onClick={onClose}>
      
      <div 
        className="in-app-browser-container" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Browser Top Navigation Bar */}
        <div className="in-app-browser-header">
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* navigation control buttons (mocks) */}
            <ChevronLeft size={20} style={{ color: 'var(--text-tertiary)' }} />
            <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>

          <div className="in-app-browser-title-wrapper" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} style={{ color: '#10B981' }} />
              <span className="in-app-browser-title">{title}</span>
            </div>
            <span className="in-app-browser-subtitle">{cleanUrl}</span>
          </div>

          <button className="in-app-browser-close-btn" onClick={onClose}>
            [X] 끌로 돌아가기
          </button>

        </div>

        {/* Content Area - Simulated Application Form */}
        <div className="browser-fallback-content">
          
          {submitted ? (
            <div className="animate-scale-in" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: 'auto',
              textAlign: 'center',
              gap: '16px'
            }}>
              <CheckCircle2 size={64} style={{ color: 'var(--color-indigo)' }} />
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 800 }}>지원서 제출 완료!</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                축하합니다! WJedulab 시스템을 통해 공식 접수 사이트로 지원서가 접수되었습니다.<br />
                잠시 후 끌(Kkeul) 메인 화면으로 돌아갑니다.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px',
                borderTop: '8px solid var(--color-indigo)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>{title} 온라인 지원</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  주최 측에서 등록한 공식 지원 신청 양식입니다. 내용을 정확히 기재해 주세요.
                </p>
              </div>

              <form onSubmit={handleSubmitMockForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Name */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700 }}>이름 <span style={{ color: 'var(--color-red)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    style={{ padding: '12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                {/* Contact */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700 }}>연락처 <span style={{ color: 'var(--color-red)' }}>*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ padding: '12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                {/* School Grade (prefilled) */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700 }}>학적 정보</label>
                  <input
                    type="text"
                    disabled
                    value={`${userGrade} (${userLocation} 거주)`}
                    style={{ padding: '12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', backgroundColor: '#F9FAFB', color: 'var(--text-secondary)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>끌(Kkeul) 프로필 정보로 자동 동기화되었습니다.</p>
                </div>

                {/* Reason */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700 }}>지원 동기 및 각오 <span style={{ color: 'var(--color-red)' }}>*</span></label>
                  <textarea
                    required
                    rows={4}
                    placeholder="대회/공고에 지원하는 포부를 짧게 적어주세요."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ padding: '12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '52px', marginTop: '10px' }}
                >
                  제출하기
                </button>

              </form>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
