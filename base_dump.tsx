import React, { useState } from 'react';
import type { Profile } from '../types';
import { Check, Sparkles, ArrowLeft, Eye, EyeOff, User, PlusCircle, ShieldCheck } from 'lucide-react';
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
  const [activeDetailTerm, setActiveDetailTerm] = useState<'age' | 'terms' | 'privacy' | 'overseas' | 'disclaimer' | 'competency' | null>(null);
  // Loading / Overlay states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [welcomeName, setWelcomeName] = useState<string>('');

  const locations = [
    '전국', '서울', '경기', '인천', '부산', '대구', 
    '대전', '광주', '울산', '세종', '강원', '충북', 
    '충남', '전북', '전남', '경북', '경남', '제주'
  ];

  const grades = [
    '중학교 1학년', '중학교 2학년', '중학교 3학년',
    '고등학교 1학년', '고등학교 2학년', '고등학교 3학년'
  ];

  const interestOptions = [
    'IT/개발', '창업', '수학/과학', '예술/문화', 
    '인문학', '체육', '봉사활동', '외국어/어학'
  ];

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAllAgree = () => {
    const nextVal = !(agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeDisclaimer && agreeCompetency);
    setAgreeAge(nextVal);
    setAgreeTerms(nextVal);
    setAgreePrivacy(nextVal);
    setAgreeOverseas(nextVal);
    setAgreeDisclaimer(nextVal);
    setAgreeCompetency(nextVal);
  };

  const isAllAgreed = agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeDisclaimer && agreeCompetency;

  // Validation helpers
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const isValidName = name.trim().length > 0;
  const isRequiredAgreed = agreeAge && agreeTerms && agreePrivacy && agreeOverseas && agreeDisclaimer && agreeCompetency;

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
      const { error } = await db.signIn(email, password);
      if (error) {
        alert(`로그인 실패: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      let userProfile = await db.getProfile(email);
      if (!userProfile || !userProfile.role) {
        const fallbackProfile: Profile = {
          id: userProfile?.id || 'u' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36),
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
  
  // Dummy to replace old {
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
        xp: 100, // 웰컴 보너스 100 XP 지급
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
      alert(`가입 중 오류가 발생했습니다: ${err.message}`);
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
        
        