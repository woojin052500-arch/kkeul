import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_vars = """
  const [playStyleTeamSize, setPlayStyleTeamSize] = useState<string>('다 같이 으쌰으쌰(팀전)');
  const [playStyleDuration, setPlayStyleDuration] = useState<string>('무박 2일 하얗게 불태우기(해커톤)');
  const [playStyleType, setPlayStyleType] = useState<string>('방구석 100% 온라인');
"""
content = re.sub(r'(const \[interests, setInterests\] = useState<string\[\]>\(\[\]\);)', r'\1' + state_vars, content)

# 2. Add Step 13 UI
step_13_ui = """
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
                      onClick={() => setPlayStyleTeamSize(opt)}
                      style={{
                        padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                        border: playStyleTeamSize === opt ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                        backgroundColor: playStyleTeamSize === opt ? 'var(--color-indigo-light)' : '#FAFBFC',
                        color: playStyleTeamSize === opt ? 'var(--color-indigo)' : 'var(--text-secondary)'
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
"""
content = content.replace("{/* STEP 10: Host Institution Name Input */}", step_13_ui + "\n        {/* STEP 10: Host Institution Name Input */}")

# 3. Modify handleStudentFinish to include playStyle
# `interests: interests,` -> `interests: interests, play_style: { team_size: playStyleTeamSize, duration: playStyleDuration, type: playStyleType },`
content = content.replace("interests: interests,", "interests: interests,\n        play_style: { team_size: playStyleTeamSize, duration: playStyleDuration, type: playStyleType },")

# 4. Modify button for Step 9
# replace `onClick={handleStudentFinish}` with `onClick={() => setStep(13)}`
# replace `{isSubmitting ? '회원가입 중...' : '가입 완료'}` with `다음`
content = re.sub(r'\{step === 9 && \(\s*<button\s*onClick=\{handleStudentFinish\}\s*className="btn btn-primary"\s*disabled=\{interests\.length === 0 \|\| isSubmitting\}\s*>\s*\{isSubmitting \? \'회원가입 중\.\.\.\' : \'가입 완료\'\}\s*</button>\s*\)\}', 
    """{step === 9 && (
                <button
                  onClick={() => setStep(13)}
                  className="btn btn-primary"
                  disabled={interests.length === 0}
                >
                  다음
                </button>
              )}""", content)

# 5. Add button for Step 13
btn_13 = """
              {step === 13 && (
                <button
                  onClick={handleStudentFinish}
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '회원가입 중...' : '가입 완료'}
                </button>
              )}
"""
content = content.replace("{/* Host Steps Next Buttons */}", btn_13 + "\n              {/* Host Steps Next Buttons */}")

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Onboarding updated")
