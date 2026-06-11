import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTossModal } from '../hooks/useTossModal';
import type { Announcement, Profile, ClubAnnouncement, ClubApplicant } from '../types';
import { Home, Bookmark, Users, User, Star, MapPin, Calendar as CalendarIcon, Compass, Award, PlusCircle, BarChart3, CheckCircle2, Lock, Share2, Sparkles, RefreshCw, Plus, Check, Building2, Milestone, Phone, Activity, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';
import partnerBsbrbo from '../assets/partner_bsbrbo.jpg';
import partnerKangceo from '../assets/partner_kangceo.png';
import partnerSwitchback from '../assets/partner_switchback.png';

import partnerBrawl from '../assets/partner_brawl.png';
import partnerWellthy from '../assets/partner_wellthy.png';
import partnerScentpulse from '../assets/partner_scentpulse.png';
import partnerGNDevs from '../assets/partner_gndevs.svg';
import { db } from '../supabaseClient';
import type { ClubNetworking } from '../supabaseClient';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { purchase } from '../utils/billing';
import { Contacts } from '@capacitor-community/contacts';
import { AdFitNativeCard, AdFitBanner100 } from './AdFit';


const BADGE_DETAILS: Record<string, { emoji: string; color: string; neonColor: string; criteria: string }> = {
  '정보 공유왕': {
    emoji: '📢',
    color: '#3B82F6',
    neonColor: '0 0 10px rgba(59, 130, 246, 0.4)',
    criteria: '공모전 상세 정보에서 [너한테 딱이다] 링크 공유를 보내면 획득!'
  },
  '캘린더 마스터': {
    emoji: '📅',
    color: '#8B5CF6',
    neonColor: '0 0 10px rgba(139, 92, 246, 0.4)',
    criteria: '공모전 상세 정보의 달력 버튼을 눌러 내 기본 캘린더에 일정을 저장하면 획득!'
  },
  '인싸의 탄생': {
    emoji: '🤝',
    color: '#FF007F',
    neonColor: '0 0 10px rgba(255, 0, 127, 0.4)',
    criteria: '마이페이지의 설정에서 친구 초대 적용 완료 시 획득!'
  },
  '끌 마스터': {
    emoji: '👑',
    color: '#F59E0B',
    neonColor: '0 0 10px rgba(245, 158, 11, 0.4)',
    criteria: '메인 홈 탭에서 카드를 스와이프하여 넘기는 것을 5회 이상 성공하면 획득!'
  }
};

interface MainFeedProps {
  profile: Profile;
  announcements: Announcement[];
  bookmarks: string[];
  onSelectAnnouncement: (announcement: Announcement) => void;
  onToggleBookmark: (id: string) => void;
  onLogout: () => void;
  onWithdraw: () => void;
  onAddAnnouncement: (ann: Announcement) => void;
  onTriggerMockPush: (title: string, msg: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpdateProfile: (profile: Profile) => Promise<void>;
  notificationPanel: React.ReactNode;
  backRef?: React.MutableRefObject<(() => boolean) | null>;
}

export const MainFeed: React.FC<MainFeedProps> = ({

  profile,
  announcements,
  bookmarks,
  onSelectAnnouncement,
  onToggleBookmark,
  onLogout,
  onWithdraw,
  onAddAnnouncement,
  onTriggerMockPush,
  activeTab,
  setActiveTab,
  onUpdateProfile,
  notificationPanel: _notificationPanel,
  backRef
}) => {
  const { TossModal, showAlert, showPrompt } = useTossModal();

  // Student selected category state
  const [selectedCategory, setSelectedCategory] = useState<string>('추천');

  // B2C 학생용 뷰 모드: 'swipe' (토스형 스와이프 매칭) vs 'list' (리스트 뷰)
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');

  // 스와이프 Pass 처리되어 영구 제외할 공고 ID 목록
  const [passedIds, setPassedIds] = useState<string[]>([]);

  // 친구 초대 및 추천 가입 게이미피케이션 상태
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isNeonThemeUnlocked, setIsNeonThemeUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_neon_theme') === 'true';
  });
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_premium_unlocked') === 'true';
  });

  // 시뮬레이션 가이드 관련 상태
  const [showSimulation, setShowSimulation] = useState<boolean>(false); // 튜토리얼 자동 표시 비활성화
  const [simulationStep, setSimulationStep] = useState<number>(1);
  const [showCalendarSimModal, setShowCalendarSimModal] = useState<boolean>(false);
  const [showSimCompleteModal, setShowSimCompleteModal] = useState<boolean>(false);

  // B2B Stats selected announcement state
  const [selectedStatsAnnId, setSelectedStatsAnnId] = useState<string>('');

  // 동아리 SaaS 및 B2B 학교 대시보드 관련 State
  const [clubRole, setClubRole] = useState<'student' | 'leader' | 'networking'>('student');
  const [clubNetworkingEvents, setClubNetworkingEvents] = useState<ClubNetworking[]>([]);
  const [clubAnnouncements, setClubAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubAnnouncement | null>(null);
  const [clubApplicants, setClubApplicants] = useState<ClubApplicant[]>([]);
  const [appliedClubIds, setAppliedClubIds] = useState<string[]>(() => {
    const local = localStorage.getItem('kkeul_applied_club_ids');
    return local ? JSON.parse(local) : [];
  });
  const [showClubRegModal, setShowClubRegModal] = useState<boolean>(false);
  const [clubRegName, setClubRegName] = useState<string>('');
  const [clubRegTitle, setClubRegTitle] = useState<string>('');
  const [clubRegDetails, setClubRegDetails] = useState<string>('');
  const [clubRegTags, setClubRegTags] = useState<string>('');

  const [showB2BSchoolModal, setShowB2BSchoolModal] = useState<boolean>(false);
  const [selectedSchoolB2B, setSelectedSchoolB2B] = useState<string>('하나고등학교');
  const [editMajor, setEditMajor] = useState<string>('');
  const [selectedBadgeToShare, setSelectedBadgeToShare] = useState<string | null>(null);
  const [isSharingBadge, setIsSharingBadge] = useState<boolean>(false);
  const [sharedBadges, setSharedBadges] = useState<string[]>(() => {
    const local = localStorage.getItem('kkeul_shared_badges');
    return local ? JSON.parse(local) : [];
  });

  // Profile sub-tab selection state
  const [profileSubTab, setProfileSubTab] = useState<'portfolio' | 'edit' | 'settings'>('portfolio');
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Profile editing state
  const [editName, setEditName] = useState<string>('');
  const [editSchool, setEditSchool] = useState<string>('');
  const [editGrade, setEditGrade] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editContact, setEditContact] = useState<string>('');


  // 동아리 SaaS 관련 데이터 조회
  useEffect(() => {
    const fetchClubs = async () => {
      const schoolName = profile.school || '하나고등학교';
      const anns = await db.getClubAnnouncements(schoolName);
      setClubAnnouncements(anns);
      
      if (selectedClub) {
        const apps = await db.getClubApplicants(selectedClub.id);
        setClubApplicants(apps);
      } else if (anns.length > 0) {
        setSelectedClub(anns[0]);
        const apps = await db.getClubApplicants(anns[0].id);
        setClubApplicants(apps);
      }
      const networking = await db.getClubNetworking();
      setClubNetworkingEvents(networking);
    };
    if (activeTab === 'club') {
      fetchClubs();
    }
  }, [activeTab, profile.school, selectedClub?.id]);

  // Synchronize profile editing state with profile prop changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditSchool(profile.school || '');
      setEditGrade(profile.grade || '');
      setEditLocation(profile.location || '');
      setEditInterests(profile.interests || []);
      setEditContact(profile.contact || '');

      setEditMajor(profile.major || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      await showAlert('이름을 입력해 주세요!');
      return;
    }
    
    const updatedProfile: Profile = {
      ...profile,
      name: editName,
      school: editSchool,
      grade: editGrade,
      location: editLocation,
      major: editMajor,
      interests: editInterests,
      contact: editContact,
    };
    
    await onUpdateProfile(updatedProfile);
    onTriggerMockPush('프로필 업데이트', '포트폴리오 정보가 정상적으로 저장되었습니다.');
    setProfileSubTab('portfolio');
  };

  // 동아리 지원 신청 처리
  const handleApplyToClub = async (club: ClubAnnouncement) => {
    if (!profile) return;
    
    await db.applyToClub({
      club_id: club.id,
      user_id: profile.id,
      user_name: profile.name,
      user_school: profile.school || '하나고등학교',
      user_grade: profile.grade || '2학년',
      user_contact: profile.contact || profile.email || '미입력',
      user_skills: [],
      user_awards: [],
      introduction_summary: `우수한 역량과 열정으로 ${club.club_name} 동아리에 꼭 합류하여 시너지를 내고 싶습니다.`
    });

    const updatedApplied = [...appliedClubIds, club.id];
    setAppliedClubIds(updatedApplied);
    localStorage.setItem('kkeul_applied_club_ids', JSON.stringify(updatedApplied));

    // 리워드 지급 (+10 XP)
    const updatedProfile = { ...profile, xp: (profile.xp || 0) + 10 };
    await onUpdateProfile(updatedProfile);

    onTriggerMockPush(
      '동아리 지원 완료',
      `${club.school} '${club.club_name}' 동아리에 Kkeul 프로필로 1초 지원 완료! 서류가 정상 검토 중입니다.`
    );
    await showAlert(`'${club.club_name}' 동아리에 Kkeul 프로필로 즉시 지원되었습니다! (+10 XP 획득)`);
  };

  // 동아리 모집 공고 등록 처리 (기장)
  const handleCreateClubAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubRegName.trim() || !clubRegTitle.trim() || !clubRegDetails.trim()) {
      await showAlert('모든 필수 정보를 입력해 주세요!');
      return;
    }

    const tags = clubRegTags ? clubRegTags.split(',').map(t => t.trim()) : ['기획', '개발'];
    const newAnn = await db.createClubAnnouncement({
      school: profile.school || '하나고등학교',
      club_name: clubRegName,
      title: clubRegTitle,
      details: clubRegDetails,
      tags: tags,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop'
    });

    setClubAnnouncements(prev => [newAnn, ...prev]);
    setClubRegName('');
    setClubRegTitle('');
    setClubRegDetails('');
    setClubRegTags('');
    setShowClubRegModal(false);
    
    await showAlert('동아리 모집 공고가 정상적으로 등록되었습니다!');
  };

  // 동아리 지원자 심사 결과 업데이트 (기장)
  const handleUpdateApplicantStatus = async (appId: string, applicantName: string, status: 'approved' | 'rejected') => {
    const success = await db.updateClubApplicantStatus(appId, status);
    if (success) {
      setClubApplicants(prev =>
        prev.map(app => app.id === appId ? { ...app, status } : app)
      );
      
      const statusText = status === 'approved' ? '서류 합격' : '불합격';
      
      if (status === 'approved') {
        onTriggerMockPush(
          '동아리 심사 결과',
          `[합격 알림] ${applicantName}님! ${profile.school || '하나고등학교'} '${selectedClub?.club_name || 'ALGO'}' 동아리 서류 심사에 합격하셨습니다! 면접 일정을 조율해 주세요.`
        );
      } else {
        onTriggerMockPush(
          '동아리 심사 결과',
          `[심사 결과] ${applicantName}님의 지원 서류 심사 결과가 업데이트되었습니다.`
        );
      }
      await showAlert(`지원자 ${applicantName}님의 심사 상태를 [${statusText}]로 변경하였습니다.`);
    }
  };




    // Hardware back button handler registration
  useEffect(() => {
    if (backRef) {
      backRef.current = () => {
        // Close modals in order of priority
        if (showSimCompleteModal) {
          setShowSimCompleteModal(false);
          return true;
        }
        if (showCalendarSimModal) {
          setShowCalendarSimModal(false);
          return true;
        }
        if (showSimulation) {
          setShowSimulation(false);
          localStorage.setItem('kkeul_simulation_done', 'true');
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
  }, [showSimCompleteModal, showCalendarSimModal, showSimulation, backRef]);

  // 실제 가입자 수 쿼리를 위한 프로필 목록 상태
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        const profilesData = await db.getAllProfiles();
        setAllProfiles(profilesData);
      } catch (err) {
        console.warn('전체 프로필 로드 실패:', err);
      }
    };
    loadAllProfiles();
  }, []);

  // 드래그 제스처 상태
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'like' | 'pass' | null>(null);
  const [swipeDismissedId, setSwipeDismissedId] = useState<string | null>(null);

  // user_actions 복원 훅
  useEffect(() => {
    const loadActions = async () => {
      if (!profile || profile.role === 'host') return;
      try {
        const actions = await db.getUserActions(profile.id, profile.email);
        const passed = actions.filter(a => a.action_type === 'pass').map(a => a.announcement_id);
        setPassedIds(passed);
      } catch (err) {
        console.warn('사용자 액션 조회 실패, 로컬 캐시를 사용합니다.', err);
      }
    };
    loadActions();
  }, [profile]);

  // 스와이프 터치/마우스 이벤트 핸들러
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, cardId: string) => {
    if (e.type !== 'touchstart' && e.cancelable) e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragCardId(cardId);
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart || !dragCardId) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const offsetX = clientX - dragStart.x;
    const offsetY = clientY - dragStart.y;
    
    // 수평 드래그일 때만 화면 스크롤 방지
    if (Math.abs(offsetX) > Math.abs(offsetY) && e.cancelable) {
      e.preventDefault();
    }
    
    if (Math.abs(offsetY) > 15 && Math.abs(offsetY) > Math.abs(offsetX)) {
      setDragStart(null);
      setDragCardId(null);
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
      return;
    }
    setDragOffset({ x: offsetX, y: 0 });

    if (offsetX > 40) {
      setSwipeDirection('like');
    } else if (offsetX < -40) {
      setSwipeDirection('pass');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = async (_e: React.MouseEvent | React.TouchEvent, card: Announcement) => {
    if (!dragStart || !dragCardId) return;

    const threshold = 100; // 가로 100px 이상 드래그 시 결정 확정 (임계값)
    const isLike = dragOffset.x >= threshold;
    const isPass = dragOffset.x <= -threshold;

    if (isLike || isPass) {
      // 1. Capacitor Haptics 호출 (물리 피드백)
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        if ('vibrate' in navigator) navigator.vibrate(40);
      }

      // 2. 화면 밖으로 튕겨 날아가는 애니메이션 상태 트리거
      setSwipeDismissedId(card.id);

      // 3. Like / Pass 백엔드 및 로컬스토리지 적재
      const actionType = isLike ? 'like' : 'pass';

      if (card.category === 'AD') {
        // 광고 카드인 경우 푸시 알림 및 백엔드 로그 없이 그냥 큐 진행만 시킴
        setPassedIds(prev => [...prev, card.id]);
      } else {
        await db.recordUserAction(profile.id, profile.email, card.id, actionType);

        if (showSimulation && simulationStep === 2) {
          setSimulationStep(3);
        }

        if (isLike) {
          // Like 시: 즐겨찾기(보관함) 추가 및 D-Day 푸시 리마인더 스케줄링 등록
          if (!bookmarks.includes(card.id)) {
            onToggleBookmark(card.id);
          }
          onTriggerMockPush(
            '관심 등록',
            `'${card.title}' 공고가 보관함에 담겼습니다. 마감 24시간 전에 알림을 보내드립니다.`
          );
        } else {
          // Pass 시: 피드에서 즉시 제외
          setPassedIds(prev => [...prev, card.id]);

          // Pass 시 해당 카테고리 노출 강도 하향 조정 멘트
          onTriggerMockPush(
            '매칭 제외',
            `피드에서 제외되었습니다. 관련 분야의 추천 빈도가 조정됩니다.`
          );
        }
      }
      // 0.3초 애니메이션 진행 후 상태 초기화
      setTimeout(() => {
        setDragCardId(null);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setSwipeDismissedId(null);
      }, 300);

    } else {
      // 임계값 미달 시 제자리 복귀
      setDragCardId(null);
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  // Explicit button swipe action trigger
  const executeSwipeAction = async (card: Announcement, actionType: 'like' | 'pass') => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (err) {
      if ('vibrate' in navigator) navigator.vibrate(40);
    }

    setSwipeDismissedId(card.id);
    setDragOffset({ x: actionType === 'like' ? 250 : -250, y: 0 });

    await db.recordUserAction(profile.id, profile.email, card.id, actionType);

    if (showSimulation && simulationStep === 2) {
      setSimulationStep(3);
    }

    if (actionType === 'like') {
      if (!bookmarks.includes(card.id)) {
        onToggleBookmark(card.id);
      }
      onTriggerMockPush(
        '관심 등록',
        `'${card.title}' 공고가 보관함에 담겼습니다. 마감 24시간 전에 알림을 보내드립니다.`
      );
    } else {
      setPassedIds(prev => [...prev, card.id]);
      onTriggerMockPush(
        '매칭 제외',
        `피드에서 제외되었습니다. 관련 분야의 추천 빈도가 조정됩니다.`
      );
    }

    setTimeout(() => {
      setDragCardId(null);
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
      setSwipeDismissedId(null);
    }, 300);
  };

  // 초대장 마이크로 공유 함수 (Viral Loop)
  const handleMicroShare = async (e: React.MouseEvent, card: Announcement) => {
    e.stopPropagation();
    
    // 사용자 지역 기반 공유 카피
    const userLocation = profile.location || '전국';
    const shareText = userLocation !== '전국'
      ? `[${userLocation} 추천] '${card.title}' 공고가 접수 진행 중입니다. 관심사 매칭 공고 공유.`
      : `'${card.title}' 접수 진행 중. 추천 대외활동 공고 공유.`;
      
    const shareUrl = `${card.apply_url || 'https://kkeul.wjedulab.co.kr'}?ref=${profile.id}&annId=${card.id}`;

    try {
      await Share.share({
        title: `[끌] ${card.title} 추천`,
        text: shareText,
        url: shareUrl,
        dialogTitle: '친구에게 공유하기'
      });
      // 50XP 리워드 및 정보 공유왕 배지 부여
      db.saveProfile({
        ...profile,
        xp: profile.xp + 50,
        badges: profile.badges.includes('정보 공유왕') ? profile.badges : [...profile.badges, '정보 공유왕']
      }).then(() => {
        // Only trigger mock push banner on web, skip on native!
        if (!Capacitor.isNativePlatform()) {
          onTriggerMockPush('정보 공유 완료', '친구에게 공유가 완료되었습니다. +50 XP 획득 및 정보 공유왕 배지가 부여되었습니다.');
        }
        if (showSimulation && simulationStep === 4) {
          setSimulationStep(5);
        }
      });
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : (err.message || '');
      if (errMsg.toLowerCase().includes('cancel') || err.name === 'AbortError') return;
      // 클립보드 복사 폴백
      const copyText = `${shareText}\n바로보기: ${shareUrl}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(() => {
          onTriggerMockPush('링크 복사 완료', '초대 링크가 클립보드에 복사되었습니다.');
          if (showSimulation && simulationStep === 4) {
            setSimulationStep(5);
          }
        });

      } else {
        await showAlert('공유 링크: ' + shareUrl);
      }
    }
  };

  // 딥링크 추천 코드 입력 및 잠금해제 시뮬레이터 (게이미피케이션)
  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim()) return;

    // 모의 딥링크 가입 및 초대장 매칭 시뮬레이터 작동
    localStorage.setItem('kkeul_neon_theme', 'true');
    localStorage.setItem('kkeul_premium_unlocked', 'true');
    setIsNeonThemeUnlocked(true);
    setIsPremiumUnlocked(true);

    // 특별 배지 "인싸의 탄생" 및 100XP 보상 지급
    const updatedBadges = profile.badges.includes('인싸의 탄생') ? profile.badges : [...profile.badges, '인싸의 탄생'];
    db.saveProfile({
      ...profile,
      xp: profile.xp + 100,
      badges: updatedBadges
    }).then(() => {
      onTriggerMockPush('초대 혜택 적용 완료', '추천인 코드 매칭이 완료되었습니다. 100 XP 적립 및 네온 핑크 스와이프 테마가 활성화되었습니다.');
    });
  };

  // 스마트 역량 매칭 큐레이션 및 추천 이유 로직
  const [matchingRecommendation, setMatchingRecommendation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // 매칭 스코어링 함수 (키워드, 난이도, 스택, 입찰 금액 종합)
  const getMatchScore = useCallback((ann: Announcement) => {
    let score = 0;
    score += (ann.bid_amount || 0) * 0.15;
    
    const profileInterests = profile.interests || [];
    const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
    const matchesInterest = profileInterests.some(interest => annCategories.includes(interest));
    if (matchesInterest) {
      score += 80;
    }
    return score;
  }, [profile]);

  // 추천 근거 문구 생성기
  const getRecommendationReason = useCallback((ann: Announcement) => {
    // 3. 관심 카테고리 매칭

    // 3. 관심 카테고리 매칭
    const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
    const matchesInterest = (profile.interests || []).some(interest => annCategories.includes(interest));
    if (matchesInterest) {
      return `🎯 내 관심사(${ann.category})에 쏙 맞는 공고예요!`;
    }

    return `🚀 진로 역량을 든든하게 채우는 맞춤 공고예요!`;
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role === 'host') {
      setIsAiLoading(false);
      return;
    }
    setIsAiLoading(true);

    const timer = setTimeout(() => {
      const interestsStr = profile.interests && profile.interests.length > 0
        ? profile.interests.slice(0, 2).join(', ')
        : '맞춤 진로';
      
      const recommendText = `${profile.name}님의 관심 분야인 '${interestsStr}' 정보를 바탕으로 가장 적합한 대외활동 및 프로젝트를 엄선했습니다.`;
      setMatchingRecommendation(recommendText);
      setIsAiLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [profile]);


  // B2B Host Registration States
  const [regStep, setRegStep] = useState<number>(1);
  const [regHost, setRegHost] = useState<string>(profile.name || '');
  const [regTitle, setRegTitle] = useState<string>('');
  const [regDetails, setRegDetails] = useState<string>('');
  const [regCategory, setRegCategory] = useState<string>('IT/개발');
  const [regCategories, setRegCategories] = useState<string[]>(['IT/개발']);

  const handleToggleRegCategory = async (cat: string) => {
    let updated: string[];
    if (regCategories.includes(cat)) {
      if (regCategories.length === 1) {
        await showAlert('최소 1개의 카테고리를 선택해야 합니다.');
        return;
      }
      updated = regCategories.filter(c => c !== cat);
    } else {
      if (regCategories.length >= 2) {
        await showAlert('카테고리는 최대 2개까지 선택할 수 있습니다.');
        return;
      }
      updated = [...regCategories, cat];
    }
    setRegCategories(updated);
    setRegCategory(updated.join(', '));
  };

  const [regApplyUrl, setRegApplyUrl] = useState<string>('');
  const [regDeadline, setRegDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [regRegion, setRegRegion] = useState<string>('전국');
  const [regGrade, setRegGrade] = useState<string>('고등학교 2학년');

  // B2B 실시간 타겟팅 시뮬레이터 상태 및 카운트 애니메이션
  const [simulatedStudentsCount, setSimulatedStudentsCount] = useState<number>(0);
  const targetCount = useMemo(() => {
    if (allProfiles.length === 0) return 0;
    return allProfiles.filter(p => {
      // 1. 호스트는 제외
      if (p.role === 'host') return false;

      // 2. 지역 매칭
      const matchesRegion = regRegion === '전국' || p.location === regRegion;

      // 3. 학년 매칭
      const matchesGrade = regGrade.includes('전체') || p.grade === regGrade;

      // 4. 카테고리 매칭
      const matchesCategory = (p.interests || []).some(interest => regCategories.includes(interest));

      return matchesRegion && matchesGrade && matchesCategory;
    }).length;
  }, [allProfiles, regRegion, regGrade, regCategories]);

  useEffect(() => {
    let start = Math.floor(targetCount * 0.7); // 70%부터 시작해 빠르게 올라가도록 자연스럽게 세팅
    const end = targetCount;
    setSimulatedStudentsCount(start);
    
    const duration = 300; // 0.3초
    const steps = 15;
    const stepTime = duration / steps;
    const increment = Math.ceil((end - start) / steps);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setSimulatedStudentsCount(end);
        clearInterval(timer);
      } else {
        setSimulatedStudentsCount(start);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [targetCount]);
  
  // Payment animation state
  const [showPaymentSuccess, setShowPaymentSuccess] = useState<boolean>(false);
  const [regBidAmount, setRegBidAmount] = useState<number>(2000);
  const [isBidding, setIsBidding] = useState<boolean>(false);

  // Interest categories list for student
  const studentInterests = profile.interests || [];
  const categories = ['추천', '전체', ...studentInterests];

  // Check if announcement category matches student's interests
  const isMatchingInterest = (ann: Announcement) => {
    if (!profile.interests) return false;
    const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
    return profile.interests.some(interest => annCategories.includes(interest));
  };

  // Calculate D-Day safely across timezones and cross-browser environments
  const getDDay = (deadlineStr: string) => {
    if (!deadlineStr) return 'D-Day';
    let deadlineDate: Date;
    try {
      const formattedStr = deadlineStr.replace(/-/g, '/');
      deadlineDate = new Date(formattedStr);
      if (isNaN(deadlineDate.getTime())) {
        deadlineDate = new Date(deadlineStr);
      }
    } catch (e) {
      return 'D-Day';
    }

    if (isNaN(deadlineDate.getTime())) {
      return '기한 있음';
    }

    // Set the deadline to the end of the day (23:59:59)
    const deadlineTime = new Date(
      deadlineDate.getFullYear(),
      deadlineDate.getMonth(),
      deadlineDate.getDate(),
      23,
      59,
      59
    ).getTime();

    // Set today to the beginning of the day (00:00:00)
    const today = new Date();
    const todayTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    ).getTime();

    const diff = deadlineTime - todayTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'D-Day';
    if (days < 0) return '마감됨';
    return `D-${days}`;
  };

  // 비공개 프리미엄 공고 정의 (친구 초대 게이미피케이션 연동용)
  const premiumLockedAnnouncement = useMemo<Announcement>(() => ({
    id: 'ann-premium-locked',
    title: '[비공개 독점] 대기업 연계 청소년 IT 엘리트 특별 멘토링 1기',
    host: 'WJedulab (삼성/네이버 후원)',
    category: 'IT/개발',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: '서울',
    details: '이 공고는 친구 초대 1명을 완료한 유저에게만 특별 공개되는 비공개 기회입니다. 국내 대기업 현업 시니어 소프트웨어 엔지니어들의 1:1 진로 코칭, 포트폴리오 첨삭, 판교 본사 투어 및 식사권 혜택이 주어집니다.',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://wjedulab-mock-apply-form.github.io/premium-mentoring',
    bid_amount: 0,
    created_at: new Date().toISOString()
  }), []);

  // Student matching filters (useMemo를 사용하여 성능 최적화)
  const studentMatchedAnnouncements = useMemo(() => {
    // 비공개 프리미엄 공고를 리스트에 주입
    const baseList = [...announcements, premiumLockedAnnouncement];

    return baseList
      .filter(ann => {
        const isOver = new Date(ann.deadline).getTime() < Date.now();
        if (isOver) return false;

        if (activeTab === 'bookmarks') {
          return bookmarks.includes(ann.id);
        }

        // 스와이프 Pass(제외)한 공고 영구 제외
        if (passedIds.includes(ann.id)) return false;

        if (selectedCategory === '전체') {
          return true;
        }

        const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];

        if (selectedCategory === '추천') {
          const matchesInterest = studentInterests.some(interest => annCategories.includes(interest));
          const matchesLocation = profile.location === '전국' || ann.location === '전국' || ann.location === profile.location;
          return matchesInterest || matchesLocation;
        }

        return annCategories.includes(selectedCategory);
      })
      .sort((a, b) => {
        const bidA = a.bid_amount || 0;
        const bidB = b.bid_amount || 0;
        if (bidB !== bidA) {
          return bidB - bidA;
        }
        const scoreA = getMatchScore(a);
        const scoreB = getMatchScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [announcements, bookmarks, activeTab, selectedCategory, studentInterests, profile.location, passedIds, premiumLockedAnnouncement, getMatchScore]);

  // Host announcements (registered by this host)
  const hostAnnouncements = announcements.filter(ann => ann.host === profile.name);

  // 캘린더 성능 최적화를 위한 2026년 5월 마감일 캐시 맵 (O(1) 조회)
  const mayDeadlinesMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    announcements.forEach(ann => {
      if (bookmarks.includes(ann.id)) {
        try {
          const deadDate = new Date(ann.deadline);
          // 프로토타입 시연을 위해 월 상관없이 일치하는 '일'에 점 표시
          map[deadDate.getDate()] = true;
        } catch (e) {
          console.warn('Failed to parse deadline for calendar map:', e);
        }
      }
    });
    return map;
  }, [announcements, bookmarks]);
  
  // 현재 달력 정보 계산
  const { currentYear, currentMonth, firstDayOffset, daysInMonth } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    return { currentYear: y, currentMonth: m + 1, firstDayOffset: firstDay, daysInMonth: days };
  }, []);

  // Gamification Level calculations
  const userLevel = Math.floor((profile.xp || 0) / 100) + 1;
  const currentLevelXP = (profile.xp || 0) % 100;
  const xpNeeded = 100;

  // Handle Host payment submit
  const handleHostPayment = async () => {
    if (!regTitle || !regDetails || !regApplyUrl) {
      await showAlert('모든 필수 정보를 입력해 주세요!');
      return;
    }
    const finalBidAmount = isBidding ? regBidAmount : 0;
    if (isBidding && regBidAmount < 1000) {
      await showAlert('최소 입찰 금액은 1,000원입니다!');
      return;
    }

    if (isBidding) {
      if (Capacitor.isNativePlatform()) {
        try {
          // 커스텀 안드로이드 구글 플레이 결제 모듈 호출 (상위노출 패키지: nochul)
          const result = await purchase('nochul');
          if (!result.success) {
            await showAlert('결제가 취소되었거나 실패했습니다.');
            setIsBidding(false);
            return;
          }
        } catch (e: any) {
          console.error("Purchase Error", e);
          await showAlert(`결제 모듈 에러: ${e.message}`);
          setIsBidding(false);
          return;
        }
      } else {
        // 웹 브라우저 환경 등 네이티브가 아닐 때 모의 결제 딜레이
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    try {
      const targetDeadline = new Date(regDeadline).toISOString();
      const newAnnData = {
        title: regTitle,
        host: regHost || profile.name,
        category: regCategory,
        deadline: targetDeadline,
        location: regRegion,
        details: regDetails,
        image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
        apply_url: regApplyUrl,
        bid_amount: finalBidAmount
      };

      const created = await db.createAnnouncement(newAnnData);
      onAddAnnouncement(created);

      // Trigger matching students notification
      try {
        const allProfiles = await db.getAllProfiles();
        const matchingStudents = allProfiles.filter(
          p => p.role !== 'host' && (p.interests || []).some(interest => regCategories.includes(interest))
        );
        const defaultNames = ['김민지', '박서준', '이찬우', '최예원', '정우진'];
        const matchNames = matchingStudents.slice(0, 5).map(p => p.name);
        while (matchNames.length < Math.min(5, matchingStudents.length || 5)) {
          const nextDefault = defaultNames[matchNames.length];
          if (!matchNames.includes(nextDefault)) {
            matchNames.push(nextDefault);
          } else {
            break;
          }
        }
        const count = Math.max(matchingStudents.length, 5);
        const namesStr = matchNames.join(', ');
        onTriggerMockPush(
          '신규 공고 알림',
          `내 맞춤 조건 학생 ${count}명(${namesStr} 등)에게 실시간 푸시가 발송되었습니다!`
        );
      } catch (err) {
        console.warn('Matching notification trigger failed', err);
      }

      // Trigger beautiful mock payment success overlay
      setShowPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentSuccess(false);
        // Reset registration fields
        setRegTitle('');
        setRegDetails('');
        setRegApplyUrl('https://wjedulab-mock-apply-form.github.io/ideathon');
        setRegBidAmount(2000);
        setIsBidding(false);
        setRegCategories(['IT/개발']);
        setRegCategory('IT/개발');
        setRegStep(1);
        // Redirect to host main dashboard
        setActiveTab('home');
      }, 2500);
    } catch (e: any) {
      await showAlert(`공고 등록 오류: ${e.message}`);
    }
  };

  // Render Student (B2C) layout
  const renderStudentView = () => {
    return (
      <div style={{ flex: 1, padding: '24px 20px 100px 20px', overflowY: showSimulation ? 'hidden' : 'auto' }}>
        
        {/* TAB 1: HOME FEED */}
        {activeTab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Greeting */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
                  안녕하세요, {profile.name}님
                </p>
                {!showSimulation && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>

                    {/* 체험 가이드 실행 버튼 */}
                    <button
                      onClick={() => {
                        localStorage.removeItem('kkeul_simulation_done');
                        setSimulationStep(1);
                        setShowSimulation(true);
                        setViewMode('swipe');
                        onTriggerMockPush('가이드 시작', '가이드 투어를 시작합니다. 화면의 지시를 따라 진행해 주세요.');
                      }}
                      style={{
                        border: 'none',
                        background: '#E8EBF0',
                        color: 'var(--color-indigo)',
                        padding: '5px 9px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        marginRight: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <RefreshCw size={10} />
                      가이드
                    </button>
                    {/* 뷰 모드 토글 스위치 */}
                    <div style={{
                      display: 'inline-flex',
                      backgroundColor: '#E5E8EB',
                      padding: '3px',
                      borderRadius: '10px',
                      gap: '2px'
                    }}>
                      <button
                        onClick={() => setViewMode('swipe')}
                        style={{
                          border: 'none',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          backgroundColor: viewMode === 'swipe' ? '#FFFFFF' : 'transparent',
                          color: viewMode === 'swipe' ? 'var(--color-indigo)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          boxShadow: viewMode === 'swipe' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        스와이프 매칭
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        style={{
                          border: 'none',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                          color: viewMode === 'list' ? 'var(--color-indigo)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        리스트 뷰
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
                오늘 <span style={{ color: 'var(--color-indigo)' }}>{studentMatchedAnnouncements.filter(a => a.id !== 'ann-premium-locked').length}개</span>의 기회가<br />
                매칭되었습니다.
              </h1>

              {/* Toss-Style Premium Curation Panel */}
              {(!showSimulation || simulationStep === 1) && (
                <div 
                  id="guide-step-1"
                  className={`toss-card-spring ${showSimulation && simulationStep === 1 ? 'guide-highlight' : ''}`}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    border: '1px solid #E5E8EB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                  onClick={() => {
                    onTriggerMockPush('맞춤 큐레이션 업데이트 완료', '프로필 관심사 기반으로 큐레이션 정보를 연동 중입니다.');
                    if (showSimulation && simulationStep === 1) {
                      setSimulationStep(2);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--color-indigo)" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-indigo)', letterSpacing: '-0.2px' }}>끌의 맞춤 큐레이션 가이드</span>
                    {isAiLoading ? (
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={10} className="animate-spin" /> 로딩 중...
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--color-indigo)', fontWeight: 700 }}>● 실시간 동기화 완료</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, textAlign: 'left', position: 'relative', zIndex: 1 }}>
                    {matchingRecommendation || '설정해주신 포트폴리오 학적, 관심 분야 및 보유 역량에 적합한 맞춤형 활동들을 선별하고 있습니다.'}
                  </p>
                </div>
              )}

            {/* 내 지역 맞춤 큐레이션 카드 섹션 */}
            {(selectedCategory === '추천' || selectedCategory === '전체') && profile.location !== '전국' && (!showSimulation || simulationStep === 3) && (
              <div 
                id="guide-step-3"
                className={showSimulation && simulationStep === 3 ? 'guide-highlight' : ''}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-4px', padding: showSimulation && simulationStep === 3 ? '12px 16px' : '0', borderRadius: showSimulation && simulationStep === 3 ? '16px' : '0', backgroundColor: showSimulation && simulationStep === 3 ? '#FFFFFF' : 'transparent' }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  이번 주 {profile.location} 고등학생 필수 참여 공고
                </h3>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', margin: '0 -20px', paddingLeft: '20px', paddingRight: '20px' }} className="no-scrollbar">
                  {announcements
                    .filter(ann => ann.location === profile.location)
                    .map((ann) => {
                      const dday = getDDay(ann.deadline);
                      return (
                        <div
                          key={`cheonan-curation-${ann.id}`}
                          onClick={() => {
                            if (showSimulation && simulationStep === 3) {
                              setSimulationStep(4);
                              onTriggerMockPush('로컬 큐레이션 확인', '내 지역 맞춤형 공고가 탐색되었습니다.');
                            } else {
                              onSelectAnnouncement(ann);
                            }
                          }}
                          className="spring-active toss-card-spring"
                          style={{
                            flexShrink: 0,
                            width: '260px',
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                            border: '1px solid #E5E8EB',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', fontWeight: 700, padding: '3px 6px', borderRadius: '4px' }}>
                              {dday}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{ann.category}</span>
                          </div>
                          <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {ann.title}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ann.host}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* VIEW MODE 1: 스와이프 매칭 모드 */}
            {viewMode === 'swipe' && (!showSimulation || simulationStep === 2 || simulationStep === 4 || simulationStep === 5) && (
              <div 
                id="guide-step-2"
                className={`animate-fade-in ${showSimulation && simulationStep === 2 ? 'guide-highlight' : ''}`}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '20px', 
                  alignItems: 'center', 
                  width: '100%',
                  padding: showSimulation && simulationStep === 2 ? '16px' : '0px',
                  borderRadius: showSimulation && simulationStep === 2 ? '24px' : '0px',
                  backgroundColor: showSimulation && simulationStep === 2 ? '#FFFFFF' : 'transparent',
                  boxSizing: 'border-box'
                }}
              >
                
                {/* Swipe Helper Guide Tip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: 600,
                  backgroundColor: '#F2F4F6',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  marginBottom: '-10px',
                  animation: 'fade-in 0.3s ease'
                }}>
                  <span>💡</span> 카드를 <strong>좌우로 스와이프</strong>하거나 아래 버튼을 클릭해 보세요!
                </div>

                {/* 겹쳐진 스와이프 카드 덱 컨테이너 */}
                <div className="swipe-deck-container">
                  {(() => {
                    // 아직 스와이프 Like/Pass 하지 않은 매칭 카드 대기열 계산 (비공개 락 카드는 제외)
                    const baseSwipeQueue = studentMatchedAnnouncements.filter(
                      ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                    );
                    const swipeQueue = [...baseSwipeQueue];
                    const swipesDone = bookmarks.length + passedIds.length;
                    const adIndices = [5, 11, 17, 23, 29, 35, 41]; // 4~6개 간격으로 광고 노출 (처음 5개는 무조건 일반 카드)
                    let insertedAds = 0;
                    adIndices.forEach((targetIndex) => {
                      let relativePos = targetIndex - swipesDone;
                      if (relativePos <= 0) relativePos = 1;
                      // 아직 지나치지 않은 광고만 큐에 삽입 (relativePos가 0이면 현재 맨 앞)
                      if (relativePos >= 0 && relativePos <= swipeQueue.length) {
                        swipeQueue.splice(relativePos + insertedAds, 0, {
                          id: `adfit-native-${targetIndex}`,
                          title: 'AD',
                          host: 'Kakao AdFit',
                          category: 'AD',
                          deadline: new Date().toISOString(),
                          location: '전국',
                          details: '광고',
                          image_url: '',
                          apply_url: '',
                        });
                        insertedAds++;
                      }
                    });

                    if (swipeQueue.length > 0) {
                      let visibleCount = 0;
                      return swipeQueue.slice(0, 5).map((ann, idx) => {
                        const isTop = idx === 0;
                        const isHiddenAd = ann.category === 'AD' && !isTop;
                        const isDragging = isTop && dragCardId === ann.id;
                        const isDismissed = ann.id === swipeDismissedId;

                        // 스택 효과 클래스
                        let stackClass = 'stack-hidden';
                        if (isTop) {
                          stackClass = '';
                        } else if (!isHiddenAd) {
                          visibleCount++;
                          if (visibleCount === 1) stackClass = 'stack-1';
                          else if (visibleCount === 2) stackClass = 'stack-2';
                        }

                        // 드래그 및 슬라이드아웃 물리 스타일 계산
                        let transformStyle = 'translateZ(0)';
                        let transitionStyle = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';

                        if (isDragging) {
                          const rotate = dragOffset.x / 14;
                          transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`;
                          transitionStyle = 'none'; // 드래그 중에는 실시간 트래킹
                        } else if (isDismissed) {
                          // 임계값을 넘어 튕겨 날아감
                          const flyX = dragOffset.x >= 0 ? 500 : -500;
                          transformStyle = `translate3d(${flyX}px, ${dragOffset.y}px, 0) rotate(${flyX / 14}deg)`;
                          transitionStyle = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                        }

                        return (
                          <div
                            key={`swipe-card-${ann.id}`}
                            className={`swipe-card-wrapper ${stackClass}`}
                            style={{
                              transform: transformStyle || undefined,
                              transition: transitionStyle,
                              zIndex: isTop ? 100 : 10 - idx
                            }}
                            onMouseDown={isTop ? (e) => handleDragStart(e, ann.id) : undefined}
                            onTouchStart={isTop ? (e) => handleDragStart(e, ann.id) : undefined}
                            onMouseMove={isTop ? handleDragMove : undefined}
                            onTouchMove={isTop ? handleDragMove : undefined}
                            onMouseUp={isTop ? (e) => handleDragEnd(e, ann) : undefined}
                            onTouchEnd={isTop ? (e) => handleDragEnd(e, ann) : undefined}
                            onMouseLeave={isTop ? (e) => handleDragEnd(e, ann) : undefined}
                          >
                            <div className={`swipe-card ${isNeonThemeUnlocked ? 'theme-neon-pink' : ''}`} style={ann.category === 'AD' ? { padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' } : undefined}>
                              {ann.category === 'AD' ? (
                                <AdFitNativeCard height="100%" isActive={isTop} />
                              ) : (
                                <>
                              {/* 좌우 드래그 상태 반투명 가이드 뱃지 */}
                              {isTop && swipeDirection === 'like' && (
                                <div className="swipe-badge like" style={{ opacity: Math.min(1, dragOffset.x / 60) }}>
                                  LIKE
                                </div>
                              )}
                              {isTop && swipeDirection === 'pass' && (
                                <div className="swipe-badge pass" style={{ opacity: Math.min(1, -dragOffset.x / 60) }}>
                                  PASS
                                </div>
                              )}

                              {/* 카드 헤더 */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: isNeonThemeUnlocked ? '#FF007F' : 'var(--color-indigo)',
                                    backgroundColor: isNeonThemeUnlocked ? '#FFF0F6' : 'var(--color-indigo-light)',
                                    padding: '4px 10px',
                                    borderRadius: '6px'
                                  }}>
                                    {getDDay(ann.deadline)}
                                  </span>
                                  {isMatchingInterest(ann) && (
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: '#059669',
                                      backgroundColor: '#ECFDF5',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      marginLeft: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}>
                                      🎯 관심사 맞춤
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                  {ann.category}
                                </span>
                              </div>

                              {/* 매칭 추천 사유 문구 */}
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--color-indigo)',
                                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                textAlign: 'left',
                                marginTop: '12px',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                {getRecommendationReason(ann)}
                              </div>

                              {/* 카드 메인 본문 */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', textAlign: 'left' }}>
                                <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                  {ann.title}
                                </h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {ann.details}
                                </p>
                              </div>

                              {/* 카드 푸터 및 원터치 공유 */}
                              <div style={{ borderTop: '1px solid #F2F4F6', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                  <span>{ann.host.slice(0, 10)}</span>
                                  <span>•</span>
                                  <span>{ann.location}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {/* 원터치 마이크로 공유 버튼 (Viral Loop) */}
                                  <button
                                    onClick={(e) => handleMicroShare(e, ann)}
                                    className={`spring-active ${showSimulation && simulationStep === 4 ? 'guide-highlight-pink' : ''}`}
                                    style={{
                                      border: 'none',
                                      background: isNeonThemeUnlocked ? 'linear-gradient(135deg, #FF007F 0%, #FF60B5 100%)' : '#FAFBFC',
                                      color: isNeonThemeUnlocked ? '#FFFFFF' : 'var(--text-secondary)',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: isNeonThemeUnlocked ? '0 2px 8px rgba(255,0,127,0.2)' : 'none'
                                    }}
                                    title="인스타/카톡으로 공유하고 뱃지 받기"
                                  >
                                    <Share2 size={12} />
                                    너한테 딱이다!
                                  </button>

                                  {showSimulation && simulationStep === 5 ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCalendarSimModal(true);
                                      }}
                                      className="spring-active guide-highlight-pink"
                                      style={{
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #FF007F 0%, #FF60B5 100%)',
                                        color: '#FFFFFF',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 8px rgba(255,0,127,0.2)'
                                      }}
                                    >
                                      <CalendarIcon size={12} />
                                      달력에 저장
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectAnnouncement(ann);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'var(--color-indigo)',
                                        color: '#FFFFFF',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      상세
                                    </button>
                                  )}
                                </div>
                              </div>
                              </>
                              )}
                            </div>
                          </div>
                        );
                      });
                    }

                    // 매칭 카드 덱 소진 시 웰던 카드 노출
                    return (
                      <div className="animate-scale-in" style={{
                        width: '100%',
                        maxWidth: '360px',
                        height: '420px',
                        backgroundColor: '#FFFFFF',
                        border: '1px dashed #CCD2E3',
                        borderRadius: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center',
                        gap: '16px'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '20px',
                          backgroundColor: 'var(--color-indigo-light)',
                          color: 'var(--color-indigo)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle2 size={28} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                            오늘의 기회를 모두 검토했어요!
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            관심 분야를 더 넓히거나, 리스트 뷰 모드로 이동하여 다양한 공고를 직접 탐색해 보세요.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPassedIds([]);
                            onTriggerMockPush('매칭 피드 초기화', '패스했던 모든 공고를 피드에 다시 노출합니다.');
                          }}
                          className="btn btn-secondary spring-active"
                          style={{
                            padding: '10px 20px',
                            fontSize: '13px',
                            borderRadius: '10px',
                            width: 'auto',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RefreshCw size={14} />
                          패스한 공고 다시 보기
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Swipe Deck Interactive Button Controls */}
                {(() => {
                  const swipeQueue = studentMatchedAnnouncements.filter(
                    ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                  );
                  if (swipeQueue.length === 0) return null;
                  const topCard = swipeQueue[0];
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '24px',
                      marginTop: '10px',
                      marginBottom: '10px',
                      width: '100%',
                      maxWidth: '360px',
                      animation: 'fade-in 0.3s ease'
                    }}>
                      {/* Pass Button */}
                      <button
                        onClick={() => executeSwipeAction(topCard, 'pass')}
                        className="spring-active"
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: '1px solid #E5E8EB',
                          backgroundColor: '#FFFFFF',
                          color: '#FF4D4F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        title="관심 없음 (왼쪽 스와이프)"
                      >
                        ✕
                      </button>
                      
                      {/* Like Button */}
                      <button
                        onClick={() => executeSwipeAction(topCard, 'like')}
                        className="spring-active"
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: '1px solid #E5E8EB',
                          backgroundColor: '#FFFFFF',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        title="관심 있음 (오른쪽 스와이프)"
                      >
                        ♥
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 2: 리스트 뷰 모드 및 기존 컨텐츠 */}
            {viewMode === 'list' && (
              <>
                {/* Gamification Stats Card */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-indigo) 0%, #6366F1 100%)',
                  borderRadius: '20px',
                  padding: '20px',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>기회 획득 레벨</span>
                    <span style={{ fontSize: '18px', fontWeight: 800 }}>Lv.{userLevel}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>{profile.xp} XP</div>
                  
                  {/* XP Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ width: `${(currentLevelXP / xpNeeded) * 100}%`, height: '100%', backgroundColor: '#FFFFFF', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8 }}>
                    <span>다음 레벨까지 {xpNeeded - currentLevelXP} XP 필요</span>
                    <span>{currentLevelXP}/{xpNeeded}</span>
                  </div>
                </div>

                {/* Horizontal Category Tag Filters */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -20px', paddingLeft: '20px', paddingRight: '20px' }} className="no-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        className="spring-active"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '30px',
                          fontSize: '13px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-indigo)' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                          boxShadow: isSelected ? '0 4px 10px rgba(79, 70, 229, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Announcements Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 비공개 프리미엄 공고를 리스트 최상단/하단에 노출하여 초대 가입 욕구 촉진 */}
                  <div
                    onClick={isPremiumUnlocked ? () => onSelectAnnouncement(premiumLockedAnnouncement) : undefined}
                    className="premium-locked-card"
                    style={{ position: 'relative' }}
                  >
                    {!isPremiumUnlocked && (
                      <div className="premium-locked-overlay">
                        <div className="lock-visual-badge">
                          <Lock size={22} />
                        </div>
                        <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          비공개 고급 멘토링 공고 잠김
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, padding: '0 16px' }}>
                          친구 초대 1명 완료 시 락이 해제되어 내용을 열람할 수 있습니다.
                        </p>
                      </div>
                    )}
                    <div
                      style={{
                        backgroundColor: '#FFF0F6',
                        borderRadius: '18px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        border: '2px solid #FF007F',
                        boxShadow: '0 6px 20px rgba(255, 0, 127, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          color: '#FFFFFF',
                          background: 'linear-gradient(135deg, #FF007F 0%, #FF60B5 100%)',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '30px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Lock size={11} /> 프리미엄 비공개
                        </span>
                        <span style={{ fontSize: '11px', color: '#FF007F', fontWeight: 700 }}>
                          {getDDay(premiumLockedAnnouncement.deadline)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#191F28' }}>
                        {premiumLockedAnnouncement.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span>{premiumLockedAnnouncement.host}</span>
                        <span>•</span>
                        <span>{premiumLockedAnnouncement.location}</span>
                      </div>
                    </div>
                  </div>

                  {studentMatchedAnnouncements
                    .filter(ann => ann.id !== 'ann-premium-locked') // 일반 리스트에서는 프리미엄 고정 락 카드는 하단에 별도 노출했으므로 중복 제거
                    .length > 0 ? (
                    studentMatchedAnnouncements
                      .filter(ann => ann.id !== 'ann-premium-locked')
                      .map((ann, idx) => {
                        const isBookmarked = bookmarks.includes(ann.id);
                        const dday = getDDay(ann.deadline);
                        const showAd = idx === 7 || idx === 15;
                        return (
                          <React.Fragment key={ann.id}>
                          {showAd && <AdFitBanner100 />}
                          <div
                            onClick={() => onSelectAnnouncement(ann)}
                            className="animate-fade-in toss-card-spring"
                            style={{
                              backgroundColor: ann.bid_amount && ann.bid_amount > 0 ? '#F4F6FF' : 'var(--color-card-bg)',
                              borderRadius: '18px',
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              cursor: 'pointer',
                              boxShadow: ann.bid_amount && ann.bid_amount > 0 ? '0 6px 20px rgba(79, 70, 229, 0.06)' : '0 4px 16px rgba(0,0,0,0.02)',
                              border: ann.bid_amount && ann.bid_amount > 0 ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                              transition: 'var(--transition-bounce)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {ann.bid_amount && ann.bid_amount > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{
                                    color: '#FFFFFF',
                                    background: 'linear-gradient(135deg, var(--color-indigo) 0%, #6366F1 100%)',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '4px 10px',
                                    borderRadius: '30px',
                                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)'
                                  }}>
                                    최상단 추천
                                  </span>
                                  <span style={{
                                    color: 'var(--color-indigo)',
                                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    {dday}
                                  </span>
                                </div>
                              ) : (
                                <span style={{
                                  color: 'var(--color-indigo)',
                                  backgroundColor: 'var(--color-indigo-light)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  borderRadius: '6px'
                                }}>
                                  {dday}
                                </span>
                              )}
                              
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {isMatchingInterest(ann) && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#059669',
                                    backgroundColor: '#ECFDF5',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    🎯 관심사 맞춤
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '11px',
                                  color: 'var(--text-tertiary)',
                                  backgroundColor: '#F2F4F6',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600
                                }}>
                                  {ann.category}
                                </span>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleBookmark(ann.id);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isBookmarked ? '#F59E0B' : 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Star size={20} fill={isBookmarked ? '#F59E0B' : 'none'} />
                                </button>
                              </div>
                            </div>

                            {/* 매칭 추천 사유 문구 */}
                            <div style={{
                              fontSize: '11.5px',
                              color: 'var(--color-indigo)',
                              backgroundColor: 'rgba(79, 70, 229, 0.05)',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              textAlign: 'left',
                              display: 'inline-block',
                              width: 'fit-content',
                              marginTop: '4px',
                              marginBottom: '4px'
                            }}>
                              {getRecommendationReason(ann)}
                            </div>

                            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                              {ann.title}
                            </h3>

                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid #F9FAFB', paddingTop: '10px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Compass size={14} />
                                {ann.host}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={14} />
                                {ann.location}
                              </span>
                            </div>
                          </div>
                          </React.Fragment>
                        );
                      })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13.5px', lineHeight: 1.6 }}>
                      조건에 부합하는 매칭 기회가 없습니다.<br />
                      관심 분야를 넓히거나 전체 탭을 확인해 보세요.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>대외활동 달력</h1>
              <p>찜한 공고들의 접수 마감일을 달력에서 바로 모아보세요.</p>
            </div>

            {/* Toss-style Custom Calendar Widget */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontWeight: 700, fontSize: '16px' }}>
                <span>{currentYear}년 {currentMonth}월</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-red)' }}>일</span>
                <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span>
                <span style={{ color: 'var(--color-indigo)' }}>토</span>
              </div>
              
              {/* Calendar Grid (Days) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center' }}>
                {/* Empty cells for starting offset */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {/* Days in current month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  // O(1) 캐시 맵 조회로 마감일 여부 판별 성능 최적화
                  const hasDeadline = !!mayDeadlinesMap[day];

                  return (
                    <div
                      key={`day-${day}`}
                      style={{
                        height: '36px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        position: 'relative',
                        color: hasDeadline ? 'var(--color-indigo)' : 'var(--text-primary)'
                      }}
                    >
                      {day}
                      {hasDeadline && (
                        <div style={{
                          position: 'absolute',
                          bottom: '1px',
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-indigo)'
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List of bookmarked deadlines */}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>이번 달 접수 마감 일정</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.filter(ann => bookmarks.includes(ann.id)).map((ann) => {
                  const dday = getDDay(ann.deadline);
                  const deadDate = new Date(ann.deadline);
                  const formattedDate = `${deadDate.getMonth() + 1}월 ${deadDate.getDate()}일 마감`;

                  return (
                    <div
                      key={`cal-list-${ann.id}`}
                      onClick={() => onSelectAnnouncement(ann)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #E5E8EB',
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {ann.title}
                        </h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {formattedDate} • {ann.host}
                        </span>
                      </div>
                      <span style={{
                        color: 'var(--color-indigo)',
                        backgroundColor: 'var(--color-indigo-light)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {dday}
                      </span>
                    </div>
                  );
                })}
                {announcements.filter(ann => bookmarks.includes(ann.id)).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    보관함에 담긴 공고 마감 일정이 여기에 나열됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKMARKS / 찜 */}
        {activeTab === 'bookmarks' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>내가 찜한 기회 ⭐</h1>
              <p>마감 시간이 촉박할 때 족집게 리마인드 푸시가 날아갑니다.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {studentMatchedAnnouncements.length > 0 ? (
                studentMatchedAnnouncements.map((ann) => {
                  const dday = getDDay(ann.deadline);
                  return (
                    <div
                      key={ann.id}
                      onClick={() => onSelectAnnouncement(ann)}
                      className="toss-card-spring"
                      style={{
                        backgroundColor: 'var(--color-card-bg)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        border: '1px solid #E5E8EB'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {ann.bid_amount && ann.bid_amount > 0 ? (
                          <span style={{
                            color: '#FFFFFF',
                            background: 'linear-gradient(135deg, var(--color-indigo) 0%, #6366F1 100%)',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '30px'
                          }}>
                            최상단 추천
                          </span>
                        ) : (
                          <span style={{
                            color: 'var(--color-red)',
                            backgroundColor: 'var(--color-red-light)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 6px',
                            borderRadius: '6px'
                          }}>
                            {dday}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(ann.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#F59E0B'
                          }}
                        >
                          <Star size={20} fill="#F59E0B" />
                        </button>
                      </div>

                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {ann.title}
                      </h3>

                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>{ann.host}</span>
                        <span>•</span>
                        <span>{ann.location}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                  아직 찜한 기회가 없어요.<br />
                  매칭 피드에서 마음에 드는 기회에 별표를 눌러보세요!
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CLUB RECRUITING SAAS */}
        {activeTab === 'club' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>교내 동아리 리크루팅 SaaS 🏫</h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                내 학교인 <strong style={{ color: 'var(--color-indigo)' }}>{profile.school || '하나고등학교'}</strong>의 동아리 리스트를 조회하고 기장과 매칭됩니다.
              </p>
            </div>

            {/* Club Roles Switcher */}
            <div style={{ display: 'flex', backgroundColor: '#F2F4F6', borderRadius: '12px', padding: '4px' }}>
              <button
                onClick={() => setClubRole('student')}
                style={{
                  flex: 1, height: '38px', borderRadius: '9px', border: 'none',
                  backgroundColor: clubRole === 'student' ? '#FFFFFF' : 'transparent',
                  color: clubRole === 'student' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: clubRole === 'student' ? 800 : 600, fontSize: '11.5px', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: clubRole === 'student' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                동아리 지원
              </button>
              <button
                onClick={() => setClubRole('leader')}
                style={{
                  flex: 1, height: '38px', borderRadius: '9px', border: 'none',
                  backgroundColor: clubRole === 'leader' ? '#FFFFFF' : 'transparent',
                  color: clubRole === 'leader' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: clubRole === 'leader' ? 800 : 600, fontSize: '11.5px', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: clubRole === 'leader' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                서류 관리
              </button>
              <button
                onClick={() => setClubRole('networking')}
                style={{
                  flex: 1, height: '38px', borderRadius: '9px', border: 'none',
                  backgroundColor: clubRole === 'networking' ? '#FFFFFF' : 'transparent',
                  color: clubRole === 'networking' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: clubRole === 'networking' ? 800 : 600, fontSize: '11.5px', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: clubRole === 'networking' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                연합/교류회
              </button>
            </div>

            {/* CLUB ROLE: STUDENT */}
            {clubRole === 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>모집 중인 동아리 ({clubAnnouncements.length})</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>내 Kkeul 프로필로 즉시 접수 가능</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clubAnnouncements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #E5E8EB', borderRadius: '16px' }}>
                      현재 학교에 모집 중인 동아리 공고가 없습니다.<br />
                      마이페이지에서 소속 학교 정보를 변경해보세요!
                    </div>
                  ) : (
                    clubAnnouncements.map(club => {
                      const hasApplied = appliedClubIds.includes(club.id);
                      return (
                        <div key={club.id} style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '20px',
                          padding: '20px',
                          border: '1px solid #E5E8EB',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', padding: '3px 8px', borderRadius: '6px' }}>
                              {club.club_name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              마감: {getDDay(club.deadline)}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {club.title}
                          </h3>
                          
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                            {club.details}
                          </p>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
                            {club.tags.map((tag: string) => (
                              <span key={tag} style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', backgroundColor: '#F2F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <button
                            onClick={() => handleApplyToClub(club)}
                            disabled={hasApplied}
                            style={{
                              border: 'none',
                              borderRadius: '10px',
                              height: '44px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: hasApplied ? 'default' : 'pointer',
                              backgroundColor: hasApplied ? '#ECFDF5' : 'var(--color-indigo)',
                              color: hasApplied ? '#10B981' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              boxShadow: hasApplied ? 'none' : '0 4px 10px rgba(79, 70, 229, 0.15)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {hasApplied ? <Check size={14} /> : '⚡'}
                            {hasApplied ? 'Kkeul 프로필로 지원 완료' : 'Kkeul 프로필로 1초 지원하기'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* CLUB ROLE: LEADER */}
            {clubRole === 'leader' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>모집 공고 관리</h3>
                  <button
                    onClick={() => setShowClubRegModal(true)}
                    style={{
                      border: 'none',
                      background: 'var(--color-indigo)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <Plus size={12} /> 새 공고 작성
                  </button>
                </div>

                {/* Club Selector Dropdown */}
                {clubAnnouncements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)' }}>기장 권한 동아리 공고 선택</label>
                      <select
                        value={selectedClub?.id || ''}
                        onChange={async (e) => {
                          const found = clubAnnouncements.find(c => c.id === e.target.value);
                          if (found) {
                            setSelectedClub(found);
                            const apps = await db.getClubApplicants(found.id);
                            setClubApplicants(apps);
                          }
                        }}
                        style={{ padding: '10px 12px', fontSize: '13.5px', border: '1px solid #E5E8EB', borderRadius: '8px', background: '#FFFFFF', outline: 'none', fontWeight: 700 }}
                      >
                        {clubAnnouncements.map(c => (
                          <option key={c.id} value={c.id}>
                            [{c.club_name}] {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '8px 0 0 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                      📩 접수된 지원 서류 리스트 ({clubApplicants.length}건)
                    </h4>

                    {/* Applicants card list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {clubApplicants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          아직 접수된 지원서가 없습니다.
                        </div>
                      ) : (
                        clubApplicants.map(app => (
                          <div key={app.id} style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            border: '1px solid #E5E8EB',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{app.user_name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>{app.user_school} ({app.user_grade})</span>
                              </div>
                              
                              {/* Status Badge */}
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: app.status === 'approved' ? '#ECFDF5' : app.status === 'rejected' ? '#FEF2F2' : '#FFF9E6',
                                color: app.status === 'approved' ? '#10B981' : app.status === 'rejected' ? '#EF4444' : '#F59E0B'
                              }}>
                                {app.status === 'approved' ? '서류합격' : app.status === 'rejected' ? '불합격' : '심사중'}
                              </span>
                            </div>

                            {/* Contact */}
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-tertiary)' }}>연락처:</strong> {app.user_contact}
                            </div>

                            {/* Skills */}
                            {app.user_skills.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {app.user_skills.map((sk: string) => (
                                  <span key={sk} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Self intro summary */}
                            <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '10px', fontSize: '12px', border: '1px solid #EEF2F6' }}>
                              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                &ldquo;{app.introduction_summary}&rdquo;
                              </p>
                            </div>

                            {/* Action Buttons */}
                            {app.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button
                                  onClick={() => handleUpdateApplicantStatus(app.id, app.user_name, 'rejected')}
                                  style={{
                                    flex: 1,
                                    height: '34px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E8EB',
                                    backgroundColor: '#FFFFFF',
                                    color: 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  거절
                                </button>
                                <button
                                  onClick={() => handleUpdateApplicantStatus(app.id, app.user_name, 'approved')}
                                  style={{
                                    flex: 2,
                                    height: '34px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'var(--color-indigo)',
                                    color: '#FFFFFF',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✓ 서류 합격 승인
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    등록된 기장 권한 동아리 모집 공고가 없습니다. 학교 정보를 확인해 주세요.
                  </div>
                )}
              </div>
            )}

            {/* CLUB ROLE: NETWORKING */}
            {clubRole === 'networking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>타 학교 동아리 교류 제안</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clubNetworkingEvents.map(event => (
                    <div key={event.id} style={{
                      backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px',
                      border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                            {event.host_school}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                            {event.host_club}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1.3 }}>{event.title}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, wordBreak: 'keep-all' }}>{event.description}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>진행 일정</span>
                          <span>{event.event_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>모집 대상</span>
                          <span>{event.target_audience}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(event.contact_link, '_blank')}
                        style={{
                          width: '100%', height: '44px', borderRadius: '12px', border: 'none',
                          backgroundColor: 'var(--color-indigo)', color: '#FFF', fontWeight: 700,
                          fontSize: '14px', cursor: 'pointer', marginTop: '4px'
                        }}
                      >
                        오픈채팅으로 문의하기
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Floating Action Button for Proposing Networking */}
                <button
                  style={{
                    position: 'fixed', bottom: '80px', right: '20px', width: '56px', height: '56px',
                    borderRadius: '28px', backgroundColor: 'var(--color-indigo)', color: '#FFF',
                    border: 'none', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', cursor: 'pointer', zIndex: 100
                  }}
                  onClick={() => alert('교류회 제안글 작성 기능은 준비 중입니다.')}
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (() => {
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

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>내 정보 및 스펙</h1>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>역량 진단 분석과 포트폴리오를 관리합니다.</p>
              </div>

              {/* Sub-tab Navigation */}
              <div style={{
                display: 'flex',
                backgroundColor: '#E5E8EB',
                padding: '4px',
                borderRadius: '12px',
                gap: '4px',
                marginBottom: '4px'
              }}>
                {(['portfolio', 'edit', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProfileSubTab(tab)}
                    style={{
                      flex: 1,
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      backgroundColor: profileSubTab === tab ? '#FFFFFF' : 'transparent',
                      color: profileSubTab === tab ? 'var(--color-indigo)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      boxShadow: profileSubTab === tab ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab === 'portfolio' ? '✨ 포트폴리오' : tab === 'edit' ? '📝 스펙 편집' : '⚙️ 설정'}
                  </button>
                ))}
              </div>

                            {/* SUBTAB 1: PORTFOLIO */}
              {profileSubTab === 'portfolio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
                  
                                    {/* INTERACTIVE 3D BUSINESS CARD */}
                  <div style={{ perspective: '1000px', width: '100%', minHeight: '230px', position: 'relative' }}>
                    <div 
                      className="business-card-container" 
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
                        transformStyle: 'preserve-3d',
                        transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                      onMouseMove={(e) => {
                        if (!Capacitor.isNativePlatform() && !isCardFlipped) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          const centerX = rect.width / 2;
                          const centerY = rect.height / 2;
                          const rotateX = ((y - centerY) / centerY) * -10;
                          const rotateY = ((x - centerX) / centerX) * 10;
                          e.currentTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                          
                          const glare = e.currentTarget.querySelector('.glare') as HTMLElement;
                          if (glare) {
                            glare.style.transform = `translate(${(x/rect.width)*100}%, ${(y/rect.height)*100}%)`;
                            glare.style.opacity = '1';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!Capacitor.isNativePlatform() && !isCardFlipped) {
                          e.currentTarget.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                          const glare = e.currentTarget.querySelector('.glare') as HTMLElement;
                          if (glare) {
                            glare.style.opacity = '0';
                          }
                        }
                      }}
                    >
                      {/* FRONT OF CARD */}
                      <div style={{
                        backfaceVisibility: 'hidden',
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
                        borderRadius: '24px',
                        padding: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white'
                      }}>
                        <div className="glare" style={{
                          position: 'absolute',
                          top: '-100%', left: '-100%',
                          width: '300%', height: '300%',
                          background: 'radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)',
                          opacity: 0,
                          pointerEvents: 'none',
                          transition: 'opacity 0.3s ease',
                          zIndex: 1
                        }}></div>
                        
                        <button onClick={(e) => { e.stopPropagation(); setIsCardFlipped(true); }} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF', backdropFilter: 'blur(4px)' }}>
                          <QrCode size={18} />
                        </button>

                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginBottom: '12px', backdropFilter: 'blur(10px)' }}>
                              <Building2 size={12} />
                              {profile.school || 'Kkeul High School'} {profile.grade}
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                              {profile.name}
                            </h2>
                            <p 
                              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newBio = await showPrompt("나만의 멋진 한 줄 소개를 입력해주세요:", profile.bio || '세상을 바꿀 기획자 지망생');
                                if (newBio !== null && newBio.trim() !== '') {
                                  onUpdateProfile({ ...profile, bio: newBio });
                                }
                              }}
                              title="클릭하여 한 줄 소개 수정하기"
                            >
                              {profile.bio || '세상을 바꿀 기획자 지망생'} <span style={{ fontSize: '12px', opacity: 0.5 }}>✏️</span>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '46px' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Kkeul ID</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>#{profile.id.split('-')[0]}</div>
                          </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 2, marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '100%', maxHeight: '60px', overflowY: 'auto', paddingRight: '4px' }}>
                            {(profile.interests || ['IT/기획', '스타트업']).map(int => (
                              <span key={int} style={{ fontSize: '10px', fontWeight: 600, color: '#3182F6', backgroundColor: '#FFFFFF', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                {int}
                              </span>
                            ))}
                            {profile.play_style?.team_size && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                👥 {profile.play_style.team_size.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.duration && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ⏳ {profile.play_style.duration.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.type && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                📍 {profile.play_style.type.split(' ')[1] || profile.play_style.type}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Total XP</span>
                            <strong style={{ display: 'block', fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', textShadow: '0 2px 10px rgba(255,255,255,0.3)' }}>
                              {profile.xp.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* BACK OF CARD (QR CODE) */}
                      <div style={{
                        backfaceVisibility: 'hidden',
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        background: '#FFFFFF',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        border: '1px solid #E5E8EB',
                        transform: 'rotateY(180deg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#191F28'
                      }}>
                        <button onClick={(e) => { e.stopPropagation(); setIsCardFlipped(false); }} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                          <X size={18} />
                        </button>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 16px 0' }}>제 명함을 스캔해주세요!</h3>
                        <div style={{ background: '#FFF', padding: '10px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <QRCodeSVG value={`${window.location.origin}/p/${profile.id.split('-')[0]}`} size={110} level="M" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONNECT WITH CONTACTS BUTTON */}
                  <button 
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) {
                        try {
                          const permission = await Contacts.requestPermissions();
                          if (permission.contacts === 'granted') {
                            const result = await Contacts.getContacts({
                              projection: { name: true, phones: true }
                            });
                            await showAlert(`연락처 ${result.contacts.length}개를 성공적으로 불러왔습니다! Kkeul 친구 매칭을 시작합니다.`);
                          } else {
                            await showAlert('연락처 접근 권한이 필요합니다.');
                          }
                        } catch (e: any) {
                          await showAlert('연락처를 불러오는데 실패했습니다: ' + e.message);
                        }
                      } else {
                        await showAlert('[웹 환경] 안드로이드 앱에서만 연락처 연동이 지원됩니다. 모바일 기기에서 시도해 주세요.');
                      }
                    }}
                    className="spring-active"
                    style={{
                      width: '100%',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E8EB',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#191F28',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                    <Phone size={18} color="#3182F6" /> 연락처로 Kkeul 친구 찾기
                  </button>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E8EB', margin: '8px 0' }}></div>

                  {/* CAREER ROADMAP TIMELINE */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px 0', color: '#191F28', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Milestone size={20} color="#3182F6" /> 진로 성장 로드맵
                    </h3>
                    
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                      {/* Timeline Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#E5E8EB', borderRadius: '1px' }}></div>

                      {/* STEP 1: AI 역량 진단 */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #3182F6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3182F6', backgroundColor: '#E8F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 1</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>AI 역량 진단 완료</h4>
                          </div>
                          

                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              <Activity size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                              분석 결과: <strong>기획력</strong>과 <strong>리더십</strong>이 돋보입니다. 프로젝트 매니징이나 해커톤 리더 역할에 적합한 역량을 갖추고 있습니다.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STEP 2: 획득한 배지 (업적 룸) */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #10B981', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>STEP 2</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>인증 배지 컬렉션</h4>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {Object.entries(BADGE_DETAILS).map(([badgeName, details]) => {
                              const isUnlocked = profile.badges && profile.badges.includes(badgeName);
                              return (
                                <div key={badgeName} style={{
                                  backgroundColor: isUnlocked ? '#FFFFFF' : '#FAFBFC',
                                  borderRadius: '12px', padding: '12px',
                                  border: isUnlocked ? `1px solid ${details.color}40` : '1px solid #F1F5F9',
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  opacity: isUnlocked ? 1 : 0.5
                                }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: isUnlocked ? `${details.color}15` : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                    {details.emoji}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>{badgeName}</div>
                                    <div style={{ fontSize: '9px', color: '#64748B' }}>{isUnlocked ? '획득 완료' : '잠김'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* STEP 3: 수상 및 활동 실적 */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #8B5CF6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', backgroundColor: '#F5F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 3</span>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>수상 실적 & 포트폴리오</h4>
                            </div>
                            <button 
                              onClick={async () => {
                                const type = await showPrompt("등록할 유형을 숫자로 선택해주세요:\n1. 수상/활동 실적\n2. 포트폴리오 링크");
                                if (type === '1') {
                                  const title = await showPrompt("실적명 (예: NYPC 장려상):");
                                  if (!title) return;
                                  const date = await showPrompt("날짜 (예: 2026.08):") || "2026";
                                  const updated = { ...profile, awards: [...(profile.awards || []), { title, date }] };
                                  onUpdateProfile(updated);
                                  await showAlert("실적이 등록되었습니다.");
                                } else if (type === '2') {
                                  const url = await showPrompt("포트폴리오 링크 주소 (예: https://github.com/my):");
                                  if (!url) return;
                                  const updated = { ...profile, portfolio_urls: [...(profile.portfolio_urls || []), url] };
                                  onUpdateProfile(updated);
                                  await showAlert("포트폴리오 링크가 등록되었습니다.");
                                }
                              }}
                              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Plus size={14} /> 등록하기
                            </button>
                          </div>

                          {/* 수상 실적 리스트 */}
                          {profile.awards && profile.awards.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>🏆 활동 및 수상 내역</div>
                              {profile.awards.map((award, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{award.title}</span>
                                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{award.date}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* 포폴 링크 리스트 */}
                          {profile.portfolio_urls && profile.portfolio_urls.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>🔗 첨부 링크</div>
                              {profile.portfolio_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', textDecoration: 'none', color: '#3182F6', fontSize: '13px', fontWeight: 600 }}>
                                  <Share2 size={14} /> {url}
                                </a>
                              ))}
                            </div>
                          ) : null}

                          {(!profile.awards || profile.awards.length === 0) && (!profile.portfolio_urls || profile.portfolio_urls.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '13px' }}>
                              아직 등록된 실적이나 링크가 없습니다.<br/>우측 상단의 등록 버튼을 눌러 추가해보세요.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NATIVE SHARE PORTFOLIO BUTTON */}
                  <button 
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) {
                        try {
                          await Share.share({
                            title: '내 진로 로드맵 공유',
                            text: `[Kkeul] ${profile.name}님의 인터랙티브 진로 로드맵과 스펙을 확인해보세요! #Kkeul #진로로드맵`,
                            url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            dialogTitle: '로드맵 공유하기'
                          });
                        } catch (e: any) {
                          const errMsg = typeof e === 'string' ? e : (e.message || '');
                          if (!errMsg.toLowerCase().includes('cancel') && e.name !== 'AbortError') {
                            await showAlert('공유 실패: ' + errMsg);
                          }
                        }
                      } else {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: '내 진로 로드맵 공유',
                              text: `[Kkeul] ${profile.name}님의 인터랙티브 진로 로드맵과 스펙을 확인해보세요! #Kkeul #진로로드맵`,
                              url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            });
                          } else {
                            await showAlert('[웹 환경] 클립보드에 링크가 복사되었습니다!');
                          }
                        } catch(e) {}
                      }
                    }}
                    className="spring-active"
                    style={{
                      width: '100%',
                      backgroundColor: '#191F28',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      marginTop: '12px',
                      boxShadow: '0 8px 16px rgba(25, 31, 40, 0.2)'
                    }}>
                    <Share2 size={18} color="#FFFFFF" /> 내 포트폴리오 공유하기
                  </button>

                </div>
              )}

              {/* SUBTAB 2: EDIT */}
              {profileSubTab === 'edit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                  
                  {/* Basic Info fields */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>기본 인적 사항</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>이름</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>학교명</label>
                      <input
                        type="text"
                        value={editSchool}
                        onChange={(e) => setEditSchool(e.target.value)}
                        placeholder="예: 서울고등학교"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>학년</label>
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', backgroundColor: '#FFFFFF' }}
                        >
                          {grades.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>지역</label>
                        <select
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', backgroundColor: '#FFFFFF' }}
                        >
                          {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>연락처</label>
                      <input
                        type="text"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="010-0000-0000"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>목표 전공 (AI 세특 분석에 활용)</label>
                      <input
                        type="text"
                        value={editMajor}
                        onChange={(e) => setEditMajor(e.target.value)}
                        placeholder="예: 컴퓨터공학과, 경영학과, 디자인과, 기계공학과"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Interest options */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>관심 분야</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {interestOptions.map((interest) => {
                        const isSelected = editInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => {
                              setEditInterests(prev =>
                                prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
                              );
                            }}
                            style={{
                              padding: '8px 14px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              borderRadius: '12px',
                              border: isSelected ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                              backgroundColor: isSelected ? 'var(--color-indigo-light)' : '#FFFFFF',
                              color: isSelected ? 'var(--color-indigo)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>


                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="btn btn-primary"
                  style={{ padding: '14px', fontSize: '14.5px', fontWeight: 800, borderRadius: '12px', marginTop: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
                >
                  포트폴리오 저장하기 💾
                </button>
              </div>
            )}

            {/* SUBTAB 3: SETTINGS */}
            {profileSubTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                
                {/* School Profile Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '14px' }}>학적 사항</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>학교</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.school || '미입력'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>학년</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.grade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>이름</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>이메일</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                    </div>
                  </div>
                </div>

                {/* Badges card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} style={{ color: 'var(--color-indigo)' }} /> 획득한 업적 배지
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['정보 공유왕', '캘린더 마스터', '인싸의 탄생', '끌 마스터'].map((badge) => {
                      const isUnlocked = profile.badges && profile.badges.includes(badge);
                      return (
                        <div
                          key={badge}
                          onClick={async () => {
                            if (isUnlocked) {
                              setSelectedBadgeToShare(badge);
                            } else {
                              const criteria = BADGE_DETAILS[badge]?.criteria || '';
                              await showAlert(`🔒 [${badge}] 획득 방법:\n${criteria}`);
                            }
                          }}
                          className="spring-active"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: isUnlocked ? 'var(--color-cyan-light)' : '#E2E8F0',
                            color: isUnlocked ? 'var(--color-cyan)' : '#94A3B8',
                            border: isUnlocked ? '1px solid var(--color-cyan)' : '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          {badge} ({isUnlocked ? '획득 완료 ✈️' : '잠김 🔒'})
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gamification referral loop */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E5E8EB',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} style={{ color: '#FF007F' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      친구 초대하고 특별 혜택 언락하기
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    공유한 링크를 타고 친구가 가입하면 <strong>인싸의 탄생 뱃지</strong>, <strong>한정판 네온 핑크 스와이프 테마</strong>, 그리고 <strong>대기업 특별 멘토링 비공개 공고</strong> 열람 권한을 즉시 획득합니다!
                  </p>
                  
                  <form onSubmit={handleApplyReferral} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="초대 코드 또는 링크 입력"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1px solid #E5E8EB',
                        borderRadius: '8px',
                        outline: 'none',
                        backgroundColor: '#FAFBFC'
                      }}
                    />
                    <button
                      type="submit"
                      className="spring-active"
                      style={{
                        padding: '10px 16px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        backgroundColor: '#FF007F',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      적용
                    </button>
                  </form>
                </div>

                {/* Logout and withdraw actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={onLogout}
                    className="btn btn-secondary"
                    style={{ padding: '12px', fontSize: '14px', borderRadius: '12px' }}
                  >
                    로그아웃
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('정말로 탈퇴하시겠습니까? 모든 찜 데이터와 경험치가 삭제되며 되돌릴 수 없습니다.')) {
                        onWithdraw();
                      }
                    }}
                    style={{ 
                      padding: '12px', 
                      fontSize: '13px', 
                      backgroundColor: '#FEE2E2', 
                      color: '#EF4444', 
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontFamily: 'var(--font-family)',
                      textAlign: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    회원 탈퇴
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* TAB: PARTNERS */}
        {activeTab === 'partners' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Hero Banner */}
          <div style={{ padding: '24px 8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#191F28', margin: '0 0 12px 0', lineHeight: 1.35, letterSpacing: '-0.5px' }}>
              끌과 함께하는<br />협력 파트너
            </h2>
            <p style={{ fontSize: '15px', color: '#8B95A1', margin: 0, lineHeight: 1.5, letterSpacing: '-0.3px' }}>
              청소년 성장을 위해 끌과 협력하는<br />기관·인플루언서·기업·학교를 소개합니다.
            </p>
          </div>

          {/* 개발 기관 WJedulab */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>개발 기관</span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '22px' }}>🏫</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>WJedulab</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '4px 8px' }}>Kkeul 개발 기관</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#4E5968', margin: '0 0 16px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>끌(Kkeul)을 기획·개발한 청소년 주도 교육 기술 연구소입니다. 청소년이 더 나은 기회를 발견하고 성장할 수 있는 플랫폼을 만들어 갑니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="https://wjedulab.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🌐</span>
                  wjedulab.vercel.app
                </a>
                <a href="https://namu.wiki/w/WJedulab" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📖</span>
                  나무위키 · WJedulab
                </a>
              </div>
            </div>
          </div>

          {/* 협력 업체 · 기관 · 학교 */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>협력 업체 · 기관 · 학교</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 강남디벨로퍼스 */}
              <a href="https://www.gangnamdev.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerGNDevs} alt="강남디벨로퍼스" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>강남디벨로퍼스</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력사</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>글로벌 HR 전문기업 및 맞춤형 IT 솔루션 구축 파트너</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['솔루션', 'IT컨설팅', 'HR'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* Wellthy Korea */}
              <a href="https://www.wellthykorea.kr/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerWellthy} alt="Wellthy Korea" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Wellthy Korea</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력사</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>향기 관련 제휴 파트너</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['향기', '라이프', '제휴'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* Scent Pulse */}
              <a href="https://www.scent-pulse.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerScentpulse} alt="Scent Pulse" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Scent Pulse</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', background: 'rgba(249,115,22,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력 서비스</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>향기 관련 파트너 브랜드</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['향기', '서비스', '브랜드'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* 강대표님 */}
              <a href="https://www.instagram.com/kangceo_official/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '1px solid #F0F0F5', background: '#FFFFFF' }}>
                    <img src={partnerKangceo} alt="강대표님" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.3)' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: '22px', height: '22px', borderRadius: '50%', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF', zIndex: 1 }}><Check size={12} strokeWidth={3} color="#FFFFFF" /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>강대표님</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>인플루언서</span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>전자명함 사업 인플루언서</p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['전자명함','사업','인플루언서'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </a>

              {/* BSBRBO */}
              <a href="https://open.kakao.com/o/gBXNKfEh" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid #F0F0F5' }}>
                  <img src={partnerBsbrbo} alt="BSBRBO" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Team BSBRBO</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력사</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', lineHeight: 1.4, letterSpacing: '-0.3px' }}>청소년 창작기반 엔터테인먼트형 프로젝트 팀</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {['교육','콘텐츠','e스포츠','음악','상담'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* 학생 능력자들의 방 */}
              <a href="https://open.kakao.com/o/gzJLwdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#191F28' }}>
                  <Users size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>학생 능력자들의 방</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>커뮤니티</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>네트워킹 및 소통 공간</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['소통', '네트워킹'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* 브롤 커뮤니티 방 */}
              <a href="https://open.kakao.com/o/pKJ0jdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={partnerBrawl} alt="브롤 커뮤니티 방" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>브롤 커뮤니티 방</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>협력 커뮤니티</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>게임 기반 청소년 소통 및 대회 기획 파트너</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['게임', '대회', '친목'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* SWITCHBACK */}
              <div className="spring-active" style={{ background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}><img src={partnerSwitchback} alt="SWITCHBACK" style={{ width: '90%', height: '90%', objectFit: 'contain' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>SWITCHBACK</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 6px' }}>협력사</span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>패션의류 브랜드 파트너</p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['패션','의류','브랜드'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </div>



            </div>
          </div>

          {/* 파트너십 CTA (토스 스타일) */}
          <div style={{ background: '#F5F5FC', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Sparkles size={28} color="#5544FF" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>끌과 함께 성장하고 싶으신가요?</h4>
            <p style={{ fontSize: '14px', color: '#8B95A1', margin: '0 0 20px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>학교·기관·기업 협력 문의는 아래로 연락해 주세요.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 700, color: '#5544FF' }}>
              <span style={{ background: 'rgba(85,68,255,0.1)', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>@</span> 
              woojin052501@gmail.com
            </div>
          </div>

        </div>
      )}

      </div>
    );
  };

  // Render Organizer/Host (B2B) layout
  const renderHostView = () => {
    return (
      <div style={{ flex: 1, padding: '24px 20px 100px 20px', overflowY: 'auto' }}>
        
        {/* TAB 1: MY ANNOUNCEMENTS (내 공고) */}
        {activeTab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>
                {profile.name} 호스트 관리자님 👋
              </p>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
                현재 진행 중인 공고가<br />
                <span style={{ color: 'var(--color-indigo)' }}>{hostAnnouncements.length}건</span> 있어요 📢
              </h1>
            </div>

            {/* List announcements */}
            {hostAnnouncements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {hostAnnouncements.map((ann) => {
                  const dday = getDDay(ann.deadline);
                  return (
                    <div
                      key={ann.id}
                      onClick={() => onSelectAnnouncement(ann)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '18px',
                        padding: '20px',
                        border: '1px solid #E5E8EB',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>
                          {dday}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          대상: {ann.location}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        {ann.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ann.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* EMPTY DASHBOARD STATE */
              <div style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                borderRadius: '24px',
                padding: '40px 24px',
                textAlign: 'center',
                border: '1px dashed #CCD2E3',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '18px',
                marginTop: '10px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--color-indigo-light)',
                  color: 'var(--color-indigo)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📢
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    아직 등록된 기회가 없어요
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    정밀 설정한 타겟 학생들의 휴대전화로<br />
                    실시간 푸시 알림을 즉시 발송해 보세요!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRegStep(1);
                    setActiveTab('register');
                  }}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}
                >
                  첫 공고 등록하기 ➕
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTER (공고 등록) */}
        {activeTab === 'register' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>신규 공고 등록</h1>
              <p>순서대로 기입해 주시면 알림 메시지를 작성해 드립니다.</p>
            </div>

            {/* Form Step Indicator */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={`reg-indicator-${s}`}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: regStep >= s ? 'var(--color-indigo)' : '#E5E8EB',
                    transition: 'background-color 0.3s'
                  }}
                />
              ))}
            </div>

            {/* Step 1: Institution Info */}
            {regStep === 1 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>주최 기관명 / 동아리명</label>
                  <input
                    type="text"
                    value={regHost}
                    onChange={(e) => setRegHost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      outline: 'none',
                      backgroundColor: '#FAFBFC'
                    }}
                    placeholder="예: WJedulab 주최 기획팀"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!regHost) {
                      await showAlert('기관명을 채워주세요!');
                      return;
                    }
                    setRegStep(2);
                  }}
                  style={{ padding: '14px', fontSize: '14px', fontWeight: 600, borderRadius: '12px' }}
                >
                  다음 단계로
                </button>
              </div>
            )}

            {/* Step 2: Details */}
            {regStep === 2 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>공고 제목</label>
                  <input
                    type="text"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      outline: 'none',
                      backgroundColor: '#FAFBFC'
                    }}
                    placeholder="예: 제1회 전국 청소년 창업 아이디어 경진대회"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>공고 상세 내용</label>
                  <textarea
                    value={regDetails}
                    onChange={(e) => setRegDetails(e.target.value)}
                    style={{
                      width: '100%',
                      height: '120px',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      outline: 'none',
                      backgroundColor: '#FAFBFC',
                      resize: 'none',
                      fontFamily: 'var(--font-family)'
                    }}
                    placeholder="공고에 대한 소개, 참가 자격 등을 적어주세요."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>공고 카테고리 (최대 2개 선택)</label>
                    <span style={{ fontSize: '12px', color: regCategories.length >= 2 ? 'var(--color-indigo)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                      {regCategories.length} / 2
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    {['IT/개발', '창업', '수학/과학', '예술/문화', '인문학', '체육', '봉사활동', '외국어/어학'].map((cat) => {
                      const isSelected = regCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => handleToggleRegCategory(cat)}
                          style={{
                            padding: '12px 6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '12px',
                            border: isSelected ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                            backgroundColor: isSelected ? 'var(--color-indigo-light)' : '#FAFBFC',
                            color: isSelected ? 'var(--color-indigo)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'var(--transition-smooth)',
                            transform: isSelected ? 'scale(1.02)' : 'none',
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>공식 접수 링크 (URL)</label>
                  <input
                    type="url"
                    value={regApplyUrl}
                    onChange={(e) => setRegApplyUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      outline: 'none',
                      backgroundColor: '#FAFBFC'
                    }}
                    placeholder="https://docs.google.com/forms/..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>접수 마감일</label>
                  <input
                    type="date"
                    value={regDeadline}
                    onChange={(e) => setRegDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      backgroundColor: '#FAFBFC'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setRegStep(1)}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!regTitle || !regDetails || !regApplyUrl) {
                        await showAlert('모든 입력 칸을 빠짐없이 채워주세요!');
                        return;
                      }
                      setRegStep(3);
                    }}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    다음 단계로
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Target Setting */}
            {regStep === 3 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>발송 타겟 지역 설정</label>
                  <select
                    value={regRegion}
                    onChange={(e) => setRegRegion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      backgroundColor: '#FAFBFC'
                    }}
                  >
                    <option value="전국">전국 전체</option>
                    <option value="서울">서울특별시</option>
                    <option value="경기">경기도</option>
                    <option value="인천">인천광역시</option>
                    <option value="부산">부산광역시</option>
                    <option value="대구">대구광역시</option>
                    <option value="대전">대전광역시</option>
                    <option value="광주">광주광역시</option>
                    <option value="울산">울산광역시</option>
                    <option value="세종">세종특별자치시</option>
                    <option value="강원">강원특별자치도</option>
                    <option value="충북">충청북도</option>
                    <option value="충남">충청남도</option>
                    <option value="전북">전라북도</option>
                    <option value="전남">전라남도</option>
                    <option value="경북">경상북도</option>
                    <option value="경남">경상남도</option>
                    <option value="제주">제주특별자치도</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>발송 타겟 학년 설정</label>
                  <select
                    value={regGrade}
                    onChange={(e) => setRegGrade(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '15px',
                      border: '1px solid #E5E8EB',
                      borderRadius: '10px',
                      backgroundColor: '#FAFBFC'
                    }}
                  >
                    <option value="고등학교 전체">고등학교 전체</option>
                    <option value="고등학교 2학년">고등학교 2학년</option>
                    <option value="고등학교 1학년">고등학교 1학년</option>
                    <option value="중학교 전체">중학교 전체</option>
                  </select>
                </div>

                {/* 실시간 타겟팅 시뮬레이터 카드 UI */}
                <div style={{
                  background: 'linear-gradient(135deg, #ECFEFF 0%, #F5F3FF 100%)',
                  borderRadius: '16px',
                  padding: '20px 18px',
                  border: '1px solid #C084FC',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.05)',
                  margin: '6px 0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#7C3AED' }}>
                    <span>🎯</span> 실시간 타겟팅 시뮬레이터
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-indigo)', letterSpacing: '-0.5px' }}>
                    {simulatedStudentsCount.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>명</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    설정하신 조건(<strong>{regRegion} {regGrade}</strong>)과 일치하며, <strong>{regCategory}</strong> 관심사를 선택한 학생 수입니다. 지금 공고를 올리시면 이 학생들의 휴대전화로 즉시 타겟팅 알림이 쏘아집니다! 🚀
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setRegStep(2)}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setRegStep(4)}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    타겟 설정 완료
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: The Hook - Payment Receipt */}
            {regStep === 4 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Targeting push info text */}
                <div style={{
                  backgroundColor: 'var(--color-indigo-light)',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(79, 70, 229, 0.1)',
                  fontSize: '14px',
                  color: 'var(--color-indigo)',
                  lineHeight: 1.5,
                  fontWeight: 600
                }}>
                  ✨ 설정하신 타겟({regRegion} {regGrade}) 학생들에게 실시간 푸시 알림을 보낼 준비가 끝났어요.
                </div>

                {/* Free vs Premium Option Selector */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundColor: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #E5E8EB',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>선택사항: 공고 노출 방식 선택</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsBidding(false)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: !isBidding ? '2px solid var(--color-indigo)' : '1px solid #E5E8EB',
                        backgroundColor: !isBidding ? '#F5F6FF' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: !isBidding ? 'var(--color-indigo)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      기본 무료 등록 🌱
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBidding(true)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: isBidding ? '2px solid transparent' : '1px solid #E5E8EB',
                        background: isBidding 
                          ? 'linear-gradient(#F5F6FF, #F5F6FF) padding-box, linear-gradient(135deg, #FF6B6B, #5544FF) border-box' 
                          : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13px',
                        color: isBidding ? 'var(--color-indigo)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {isBidding && <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#FF4747', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(255,71,71,0.3)' }}>HOT</span>}
                      🚀 프리미엄 최상단 고정 (추천)
                    </button>
                  </div>
                </div>

                {/* Premium Bid Amount Information */}
                {isBidding && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'linear-gradient(145deg, #FFFFFF, #F8FAFF)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(85, 68, 255, 0.2)',
                    boxShadow: '0 4px 20px rgba(85, 68, 255, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <label style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '18px' }}>💎</span> VVIP 최상단 노출 패키지
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>상품ID: 공고 상위노출 하기 (nochul)</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                          2,000<span style={{ fontSize: '15px', fontWeight: 700, marginLeft: '2px' }}>원</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#FF4747', fontWeight: 700, background: 'rgba(255,71,71,0.1)', padding: '2px 6px', borderRadius: '4px' }}>단 1회 결제로 끝!</span>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>1</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>조회수 평균 <span style={{ color: '#FF4747' }}>10배</span> 상승 효과!</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>2</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>지원자 모집이 완료될 때까지 <span style={{ color: 'var(--color-indigo)' }}>최상단 고정</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>3</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>전국 청소년 대상 타겟 푸시 알림 우선 발송</span>
                      </div>
                    </div>
                  </div>
                )}


                {/* NH Bank Information Panel (Optional) */}
                {isBidding && (
                  <div style={{
                    backgroundColor: '#FFF9E6',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid #FFE0B2',
                    fontSize: '13px',
                    color: '#7A5700',
                    lineHeight: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🏦 무통장 입금 안내 계좌
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                      NH농협 3516-3767-60453 <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}>(예금주: 염우진)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#6B4F00' }}>
                      💡 입금자명과 회원가입 시 적으신 기관명/담당자명(<strong>{profile.name}</strong>)을 동일하게 입금해 주세요. 입금 확인 완료 후 10분 이내에 끌올 알고리즘이 적용됩니다.
                    </p>
                  </div>
                )}

                {/* Receipt UI */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E8EB',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  backgroundImage: 'radial-gradient(circle at 0px 100%, transparent 12px, #FFFFFF 12px), radial-gradient(circle at 100% 100%, transparent 12px, #FFFFFF 12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 600 }}>청소년 매칭 플랫폼</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-indigo)' }}>KKEUL 영수증</span>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>공고명</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{regTitle}</div>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>매칭 타겟</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regRegion} / {regGrade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>관심 분야 매칭</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regCategory}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>총 등록/입찰 비용</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                      {isBidding ? `${regBidAmount.toLocaleString()} 원` : '0 원 (무료)'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setRegStep(3)}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={handleHostPayment}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      padding: '16px',
                      fontSize: '14px',
                      fontWeight: 700,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 6px 16px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    {isBidding ? `${regBidAmount.toLocaleString()}원 입찰 신청 및 알림 등록 🚀` : '무료로 공고 등록하고 알림 쏘기 🚀'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STATS (통계) */}
        {activeTab === 'stats' && (() => {
          if (hostAnnouncements.length === 0) {
            return (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px' }}>📊</div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>분석할 발송 성과가 없습니다</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  현재 등록하신 공고가 없거나 발송 이력이 없습니다.<br />
                  먼저 신규 공고를 등록하고 실시간 알림을 보내보세요!
                </p>
                <button
                  onClick={() => {
                    setRegStep(1);
                    setActiveTab('register');
                  }}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, width: 'auto', alignSelf: 'center' }}
                >
                  첫 공고 등록하러 가기 ➕
                </button>
              </div>
            );
          }

          // Find selected announcement or fallback to first one
          const currentAnn = hostAnnouncements.find(a => a.id === selectedStatsAnnId) || hostAnnouncements[0];
          const currentId = currentAnn.id;

          // Real DB target matching stats
          const matchedStudents = allProfiles.filter(p => {
            if (p.role === 'host') return false;
            // Region match
            const regMatch = currentAnn.location === '전국' || p.location === '전국' || p.location === currentAnn.location;
            // Category match
            const annCategories = currentAnn.category ? currentAnn.category.split(',').map((s: string) => s.trim()) : [];
            const catMatch = p.interests ? p.interests.some((interest: string) => annCategories.includes(interest)) : false;
            return regMatch && catMatch;
          });

          // Scale stats realistically for mock reporting
          const baseReach = matchedStudents.length * 15;
          const currentBid = currentAnn.bid_amount ?? 0;
          const bidWeight = Math.floor(currentBid / 50);
          const reachCount = baseReach + bidWeight + 120; // Ensure a nice minimum display reach for demo
          
          // Seed values based on ID hash to keep them stable and unique per contest
          const idHash = currentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          
          const openRate = currentBid > 0 
            ? parseFloat((75.4 + (idHash % 15) / 10).toFixed(1))
            : parseFloat((52.8 + (idHash % 12) / 10).toFixed(1));
            
          const clickCount = Math.floor(reachCount * (openRate / 100) * (0.32 + (currentBid ? 0.12 : 0) + (idHash % 5) / 100));
          const bookmarkCount = Math.round(clickCount * (0.16 + (idHash % 4) / 100));

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>발송 성과 통계 📊</h1>
                <p>발송한 타겟 푸시 알림의 도달 및 클릭률 리포트입니다.</p>
              </div>

              {/* Contest Selector Dropdown */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #E5E8EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>조회할 발송 공고 선택</label>
                <select
                  value={currentId}
                  onChange={(e) => setSelectedStatsAnnId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: '1px solid #E5E8EB',
                    borderRadius: '10px',
                    backgroundColor: '#FAFBFC',
                    outline: 'none',
                    color: 'var(--text-primary)'
                  }}
                >
                  {hostAnnouncements.map(ann => (
                    <option key={ann.id} value={ann.id}>{ann.title}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  <span>입찰가: {currentBid > 0 ? `${currentBid.toLocaleString()}원` : '무료'}</span>
                  <span>•</span>
                  <span>카테고리: {currentAnn.category}</span>
                </div>
              </div>

              {/* Metrics cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>도달 학생 수</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{reachCount.toLocaleString()} 명</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>푸시 알림 열람률</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>{openRate} %</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>상세 페이지 클릭 수</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{clickCount.toLocaleString()} 회</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>관심 등록(찜) 수</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{bookmarkCount.toLocaleString()} 회</div>
                </div>
              </div>

              {/* CSS graph */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>주간 상세 페이지 방문 추이</h3>
                <div style={{ display: 'flex', height: '140px', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.15))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>월</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.25))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>화</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.35))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>수</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(15, Math.floor(clickCount * 0.45))}px`, backgroundColor: 'var(--color-indigo)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>목</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.30))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>금</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>기관 관리자 정보</h1>
              <p>소속 기관 설정 및 가입 상세 정보를 확인합니다.</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>기관/동아리명</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>담당자 이메일</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                </div>
                {profile.contact && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>연락처</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.contact}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>권한 구분</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-indigo)' }}>주최자 (B2B Host)</span>
                </div>
              </div>
            </div>

            {/* Logout/withdraw */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ padding: '12px', fontSize: '14px', borderRadius: '12px' }}
              >
                로그아웃
              </button>
              <button
                onClick={() => {
                  if (confirm('정말로 탈퇴하시겠습니까? 등록하신 모든 대외활동 정보가 삭제되며 복구할 수 없습니다.')) {
                    onWithdraw();
                  }
                }}
                style={{ 
                  padding: '12px', 
                  fontSize: '13px', 
                  backgroundColor: '#FEE2E2', 
                  color: '#EF4444', 
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-family)',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  transition: 'var(--transition-smooth)'
                }}
              >
                회원 탈퇴
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isHost = profile.role === 'host';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', backgroundColor: '#FAFBFC', position: 'relative' }}>
      
      {/* Dynamic Main view rendering */}
      {isHost ? renderHostView() : renderStudentView()}

      {/* Business Info Footer (Shared) */}
      <footer style={{
        backgroundColor: '#FAFBFC',
        padding: '24px 20px',
        borderTop: '1px solid #E5E8EB',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        lineHeight: 1.6,
        marginBottom: '64px'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>
          WJedulab (더블유제이에듀랩)
        </div>
        <div>
          대표자: 염우진 | 이메일: <a href="mailto:woojin052501@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>woojin052501@gmail.com</a>
        </div>
        <div>
          사업자등록번호: 243-09-03290
        </div>
        <div style={{ marginTop: '4px' }}>
          기회가 알아서 끌려오는 곳, 끌 (Kkeul) © 2026 WJedulab. All rights reserved.
        </div>
      </footer>

      {/* B2C / B2B Dynamic Tab Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E8EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50
      }}>
        {!isHost ? (
          /* STUDENT TAB BAR */
          <>
            <button
              onClick={() => setActiveTab('home')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'home' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Home size={20} />
              홈
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'calendar' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <CalendarIcon size={20} />
              캘린더
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'bookmarks' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Bookmark size={20} />
              보관함
            </button>

            <button
              onClick={() => setActiveTab('club')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'club' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Compass size={20} />
              동아리
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'profile' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <User size={20} />
              내 정보
            </button>

            <button
              onClick={() => setActiveTab('partners')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'partners' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Building2 size={20} />
              파트너
            </button>
          </>
        ) : (
          /* HOST TAB BAR */
          <>
            <button
              onClick={() => setActiveTab('home')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'home' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Home size={20} />
              내 공고
            </button>

            <button
              onClick={() => {
                setRegStep(1);
                setActiveTab('register');
              }}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'register' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <PlusCircle size={20} />
              등록 ➕
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'stats' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <BarChart3 size={20} />
              통계
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="spring-active"
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeTab === 'profile' ? 'var(--color-indigo)' : 'var(--text-tertiary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <User size={20} />
              마이페이지
            </button>
          </>
        )}
      </div>

      {/* FULLSCREEN MOCK PAYMENT SUCCESS OVERLAY */}
      {showPaymentSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          animation: 'fade-in 0.3s ease'
        }}>
          {/* Logo visual ornament */}
          <div style={{
            position: 'absolute',
            top: '32px',
            opacity: 0.15
          }}>
            <img src={logoImg} alt="Kkeul Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>

          <CheckCircle2 size={64} style={{ color: 'var(--color-indigo)', animation: 'scale-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            결제가 완료되었습니다!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
            설정하신 타겟({regRegion} {regGrade}) 학생들에게<br />
            실시간 푸시 알림을 즉시 발송합니다 🚀
          </p>
        </div>
      )}

      {/* --- INTERACTIVE SIMULATION GUIDE SYSTEM --- */}
      {showSimulation && !showCalendarSimModal && !showSimCompleteModal && (
        <>
          {/* 어두운 딤드 오버레이 */}
          <div className="guide-dimmer" />

          {/* 단계별 가이드 툴팁 */}
          {(() => {
            let tooltipStyle: React.CSSProperties = {};
            let tooltipClass = 'guide-tooltip bottom';
            let tooltipText = '';

            if (simulationStep === 1) {
              // 1단계: 맞춤 큐레이션
              tooltipStyle = { top: '220px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[1단계] 맞춤 큐레이션\n내 프로필에 최적화된 공고를 추천합니다. 카드를 눌러 시작해 보세요.';
            } else if (simulationStep === 2) {
              // 2단계: 스와이프 매칭 & 버튼 컨트롤
              tooltipStyle = { top: '80px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[2단계] 스와이프 매칭\n카드를 좌우로 밀거나 하단 버튼으로 매칭을 진행하세요.\n\n♥ 버튼: 보관함 저장\n✕ 버튼: 피드 제외';
            } else if (simulationStep === 3) {
              // 3단계: 천안 로컬 큐레이션
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[3단계] 로컬 맞춤 공고\n내 근처 지역의 공고만 모아 보여줍니다. 하이라이트된 카드를 선택하세요.';
            } else if (simulationStep === 4) {
              // 4단계: 마찰 없는 1초 공유
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[4단계] 원터치 정보 공유\n공유 버튼을 눌러 친구들에게 공고를 보내고 경험치를 획득해 보세요.';
            } else if (simulationStep === 5) {
              // 5단계: 캘린더 등록
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[5단계] 캘린더 동기화\n달력에 저장 버튼을 누르면 스마트폰 캘린더에 마감일이 연동됩니다.';
            }

            return (
              <div className={tooltipClass} style={tooltipStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-indigo)', fontSize: '14px' }}>서비스 이용 가이드</span>
                </div>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  textAlign: 'left',
                  margin: 0,
                  whiteSpace: 'pre-line',
                  fontWeight: 600
                }}>
                  {tooltipText}
                </p>
                {/* 스킵 및 다음 단계 이동 수동 트리거 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '6px' }}>
                  <button
                    onClick={() => {
                      setShowSimulation(false);
                      localStorage.setItem('kkeul_simulation_done', 'true');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-tertiary)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    가이드 건너뛰기
                  </button>
                  <button
                    onClick={() => {
                      if (simulationStep < 5) {
                        setSimulationStep(simulationStep + 1);
                      } else {
                        setShowCalendarSimModal(true);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'var(--color-indigo-light)',
                      color: 'var(--color-indigo)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    다음 단계 ▶
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* --- MOCK CALENDAR PERMISSION REQUEST MODAL (STEP 5) --- */}
      {showCalendarSimModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 11000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#EEF2FF',
              color: 'var(--color-indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px auto'
            }}>
              📅
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              '끌(Kkeul)'이 달력에<br />접근하려고 합니다
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              대외활동 마감 일정 자동 기록 및 리마인더 푸시 예약을 위해 휴대폰 기본 캘린더 읽기/쓰기 권한 허용이 필요합니다.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCalendarSimModal(false)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: '#F2F4F6',
                  color: 'var(--text-secondary)',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                허용 안 함
              </button>
              <button
                onClick={async () => {
                  try {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                  } catch (e) {}
                  
                  // 리워드 업데이트 & 완료 팝업으로
                  const updatedBadges = profile.badges.includes('끌 마스터') ? profile.badges : [...profile.badges, '끌 마스터'];
                  db.saveProfile({
                    ...profile,
                    xp: profile.xp + 100,
                    badges: updatedBadges
                  }).then(() => {
                    setShowCalendarSimModal(false);
                    setShowSimCompleteModal(true);
                    onTriggerMockPush('캘린더 연동 완료', '일정이 기기 캘린더에 정상 등록되었습니다.');
                  });
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'var(--color-indigo)',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                }}
              >
                허용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIMULATION COMPLETE SUCCESS MODAL --- */}
      {showSimCompleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          zIndex: 12000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <Award size={64} style={{ color: 'var(--color-indigo)' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
            가이드 투어 완료
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
            축하합니다. 끌(Kkeul)의 모든 핵심 기능을 마스터하셨습니다.<br />
            보상으로 <strong>+100 XP</strong> 경험치와<br />
            <strong>&apos;끌 마스터&apos;</strong> 한정 업적 배지가 지급되었습니다.
          </p>

          <div style={{
            width: '100%',
            maxWidth: '280px',
            background: '#F2F4F6',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <CheckCircle2 size={24} style={{ color: 'var(--color-indigo)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>신규 배지 획득</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>끌 마스터 (가이드 투어 정복자)</div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowSimCompleteModal(false);
              setShowSimulation(false);
              localStorage.setItem('kkeul_simulation_done', 'true');
            }}
            className="spring-active"
            style={{
              width: '100%',
              maxWidth: '280px',
              border: 'none',
              background: 'linear-gradient(135deg, #FF007F 0%, #FF60B5 100%)',
              color: '#FFFFFF',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(255, 0, 127, 0.3)'
            }}
          >
            체험 완료하고 홈으로 가기
          </button>
        </div>
      )}

      {/* 동아리 새 모집 공고 작성 모달 (기장용) */}
      {showClubRegModal && (
        <div className="calendar-success-overlay" onClick={() => setShowClubRegModal(false)} style={{ zIndex: 140, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏫 새 동아리 모집 공고 등록
            </h3>
            
            <form onSubmit={handleCreateClubAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>동아리 이름</label>
                <input
                  type="text"
                  value={clubRegName}
                  onChange={(e) => setClubRegName(e.target.value)}
                  placeholder="예: ALGO, Motion 등"
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>모집 공고 제목</label>
                <input
                  type="text"
                  value={clubRegTitle}
                  onChange={(e) => setClubRegTitle(e.target.value)}
                  placeholder="예: 2026 알고리즘 동아리 부원 모집"
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>공고 세부 설명</label>
                <textarea
                  value={clubRegDetails}
                  onChange={(e) => setClubRegDetails(e.target.value)}
                  placeholder="동아리 소개 및 활동 목표, 선발 방식을 적어주세요."
                  rows={4}
                  style={{ padding: '10px 12px', fontSize: '13px', border: '1px solid #E5E8EB', borderRadius: '8px', resize: 'none', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>동아리 태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={clubRegTags}
                  onChange={(e) => setClubRegTags(e.target.value)}
                  placeholder="예: IT/코딩, 학술, 인기"
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowClubRegModal(false)}
                  className="btn btn-gray"
                  style={{ flex: 1, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  공고 올리기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 성과 관리 B2B 대시보드 PC Web 에뮬레이터 모달 */}
      {showB2BSchoolModal && (
        <div className="calendar-success-overlay" onClick={() => setShowB2BSchoolModal(false)} style={{ zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="animate-scale-in" onClick={(e) => e.stopPropagation()} style={{
            width: '100%',
            maxWidth: '920px',
            height: '90vh',
            maxHeight: '680px',
            backgroundColor: '#F8FAFC',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            {/* Desktop Browser Frame Header */}
            <div style={{
              height: '44px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              {/* Left traffic lights */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div onClick={() => setShowB2BSchoolModal(false)} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', cursor: 'pointer' }} title="닫기" />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              </div>
              {/* Address bar */}
              <div style={{
                backgroundColor: '#F1F5F9',
                borderRadius: '8px',
                width: '60%',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontWeight: 500
              }}>
                🔒 {window.location.origin}/school-dashboard/manage
              </div>
              {/* Right spacer */}
              <div style={{ width: '50px' }} />
            </div>

            {/* Main B2B Dashboard Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
              {/* Header section with school selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', padding: '4px 8px', borderRadius: '6px' }}>
                    B2B 우수 인재 성과 관리 솔루션
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0' }}>
                    진로지도 및 대외활동 성과 어드민 대시보드
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>학교 선택:</span>
                  <select
                    value={selectedSchoolB2B}
                    onChange={(e) => setSelectedSchoolB2B(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #CBD5E1', borderRadius: '8px', background: '#FFFFFF', outline: 'none', fontWeight: 700, color: '#0F172A' }}
                  >
                    <option value="하나고등학교">하나고등학교</option>
                    <option value="한국디지털미디어고등학교">한국디지털미디어고등학교</option>
                    <option value="선린인터넷고등학교">선린인터넷고등학교</option>
                  </select>
                </div>
              </div>

              {(() => {
                // Generate metrics based on selected school
                const getSchoolMetrics = (sch: string) => {
                  if (sch === '한국디지털미디어고등학교') {
                    return {
                      activeStudents: 168,
                      submissions: 482,
                      awards: 64,
                      clubs: 18,
                      chart: { dev: 98, startup: 28, science: 14, art: 28 },
                      table: [
                        { name: '김민지', major: '컴퓨터공학과', club: 'ALGO', award: '2026 NYPC 본선 진출 (#자료구조)' },
                        { name: '이찬우', major: '소프트웨어과', club: 'ALGO', award: '한국정보올림피아드 금상 (#알고리즘최적화)' },
                        { name: '정우진', major: '디자인과', club: 'Motion', award: '기상청 숏폼 공모전 대상 (#미디어스토리)' }
                      ]
                    };
                  }
                  if (sch === '선린인터넷고등학교') {
                    return {
                      activeStudents: 154,
                      submissions: 418,
                      awards: 52,
                      clubs: 16,
                      chart: { dev: 84, startup: 32, science: 18, art: 20 },
                      table: [
                        { name: '박서준', major: '경영공학과', club: 'SPARK', award: '주니어 발명창의대회 최우수상 (#비즈니스모델)' },
                        { name: '최예원', major: 'UX디자인과', club: 'Motion', award: '삼성 주니어 SW창작대회 장려상 (#UIUX프로토타입)' },
                        { name: '윤지훈', major: '정보기기과', club: 'ALGO', award: '임베디드 SW 경진대회 우수상 (#IoT설계)' }
                      ]
                    };
                  }
                  // 하나고등학교 (기본)
                  return {
                    activeStudents: 124,
                    submissions: 312,
                    awards: 46,
                    clubs: 12,
                    chart: { dev: 38, startup: 45, science: 28, art: 13 },
                    table: [
                      { name: '김민지', major: '컴퓨터공학과', club: 'ALGO', award: '전국 고교 알고리즘 경시 대상 (#자료구조)' },
                      { name: '박서준', major: '경영학과', club: 'SPARK', award: '청소년 스타트업 아이디어 은상 (#시장타당성)' },
                      { name: '최예원', major: '미디어디자인', club: 'Motion', award: '대한민국 학생 미술대전 대상 (#시각시인성)' }
                    ]
                  };
                };

                const metrics = getSchoolMetrics(selectedSchoolB2B);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    {/* Top Row: Numeric Indicators */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      {[
                        { title: '대외 활동 활성 학생', val: `${metrics.activeStudents}명`, desc: '대비 참여율 76.5%' },
                        { title: '누적 공모 접수수', val: `${metrics.submissions}건`, desc: '전월 대비 +18%' },
                        { title: '외부 대회 입상 실적', val: `${metrics.awards}건`, desc: '연간 누적 카운트' },
                        { title: '활동 연계 동아리수', val: `${metrics.clubs}개`, desc: '모집 기한 운영 중' }
                      ].map((card, idx) => (
                        <div key={idx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)' }}>{card.title}</span>
                          <strong style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>{card.val}</strong>
                          <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 600 }}>{card.desc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Middle Row: Chart & Contests */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {/* SVG Bar Chart for Categories */}
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                          📊 학생 대외 성과 전공 카테고리 분포
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                          {[
                            { name: 'IT / 개발 및 SW공학', val: metrics.chart.dev, color: 'var(--color-indigo)' },
                            { name: '경영 / 창업 / 비즈니스', val: metrics.chart.startup, color: '#F59E0B' },
                            { name: '수학 / 기초과학 / 연구', val: metrics.chart.science, color: '#EF4444' },
                            { name: '미술 / 콘텐츠 / 디자인', val: metrics.chart.art, color: '#10B981' }
                          ].map((bar, idx) => {
                            const total = metrics.chart.dev + metrics.chart.startup + metrics.chart.science + metrics.chart.art;
                            const pct = Math.round((bar.val / total) * 100);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{bar.name}</span>
                                  <span style={{ color: 'var(--text-primary)' }}>{bar.val}명 ({pct}%)</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: bar.color, borderRadius: '4px' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Contests Monitor */}
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                          📢 실시간 학생 참가 집중 외부 대회 (Top 3)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          {[
                            { title: '넥슨 청소년 프로그래밍 챌린지 (NYPC)', count: 42, color: '#EEF2FF', border: '#C7D2FE', text: 'var(--color-indigo)' },
                            { title: '한국정보올림피아드 경시부문 (KOI)', count: 28, color: '#FDF2F8', border: '#FBCFE8', text: '#D946EF' },
                            { title: '제7회 기상청 달콤기후 공모전', count: 15, color: '#ECFDF5', border: '#A7F3D0', text: '#059669' }
                          ].map((item, idx) => (
                            <div key={idx} style={{ backgroundColor: item.color, border: `1px solid ${item.border}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: item.text }}>{item.count}명 도전 중</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Detailed student performance table */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        🏆 교내 대외 실적 및 세특 추천 항목 모니터
                      </h3>
                      
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>지원 학생</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>희망 목표전공</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>소속 동아리</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>외부 대회 수상 성과 / 세특 매칭 키워드</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.table.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{row.name}</td>
                                <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.major}</td>
                                <td style={{ padding: '12px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--color-indigo-light)', color: 'var(--color-indigo)', padding: '3px 6px', borderRadius: '4px' }}>
                                    {row.club}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', fontWeight: 600, color: '#334155' }}>{row.award}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Action and Pitch Footer */}
                    <div style={{
                      backgroundColor: '#EEF2FF',
                      borderRadius: '16px',
                      border: '1px solid #CBD5E1',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <span style={{ fontSize: '12.5px', color: '#1E1B4B', lineHeight: 1.5, fontWeight: 700 }}>
                          💡 <strong>진로지도 선생님을 위한 원클릭 보고서 추출:</strong> 끌(Kkeul) B2B 정식 계약 학교는 학생들이 제출한 실적과 AI 자동 요약 세특 문장을 한 번에 모아 생활기록부 기재 양식 엑셀 파일로 바로 출력할 수 있습니다.
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await showAlert('보고서 엑셀 내보내기가 완료되었습니다. (다운로드 파일: kkeul_school_report.xlsx)');
                        }}
                        style={{
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--color-indigo) 0%, #6366F1 100%)',
                          color: '#FFFFFF',
                          padding: '12px 20px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 엑셀 실적 데이터 출력
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 4. INSTAGRAM STORY SHARE PREVIEW MODAL */}
      {selectedBadgeToShare && (() => {
        const details = BADGE_DETAILS[selectedBadgeToShare];
        if (!details) return null;
        
        return (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 10500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              animation: 'fade-in 0.3s ease'
            }}
            onClick={() => setSelectedBadgeToShare(null)}
          >
            <div 
              style={{
                width: '100%',
                maxWidth: '340px',
                backgroundColor: '#1E293B',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 800 }}>인스타그램 스토리 프리뷰 📱</span>
                <button
                  onClick={() => setSelectedBadgeToShare(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Story Content Frame (Ratio 9:16 emulator) */}
              <div style={{
                padding: '24px 20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#0F172A',
                position: 'relative'
              }}>
                <div style={{
                  width: '220px',
                  height: '380px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #FF007F 0%, #7928CA 50%, #4F46E5 100%)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  {/* Neon Glow spots */}
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '-50px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: '#FF007F',
                    filter: 'blur(40px)',
                    opacity: 0.5
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-50px',
                    right: '-50px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: '#4F46E5',
                    filter: 'blur(40px)',
                    opacity: 0.5
                  }} />

                  {/* Kkeul Header Tag */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2,
                    alignSelf: 'center',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(6px)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <img src={logoImg} alt="Kkeul" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.5px' }}>KKEUL</span>
                  </div>

                  {/* Glassmorphism Badge Card */}
                  <div style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '20px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 2,
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
                    margin: '20px 0'
                  }}>
                    <div style={{
                      fontSize: '36px',
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '3px solid #FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(255,255,255,0.4)'
                    }}>
                      {details.emoji}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Official Digital Badge
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0 2px 0', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        {selectedBadgeToShare}
                      </h4>
                      <p style={{ fontSize: '10.5px', color: '#CBD5E1', margin: 0, fontWeight: 500 }}>
                        {profile.name} ({profile.school || '하나고등학교'})
                      </p>
                    </div>
                  </div>

                  {/* QR Code and App Promotion Footer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    zIndex: 2,
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px 12px',
                    borderRadius: '12px'
                  }}>
                    {/* Mock QR code drawing */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      padding: '2px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1px'
                    }}>
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} style={{
                          backgroundColor: (i % 3 === 0 || i % 5 === 1) ? '#000000' : 'transparent',
                          borderRadius: '1px'
                        }} />
                      ))}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#FFFFFF' }}>스캔해서 나도 시작하기</div>
                      <div style={{ fontSize: '7.5px', color: '#CBD5E1', marginTop: '1px' }}>10대 공모전 & 팀원 매칭 플랫폼 '끌'</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Footer */}
              <div style={{
                padding: '20px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <button
                  onClick={async () => {
                    if (isSharingBadge) return;
                    setIsSharingBadge(true);
                    
                    // Simulate Toss-style micro-animation / delay
                    setTimeout(async () => {
                      setIsSharingBadge(false);
                      setSelectedBadgeToShare(null);
                      
                      // Award reward if not shared yet
                      const isAlreadyShared = sharedBadges.includes(selectedBadgeToShare);
                      if (!isAlreadyShared) {
                        const newShared = [...sharedBadges, selectedBadgeToShare];
                        setSharedBadges(newShared);
                        localStorage.setItem('kkeul_shared_badges', JSON.stringify(newShared));
                        
                        const newXp = profile.xp + 50;
                        await onUpdateProfile({
                          ...profile,
                          xp: newXp
                        });
                        
                        onTriggerMockPush('🏆 배지 스토리 공유 보상', `인스타그램 스토리에 [${selectedBadgeToShare}] 배지를 자랑하여 50 XP가 지급되었습니다!`);
                      } else {
                        onTriggerMockPush('✏️ 배지 스토리 공유', `인스타그램 스토리에 [${selectedBadgeToShare}] 배지를 자랑했습니다! (중복 공유로 XP는 지급되지 않습니다.)`);
                      }
                    }, 1500);
                  }}
                  disabled={isSharingBadge}
                  style={{
                    border: 'none',
                    background: 'linear-gradient(135deg, #FF007F 0%, #E2008B 100%)',
                    color: '#FFFFFF',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(255, 0, 127, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSharingBadge ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      스토리로 공유 중...
                    </>
                  ) : (
                    <>
                      <span>스토리 공유하고 50 XP 받기 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toss Modal */}
      {TossModal()}
    </div>
  );
};
