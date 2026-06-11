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
  '?뺣낫 怨듭쑀??: {
    emoji: '?뱼',
    color: '#3B82F6',
    neonColor: '0 0 10px rgba(59, 130, 246, 0.4)',
    criteria: '怨듬え???곸꽭 ?뺣낫?먯꽌 [?덊븳???깆씠?? 留곹겕 怨듭쑀瑜?蹂대궡硫??띾뱷!'
  },
  '罹섎┛??留덉뒪??: {
    emoji: '?뱟',
    color: '#8B5CF6',
    neonColor: '0 0 10px rgba(139, 92, 246, 0.4)',
    criteria: '怨듬え???곸꽭 ?뺣낫???щ젰 踰꾪듉???뚮윭 ??湲곕낯 罹섎┛?붿뿉 ?쇱젙????ν븯硫??띾뱷!'
  },
  '?몄떥???꾩깮': {
    emoji: '?쩃',
    color: '#FF007F',
    neonColor: '0 0 10px rgba(255, 0, 127, 0.4)',
    criteria: '留덉씠?섏씠吏???ㅼ젙?먯꽌 移쒓뎄 珥덈? ?곸슜 ?꾨즺 ???띾뱷!'
  },
  '??留덉뒪??: {
    emoji: '?몣',
    color: '#F59E0B',
    neonColor: '0 0 10px rgba(245, 158, 11, 0.4)',
    criteria: '硫붿씤 ????뿉??移대뱶瑜??ㅼ??댄봽?섏뿬 ?섍린??寃껋쓣 5???댁긽 ?깃났?섎㈃ ?띾뱷!'
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
  const [selectedCategory, setSelectedCategory] = useState<string>('異붿쿇');

  // B2C ?숈깮??酉?紐⑤뱶: 'swipe' (?좎뒪???ㅼ??댄봽 留ㅼ묶) vs 'list' (由ъ뒪??酉?
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');

  // ?ㅼ??댄봽 Pass 泥섎━?섏뼱 ?곴뎄 ?쒖쇅??怨듦퀬 ID 紐⑸줉
  const [passedIds, setPassedIds] = useState<string[]>([]);

  // 移쒓뎄 珥덈? 諛?異붿쿇 媛??寃뚯씠誘명뵾耳?댁뀡 ?곹깭
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isNeonThemeUnlocked, setIsNeonThemeUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_neon_theme') === 'true';
  });
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_premium_unlocked') === 'true';
  });

  // ?쒕??덉씠??媛?대뱶 愿???곹깭
  const [showSimulation, setShowSimulation] = useState<boolean>(false); // ?쒗넗由ъ뼹 ?먮룞 ?쒖떆 鍮꾪솢?깊솕
  const [simulationStep, setSimulationStep] = useState<number>(1);
  const [showCalendarSimModal, setShowCalendarSimModal] = useState<boolean>(false);
  const [showSimCompleteModal, setShowSimCompleteModal] = useState<boolean>(false);

  // B2B Stats selected announcement state
  const [selectedStatsAnnId, setSelectedStatsAnnId] = useState<string>('');

  // ?숈븘由?SaaS 諛?B2B ?숆탳 ??쒕낫??愿??State
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
  const [selectedSchoolB2B, setSelectedSchoolB2B] = useState<string>('?섎굹怨좊벑?숆탳');
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


  // ?숈븘由?SaaS 愿???곗씠??議고쉶
  useEffect(() => {
    const fetchClubs = async () => {
      const schoolName = profile.school || '?섎굹怨좊벑?숆탳';
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
      await showAlert('?대쫫???낅젰??二쇱꽭??');
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
    onTriggerMockPush('?꾨줈???낅뜲?댄듃', '?ы듃?대━???뺣낫媛 ?뺤긽?곸쑝濡???λ릺?덉뒿?덈떎.');
    setProfileSubTab('portfolio');
  };

  // ?숈븘由?吏???좎껌 泥섎━
  const handleApplyToClub = async (club: ClubAnnouncement) => {
    if (!profile) return;
    
    await db.applyToClub({
      club_id: club.id,
      user_id: profile.id,
      user_name: profile.name,
      user_school: profile.school || '?섎굹怨좊벑?숆탳',
      user_grade: profile.grade || '2?숇뀈',
      user_contact: profile.contact || profile.email || '誘몄엯??,
      user_skills: [],
      user_awards: [],
      introduction_summary: `?곗닔????웾怨??댁젙?쇰줈 ${club.club_name} ?숈븘由ъ뿉 瑗??⑸쪟?섏뿬 ?쒕꼫吏瑜??닿퀬 ?띠뒿?덈떎.`
    });

    const updatedApplied = [...appliedClubIds, club.id];
    setAppliedClubIds(updatedApplied);
    localStorage.setItem('kkeul_applied_club_ids', JSON.stringify(updatedApplied));

    // 由ъ썙??吏湲?(+10 XP)
    const updatedProfile = { ...profile, xp: (profile.xp || 0) + 10 };
    await onUpdateProfile(updatedProfile);

    onTriggerMockPush(
      '?숈븘由?吏???꾨즺',
      `${club.school} '${club.club_name}' ?숈븘由ъ뿉 Kkeul ?꾨줈?꾨줈 1珥?吏???꾨즺! ?쒕쪟媛 ?뺤긽 寃??以묒엯?덈떎.`
    );
    await showAlert(`'${club.club_name}' ?숈븘由ъ뿉 Kkeul ?꾨줈?꾨줈 利됱떆 吏?먮릺?덉뒿?덈떎! (+10 XP ?띾뱷)`);
  };

  // ?숈븘由?紐⑥쭛 怨듦퀬 ?깅줉 泥섎━ (湲곗옣)
  const handleCreateClubAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubRegName.trim() || !clubRegTitle.trim() || !clubRegDetails.trim()) {
      await showAlert('紐⑤뱺 ?꾩닔 ?뺣낫瑜??낅젰??二쇱꽭??');
      return;
    }

    const tags = clubRegTags ? clubRegTags.split(',').map(t => t.trim()) : ['湲고쉷', '媛쒕컻'];
    const newAnn = await db.createClubAnnouncement({
      school: profile.school || '?섎굹怨좊벑?숆탳',
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
    
    await showAlert('?숈븘由?紐⑥쭛 怨듦퀬媛 ?뺤긽?곸쑝濡??깅줉?섏뿀?듬땲??');
  };

  // ?숈븘由?吏?먯옄 ?ъ궗 寃곌낵 ?낅뜲?댄듃 (湲곗옣)
  const handleUpdateApplicantStatus = async (appId: string, applicantName: string, status: 'approved' | 'rejected') => {
    const success = await db.updateClubApplicantStatus(appId, status);
    if (success) {
      setClubApplicants(prev =>
        prev.map(app => app.id === appId ? { ...app, status } : app)
      );
      
      const statusText = status === 'approved' ? '?쒕쪟 ?⑷꺽' : '遺덊빀寃?;
      
      if (status === 'approved') {
        onTriggerMockPush(
          '?숈븘由??ъ궗 寃곌낵',
          `[?⑷꺽 ?뚮┝] ${applicantName}?? ${profile.school || '?섎굹怨좊벑?숆탳'} '${selectedClub?.club_name || 'ALGO'}' ?숈븘由??쒕쪟 ?ъ궗???⑷꺽?섏뀲?듬땲?? 硫댁젒 ?쇱젙??議곗쑉??二쇱꽭??`
        );
      } else {
        onTriggerMockPush(
          '?숈븘由??ъ궗 寃곌낵',
          `[?ъ궗 寃곌낵] ${applicantName}?섏쓽 吏???쒕쪟 ?ъ궗 寃곌낵媛 ?낅뜲?댄듃?섏뿀?듬땲??`
        );
      }
      await showAlert(`吏?먯옄 ${applicantName}?섏쓽 ?ъ궗 ?곹깭瑜?[${statusText}]濡?蹂寃쏀븯??듬땲??`);
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

  // ?ㅼ젣 媛?낆옄 ??荑쇰━瑜??꾪븳 ?꾨줈??紐⑸줉 ?곹깭
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        const profilesData = await db.getAllProfiles();
        setAllProfiles(profilesData);
      } catch (err) {
        console.warn('?꾩껜 ?꾨줈??濡쒕뱶 ?ㅽ뙣:', err);
      }
    };
    loadAllProfiles();
  }, []);

  // ?쒕옒洹??쒖뒪泥??곹깭
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'like' | 'pass' | null>(null);
  const [swipeDismissedId, setSwipeDismissedId] = useState<string | null>(null);

  // user_actions 蹂듭썝 ??
  useEffect(() => {
    const loadActions = async () => {
      if (!profile || profile.role === 'host') return;
      try {
        const actions = await db.getUserActions(profile.id, profile.email);
        const passed = actions.filter(a => a.action_type === 'pass').map(a => a.announcement_id);
        setPassedIds(passed);
      } catch (err) {
        console.warn('?ъ슜???≪뀡 議고쉶 ?ㅽ뙣, 濡쒖뺄 罹먯떆瑜??ъ슜?⑸땲??', err);
      }
    };
    loadActions();
  }, [profile]);

  // ?ㅼ??댄봽 ?곗튂/留덉슦???대깽???몃뱾??
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
    
    // ?섑룊 ?쒕옒洹몄씪 ?뚮쭔 ?붾㈃ ?ㅽ겕濡?諛⑹?
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

    const threshold = 100; // 媛濡?100px ?댁긽 ?쒕옒洹???寃곗젙 ?뺤젙 (?꾧퀎媛?
    const isLike = dragOffset.x >= threshold;
    const isPass = dragOffset.x <= -threshold;

    if (isLike || isPass) {
      // 1. Capacitor Haptics ?몄텧 (臾쇰━ ?쇰뱶諛?
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        if ('vibrate' in navigator) navigator.vibrate(40);
      }

      // 2. ?붾㈃ 諛뽰쑝濡??뺢꺼 ?좎븘媛???좊땲硫붿씠???곹깭 ?몃━嫄?
      setSwipeDismissedId(card.id);

      // 3. Like / Pass 諛깆뿏??諛?濡쒖뺄?ㅽ넗由ъ? ?곸옱
      const actionType = isLike ? 'like' : 'pass';

      if (card.category === 'AD') {
        // 愿묎퀬 移대뱶??寃쎌슦 ?몄떆 ?뚮┝ 諛?諛깆뿏??濡쒓렇 ?놁씠 洹몃깷 ??吏꾪뻾留??쒗궡
        setPassedIds(prev => [...prev, card.id]);
      } else {
        await db.recordUserAction(profile.id, profile.email, card.id, actionType);

        if (showSimulation && simulationStep === 2) {
          setSimulationStep(3);
        }

        if (isLike) {
          // Like ?? 利먭꺼李얘린(蹂닿??? 異붽? 諛?D-Day ?몄떆 由щ쭏?몃뜑 ?ㅼ?以꾨쭅 ?깅줉
          if (!bookmarks.includes(card.id)) {
            onToggleBookmark(card.id);
          }
          onTriggerMockPush(
            '愿???깅줉',
            `'${card.title}' 怨듦퀬媛 蹂닿??⑥뿉 ?닿꼈?듬땲?? 留덇컧 24?쒓컙 ?꾩뿉 ?뚮┝??蹂대궡?쒕┰?덈떎.`
          );
        } else {
          // Pass ?? ?쇰뱶?먯꽌 利됱떆 ?쒖쇅
          setPassedIds(prev => [...prev, card.id]);

          // Pass ???대떦 移댄뀒怨좊━ ?몄텧 媛뺣룄 ?섑뼢 議곗젙 硫섑듃
          onTriggerMockPush(
            '留ㅼ묶 ?쒖쇅',
            `?쇰뱶?먯꽌 ?쒖쇅?섏뿀?듬땲?? 愿??遺꾩빞??異붿쿇 鍮덈룄媛 議곗젙?⑸땲??`
          );
        }
      }
      // 0.3珥??좊땲硫붿씠??吏꾪뻾 ???곹깭 珥덇린??
      setTimeout(() => {
        setDragCardId(null);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setSwipeDismissedId(null);
      }, 300);

    } else {
      // ?꾧퀎媛?誘몃떖 ???쒖옄由?蹂듦?
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
        '愿???깅줉',
        `'${card.title}' 怨듦퀬媛 蹂닿??⑥뿉 ?닿꼈?듬땲?? 留덇컧 24?쒓컙 ?꾩뿉 ?뚮┝??蹂대궡?쒕┰?덈떎.`
      );
    } else {
      setPassedIds(prev => [...prev, card.id]);
      onTriggerMockPush(
        '留ㅼ묶 ?쒖쇅',
        `?쇰뱶?먯꽌 ?쒖쇅?섏뿀?듬땲?? 愿??遺꾩빞??異붿쿇 鍮덈룄媛 議곗젙?⑸땲??`
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

  // 珥덈???留덉씠?щ줈 怨듭쑀 ?⑥닔 (Viral Loop)
  const handleMicroShare = async (e: React.MouseEvent, card: Announcement) => {
    e.stopPropagation();
    
    // ?ъ슜??吏??湲곕컲 怨듭쑀 移댄뵾
    const userLocation = profile.location || '?꾧뎅';
    const shareText = userLocation !== '?꾧뎅'
      ? `[${userLocation} 異붿쿇] '${card.title}' 怨듦퀬媛 ?묒닔 吏꾪뻾 以묒엯?덈떎. 愿?ъ궗 留ㅼ묶 怨듦퀬 怨듭쑀.`
      : `'${card.title}' ?묒닔 吏꾪뻾 以? 異붿쿇 ??명솢??怨듦퀬 怨듭쑀.`;
      
    const shareUrl = `${card.apply_url || 'https://kkeul.wjedulab.co.kr'}?ref=${profile.id}&annId=${card.id}`;

    try {
      await Share.share({
        title: `[?? ${card.title} 異붿쿇`,
        text: shareText,
        url: shareUrl,
        dialogTitle: '移쒓뎄?먭쾶 怨듭쑀?섍린'
      });
      // 50XP 由ъ썙??諛??뺣낫 怨듭쑀??諛곗? 遺??
      db.saveProfile({
        ...profile,
        xp: profile.xp + 50,
        badges: profile.badges.includes('?뺣낫 怨듭쑀??) ? profile.badges : [...profile.badges, '?뺣낫 怨듭쑀??]
      }).then(() => {
        // Only trigger mock push banner on web, skip on native!
        if (!Capacitor.isNativePlatform()) {
          onTriggerMockPush('?뺣낫 怨듭쑀 ?꾨즺', '移쒓뎄?먭쾶 怨듭쑀媛 ?꾨즺?섏뿀?듬땲?? +50 XP ?띾뱷 諛??뺣낫 怨듭쑀??諛곗?媛 遺?щ릺?덉뒿?덈떎.');
        }
        if (showSimulation && simulationStep === 4) {
          setSimulationStep(5);
        }
      });
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : (err.message || '');
      if (errMsg.toLowerCase().includes('cancel') || err.name === 'AbortError') return;
      // ?대┰蹂대뱶 蹂듭궗 ?대갚
      const copyText = `${shareText}\n諛붾줈蹂닿린: ${shareUrl}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(() => {
          onTriggerMockPush('留곹겕 蹂듭궗 ?꾨즺', '珥덈? 留곹겕媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??');
          if (showSimulation && simulationStep === 4) {
            setSimulationStep(5);
          }
        });

      } else {
        await showAlert('怨듭쑀 留곹겕: ' + shareUrl);
      }
    }
  };

  // ?λ쭅??異붿쿇 肄붾뱶 ?낅젰 諛??좉툑?댁젣 ?쒕??덉씠??(寃뚯씠誘명뵾耳?댁뀡)
  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim()) return;

    // 紐⑥쓽 ?λ쭅??媛??諛?珥덈???留ㅼ묶 ?쒕??덉씠???묐룞
    localStorage.setItem('kkeul_neon_theme', 'true');
    localStorage.setItem('kkeul_premium_unlocked', 'true');
    setIsNeonThemeUnlocked(true);
    setIsPremiumUnlocked(true);

    // ?밸퀎 諛곗? "?몄떥???꾩깮" 諛?100XP 蹂댁긽 吏湲?
    const updatedBadges = profile.badges.includes('?몄떥???꾩깮') ? profile.badges : [...profile.badges, '?몄떥???꾩깮'];
    db.saveProfile({
      ...profile,
      xp: profile.xp + 100,
      badges: updatedBadges
    }).then(() => {
      onTriggerMockPush('珥덈? ?쒗깮 ?곸슜 ?꾨즺', '異붿쿇??肄붾뱶 留ㅼ묶???꾨즺?섏뿀?듬땲?? 100 XP ?곷┰ 諛??ㅼ삩 ?묓겕 ?ㅼ??댄봽 ?뚮쭏媛 ?쒖꽦?붾릺?덉뒿?덈떎.');
    });
  };

  // ?ㅻ쭏????웾 留ㅼ묶 ?먮젅?댁뀡 諛?異붿쿇 ?댁쑀 濡쒖쭅
  const [matchingRecommendation, setMatchingRecommendation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // 留ㅼ묶 ?ㅼ퐫?대쭅 ?⑥닔 (?ㅼ썙?? ?쒖씠?? ?ㅽ깮, ?낆같 湲덉븸 醫낇빀)
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

  // 異붿쿇 洹쇨굅 臾멸뎄 ?앹꽦湲?
  const getRecommendationReason = useCallback((ann: Announcement) => {
    // 3. 愿??移댄뀒怨좊━ 留ㅼ묶

    // 3. 愿??移댄뀒怨좊━ 留ㅼ묶
    const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
    const matchesInterest = (profile.interests || []).some(interest => annCategories.includes(interest));
    if (matchesInterest) {
      return `?렞 ??愿?ъ궗(${ann.category})????留욌뒗 怨듦퀬?덉슂!`;
    }

    return `?? 吏꾨줈 ??웾???좊뱺?섍쾶 梨꾩슦??留욎땄 怨듦퀬?덉슂!`;
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
        : '留욎땄 吏꾨줈';
      
      const recommendText = `${profile.name}?섏쓽 愿??遺꾩빞??'${interestsStr}' ?뺣낫瑜?諛뷀깢?쇰줈 媛???곹빀????명솢??諛??꾨줈?앺듃瑜??꾩꽑?덉뒿?덈떎.`;
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
  const [regCategory, setRegCategory] = useState<string>('IT/媛쒕컻');
  const [regCategories, setRegCategories] = useState<string[]>(['IT/媛쒕컻']);

  const handleToggleRegCategory = async (cat: string) => {
    let updated: string[];
    if (regCategories.includes(cat)) {
      if (regCategories.length === 1) {
        await showAlert('理쒖냼 1媛쒖쓽 移댄뀒怨좊━瑜??좏깮?댁빞 ?⑸땲??');
        return;
      }
      updated = regCategories.filter(c => c !== cat);
    } else {
      if (regCategories.length >= 2) {
        await showAlert('移댄뀒怨좊━??理쒕? 2媛쒓퉴吏 ?좏깮?????덉뒿?덈떎.');
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
  const [regRegion, setRegRegion] = useState<string>('?꾧뎅');
  const [regGrade, setRegGrade] = useState<string>('怨좊벑?숆탳 2?숇뀈');

  // B2B ?ㅼ떆媛??寃잜똿 ?쒕??덉씠???곹깭 諛?移댁슫???좊땲硫붿씠??
  const [simulatedStudentsCount, setSimulatedStudentsCount] = useState<number>(0);
  const targetCount = useMemo(() => {
    if (allProfiles.length === 0) return 0;
    return allProfiles.filter(p => {
      // 1. ?몄뒪?몃뒗 ?쒖쇅
      if (p.role === 'host') return false;

      // 2. 吏??留ㅼ묶
      const matchesRegion = regRegion === '?꾧뎅' || p.location === regRegion;

      // 3. ?숇뀈 留ㅼ묶
      const matchesGrade = regGrade.includes('?꾩껜') || p.grade === regGrade;

      // 4. 移댄뀒怨좊━ 留ㅼ묶
      const matchesCategory = (p.interests || []).some(interest => regCategories.includes(interest));

      return matchesRegion && matchesGrade && matchesCategory;
    }).length;
  }, [allProfiles, regRegion, regGrade, regCategories]);

  useEffect(() => {
    let start = Math.floor(targetCount * 0.7); // 70%遺???쒖옉??鍮좊Ⅴ寃??щ씪媛?꾨줉 ?먯뿰?ㅻ읇寃??명똿
    const end = targetCount;
    setSimulatedStudentsCount(start);
    
    const duration = 300; // 0.3珥?
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
  const categories = ['異붿쿇', '?꾩껜', ...studentInterests];

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
      return '湲고븳 ?덉쓬';
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
    if (days < 0) return '留덇컧??;
    return `D-${days}`;
  };

  // 鍮꾧났媛??꾨━誘몄뾼 怨듦퀬 ?뺤쓽 (移쒓뎄 珥덈? 寃뚯씠誘명뵾耳?댁뀡 ?곕룞??
  const premiumLockedAnnouncement = useMemo<Announcement>(() => ({
    id: 'ann-premium-locked',
    title: '[鍮꾧났媛??낆젏] ?湲곗뾽 ?곌퀎 泥?냼??IT ?섎━???밸퀎 硫섑넗留?1湲?,
    host: 'WJedulab (?쇱꽦/?ㅼ씠踰??꾩썝)',
    category: 'IT/媛쒕컻',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: '?쒖슱',
    details: '??怨듦퀬??移쒓뎄 珥덈? 1紐낆쓣 ?꾨즺???좎??먭쾶留??밸퀎 怨듦컻?섎뒗 鍮꾧났媛?湲고쉶?낅땲?? 援?궡 ?湲곗뾽 ?꾩뾽 ?쒕땲???뚰봽?몄썾???붿??덉뼱?ㅼ쓽 1:1 吏꾨줈 肄붿묶, ?ы듃?대━??泥⑥궘, ?먭탳 蹂몄궗 ?ъ뼱 諛??앹궗沅??쒗깮??二쇱뼱吏묐땲??',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://wjedulab-mock-apply-form.github.io/premium-mentoring',
    bid_amount: 0,
    created_at: new Date().toISOString()
  }), []);

  // Student matching filters (useMemo瑜??ъ슜?섏뿬 ?깅뒫 理쒖쟻??
  const studentMatchedAnnouncements = useMemo(() => {
    // 鍮꾧났媛??꾨━誘몄뾼 怨듦퀬瑜?由ъ뒪?몄뿉 二쇱엯
    const baseList = [...announcements, premiumLockedAnnouncement];

    return baseList
      .filter(ann => {
        const isOver = new Date(ann.deadline).getTime() < Date.now();
        if (isOver) return false;

        if (activeTab === 'bookmarks') {
          return bookmarks.includes(ann.id);
        }

        // ?ㅼ??댄봽 Pass(?쒖쇅)??怨듦퀬 ?곴뎄 ?쒖쇅
        if (passedIds.includes(ann.id)) return false;

        if (selectedCategory === '?꾩껜') {
          return true;
        }

        const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];

        if (selectedCategory === '異붿쿇') {
          const matchesInterest = studentInterests.some(interest => annCategories.includes(interest));
          const matchesLocation = profile.location === '?꾧뎅' || ann.location === '?꾧뎅' || ann.location === profile.location;
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

  // 罹섎┛???깅뒫 理쒖쟻?붾? ?꾪븳 2026??5??留덇컧??罹먯떆 留?(O(1) 議고쉶)
  const mayDeadlinesMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    announcements.forEach(ann => {
      if (bookmarks.includes(ann.id)) {
        try {
          const deadDate = new Date(ann.deadline);
          // ?꾨줈?좏????쒖뿰???꾪빐 ???곴??놁씠 ?쇱튂?섎뒗 '???????쒖떆
          map[deadDate.getDate()] = true;
        } catch (e) {
          console.warn('Failed to parse deadline for calendar map:', e);
        }
      }
    });
    return map;
  }, [announcements, bookmarks]);
  
  // ?꾩옱 ?щ젰 ?뺣낫 怨꾩궛
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
      await showAlert('紐⑤뱺 ?꾩닔 ?뺣낫瑜??낅젰??二쇱꽭??');
      return;
    }
    const finalBidAmount = isBidding ? regBidAmount : 0;
    if (isBidding && regBidAmount < 1000) {
      await showAlert('理쒖냼 ?낆같 湲덉븸? 1,000?먯엯?덈떎!');
      return;
    }

    if (isBidding) {
      if (Capacitor.isNativePlatform()) {
        try {
          // 而ㅼ뒪? ?덈뱶濡쒖씠??援ш? ?뚮젅??寃곗젣 紐⑤뱢 ?몄텧 (?곸쐞?몄텧 ?⑦궎吏: nochul)
          const result = await purchase('nochul');
          if (!result.success) {
            await showAlert('寃곗젣媛 痍⑥냼?섏뿀嫄곕굹 ?ㅽ뙣?덉뒿?덈떎.');
            setIsBidding(false);
            return;
          }
        } catch (e: any) {
          console.error("Purchase Error", e);
          await showAlert(`寃곗젣 紐⑤뱢 ?먮윭: ${e.message}`);
          setIsBidding(false);
          return;
        }
      } else {
        // ??釉뚮씪?곗? ?섍꼍 ???ㅼ씠?곕툕媛 ?꾨땺 ??紐⑥쓽 寃곗젣 ?쒕젅??
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
        const defaultNames = ['源誘쇱?', '諛뺤꽌以', '?댁갔??, '理쒖삁??, '?뺤슦吏?];
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
          '?좉퇋 怨듦퀬 ?뚮┝',
          `??留욎땄 議곌굔 ?숈깮 ${count}紐?${namesStr} ???먭쾶 ?ㅼ떆媛??몄떆媛 諛쒖넚?섏뿀?듬땲??`
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
        setRegCategories(['IT/媛쒕컻']);
        setRegCategory('IT/媛쒕컻');
        setRegStep(1);
        // Redirect to host main dashboard
        setActiveTab('home');
      }, 2500);
    } catch (e: any) {
      await showAlert(`怨듦퀬 ?깅줉 ?ㅻ쪟: ${e.message}`);
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
                  ?덈뀞?섏꽭?? {profile.name}??
                </p>
                {!showSimulation && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>

                    {/* 泥댄뿕 媛?대뱶 ?ㅽ뻾 踰꾪듉 */}
                    <button
                      onClick={() => {
                        localStorage.removeItem('kkeul_simulation_done');
                        setSimulationStep(1);
                        setShowSimulation(true);
                        setViewMode('swipe');
                        onTriggerMockPush('媛?대뱶 ?쒖옉', '媛?대뱶 ?ъ뼱瑜??쒖옉?⑸땲?? ?붾㈃??吏?쒕? ?곕씪 吏꾪뻾??二쇱꽭??');
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
                      媛?대뱶
                    </button>
                    {/* 酉?紐⑤뱶 ?좉? ?ㅼ쐞移?*/}
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
                        ?ㅼ??댄봽 留ㅼ묶
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
                        由ъ뒪??酉?
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
                ?ㅻ뒛 <span style={{ color: 'var(--color-indigo)' }}>{studentMatchedAnnouncements.filter(a => a.id !== 'ann-premium-locked').length}媛?/span>??湲고쉶媛<br />
                留ㅼ묶?섏뿀?듬땲??
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
                    onTriggerMockPush('留욎땄 ?먮젅?댁뀡 ?낅뜲?댄듃 ?꾨즺', '?꾨줈??愿?ъ궗 湲곕컲?쇰줈 ?먮젅?댁뀡 ?뺣낫瑜??곕룞 以묒엯?덈떎.');
                    if (showSimulation && simulationStep === 1) {
                      setSimulationStep(2);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--color-indigo)" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-indigo)', letterSpacing: '-0.2px' }}>?뚯쓽 留욎땄 ?먮젅?댁뀡 媛?대뱶</span>
                    {isAiLoading ? (
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={10} className="animate-spin" /> 濡쒕뵫 以?..
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--color-indigo)', fontWeight: 700 }}>???ㅼ떆媛??숆린???꾨즺</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, textAlign: 'left', position: 'relative', zIndex: 1 }}>
                    {matchingRecommendation || '?ㅼ젙?댁＜???ы듃?대━???숈쟻, 愿??遺꾩빞 諛?蹂댁쑀 ??웾???곹빀??留욎땄???쒕룞?ㅼ쓣 ?좊퀎?섍퀬 ?덉뒿?덈떎.'}
                  </p>
                </div>
              )}

            {/* ??吏??留욎땄 ?먮젅?댁뀡 移대뱶 ?뱀뀡 */}
            {(selectedCategory === '異붿쿇' || selectedCategory === '?꾩껜') && profile.location !== '?꾧뎅' && (!showSimulation || simulationStep === 3) && (
              <div 
                id="guide-step-3"
                className={showSimulation && simulationStep === 3 ? 'guide-highlight' : ''}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-4px', padding: showSimulation && simulationStep === 3 ? '12px 16px' : '0', borderRadius: showSimulation && simulationStep === 3 ? '16px' : '0', backgroundColor: showSimulation && simulationStep === 3 ? '#FFFFFF' : 'transparent' }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  ?대쾲 二?{profile.location} 怨좊벑?숈깮 ?꾩닔 李몄뿬 怨듦퀬
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
                              onTriggerMockPush('濡쒖뺄 ?먮젅?댁뀡 ?뺤씤', '??吏??留욎땄??怨듦퀬媛 ?먯깋?섏뿀?듬땲??');
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

            {/* VIEW MODE 1: ?ㅼ??댄봽 留ㅼ묶 紐⑤뱶 */}
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
                  <span>?뮕</span> 移대뱶瑜?<strong>醫뚯슦濡??ㅼ??댄봽</strong>?섍굅???꾨옒 踰꾪듉???대┃??蹂댁꽭??
                </div>

                {/* 寃뱀퀜吏??ㅼ??댄봽 移대뱶 ??而⑦뀒?대꼫 */}
                <div className="swipe-deck-container">
                  {(() => {
                    // ?꾩쭅 ?ㅼ??댄봽 Like/Pass ?섏? ?딆? 留ㅼ묶 移대뱶 ?湲곗뿴 怨꾩궛 (鍮꾧났媛???移대뱶???쒖쇅)
                    const baseSwipeQueue = studentMatchedAnnouncements.filter(
                      ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                    );
                    const swipeQueue = [...baseSwipeQueue];
                    const swipesDone = bookmarks.length + passedIds.length;
                    const adIndices = [5, 11, 17, 23, 29, 35, 41]; // 4~6媛?媛꾧꺽?쇰줈 愿묎퀬 ?몄텧 (泥섏쓬 5媛쒕뒗 臾댁“嫄??쇰컲 移대뱶)
                    let insertedAds = 0;
                    adIndices.forEach((targetIndex) => {
                      let relativePos = targetIndex - swipesDone;
                      if (relativePos <= 0) relativePos = 1;
                      // ?꾩쭅 吏?섏튂吏 ?딆? 愿묎퀬留??먯뿉 ?쎌엯 (relativePos媛 0?대㈃ ?꾩옱 留???
                      if (relativePos >= 0 && relativePos <= swipeQueue.length) {
                        swipeQueue.splice(relativePos + insertedAds, 0, {
                          id: `adfit-native-${targetIndex}`,
                          title: 'AD',
                          host: 'Kakao AdFit',
                          category: 'AD',
                          deadline: new Date().toISOString(),
                          location: '?꾧뎅',
                          details: '愿묎퀬',
                          image_url: '',
                          apply_url: '',
                        });
                        insertedAds++;
                      }
                    });

                    if (swipeQueue.length > 0) {
                      return swipeQueue.slice(0, 3).map((ann, idx) => {
                        const isTop = idx === 0;
                        const isDragging = isTop && dragCardId === ann.id;
                        const isDismissed = ann.id === swipeDismissedId;

                        // ?ㅽ깮 ?④낵 ?대옒??
                        let stackClass = '';
                        if (idx === 1) stackClass = 'stack-1';
                        else if (idx === 2) stackClass = 'stack-2';

                        // ?쒕옒洹?諛??щ씪?대뱶?꾩썐 臾쇰━ ?ㅽ???怨꾩궛
                        let transformStyle = '';
                        let transitionStyle = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

                        if (isDragging) {
                          const rotate = dragOffset.x / 14;
                          transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`;
                          transitionStyle = 'none'; // ?쒕옒洹?以묒뿉???ㅼ떆媛??몃옒??
                        } else if (isDismissed) {
                          // ?꾧퀎媛믪쓣 ?섏뼱 ?뺢꺼 ?좎븘媛?
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
                                <AdFitNativeCard height="100%" />
                              ) : (
                                <>
                              {/* 醫뚯슦 ?쒕옒洹??곹깭 諛섑닾紐?媛?대뱶 諭껋? */}
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

                              {/* 移대뱶 ?ㅻ뜑 */}
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
                                      ?렞 愿?ъ궗 留욎땄
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                  {ann.category}
                                </span>
                              </div>

                              {/* 留ㅼ묶 異붿쿇 ?ъ쑀 臾멸뎄 */}
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

                              {/* 移대뱶 硫붿씤 蹂몃Ц */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', textAlign: 'left' }}>
                                <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                  {ann.title}
                                </h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {ann.details}
                                </p>
                              </div>

                              {/* 移대뱶 ?명꽣 諛??먰꽣移?怨듭쑀 */}
                              <div style={{ borderTop: '1px solid #F2F4F6', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                  <span>{ann.host.slice(0, 10)}</span>
                                  <span>??/span>
                                  <span>{ann.location}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {/* ?먰꽣移?留덉씠?щ줈 怨듭쑀 踰꾪듉 (Viral Loop) */}
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
                                    title="?몄뒪?/移댄넚?쇰줈 怨듭쑀?섍퀬 諭껋? 諛쏄린"
                                  >
                                    <Share2 size={12} />
                                    ?덊븳???깆씠??
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
                                      ?щ젰?????
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
                                      ?곸꽭
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

                    // 留ㅼ묶 移대뱶 ???뚯쭊 ???곕뜕 移대뱶 ?몄텧
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
                            ?ㅻ뒛??湲고쉶瑜?紐⑤몢 寃?좏뻽?댁슂!
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            愿??遺꾩빞瑜????볧엳嫄곕굹, 由ъ뒪??酉?紐⑤뱶濡??대룞?섏뿬 ?ㅼ뼇??怨듦퀬瑜?吏곸젒 ?먯깋??蹂댁꽭??
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPassedIds([]);
                            onTriggerMockPush('留ㅼ묶 ?쇰뱶 珥덇린??, '?⑥뒪?덈뜕 紐⑤뱺 怨듦퀬瑜??쇰뱶???ㅼ떆 ?몄텧?⑸땲??');
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
                          ?⑥뒪??怨듦퀬 ?ㅼ떆 蹂닿린
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
                        title="愿???놁쓬 (?쇱そ ?ㅼ??댄봽)"
                      >
                        ??
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
                        title="愿???덉쓬 (?ㅻⅨ履??ㅼ??댄봽)"
                      >
                        ??
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 2: 由ъ뒪??酉?紐⑤뱶 諛?湲곗〈 而⑦뀗痢?*/}
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
                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>湲고쉶 ?띾뱷 ?덈꺼</span>
                    <span style={{ fontSize: '18px', fontWeight: 800 }}>Lv.{userLevel}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>{profile.xp} XP</div>
                  
                  {/* XP Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ width: `${(currentLevelXP / xpNeeded) * 100}%`, height: '100%', backgroundColor: '#FFFFFF', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8 }}>
                    <span>?ㅼ쓬 ?덈꺼源뚯? {xpNeeded - currentLevelXP} XP ?꾩슂</span>
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
                  {/* 鍮꾧났媛??꾨━誘몄뾼 怨듦퀬瑜?由ъ뒪??理쒖긽???섎떒???몄텧?섏뿬 珥덈? 媛???뺢뎄 珥됱쭊 */}
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
                          鍮꾧났媛?怨좉툒 硫섑넗留?怨듦퀬 ?좉?
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, padding: '0 16px' }}>
                          移쒓뎄 珥덈? 1紐??꾨즺 ???쎌씠 ?댁젣?섏뼱 ?댁슜???대엺?????덉뒿?덈떎.
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
                          <Lock size={11} /> ?꾨━誘몄뾼 鍮꾧났媛?
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
                        <span>??/span>
                        <span>{premiumLockedAnnouncement.location}</span>
                      </div>
                    </div>
                  </div>

                  {studentMatchedAnnouncements
                    .filter(ann => ann.id !== 'ann-premium-locked') // ?쇰컲 由ъ뒪?몄뿉?쒕뒗 ?꾨━誘몄뾼 怨좎젙 ??移대뱶???섎떒??蹂꾨룄 ?몄텧?덉쑝誘濡?以묐났 ?쒓굅
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
                                    理쒖긽??異붿쿇
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
                                    ?렞 愿?ъ궗 留욎땄
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

                            {/* 留ㅼ묶 異붿쿇 ?ъ쑀 臾멸뎄 */}
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
                      議곌굔??遺?⑺븯??留ㅼ묶 湲고쉶媛 ?놁뒿?덈떎.<br />
                      愿??遺꾩빞瑜??볧엳嫄곕굹 ?꾩껜 ??쓣 ?뺤씤??蹂댁꽭??
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
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>??명솢???щ젰</h1>
              <p>李쒗븳 怨듦퀬?ㅼ쓽 ?묒닔 留덇컧?쇱쓣 ?щ젰?먯꽌 諛붾줈 紐⑥븘蹂댁꽭??</p>
            </div>

            {/* Toss-style Custom Calendar Widget */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontWeight: 700, fontSize: '16px' }}>
                <span>{currentYear}??{currentMonth}??/span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-red)' }}>??/span>
                <span>??/span><span>??/span><span>??/span><span>紐?/span><span>湲?/span>
                <span style={{ color: 'var(--color-indigo)' }}>??/span>
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
                  // O(1) 罹먯떆 留?議고쉶濡?留덇컧???щ? ?먮퀎 ?깅뒫 理쒖쟻??
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
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>?대쾲 ???묒닔 留덇컧 ?쇱젙</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.filter(ann => bookmarks.includes(ann.id)).map((ann) => {
                  const dday = getDDay(ann.deadline);
                  const deadDate = new Date(ann.deadline);
                  const formattedDate = `${deadDate.getMonth() + 1}??${deadDate.getDate()}??留덇컧`;

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
                          {formattedDate} ??{ann.host}
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
                    蹂닿??⑥뿉 ?닿릿 怨듦퀬 留덇컧 ?쇱젙???ш린???섏뿴?⑸땲??
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKMARKS / 李?*/}
        {activeTab === 'bookmarks' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>?닿? 李쒗븳 湲고쉶 狩?/h1>
              <p>留덇컧 ?쒓컙??珥됰컯????議깆쭛寃?由щ쭏?몃뱶 ?몄떆媛 ?좎븘媛묐땲??</p>
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
                            理쒖긽??異붿쿇
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
                        <span>??/span>
                        <span>{ann.location}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                  ?꾩쭅 李쒗븳 湲고쉶媛 ?놁뼱??<br />
                  留ㅼ묶 ?쇰뱶?먯꽌 留덉쓬???쒕뒗 湲고쉶??蹂꾪몴瑜??뚮윭蹂댁꽭??
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CLUB RECRUITING SAAS */}
        {activeTab === 'club' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>援먮궡 ?숈븘由?由ы겕猷⑦똿 SaaS ?룶</h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                ???숆탳??<strong style={{ color: 'var(--color-indigo)' }}>{profile.school || '?섎굹怨좊벑?숆탳'}</strong>???숈븘由?由ъ뒪?몃? 議고쉶?섍퀬 湲곗옣怨?留ㅼ묶?⑸땲??
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
                ?숈븘由?吏??
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
                ?쒕쪟 愿由?
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
                ?고빀/援먮쪟??
              </button>
            </div>

            {/* CLUB ROLE: STUDENT */}
            {clubRole === 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>紐⑥쭛 以묒씤 ?숈븘由?({clubAnnouncements.length})</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>??Kkeul ?꾨줈?꾨줈 利됱떆 ?묒닔 媛??/span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clubAnnouncements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #E5E8EB', borderRadius: '16px' }}>
                      ?꾩옱 ?숆탳??紐⑥쭛 以묒씤 ?숈븘由?怨듦퀬媛 ?놁뒿?덈떎.<br />
                      留덉씠?섏씠吏?먯꽌 ?뚯냽 ?숆탳 ?뺣낫瑜?蹂寃쏀빐蹂댁꽭??
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
                              留덇컧: {getDDay(club.deadline)}
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
                            {hasApplied ? <Check size={14} /> : '??}
                            {hasApplied ? 'Kkeul ?꾨줈?꾨줈 吏???꾨즺' : 'Kkeul ?꾨줈?꾨줈 1珥?吏?먰븯湲?}
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
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>紐⑥쭛 怨듦퀬 愿由?/h3>
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
                    <Plus size={12} /> ??怨듦퀬 ?묒꽦
                  </button>
                </div>

                {/* Club Selector Dropdown */}
                {clubAnnouncements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)' }}>湲곗옣 沅뚰븳 ?숈븘由?怨듦퀬 ?좏깮</label>
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
                      ?벃 ?묒닔??吏???쒕쪟 由ъ뒪??({clubApplicants.length}嫄?
                    </h4>

                    {/* Applicants card list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {clubApplicants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          ?꾩쭅 ?묒닔??吏?먯꽌媛 ?놁뒿?덈떎.
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
                                {app.status === 'approved' ? '?쒕쪟?⑷꺽' : app.status === 'rejected' ? '遺덊빀寃? : '?ъ궗以?}
                              </span>
                            </div>

                            {/* Contact */}
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-tertiary)' }}>?곕씫泥?</strong> {app.user_contact}
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
                                  嫄곗젅
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
                                  ???쒕쪟 ?⑷꺽 ?뱀씤
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
                    ?깅줉??湲곗옣 沅뚰븳 ?숈븘由?紐⑥쭛 怨듦퀬媛 ?놁뒿?덈떎. ?숆탳 ?뺣낫瑜??뺤씤??二쇱꽭??
                  </div>
                )}
              </div>
            )}

            {/* CLUB ROLE: NETWORKING */}
            {clubRole === 'networking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>? ?숆탳 ?숈븘由?援먮쪟 ?쒖븞</h3>
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
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>吏꾪뻾 ?쇱젙</span>
                          <span>{event.event_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>紐⑥쭛 ???/span>
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
                        ?ㅽ뵂梨꾪똿?쇰줈 臾몄쓽?섍린
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
                  onClick={() => alert('援먮쪟???쒖븞湲 ?묒꽦 湲곕뒫? 以鍮?以묒엯?덈떎.')}
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
            '?꾧뎅', '?쒖슱', '寃쎄린', '?몄쿇', '遺??, '?援?, 
            '???, '愿묒＜', '?몄궛', '?몄쥌', '媛뺤썝', '異⑸턿', 
            '異⑸궓', '?꾨턿', '?꾨궓', '寃쎈턿', '寃쎈궓', '?쒖＜'
          ];

          const grades = [
            '以묓븰援?1?숇뀈', '以묓븰援?2?숇뀈', '以묓븰援?3?숇뀈',
            '怨좊벑?숆탳 1?숇뀈', '怨좊벑?숆탳 2?숇뀈', '怨좊벑?숆탳 3?숇뀈'
          ];

          const interestOptions = [
            'IT/媛쒕컻', '李쎌뾽', '?섑븰/怨쇳븰', '?덉닠/臾명솕', 
            '?몃Ц??, '泥댁쑁', '遊됱궗?쒕룞', '?멸뎅???댄븰'
          ];

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>???뺣낫 諛??ㅽ럺</h1>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>??웾 吏꾨떒 遺꾩꽍怨??ы듃?대━?ㅻ? 愿由ы빀?덈떎.</p>
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
                    {tab === 'portfolio' ? '???ы듃?대━?? : tab === 'edit' ? '?뱷 ?ㅽ럺 ?몄쭛' : '?숋툘 ?ㅼ젙'}
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
                                const newBio = await showPrompt("?섎쭔??硫뗭쭊 ??以??뚭컻瑜??낅젰?댁＜?몄슂:", profile.bio || '?몄긽??諛붽? 湲고쉷??吏留앹깮');
                                if (newBio !== null && newBio.trim() !== '') {
                                  onUpdateProfile({ ...profile, bio: newBio });
                                }
                              }}
                              title="?대┃?섏뿬 ??以??뚭컻 ?섏젙?섍린"
                            >
                              {profile.bio || '?몄긽??諛붽? 湲고쉷??吏留앹깮'} <span style={{ fontSize: '12px', opacity: 0.5 }}>?륅툘</span>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '46px' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Kkeul ID</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>#{profile.id.split('-')[0]}</div>
                          </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 2, marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '100%', maxHeight: '60px', overflowY: 'auto', paddingRight: '4px' }}>
                            {(profile.interests || ['IT/湲고쉷', '?ㅽ??몄뾽']).map(int => (
                              <span key={int} style={{ fontSize: '10px', fontWeight: 600, color: '#3182F6', backgroundColor: '#FFFFFF', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                {int}
                              </span>
                            ))}
                            {profile.play_style?.team_size && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ?뫁 {profile.play_style.team_size.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.duration && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ??{profile.play_style.duration.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.type && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ?뱧 {profile.play_style.type.split(' ')[1] || profile.play_style.type}
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
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 16px 0' }}>??紐낇븿???ㅼ틪?댁＜?몄슂!</h3>
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
                            await showAlert(`?곕씫泥?${result.contacts.length}媛쒕? ?깃났?곸쑝濡?遺덈윭?붿뒿?덈떎! Kkeul 移쒓뎄 留ㅼ묶???쒖옉?⑸땲??`);
                          } else {
                            await showAlert('?곕씫泥??묎렐 沅뚰븳???꾩슂?⑸땲??');
                          }
                        } catch (e: any) {
                          await showAlert('?곕씫泥섎? 遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎: ' + e.message);
                        }
                      } else {
                        await showAlert('[???섍꼍] ?덈뱶濡쒖씠???깆뿉?쒕쭔 ?곕씫泥??곕룞??吏?먮맗?덈떎. 紐⑤컮??湲곌린?먯꽌 ?쒕룄??二쇱꽭??');
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
                    <Phone size={18} color="#3182F6" /> ?곕씫泥섎줈 Kkeul 移쒓뎄 李얘린
                  </button>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E8EB', margin: '8px 0' }}></div>

                  {/* CAREER ROADMAP TIMELINE */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px 0', color: '#191F28', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Milestone size={20} color="#3182F6" /> 吏꾨줈 ?깆옣 濡쒕뱶留?
                    </h3>
                    
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                      {/* Timeline Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#E5E8EB', borderRadius: '1px' }}></div>

                      {/* STEP 1: AI ??웾 吏꾨떒 */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #3182F6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3182F6', backgroundColor: '#E8F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 1</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>AI ??웾 吏꾨떒 ?꾨즺</h4>
                          </div>
                          

                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              <Activity size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                              遺꾩꽍 寃곌낵: <strong>湲고쉷??/strong>怨?<strong>由щ뜑??/strong>???뗫낫?낅땲?? ?꾨줈?앺듃 留ㅻ땲吏뺤씠???댁빱??由щ뜑 ??븷???곹빀????웾??媛뽰텛怨??덉뒿?덈떎.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STEP 2: ?띾뱷??諛곗? (?낆쟻 猷? */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #10B981', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>STEP 2</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>?몄쬆 諛곗? 而щ젆??/h4>
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
                                    <div style={{ fontSize: '9px', color: '#64748B' }}>{isUnlocked ? '?띾뱷 ?꾨즺' : '?좉?'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* STEP 3: ?섏긽 諛??쒕룞 ?ㅼ쟻 */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #8B5CF6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', backgroundColor: '#F5F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 3</span>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>?섏긽 ?ㅼ쟻 & ?ы듃?대━??/h4>
                            </div>
                            <button 
                              onClick={async () => {
                                const type = await showPrompt("?깅줉???좏삎???レ옄濡??좏깮?댁＜?몄슂:\n1. ?섏긽/?쒕룞 ?ㅼ쟻\n2. ?ы듃?대━??留곹겕");
                                if (type === '1') {
                                  const title = await showPrompt("?ㅼ쟻紐?(?? NYPC ?λ젮??:");
                                  if (!title) return;
                                  const date = await showPrompt("?좎쭨 (?? 2026.08):") || "2026";
                                  const updated = { ...profile, awards: [...(profile.awards || []), { title, date }] };
                                  onUpdateProfile(updated);
                                  await showAlert("?ㅼ쟻???깅줉?섏뿀?듬땲??");
                                } else if (type === '2') {
                                  const url = await showPrompt("?ы듃?대━??留곹겕 二쇱냼 (?? https://github.com/my):");
                                  if (!url) return;
                                  const updated = { ...profile, portfolio_urls: [...(profile.portfolio_urls || []), url] };
                                  onUpdateProfile(updated);
                                  await showAlert("?ы듃?대━??留곹겕媛 ?깅줉?섏뿀?듬땲??");
                                }
                              }}
                              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Plus size={14} /> ?깅줉?섍린
                            </button>
                          </div>

                          {/* ?섏긽 ?ㅼ쟻 由ъ뒪??*/}
                          {profile.awards && profile.awards.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>?룇 ?쒕룞 諛??섏긽 ?댁뿭</div>
                              {profile.awards.map((award, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{award.title}</span>
                                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{award.date}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* ?ы뤃 留곹겕 由ъ뒪??*/}
                          {profile.portfolio_urls && profile.portfolio_urls.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>?뵕 泥⑤? 留곹겕</div>
                              {profile.portfolio_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', textDecoration: 'none', color: '#3182F6', fontSize: '13px', fontWeight: 600 }}>
                                  <Share2 size={14} /> {url}
                                </a>
                              ))}
                            </div>
                          ) : null}

                          {(!profile.awards || profile.awards.length === 0) && (!profile.portfolio_urls || profile.portfolio_urls.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '13px' }}>
                              ?꾩쭅 ?깅줉???ㅼ쟻?대굹 留곹겕媛 ?놁뒿?덈떎.<br/>?곗륫 ?곷떒???깅줉 踰꾪듉???뚮윭 異붽??대낫?몄슂.
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
                            title: '??吏꾨줈 濡쒕뱶留?怨듭쑀',
                            text: `[Kkeul] ${profile.name}?섏쓽 ?명꽣?숉떚釉?吏꾨줈 濡쒕뱶留듦낵 ?ㅽ럺???뺤씤?대낫?몄슂! #Kkeul #吏꾨줈濡쒕뱶留?,
                            url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            dialogTitle: '濡쒕뱶留?怨듭쑀?섍린'
                          });
                        } catch (e: any) {
                          const errMsg = typeof e === 'string' ? e : (e.message || '');
                          if (!errMsg.toLowerCase().includes('cancel') && e.name !== 'AbortError') {
                            await showAlert('怨듭쑀 ?ㅽ뙣: ' + errMsg);
                          }
                        }
                      } else {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: '??吏꾨줈 濡쒕뱶留?怨듭쑀',
                              text: `[Kkeul] ${profile.name}?섏쓽 ?명꽣?숉떚釉?吏꾨줈 濡쒕뱶留듦낵 ?ㅽ럺???뺤씤?대낫?몄슂! #Kkeul #吏꾨줈濡쒕뱶留?,
                              url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            });
                          } else {
                            await showAlert('[???섍꼍] ?대┰蹂대뱶??留곹겕媛 蹂듭궗?섏뿀?듬땲??');
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
                    <Share2 size={18} color="#FFFFFF" /> ???ы듃?대━??怨듭쑀?섍린
                  </button>

                </div>
              )}

              {/* SUBTAB 2: EDIT */}
              {profileSubTab === 'edit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                  
                  {/* Basic Info fields */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>湲곕낯 ?몄쟻 ?ы빆</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?대쫫</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?숆탳紐?/label>
                      <input
                        type="text"
                        value={editSchool}
                        onChange={(e) => setEditSchool(e.target.value)}
                        placeholder="?? ?쒖슱怨좊벑?숆탳"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?숇뀈</label>
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
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>吏??/label>
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
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?곕씫泥?/label>
                      <input
                        type="text"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="010-0000-0000"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>紐⑺몴 ?꾧났 (AI ?명듅 遺꾩꽍???쒖슜)</label>
                      <input
                        type="text"
                        value={editMajor}
                        onChange={(e) => setEditMajor(e.target.value)}
                        placeholder="?? 而댄벂?곌났?숆낵, 寃쎌쁺?숆낵, ?붿옄?멸낵, 湲곌퀎怨듯븰怨?
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Interest options */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>愿??遺꾩빞</h3>
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
                  ?ы듃?대━????ν븯湲??뮶
                </button>
              </div>
            )}

            {/* SUBTAB 3: SETTINGS */}
            {profileSubTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                
                {/* School Profile Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '14px' }}>?숈쟻 ?ы빆</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?숆탳</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.school || '誘몄엯??}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?숇뀈</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.grade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?대쫫</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?대찓??/span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                    </div>
                  </div>
                </div>

                {/* Badges card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} style={{ color: 'var(--color-indigo)' }} /> ?띾뱷???낆쟻 諛곗?
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['?뺣낫 怨듭쑀??, '罹섎┛??留덉뒪??, '?몄떥???꾩깮', '??留덉뒪??].map((badge) => {
                      const isUnlocked = profile.badges && profile.badges.includes(badge);
                      return (
                        <div
                          key={badge}
                          onClick={async () => {
                            if (isUnlocked) {
                              setSelectedBadgeToShare(badge);
                            } else {
                              const criteria = BADGE_DETAILS[badge]?.criteria || '';
                              await showAlert(`?뵏 [${badge}] ?띾뱷 諛⑸쾿:\n${criteria}`);
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
                          {badge} ({isUnlocked ? '?띾뱷 ?꾨즺 ?덌툘' : '?좉? ?뵏'})
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
                      移쒓뎄 珥덈??섍퀬 ?밸퀎 ?쒗깮 ?몃씫?섍린
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    怨듭쑀??留곹겕瑜??怨?移쒓뎄媛 媛?낇븯硫?<strong>?몄떥???꾩깮 諭껋?</strong>, <strong>?쒖젙???ㅼ삩 ?묓겕 ?ㅼ??댄봽 ?뚮쭏</strong>, 洹몃━怨?<strong>?湲곗뾽 ?밸퀎 硫섑넗留?鍮꾧났媛?怨듦퀬</strong> ?대엺 沅뚰븳??利됱떆 ?띾뱷?⑸땲??
                  </p>
                  
                  <form onSubmit={handleApplyReferral} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="珥덈? 肄붾뱶 ?먮뒗 留곹겕 ?낅젰"
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
                      ?곸슜
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
                    濡쒓렇?꾩썐
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('?뺣쭚濡??덊눜?섏떆寃좎뒿?덇퉴? 紐⑤뱺 李??곗씠?곗? 寃쏀뿕移섍? ??젣?섎ŉ ?섎룎由????놁뒿?덈떎.')) {
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
                    ?뚯썝 ?덊눜
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
              ?뚭낵 ?④퍡?섎뒗<br />?묐젰 ?뚰듃??
            </h2>
            <p style={{ fontSize: '15px', color: '#8B95A1', margin: 0, lineHeight: 1.5, letterSpacing: '-0.3px' }}>
              泥?냼???깆옣???꾪빐 ?뚭낵 ?묐젰?섎뒗<br />湲곌?쨌?명뵆猷⑥뼵?쑣룰린?끒룻븰援먮? ?뚭컻?⑸땲??
            </p>
          </div>

          {/* 媛쒕컻 湲곌? WJedulab */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>媛쒕컻 湲곌?</span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '22px' }}>?룶</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>WJedulab</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '4px 8px' }}>Kkeul 媛쒕컻 湲곌?</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#4E5968', margin: '0 0 16px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>??Kkeul)??湲고쉷쨌媛쒕컻??泥?냼??二쇰룄 援먯쑁 湲곗닠 ?곌뎄?뚯엯?덈떎. 泥?냼?꾩씠 ???섏? 湲고쉶瑜?諛쒓껄?섍퀬 ?깆옣?????덈뒗 ?뚮옯?쇱쓣 留뚮뱾??媛묐땲??</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="https://wjedulab.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>?뙋</span>
                  wjedulab.vercel.app
                </a>
                <a href="https://namu.wiki/w/WJedulab" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>?뱰</span>
                  ?섎Т?꾪궎 쨌 WJedulab
                </a>
              </div>
            </div>
          </div>

          {/* ?묐젰 ?낆껜 쨌 湲곌? 쨌 ?숆탳 */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>?묐젰 ?낆껜 쨌 湲곌? 쨌 ?숆탳</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 媛뺣궓?붾꺼濡쒗띁??*/}
              <a href="https://www.gangnamdev.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerGNDevs} alt="媛뺣궓?붾꺼濡쒗띁?? style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>媛뺣궓?붾꺼濡쒗띁??/span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?묐젰??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>湲濡쒕쾶 HR ?꾨Ц湲곗뾽 諛?留욎땄??IT ?붾（??援ъ텞 ?뚰듃??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?붾（??, 'IT而⑥꽕??, 'HR'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
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
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?묐젰??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?κ린 愿???쒗쑕 ?뚰듃??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?κ린', '?쇱씠??, '?쒗쑕'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
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
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', background: 'rgba(249,115,22,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?묐젰 ?쒕퉬??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?κ린 愿???뚰듃??釉뚮옖??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?κ린', '?쒕퉬??, '釉뚮옖??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* 媛뺣??쒕떂 */}
              <a href="https://www.instagram.com/kangceo_official/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '1px solid #F0F0F5', background: '#FFFFFF' }}>
                    <img src={partnerKangceo} alt="媛뺣??쒕떂" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.3)' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: '22px', height: '22px', borderRadius: '50%', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF', zIndex: 1 }}><Check size={12} strokeWidth={3} color="#FFFFFF" /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>媛뺣??쒕떂</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?명뵆猷⑥뼵??/span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?꾩옄紐낇븿 ?ъ뾽 ?명뵆猷⑥뼵??/p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['?꾩옄紐낇븿','?ъ뾽','?명뵆猷⑥뼵??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </a>

              {/* BSBRBO */}
              <a href="https://open.kakao.com/o/gBXNKfEh" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid #F0F0F5' }}>
                  <img src={partnerBsbrbo} alt="BSBRBO" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Team BSBRBO</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?묐젰??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', lineHeight: 1.4, letterSpacing: '-0.3px' }}>泥?냼??李쎌옉湲곕컲 ?뷀꽣?뚯씤癒쇳듃???꾨줈?앺듃 ?</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {['援먯쑁','肄섑뀗痢?,'e?ㅽ룷痢?,'?뚯븙','?곷떞'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* ?숈깮 ?λ젰?먮뱾??諛?*/}
              <a href="https://open.kakao.com/o/gzJLwdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#191F28' }}>
                  <Users size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>?숈깮 ?λ젰?먮뱾??諛?/span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>而ㅻ??덊떚</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?ㅽ듃?뚰궧 諛??뚰넻 怨듦컙</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?뚰넻', '?ㅽ듃?뚰궧'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* 釉뚮· 而ㅻ??덊떚 諛?*/}
              <a href="https://open.kakao.com/o/pKJ0jdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={partnerBrawl} alt="釉뚮· 而ㅻ??덊떚 諛? style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>釉뚮· 而ㅻ??덊떚 諛?/span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?묐젰 而ㅻ??덊떚</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>寃뚯엫 湲곕컲 泥?냼???뚰넻 諛????湲고쉷 ?뚰듃??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['寃뚯엫', '???, '移쒕ぉ'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* SWITCHBACK */}
              <div className="spring-active" style={{ background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}><img src={partnerSwitchback} alt="SWITCHBACK" style={{ width: '90%', height: '90%', objectFit: 'contain' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>SWITCHBACK</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 6px' }}>?묐젰??/span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?⑥뀡?섎쪟 釉뚮옖???뚰듃??/p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['?⑥뀡','?섎쪟','釉뚮옖??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </div>



            </div>
          </div>

          {/* ?뚰듃?덉떗 CTA (?좎뒪 ?ㅽ??? */}
          <div style={{ background: '#F5F5FC', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Sparkles size={28} color="#5544FF" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>?뚭낵 ?④퍡 ?깆옣?섍퀬 ?띠쑝?좉???</h4>
            <p style={{ fontSize: '14px', color: '#8B95A1', margin: '0 0 20px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>?숆탳쨌湲곌?쨌湲곗뾽 ?묐젰 臾몄쓽???꾨옒濡??곕씫??二쇱꽭??</p>
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
        
        {/* TAB 1: MY ANNOUNCEMENTS (??怨듦퀬) */}
        {activeTab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>
                {profile.name} ?몄뒪??愿由ъ옄???몝
              </p>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
                ?꾩옱 吏꾪뻾 以묒씤 怨듦퀬媛<br />
                <span style={{ color: 'var(--color-indigo)' }}>{hostAnnouncements.length}嫄?/span> ?덉뼱???뱼
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
                          ??? {ann.location}
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
                  ?뱼
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    ?꾩쭅 ?깅줉??湲고쉶媛 ?놁뼱??
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    ?뺣? ?ㅼ젙???寃??숈깮?ㅼ쓽 ?대??꾪솕濡?br />
                    ?ㅼ떆媛??몄떆 ?뚮┝??利됱떆 諛쒖넚??蹂댁꽭??
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
                  泥?怨듦퀬 ?깅줉?섍린 ??
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTER (怨듦퀬 ?깅줉) */}
        {activeTab === 'register' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>?좉퇋 怨듦퀬 ?깅줉</h1>
              <p>?쒖꽌?濡?湲곗엯??二쇱떆硫??뚮┝ 硫붿떆吏瑜??묒꽦???쒕┰?덈떎.</p>
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>二쇱턀 湲곌?紐?/ ?숈븘由щ챸</label>
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
                    placeholder="?? WJedulab 二쇱턀 湲고쉷?"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!regHost) {
                      await showAlert('湲곌?紐낆쓣 梨꾩썙二쇱꽭??');
                      return;
                    }
                    setRegStep(2);
                  }}
                  style={{ padding: '14px', fontSize: '14px', fontWeight: 600, borderRadius: '12px' }}
                >
                  ?ㅼ쓬 ?④퀎濡?
                </button>
              </div>
            )}

            {/* Step 2: Details */}
            {regStep === 2 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>怨듦퀬 ?쒕ぉ</label>
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
                    placeholder="?? ?????꾧뎅 泥?냼??李쎌뾽 ?꾩씠?붿뼱 寃쎌쭊???
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>怨듦퀬 ?곸꽭 ?댁슜</label>
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
                    placeholder="怨듦퀬??????뚭컻, 李멸? ?먭꺽 ?깆쓣 ?곸뼱二쇱꽭??"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>怨듦퀬 移댄뀒怨좊━ (理쒕? 2媛??좏깮)</label>
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
                    {['IT/媛쒕컻', '李쎌뾽', '?섑븰/怨쇳븰', '?덉닠/臾명솕', '?몃Ц??, '泥댁쑁', '遊됱궗?쒕룞', '?멸뎅???댄븰'].map((cat) => {
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>怨듭떇 ?묒닔 留곹겕 (URL)</label>
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>?묒닔 留덇컧??/label>
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
                    ?댁쟾
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!regTitle || !regDetails || !regApplyUrl) {
                        await showAlert('紐⑤뱺 ?낅젰 移몄쓣 鍮좎쭚?놁씠 梨꾩썙二쇱꽭??');
                        return;
                      }
                      setRegStep(3);
                    }}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    ?ㅼ쓬 ?④퀎濡?
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Target Setting */}
            {regStep === 3 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>諛쒖넚 ?寃?吏???ㅼ젙</label>
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
                    <option value="?꾧뎅">?꾧뎅 ?꾩껜</option>
                    <option value="?쒖슱">?쒖슱?밸퀎??/option>
                    <option value="寃쎄린">寃쎄린??/option>
                    <option value="?몄쿇">?몄쿇愿묒뿭??/option>
                    <option value="遺??>遺?곌킅??떆</option>
                    <option value="?援?>?援ш킅??떆</option>
                    <option value="???>??꾧킅??떆</option>
                    <option value="愿묒＜">愿묒＜愿묒뿭??/option>
                    <option value="?몄궛">?몄궛愿묒뿭??/option>
                    <option value="?몄쥌">?몄쥌?밸퀎?먯튂??/option>
                    <option value="媛뺤썝">媛뺤썝?밸퀎?먯튂??/option>
                    <option value="異⑸턿">異⑹껌遺곷룄</option>
                    <option value="異⑸궓">異⑹껌?⑤룄</option>
                    <option value="?꾨턿">?꾨씪遺곷룄</option>
                    <option value="?꾨궓">?꾨씪?⑤룄</option>
                    <option value="寃쎈턿">寃쎌긽遺곷룄</option>
                    <option value="寃쎈궓">寃쎌긽?⑤룄</option>
                    <option value="?쒖＜">?쒖＜?밸퀎?먯튂??/option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>諛쒖넚 ?寃??숇뀈 ?ㅼ젙</label>
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
                    <option value="怨좊벑?숆탳 ?꾩껜">怨좊벑?숆탳 ?꾩껜</option>
                    <option value="怨좊벑?숆탳 2?숇뀈">怨좊벑?숆탳 2?숇뀈</option>
                    <option value="怨좊벑?숆탳 1?숇뀈">怨좊벑?숆탳 1?숇뀈</option>
                    <option value="以묓븰援??꾩껜">以묓븰援??꾩껜</option>
                  </select>
                </div>

                {/* ?ㅼ떆媛??寃잜똿 ?쒕??덉씠??移대뱶 UI */}
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
                    <span>?렞</span> ?ㅼ떆媛??寃잜똿 ?쒕??덉씠??
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-indigo)', letterSpacing: '-0.5px' }}>
                    {simulatedStudentsCount.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>紐?/span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    ?ㅼ젙?섏떊 議곌굔(<strong>{regRegion} {regGrade}</strong>)怨??쇱튂?섎ŉ, <strong>{regCategory}</strong> 愿?ъ궗瑜??좏깮???숈깮 ?섏엯?덈떎. 吏湲?怨듦퀬瑜??щ━?쒕㈃ ???숈깮?ㅼ쓽 ?대??꾪솕濡?利됱떆 ?寃잜똿 ?뚮┝???섏븘吏묐땲?? ??
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setRegStep(2)}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    ?댁쟾
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setRegStep(4)}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    ?寃??ㅼ젙 ?꾨즺
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
                  ???ㅼ젙?섏떊 ?寃?{regRegion} {regGrade}) ?숈깮?ㅼ뿉寃??ㅼ떆媛??몄떆 ?뚮┝??蹂대궪 以鍮꾧? ?앸궗?댁슂.
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
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>?좏깮?ы빆: 怨듦퀬 ?몄텧 諛⑹떇 ?좏깮</span>
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
                      湲곕낯 臾대즺 ?깅줉 ?뙮
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
                      ?? ?꾨━誘몄뾼 理쒖긽??怨좎젙 (異붿쿇)
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
                          <span style={{ fontSize: '18px' }}>?뭿</span> VVIP 理쒖긽???몄텧 ?⑦궎吏
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>?곹뭹ID: 怨듦퀬 ?곸쐞?몄텧 ?섍린 (nochul)</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                          2,000<span style={{ fontSize: '15px', fontWeight: 700, marginLeft: '2px' }}>??/span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#FF4747', fontWeight: 700, background: 'rgba(255,71,71,0.1)', padding: '2px 6px', borderRadius: '4px' }}>??1??寃곗젣濡???</span>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>1</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>議고쉶???됯퇏 <span style={{ color: '#FF4747' }}>10諛?/span> ?곸듅 ?④낵!</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>2</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>吏?먯옄 紐⑥쭛???꾨즺???뚭퉴吏 <span style={{ color: 'var(--color-indigo)' }}>理쒖긽??怨좎젙</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>3</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>?꾧뎅 泥?냼??????寃??몄떆 ?뚮┝ ?곗꽑 諛쒖넚</span>
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
                      ?룱 臾댄넻???낃툑 ?덈궡 怨꾩쥖
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                      NH?랁삊 3516-3767-60453 <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}>(?덇툑二? ?쇱슦吏?</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#6B4F00' }}>
                      ?뮕 ?낃툑?먮챸怨??뚯썝媛?????곸쑝??湲곌?紐??대떦?먮챸(<strong>{profile.name}</strong>)???숈씪?섍쾶 ?낃툑??二쇱꽭?? ?낃툑 ?뺤씤 ?꾨즺 ??10遺??대궡???뚯삱 ?뚭퀬由ъ쬁???곸슜?⑸땲??
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
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 600 }}>泥?냼??留ㅼ묶 ?뚮옯??/span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-indigo)' }}>KKEUL ?곸닔利?/span>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>怨듦퀬紐?/div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{regTitle}</div>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>留ㅼ묶 ?寃?/span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regRegion} / {regGrade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>愿??遺꾩빞 留ㅼ묶</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regCategory}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>珥??깅줉/?낆같 鍮꾩슜</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                      {isBidding ? `${regBidAmount.toLocaleString()} ?? : '0 ??(臾대즺)'}
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
                    ?댁쟾
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
                    {isBidding ? `${regBidAmount.toLocaleString()}???낆같 ?좎껌 諛??뚮┝ ?깅줉 ??` : '臾대즺濡?怨듦퀬 ?깅줉?섍퀬 ?뚮┝ ?섍린 ??'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STATS (?듦퀎) */}
        {activeTab === 'stats' && (() => {
          if (hostAnnouncements.length === 0) {
            return (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px' }}>?뱤</div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>遺꾩꽍??諛쒖넚 ?깃낵媛 ?놁뒿?덈떎</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  ?꾩옱 ?깅줉?섏떊 怨듦퀬媛 ?녾굅??諛쒖넚 ?대젰???놁뒿?덈떎.<br />
                  癒쇱? ?좉퇋 怨듦퀬瑜??깅줉?섍퀬 ?ㅼ떆媛??뚮┝??蹂대궡蹂댁꽭??
                </p>
                <button
                  onClick={() => {
                    setRegStep(1);
                    setActiveTab('register');
                  }}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, width: 'auto', alignSelf: 'center' }}
                >
                  泥?怨듦퀬 ?깅줉?섎윭 媛湲???
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
            const regMatch = currentAnn.location === '?꾧뎅' || p.location === '?꾧뎅' || p.location === currentAnn.location;
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
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>諛쒖넚 ?깃낵 ?듦퀎 ?뱤</h1>
                <p>諛쒖넚???寃??몄떆 ?뚮┝???꾨떖 諛??대┃瑜?由ы룷?몄엯?덈떎.</p>
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
                <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>議고쉶??諛쒖넚 怨듦퀬 ?좏깮</label>
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
                  <span>?낆같媛: {currentBid > 0 ? `${currentBid.toLocaleString()}?? : '臾대즺'}</span>
                  <span>??/span>
                  <span>移댄뀒怨좊━: {currentAnn.category}</span>
                </div>
              </div>

              {/* Metrics cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?꾨떖 ?숈깮 ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{reachCount.toLocaleString()} 紐?/div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?몄떆 ?뚮┝ ?대엺瑜?/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>{openRate} %</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?곸꽭 ?섏씠吏 ?대┃ ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{clickCount.toLocaleString()} ??/div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>愿???깅줉(李? ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{bookmarkCount.toLocaleString()} ??/div>
                </div>
              </div>

              {/* CSS graph */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>二쇨컙 ?곸꽭 ?섏씠吏 諛⑸Ц 異붿씠</h3>
                <div style={{ display: 'flex', height: '140px', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.15))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>??/span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.25))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>??/span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.35))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>??/span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(15, Math.floor(clickCount * 0.45))}px`, backgroundColor: 'var(--color-indigo)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>紐?/span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.30))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>湲?/span>
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
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>湲곌? 愿由ъ옄 ?뺣낫</h1>
              <p>?뚯냽 湲곌? ?ㅼ젙 諛?媛???곸꽭 ?뺣낫瑜??뺤씤?⑸땲??</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>湲곌?/?숈븘由щ챸</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?대떦???대찓??/span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                </div>
                {profile.contact && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?곕씫泥?/span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.contact}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>沅뚰븳 援щ텇</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-indigo)' }}>二쇱턀??(B2B Host)</span>
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
                濡쒓렇?꾩썐
              </button>
              <button
                onClick={() => {
                  if (confirm('?뺣쭚濡??덊눜?섏떆寃좎뒿?덇퉴? ?깅줉?섏떊 紐⑤뱺 ??명솢???뺣낫媛 ??젣?섎ŉ 蹂듦뎄?????놁뒿?덈떎.')) {
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
                ?뚯썝 ?덊눜
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
          WJedulab (?붾툝?좎젣?댁뿉???
        </div>
        <div>
          ??쒖옄: ?쇱슦吏?| ?대찓?? <a href="mailto:woojin052501@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>woojin052501@gmail.com</a>
        </div>
        <div>
          ?ъ뾽?먮벑濡앸쾲?? 243-09-03290
        </div>
        <div style={{ marginTop: '4px' }}>
          湲고쉶媛 ?뚯븘???뚮젮?ㅻ뒗 怨? ??(Kkeul) 짤 2026 WJedulab. All rights reserved.
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
              ??
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
              罹섎┛??
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
              蹂닿???
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
              ?숈븘由?
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
              ???뺣낫
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
              ?뚰듃??
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
              ??怨듦퀬
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
              ?깅줉 ??
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
              ?듦퀎
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
              留덉씠?섏씠吏
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
            寃곗젣媛 ?꾨즺?섏뿀?듬땲??
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
            ?ㅼ젙?섏떊 ?寃?{regRegion} {regGrade}) ?숈깮?ㅼ뿉寃?br />
            ?ㅼ떆媛??몄떆 ?뚮┝??利됱떆 諛쒖넚?⑸땲????
          </p>
        </div>
      )}

      {/* --- INTERACTIVE SIMULATION GUIDE SYSTEM --- */}
      {showSimulation && !showCalendarSimModal && !showSimCompleteModal && (
        <>
          {/* ?대몢???ㅻ뱶 ?ㅻ쾭?덉씠 */}
          <div className="guide-dimmer" />

          {/* ?④퀎蹂?媛?대뱶 ?댄똻 */}
          {(() => {
            let tooltipStyle: React.CSSProperties = {};
            let tooltipClass = 'guide-tooltip bottom';
            let tooltipText = '';

            if (simulationStep === 1) {
              // 1?④퀎: 留욎땄 ?먮젅?댁뀡
              tooltipStyle = { top: '220px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[1?④퀎] 留욎땄 ?먮젅?댁뀡\n???꾨줈?꾩뿉 理쒖쟻?붾맂 怨듦퀬瑜?異붿쿇?⑸땲?? 移대뱶瑜??뚮윭 ?쒖옉??蹂댁꽭??';
            } else if (simulationStep === 2) {
              // 2?④퀎: ?ㅼ??댄봽 留ㅼ묶 & 踰꾪듉 而⑦듃濡?
              tooltipStyle = { top: '80px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[2?④퀎] ?ㅼ??댄봽 留ㅼ묶\n移대뱶瑜?醫뚯슦濡?諛嫄곕굹 ?섎떒 踰꾪듉?쇰줈 留ㅼ묶??吏꾪뻾?섏꽭??\n\n??踰꾪듉: 蹂닿??????n??踰꾪듉: ?쇰뱶 ?쒖쇅';
            } else if (simulationStep === 3) {
              // 3?④퀎: 泥쒖븞 濡쒖뺄 ?먮젅?댁뀡
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[3?④퀎] 濡쒖뺄 留욎땄 怨듦퀬\n??洹쇱쿂 吏??쓽 怨듦퀬留?紐⑥븘 蹂댁뿬以띾땲?? ?섏씠?쇱씠?몃맂 移대뱶瑜??좏깮?섏꽭??';
            } else if (simulationStep === 4) {
              // 4?④퀎: 留덉같 ?녿뒗 1珥?怨듭쑀
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[4?④퀎] ?먰꽣移??뺣낫 怨듭쑀\n怨듭쑀 踰꾪듉???뚮윭 移쒓뎄?ㅼ뿉寃?怨듦퀬瑜?蹂대궡怨?寃쏀뿕移섎? ?띾뱷??蹂댁꽭??';
            } else if (simulationStep === 5) {
              // 5?④퀎: 罹섎┛???깅줉
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[5?④퀎] 罹섎┛???숆린??n?щ젰?????踰꾪듉???꾨Ⅴ硫??ㅻ쭏?명룿 罹섎┛?붿뿉 留덇컧?쇱씠 ?곕룞?⑸땲??';
            }

            return (
              <div className={tooltipClass} style={tooltipStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-indigo)', fontSize: '14px' }}>?쒕퉬???댁슜 媛?대뱶</span>
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
                {/* ?ㅽ궢 諛??ㅼ쓬 ?④퀎 ?대룞 ?섎룞 ?몃━嫄?*/}
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
                    媛?대뱶 嫄대꼫?곌린
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
                    ?ㅼ쓬 ?④퀎 ??
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
              ?뱟
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              '??Kkeul)'???щ젰??br />?묎렐?섎젮怨??⑸땲??
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              ??명솢??留덇컧 ?쇱젙 ?먮룞 湲곕줉 諛?由щ쭏?몃뜑 ?몄떆 ?덉빟???꾪빐 ?대???湲곕낯 罹섎┛???쎄린/?곌린 沅뚰븳 ?덉슜???꾩슂?⑸땲??
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
                ?덉슜 ????
              </button>
              <button
                onClick={async () => {
                  try {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                  } catch (e) {}
                  
                  // 由ъ썙???낅뜲?댄듃 & ?꾨즺 ?앹뾽?쇰줈
                  const updatedBadges = profile.badges.includes('??留덉뒪??) ? profile.badges : [...profile.badges, '??留덉뒪??];
                  db.saveProfile({
                    ...profile,
                    xp: profile.xp + 100,
                    badges: updatedBadges
                  }).then(() => {
                    setShowCalendarSimModal(false);
                    setShowSimCompleteModal(true);
                    onTriggerMockPush('罹섎┛???곕룞 ?꾨즺', '?쇱젙??湲곌린 罹섎┛?붿뿉 ?뺤긽 ?깅줉?섏뿀?듬땲??');
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
                ?덉슜
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
            媛?대뱶 ?ъ뼱 ?꾨즺
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
            異뺥븯?⑸땲?? ??Kkeul)??紐⑤뱺 ?듭떖 湲곕뒫??留덉뒪?고븯?⑥뒿?덈떎.<br />
            蹂댁긽?쇰줈 <strong>+100 XP</strong> 寃쏀뿕移섏?<br />
            <strong>&apos;??留덉뒪??apos;</strong> ?쒖젙 ?낆쟻 諛곗?媛 吏湲됰릺?덉뒿?덈떎.
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
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>?좉퇋 諛곗? ?띾뱷</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>??留덉뒪??(媛?대뱶 ?ъ뼱 ?뺣났??</div>
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
            泥댄뿕 ?꾨즺?섍퀬 ?덉쑝濡?媛湲?
          </button>
        </div>
      )}

      {/* ?숈븘由???紐⑥쭛 怨듦퀬 ?묒꽦 紐⑤떖 (湲곗옣?? */}
      {showClubRegModal && (
        <div className="calendar-success-overlay" onClick={() => setShowClubRegModal(false)} style={{ zIndex: 140, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ?룶 ???숈븘由?紐⑥쭛 怨듦퀬 ?깅줉
            </h3>
            
            <form onSubmit={handleCreateClubAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?숈븘由??대쫫</label>
                <input
                  type="text"
                  value={clubRegName}
                  onChange={(e) => setClubRegName(e.target.value)}
                  placeholder="?? ALGO, Motion ??
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>紐⑥쭛 怨듦퀬 ?쒕ぉ</label>
                <input
                  type="text"
                  value={clubRegTitle}
                  onChange={(e) => setClubRegTitle(e.target.value)}
                  placeholder="?? 2026 ?뚭퀬由ъ쬁 ?숈븘由?遺??紐⑥쭛"
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>怨듦퀬 ?몃? ?ㅻ챸</label>
                <textarea
                  value={clubRegDetails}
                  onChange={(e) => setClubRegDetails(e.target.value)}
                  placeholder="?숈븘由??뚭컻 諛??쒕룞 紐⑺몴, ?좊컻 諛⑹떇???곸뼱二쇱꽭??"
                  rows={4}
                  style={{ padding: '10px 12px', fontSize: '13px', border: '1px solid #E5E8EB', borderRadius: '8px', resize: 'none', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?숈븘由??쒓렇 (?쇳몴濡?援щ텇)</label>
                <input
                  type="text"
                  value={clubRegTags}
                  onChange={(e) => setClubRegTags(e.target.value)}
                  placeholder="?? IT/肄붾뵫, ?숈닠, ?멸린"
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
                  痍⑥냼
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  怨듦퀬 ?щ━湲?
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ?깃낵 愿由?B2B ??쒕낫??PC Web ?먮??덉씠??紐⑤떖 */}
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
                <div onClick={() => setShowB2BSchoolModal(false)} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', cursor: 'pointer' }} title="?リ린" />
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
                ?뵏 {window.location.origin}/school-dashboard/manage
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
                    B2B ?곗닔 ?몄옱 ?깃낵 愿由??붾（??
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0' }}>
                    吏꾨줈吏??諛???명솢???깃낵 ?대뱶誘???쒕낫??
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>?숆탳 ?좏깮:</span>
                  <select
                    value={selectedSchoolB2B}
                    onChange={(e) => setSelectedSchoolB2B(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #CBD5E1', borderRadius: '8px', background: '#FFFFFF', outline: 'none', fontWeight: 700, color: '#0F172A' }}
                  >
                    <option value="?섎굹怨좊벑?숆탳">?섎굹怨좊벑?숆탳</option>
                    <option value="?쒓뎅?붿??몃??붿뼱怨좊벑?숆탳">?쒓뎅?붿??몃??붿뼱怨좊벑?숆탳</option>
                    <option value="?좊┛?명꽣?룰퀬?깊븰援?>?좊┛?명꽣?룰퀬?깊븰援?/option>
                  </select>
                </div>
              </div>

              {(() => {
                // Generate metrics based on selected school
                const getSchoolMetrics = (sch: string) => {
                  if (sch === '?쒓뎅?붿??몃??붿뼱怨좊벑?숆탳') {
                    return {
                      activeStudents: 168,
                      submissions: 482,
                      awards: 64,
                      clubs: 18,
                      chart: { dev: 98, startup: 28, science: 14, art: 28 },
                      table: [
                        { name: '源誘쇱?', major: '而댄벂?곌났?숆낵', club: 'ALGO', award: '2026 NYPC 蹂몄꽑 吏꾩텧 (#?먮즺援ъ“)' },
                        { name: '?댁갔??, major: '?뚰봽?몄썾?닿낵', club: 'ALGO', award: '?쒓뎅?뺣낫?щ┝?쇱븘??湲덉긽 (#?뚭퀬由ъ쬁理쒖쟻??' },
                        { name: '?뺤슦吏?, major: '?붿옄?멸낵', club: 'Motion', award: '湲곗긽泥??륂뤌 怨듬え?????(#誘몃뵒?댁뒪?좊━)' }
                      ]
                    };
                  }
                  if (sch === '?좊┛?명꽣?룰퀬?깊븰援?) {
                    return {
                      activeStudents: 154,
                      submissions: 418,
                      awards: 52,
                      clubs: 16,
                      chart: { dev: 84, startup: 32, science: 18, art: 20 },
                      table: [
                        { name: '諛뺤꽌以', major: '寃쎌쁺怨듯븰怨?, club: 'SPARK', award: '二쇰땲??諛쒕챸李쎌쓽???理쒖슦?섏긽 (#鍮꾩쫰?덉뒪紐⑤뜽)' },
                        { name: '理쒖삁??, major: 'UX?붿옄?멸낵', club: 'Motion', award: '?쇱꽦 二쇰땲??SW李쎌옉????λ젮??(#UIUX?꾨줈?좏???' },
                        { name: '?ㅼ???, major: '?뺣낫湲곌린怨?, club: 'ALGO', award: '?꾨쿋?붾뱶 SW 寃쎌쭊????곗닔??(#IoT?ㅺ퀎)' }
                      ]
                    };
                  }
                  // ?섎굹怨좊벑?숆탳 (湲곕낯)
                  return {
                    activeStudents: 124,
                    submissions: 312,
                    awards: 46,
                    clubs: 12,
                    chart: { dev: 38, startup: 45, science: 28, art: 13 },
                    table: [
                      { name: '源誘쇱?', major: '而댄벂?곌났?숆낵', club: 'ALGO', award: '?꾧뎅 怨좉탳 ?뚭퀬由ъ쬁 寃쎌떆 ???(#?먮즺援ъ“)' },
                      { name: '諛뺤꽌以', major: '寃쎌쁺?숆낵', club: 'SPARK', award: '泥?냼???ㅽ??몄뾽 ?꾩씠?붿뼱 ???(#?쒖옣??뱀꽦)' },
                      { name: '理쒖삁??, major: '誘몃뵒?대뵒?먯씤', club: 'Motion', award: '??쒕?援??숈깮 誘몄닠??????(#?쒓컖?쒖씤??' }
                    ]
                  };
                };

                const metrics = getSchoolMetrics(selectedSchoolB2B);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    {/* Top Row: Numeric Indicators */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      {[
                        { title: '????쒕룞 ?쒖꽦 ?숈깮', val: `${metrics.activeStudents}紐?, desc: '?鍮?李몄뿬??76.5%' },
                        { title: '?꾩쟻 怨듬え ?묒닔??, val: `${metrics.submissions}嫄?, desc: '?꾩썡 ?鍮?+18%' },
                        { title: '?몃? ????낆긽 ?ㅼ쟻', val: `${metrics.awards}嫄?, desc: '?곌컙 ?꾩쟻 移댁슫?? },
                        { title: '?쒕룞 ?곌퀎 ?숈븘由ъ닔', val: `${metrics.clubs}媛?, desc: '紐⑥쭛 湲고븳 ?댁쁺 以? }
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
                          ?뱤 ?숈깮 ????깃낵 ?꾧났 移댄뀒怨좊━ 遺꾪룷
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                          {[
                            { name: 'IT / 媛쒕컻 諛?SW怨듯븰', val: metrics.chart.dev, color: 'var(--color-indigo)' },
                            { name: '寃쎌쁺 / 李쎌뾽 / 鍮꾩쫰?덉뒪', val: metrics.chart.startup, color: '#F59E0B' },
                            { name: '?섑븰 / 湲곗큹怨쇳븰 / ?곌뎄', val: metrics.chart.science, color: '#EF4444' },
                            { name: '誘몄닠 / 肄섑뀗痢?/ ?붿옄??, val: metrics.chart.art, color: '#10B981' }
                          ].map((bar, idx) => {
                            const total = metrics.chart.dev + metrics.chart.startup + metrics.chart.science + metrics.chart.art;
                            const pct = Math.round((bar.val / total) * 100);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{bar.name}</span>
                                  <span style={{ color: 'var(--text-primary)' }}>{bar.val}紐?({pct}%)</span>
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
                          ?뱼 ?ㅼ떆媛??숈깮 李멸? 吏묒쨷 ?몃? ???(Top 3)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          {[
                            { title: '?μ뒯 泥?냼???꾨줈洹몃옒諛?梨뚮┛吏 (NYPC)', count: 42, color: '#EEF2FF', border: '#C7D2FE', text: 'var(--color-indigo)' },
                            { title: '?쒓뎅?뺣낫?щ┝?쇱븘??寃쎌떆遺臾?(KOI)', count: 28, color: '#FDF2F8', border: '#FBCFE8', text: '#D946EF' },
                            { title: '????湲곗긽泥??ъ숴湲고썑 怨듬え??, count: 15, color: '#ECFDF5', border: '#A7F3D0', text: '#059669' }
                          ].map((item, idx) => (
                            <div key={idx} style={{ backgroundColor: item.color, border: `1px solid ${item.border}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: item.text }}>{item.count}紐??꾩쟾 以?/span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Detailed student performance table */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        ?룇 援먮궡 ????ㅼ쟻 諛??명듅 異붿쿇 ??ぉ 紐⑤땲??
                      </h3>
                      
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>吏???숈깮</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?щ쭩 紐⑺몴?꾧났</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?뚯냽 ?숈븘由?/th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?몃? ????섏긽 ?깃낵 / ?명듅 留ㅼ묶 ?ㅼ썙??/th>
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
                          ?뮕 <strong>吏꾨줈吏???좎깮?섏쓣 ?꾪븳 ?먰겢由?蹂닿퀬??異붿텧:</strong> ??Kkeul) B2B ?뺤떇 怨꾩빟 ?숆탳???숈깮?ㅼ씠 ?쒖텧???ㅼ쟻怨?AI ?먮룞 ?붿빟 ?명듅 臾몄옣????踰덉뿉 紐⑥븘 ?앺솢湲곕줉遺 湲곗옱 ?묒떇 ?묒? ?뚯씪濡?諛붾줈 異쒕젰?????덉뒿?덈떎.
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await showAlert('蹂닿퀬???묒? ?대낫?닿린媛 ?꾨즺?섏뿀?듬땲?? (?ㅼ슫濡쒕뱶 ?뚯씪: kkeul_school_report.xlsx)');
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
                        ?뱿 ?묒? ?ㅼ쟻 ?곗씠??異쒕젰
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
                <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 800 }}>?몄뒪?洹몃옩 ?ㅽ넗由??꾨━酉??벑</span>
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
                  ??
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
                        {profile.name} ({profile.school || '?섎굹怨좊벑?숆탳'})
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
                      <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#FFFFFF' }}>?ㅼ틪?댁꽌 ?섎룄 ?쒖옉?섍린</div>
                      <div style={{ fontSize: '7.5px', color: '#CBD5E1', marginTop: '1px' }}>10? 怨듬え??& ???留ㅼ묶 ?뚮옯??'??</div>
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
                        
                        onTriggerMockPush('?룇 諛곗? ?ㅽ넗由?怨듭쑀 蹂댁긽', `?몄뒪?洹몃옩 ?ㅽ넗由ъ뿉 [${selectedBadgeToShare}] 諛곗?瑜??먮옉?섏뿬 50 XP媛 吏湲됰릺?덉뒿?덈떎!`);
                      } else {
                        onTriggerMockPush('?륅툘 諛곗? ?ㅽ넗由?怨듭쑀', `?몄뒪?洹몃옩 ?ㅽ넗由ъ뿉 [${selectedBadgeToShare}] 諛곗?瑜??먮옉?덉뒿?덈떎! (以묐났 怨듭쑀濡?XP??吏湲됰릺吏 ?딆뒿?덈떎.)`);
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
                      ?ㅽ넗由щ줈 怨듭쑀 以?..
                    </>
                  ) : (
                    <>
                      <span>?ㅽ넗由?怨듭쑀?섍퀬 50 XP 諛쏄린 ??</span>
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
