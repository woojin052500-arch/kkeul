import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    current = f.read()

bottom_part = """
        {/* STEP 10: Host Institution Name Input */}
        {step === 10 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              공고를 개최하는<br />기관의 이름을 적어주세요
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              공고 게시글 작성자 명칭으로 노출됩니다.
            </p>

            <div className="toss-input-group" style={{ marginTop: '24px' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, isValidName, () => setStep(11))}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">기관명 또는 동아리명</label>
            </div>
            
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              예) 한국청소년발명협회, SW 기획동아리 아테나
            </div>
          </div>
        )}

        {/* STEP 11: Host Contact Info Input */}
        {step === 11 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              담당자 연락처를<br />입력해 주세요
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              긴급 상황 시 연락드릴 번호입니다.
            </p>

            <div className="toss-input-group" style={{ marginTop: '24px' }}>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, () => contact.length >= 10, handleHostFinish)}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">휴대폰 번호 (- 제외)</label>
            </div>
          </div>
        )}

        {/* STEP 12: Host Finished */}
        {step === 12 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <Check size={32} color="#FFFFFF" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
              호스트 가입이<br />완료되었습니다
            </h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
              이제 첫 공고를 올려보세요!
            </p>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        {step === 1 && (
          <button onClick={() => setStep(2)} className="btn btn-primary" disabled={!isValidEmail()}>
            다음
          </button>
        )}
        {step === 2 && (
          <button 
            onClick={() => {
              if (mode === 'signup') setStep(3);
              else handleLoginSubmit();
            }} 
            className="btn btn-primary" 
            disabled={!isValidPassword() || (mode === 'login' && isSubmitting)}
          >
            {mode === 'login' ? (isSubmitting ? '로그인 중...' : '로그인') : '다음'}
          </button>
        )}
        {step === 3 && mode === 'signup' && (
          <button onClick={() => setStep(4)} className="btn btn-primary" disabled={!isValidName()}>
            다음
          </button>
        )}
        {step === 4 && mode === 'signup' && (
          <button 
            onClick={() => setStep(5)} 
            className="btn btn-primary" 
            disabled={!(agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeCompetency && agreeDisclaimer)}
          >
            동의하고 계속하기
          </button>
        )}
        {/* Step 5 has inline buttons */}
        {step === 6 && mode === 'signup' && (
          <button onClick={() => setStep(7)} className="btn btn-primary">
            다음
          </button>
        )}
        {step === 7 && mode === 'signup' && (
          <button onClick={() => setStep(8)} className="btn btn-primary">
            다음
          </button>
        )}
        {step === 8 && mode === 'signup' && (
          <button onClick={() => setStep(9)} className="btn btn-primary" disabled={school.trim().length === 0}>
            다음
          </button>
        )}
        {step === 9 && mode === 'signup' && (
          <button onClick={() => setStep(13)} className="btn btn-primary" disabled={interests.length === 0}>
            다음
          </button>
        )}
        {step === 13 && mode === 'signup' && (
          <button onClick={() => setStep(14)} className="btn btn-primary">
            다음
          </button>
        )}
        {step === 14 && mode === 'signup' && (
          <button onClick={handleStudentFinish} className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : (invitationCode.trim() ? '100XP 추가 받고 가입하기' : '가입 완료')}
          </button>
        )}
        
        {step === 10 && mode === 'signup' && (
          <button onClick={() => setStep(11)} className="btn btn-primary" disabled={!isValidName()}>
            다음
          </button>
        )}
        {step === 11 && mode === 'signup' && (
          <button onClick={handleHostFinish} className="btn btn-primary" disabled={contact.length < 10 || isSubmitting}>
            {isSubmitting ? '처리 중...' : '가입 완료'}
          </button>
        )}
      </div>

      {showWelcome && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-indigo)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <Sparkles size={48} color="#FFFFFF" style={{ marginBottom: '24px' }} />
          <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
            환영합니다,<br />{welcomeName}님!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '16px' }}>
            나에게 딱 맞는 공고를 찾아보세요
          </p>
        </div>
      )}
    </div>
  );
};
"""

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(current + bottom_part)
