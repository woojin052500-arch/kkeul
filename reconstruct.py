import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    current = f.read()

# The cut off point where corruption starts:
# We will cut off right before the corrupted back button.
# Let's find `      {/* 1. Header (Back Button and Progress Bar) */}`
cut_idx = current.find('      {/* 1. Header (Back Button and Progress Bar) */}')
top_part = current[:cut_idx]

top_part += """      {/* 1. Header (Back Button and Progress Bar) */}
      <div>
        {step > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', height: '48px', marginBottom: '8px' }}>
            <button 
              onClick={() => {
                const handled = backRef?.current?.() ?? false;
                if (!handled) setStep(prev => prev - 1);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px' }}
            >
              <ArrowLeft size={24} color="#191F28" />
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {step > 0 && mode === 'signup' && (
          <div style={{ width: '100%', height: '4px', backgroundColor: '#F2F4F6', borderRadius: '2px', marginBottom: '32px' }}>
            <div style={{ 
              width: `${getProgressPercent()}%`, 
              height: '100%', 
              backgroundColor: 'var(--color-indigo)', 
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', marginTop: step === 0 ? '0' : '20px' }}>
        
        {/* STEP 0: Splash Screen */}
        {step === 0 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <PremiumLogo size={80} style={{ marginBottom: '20px' }} />
              <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>
                당신의 잠재력,<br />끝까지 이끌어내다
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Kkeul(끌)에서 새로운 성장의 기회를 만나보세요.
              </p>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setMode('signup'); setStep(1); }} className="btn btn-primary" style={{ width: '100%' }}>
                새로 시작하기 (회원가입)
              </button>
              <button onClick={() => { setMode('login'); setStep(1); }} className="btn btn-secondary" style={{ width: '100%' }}>
                기존 계정으로 로그인
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Email */}
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {mode === 'signup' ? '로그인에 사용할\\n이메일을 입력해 주세요' : '이메일을\\n입력해 주세요'}
            </h1>
            <div className="toss-input-group" style={{ marginTop: '24px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">이메일 주소</label>
            </div>
          </div>
        )}

        {/* STEP 2: Password */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              비밀번호를 입력해 주세요
            </h1>
            <div className="toss-input-group" style={{ marginTop: '24px', position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">비밀번호 (6자 이상)</label>
              <button 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Name */}
        {step === 3 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              이름(실명)을<br />알려주세요
            </h1>
            <div className="toss-input-group" style={{ marginTop: '24px' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">이름</label>
            </div>
          </div>
"""

with open('transcript_extract.tsx', 'r', encoding='utf-8') as f:
    mid_part = f.read()

# Now we need the play style UI inserted in mid_part right after STEP 9 (Interests)
step_13_14_ui = """
        {/* STEP 13: Student Play Style */}
        {step === 13 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '8px' }}>
              나의 플레이 스타일은?
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              성향에 딱 맞는 대회를 추천해 드립니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>선호하는 팀 규모</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['독고다이(개인전)', '다 같이 으쌰으쌰(팀전)'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setPlayStyleTeamSize(prev => 
                        prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                      )}
                      style={{
                        padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        border: playStyleTeamSize.includes(opt) ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                        backgroundColor: playStyleTeamSize.includes(opt) ? 'var(--color-indigo-light)' : '#FAFBFC',
                        color: playStyleTeamSize.includes(opt) ? 'var(--color-indigo)' : 'var(--text-secondary)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>선호하는 호흡(기간)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {['무박 2일 하얗게 불태우기(해커톤)', '몇 달간 진득하게(장기 프로젝트)'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setPlayStyleDuration(opt)}
                      style={{
                        padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        border: playStyleDuration === opt ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                        backgroundColor: playStyleDuration === opt ? 'var(--color-indigo-light)' : '#FAFBFC',
                        color: playStyleDuration === opt ? 'var(--color-indigo)' : 'var(--text-secondary)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>진행 방식</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['방구석 100% 온라인', '현장 참여 오프라인'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setPlayStyleType(opt)}
                      style={{
                        padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        border: playStyleType === opt ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                        backgroundColor: playStyleType === opt ? 'var(--color-indigo-light)' : '#FAFBFC',
                        color: playStyleType === opt ? 'var(--color-indigo)' : 'var(--text-secondary)'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 14: Invitation Code */}
        {step === 14 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '8px' }}>
              추천인 코드가 있나요?
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              초대코드를 입력하면 두 분 모두에게 100XP를 추가로 드립니다.
            </p>
            <div className="toss-input-group">
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">추천인 코드 (선택)</label>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              없다면 그냥 넘어가셔도 좋습니다.
            </div>
          </div>
        )}
"""

mid_part = mid_part.replace("{/* STEP 10: Host Institution Name Input */}", step_13_14_ui + "\n        {/* STEP 10: Host Institution Name Input */}")

# Replace step 9 next button
mid_part = re.sub(r'\{step === 9 && \(\s*<button\s*onClick=\{handleStudentFinish\}\s*className="btn btn-primary"\s*disabled=\{interests\.length === 0 \|\| isSubmitting\}\s*>\s*\{isSubmitting \? \'회원가입 중\.\.\.\' : \'가입 완료\'\}\s*</button>\s*\)\}', 
    """{step === 9 && (
                <button
                  onClick={() => setStep(13)}
                  className="btn btn-primary"
                  disabled={interests.length === 0}
                >
                  다음
                </button>
              )}""", mid_part)

# Also fix the bottom part (which wasn't deleted in current file! It starts around Step 10 or 11!)
# Actually, the bottom part of `transcript_extract.tsx` ends at `1261:  <li>제4조...`.
# Where does the bottom part in `current` start?
# In `current`, the corruption started at line 324 and ended inside `setPlayStyleTeamSize(opt)` which means it overwrote until Step 13.
# Step 14 is literally inside `current`!
# Let's see if we can just append the bottom part of `current`.
# Let's search for `{/* STEP 10: Host Institution Name Input */}` in `current`.
step_10_idx = current.find('{/* STEP 10: Host Institution Name Input */}')
bottom_part = current[step_10_idx:]

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(top_part)
    f.write(mid_part)
    f.write(bottom_part)

print("Reconstructed Onboarding.tsx!")
