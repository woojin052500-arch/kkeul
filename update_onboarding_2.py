import re

with open('src/components/Onboarding.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change string to string[]
content = content.replace("const [playStyleTeamSize, setPlayStyleTeamSize] = useState<string>('다 같이 으쌰으쌰(팀전)');", "const [playStyleTeamSize, setPlayStyleTeamSize] = useState<string[]>(['다 같이 으쌰으쌰(팀전)']);")
# Update toggle logic
toggle_logic = """onClick={() => {
                        setPlayStyleTeamSize(prev => 
                          prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                        )
                      }}"""
content = re.sub(r'onClick=\{.*?setPlayStyleTeamSize\(opt\).*?\}', toggle_logic, content, flags=re.DOTALL)
# Update UI styles
content = re.sub(r'playStyleTeamSize === opt \?', r'playStyleTeamSize.includes(opt) ?', content)
# Update handleStudentFinish
content = content.replace("team_size: playStyleTeamSize,", "team_size: playStyleTeamSize.join(', '),")

# Add invitation code
content = content.replace("const [showPassword, setShowPassword] = useState<boolean>(false);", "const [showPassword, setShowPassword] = useState<boolean>(false);\n  const [invitationCode, setInvitationCode] = useState<string>('');")

invite_ui = """
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
                onKeyDown={(e) => handleKeyDown(e, true, handleStudentFinish)}
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

content = content.replace("{/* STEP 10: Host Institution Name Input */}", invite_ui + "\n        {/* STEP 10: Host Institution Name Input */}")

content = content.replace("const handleStudentFinish = async () =>", """const handleStudentFinish = async () => {
    if (interests.length === 0) return;
    try {
      setIsSubmitting(true);
      const { user, error } = await db.signUp(email, password, name);
      if (error) {
        alert(`가입 실패: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      
      const newProfile: Profile = {
        id: user.id,
        email: email,
        name: name,
        location: location,
        grade: grade,
        school: school,
        interests: interests,
        play_style: { team_size: playStyleTeamSize.join(', '), duration: playStyleDuration, type: playStyleType },
        xp: invitationCode.trim() ? 200 : 100,
        badges: [],
        role: 'student',
        agreeDisclaimer: true
      };

      const saved = await db.saveProfile(newProfile);
      setWelcomeName(saved.name);
      setIsSubmitting(false);
      setShowWelcome(true);
      setTimeout(() => {
        onComplete(saved);
      }, 2500);
    } catch (err: any) {
      alert(`알 수 없는 에러가 발생했습니다: ${err.message}`);
      setIsSubmitting(false);
    }
  };
  
  // Dummy to replace old""")

content = re.sub(r'const handleStudentFinish = async \(\) => \{\n.*?catch \(err: any\) \{\n.*?setIsSubmitting\(false\);\n.*?\}\n.*?\}\n.*?\/\/ Dummy to replace old', r'const handleStudentFinish = async () => {\n    // Replaced\n  };\n  // Dummy to replace old', content, flags=re.DOTALL)

# Modify button logic for step 13
content = re.sub(r'\{step === 13 && \(\s*<button\s*onClick=\{handleStudentFinish\}\s*className="btn btn-primary"\s*disabled=\{isSubmitting\}\s*>\s*\{isSubmitting \? \'회원가입 중\.\.\.\' : \'가입 완료\'\}\s*</button>\s*\)\}', 
    """{step === 13 && (
                <button
                  onClick={() => setStep(14)}
                  className="btn btn-primary"
                >
                  다음
                </button>
              )}
              {step === 14 && (
                <button
                  onClick={handleStudentFinish}
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '가입 중...' : (invitationCode.trim() ? '100XP 추가 받고 가입하기' : '가입 완료')}
                </button>
              )}""", content)

with open('src/components/Onboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Onboarding.tsx")
