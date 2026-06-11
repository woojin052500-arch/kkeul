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
  const [location, setLocation] = useState<string>('�');
  const [grade, setGrade] = useState<string>('�б� 2�г�');
  const [school, setSchool] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [playStyleTeamSize, setPlayStyleTeamSize] = useState<string[]>(['� � �X�X(�)']);
  const [playStyleDuration, setPlayStyleDuration] = useState<string>('� 2� �Ͼ� �¿�(�Ŀ�)');
  const [playStyleType, setPlayStyleType] = useState<string>('�汸� 100% �¶�');

  const [contact, setContact] = useState<string>('');
  // Terms Agreement states
  const [agreeAge, setAgreeAge] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerm

