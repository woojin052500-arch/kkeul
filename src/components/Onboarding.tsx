import React, { useState } from 'react';
import type { Profile } from '../types';
import { Check, Sparkles, ArrowLeft, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
import { PremiumLogo } from './PremiumLogo';
import { db } from '../supabaseClient';

interface OnboardingProps {
  onComplete: (profile: Profile) => void;
  backRef?: React.MutableRefObject<(() => boolean) | null>;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, backRef }) => {
  // Mode: signup or login
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  // Step definition:
  // 0: Splash Screen
  // Mode signup steps:
  // 1: Email, 2: Password, 3: Name, 4: Agreements, 5: Role Split
  // 6: Student Region, 7: Student Grade, 8: Student Interests
  // 9: Host Institution Name, 10: Host Contact Info, 11: Host Finished
  // Mode login steps:
  // 1: Login Email, 2: Login Password
  const [step, setStep] = useState<number>(0);
  
  // Input states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [, setRole] = useState<'student' | 'host'>('student');
  const [location, setLocation] = useState<string>('서울');
  const [grade, setGrade] = useState<string>('고등학교 2학년');
  const [school, setSchool] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [playStyleTeamSize, setPlayStyleTeamSize] = useState<string[]>(['다 같이 으쌰으쌰(팀전)']);
  const [playStyleDuration, setPlayStyleDuration] = useState<string>('무박 2일 하얗게 불태우기(해커톤)');
  const [playStyleType, setPlayStyleType] = useState<string>('방구석 100% 온라인');

  const [contact, setContact] = useState<string>('');
  // Terms Agreement states
  const [agreeAge, setAgreeAge] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [agreePrivacy, setAgreePrivacy] = useState<boolean>(false);
  const [agreeOverseas, setAgreeOverseas] = useState<boolean>(false);
  const [agreeDisclaimer, setAgreeDisclaimer] = useState<boolean>(false);
  const [agreeCompetency, setAgreeCompetency] = useState<boolean>(false);
  // Loading / Overlay states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [welcomeName, setWelcomeName] = useState<string>('');




  const handleAllAgree = () => {
    const nextVal = !(agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeDisclaimer && agreeCompetency);
    setAgreeAge(nextVal);
    setAgreeTerms(nextVal);
    setAgreePrivacy(nextVal);
    setAgreeOverseas(nextVal);
    setAgreeDisclaimer(nextVal);
    setAgreeCompetency(nextVal);
  };


  // Validation helpers
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const isValidName = name.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isAllowed: boolean, onNext: () => void) => {
    if (e.key === 'Enter' && isAllowed) {
      e.preventDefault();
      onNext();
    }
  };

  // Login handler
  const handleLoginSubmit = async () => {
    if (!isValidEmail || !isValidPassword) return;
    try {
      setIsSubmitting(true);
      const { user, error } = await db.signIn(email, password);
      if (error) {
        alert(`로그인 실패: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      let userProfile = await db.getProfile(email);
      if (!userProfile || !userProfile.role) {
        const fallbackProfile: Profile = {
          id: userProfile?.id || user?.id || crypto.randomUUID(),
          email: email,
          name: userProfile?.name || email.split('@')[0],
          location: '전국',
          grade: '고등학교 전체',
          school: '일반학교',
          interests: ['IT/개발', '창업', '수학/과학'],
          xp: 0,
          badges: [],
          role: 'student'
        };
        userProfile = await db.saveProfile(fallbackProfile);
      }
      setIsSubmitting(false);
      onComplete(userProfile);
    } catch (err: any) {
      alert(`로그인 오류: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  // Student Signup Finish
  const handleStudentFinish = async () => {
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
  // Host Signup Finish
  const handleHostFinish = async () => {
    if (!name || !contact) return;
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
        location: '전국',
        grade: '일반',
        school: '해당없음',
        interests: ['IT/개발', '창업'],
        xp: 100, // 웰컴 보너스
        badges: [],
        role: 'host',
        contact: contact,
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
      alert(`가입 중 오류가 발생했습니다: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  // Back action handler
  const handleBack = () => {
    if (step === 0) return;
    if (mode === 'login') {
      setStep(prev => prev - 1);
    } else {
      // signup
      if (step === 10) {
        setStep(5); // Host name -> Role Selection
      } else if (step === 6) {
        setStep(5); // Student region -> Role Selection
      } else {
        setStep(prev => prev - 1);
      }
    }
  };

  React.useEffect(() => {
    if (backRef) {
      backRef.current = () => {
        if (step > 0) {
          handleBack();
          return true;
        }
        return false;
      };
    }
    return () => {
      if (backRef) {
        backRef.current = null;
      }
    };
  }, [step, mode, backRef]);

  // Progress Bar Helper
  const getProgressPercent = () => {
    if (step === 0 || mode === 'login') return 0;
    let total = 9; // email, password, name, agreements, role, region, grade, school, interests
    let current = step;
    
    if (step >= 10) {
      // Host steps: 10 (institution), 11 (contact), 12 (done)
      total = 3;
      current = step - 9;
    } else if (step === 13 || step === 14) {
      // Student extra steps
      total = 11;
      current = step;
    }
    
    return Math.min(100, Math.round((current / total) * 100));
  };

  return (
    <div style={{ 
      padding: '20px 24px', 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      justifyContent: 'space-between', 
      minHeight: '100vh', 
      position: 'relative',
      backgroundColor: '#FFFFFF'
    }}>
      
      {/* 1. Header (Back Button and Progress Bar) */}
      <div>
        {step > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', height: '48px', marginBottom: '8px' }}>
            <button 
              onClick={() => {
                const handled = backRef?.current?.() ?? false;
                if (!handled) setStep(prev => prev - 1);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', marginLeft: '-8px' }}
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
              <div style={{ marginBottom: '20px' }}><PremiumLogo size="lg" /></div>
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
              {mode === 'signup' ? '로그인에 사용할\n이메일을 입력해 주세요' : '이메일을\n입력해 주세요'}
            </h1>
            <div className="toss-input-group" style={{ marginTop: '24px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, isValidEmail, () => setStep(2))}
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
                onKeyDown={(e) => handleKeyDown(e, isValidPassword, () => {
                  if (mode === 'signup') setStep(3);
                  else handleLoginSubmit();
                })}
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
                onKeyDown={(e) => handleKeyDown(e, isValidName, () => setStep(4))}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">이름</label>
            </div>
          </div>
        )}

        {/* STEP 4: Agreements (Simplified to skip huge text block, we can just render the agreements list) */}
        {step === 4 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '24px' }}>
              끌에 오신 것을 환영합니다
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              맞춤 큐레이션을 위해 아래 약관에 동의해 주세요.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '16px', backgroundColor: '#FAFBFC', borderRadius: '12px', border: '1px solid #E5E8EB' }}>
                <div onClick={handleAllAgree} style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  backgroundColor: (agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeCompetency && agreeDisclaimer) ? 'var(--color-indigo)' : '#E5E8EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Check size={16} color="#FFFFFF" />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>전체 동의하기</span>
              </label>
              
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreeAge(!agreeAge)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreeAge ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] 만 14세 이상입니다</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreeTerms(!agreeTerms)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreeTerms ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] Kkeul 이용약관 동의</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreePrivacy(!agreePrivacy)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreePrivacy ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] 개인정보 수집 및 이용 동의</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreeOverseas(!agreeOverseas)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreeOverseas ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] 개인정보 국외 이전 동의</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreeCompetency(!agreeCompetency)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreeCompetency ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] 역량 데이터 수집 동의</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <div onClick={() => setAgreeDisclaimer(!agreeDisclaimer)} style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    backgroundColor: agreeDisclaimer ? 'var(--color-indigo)' : '#E5E8EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Check size={16} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>[필수] 면책 조항 동의</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Role Split */}
        {step === 5 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '24px' }}>
              어떤 목적으로<br />끌을 시작하시나요?
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div 
                onClick={() => { setRole('student'); setStep(6); }}
                style={{
                  padding: '24px', borderRadius: '16px', backgroundColor: '#FAFBFC', border: '1px solid #E5E8EB',
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(49, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="#3182F6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: '#191F28' }}>대회 참여 / 스펙 관리</h3>
                  <p style={{ fontSize: '14px', color: '#8B95A1', margin: 0 }}>학생 및 참가자용</p>
                </div>
              </div>
              <div 
                onClick={() => { setRole('host'); setStep(10); }}
                style={{
                  padding: '24px', borderRadius: '16px', backgroundColor: '#FAFBFC', border: '1px solid #E5E8EB',
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: '#191F28' }}>대회 주최 / 모집</h3>
                  <p style={{ fontSize: '14px', color: '#8B95A1', margin: 0 }}>주최 기관 및 동아리용</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Region (Student) */}
        {step === 6 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '24px' }}>
              주로 활동하는<br />지역을 선택해 주세요
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['서울', '경기', '인천', '대전', '부산', '대구', '울산', '광주', '강원', '충북', '충남', '경북', '경남', '전북', '전남', '제주', '세종'].map(loc => (
                <button
                  key={loc}
                  onClick={() => setLocation(loc)}
                  style={{
                    padding: '12px 0', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                    border: location === loc ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                    backgroundColor: location === loc ? 'var(--color-indigo-light)' : '#FAFBFC',
                    color: location === loc ? 'var(--color-indigo)' : 'var(--text-secondary)'
                  }}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Grade (Student) */}
        {step === 7 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '24px' }}>
              현재 학년을<br />선택해 주세요
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['중학교 1학년', '중학교 2학년', '중학교 3학년', '고등학교 1학년', '고등학교 2학년', '고등학교 3학년', '대학생/졸업생'].map(g => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  style={{
                    padding: '16px 0', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                    border: grade === g ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                    backgroundColor: grade === g ? 'var(--color-indigo-light)' : '#FAFBFC',
                    color: grade === g ? 'var(--color-indigo)' : 'var(--text-secondary)'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: School (Student) */}
        {step === 8 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '24px' }}>
              재학 중인 학교/소속을<br />입력해 주세요
            </h1>
            <div className="toss-input-group">
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, school.trim().length > 0, () => setStep(9))}
                className="toss-input"
                placeholder=" "
                autoFocus
              />
              <label className="toss-input-placeholder">소속명</label>
            </div>
          </div>
        )}

        {/* STEP 9: Interests (Student) - removed B2B, B2C, SaaS etc */}
        {step === 9 && mode === 'signup' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '8px' }}>
              관심 분야를 모두 골라주세요
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              선택한 분야의 대회를 추천해 드립니다.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['IT/개발', '디자인', '기획/아이디어', '창업', '수학/과학', '예술/문화', '인문학', '체육', '봉사활동', '외국어/어학'].map(interest => (
                <button
                  key={interest}
                  onClick={() => {
                    setInterests(prev => 
                      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
                    );
                  }}
                  style={{
                    padding: '12px 16px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                    border: interests.includes(interest) ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                    backgroundColor: interests.includes(interest) ? 'var(--color-indigo-light)' : '#FAFBFC',
                    color: interests.includes(interest) ? 'var(--color-indigo)' : 'var(--text-secondary)'
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

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
                onKeyDown={(e) => handleKeyDown(e, contact.length >= 10, handleHostFinish)}
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
          <button onClick={() => setStep(2)} className="btn btn-primary" disabled={!isValidEmail}>
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
            disabled={!isValidPassword || (mode === 'login' && isSubmitting)}
          >
            {mode === 'login' ? (isSubmitting ? '로그인 중...' : '로그인') : '다음'}
          </button>
        )}
        {step === 3 && mode === 'signup' && (
          <button onClick={() => setStep(4)} className="btn btn-primary" disabled={!isValidName}>
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
          <button onClick={() => setStep(11)} className="btn btn-primary" disabled={!isValidName}>
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
