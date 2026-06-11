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
  '?•ë³´ ê³µìœ ??: {
    emoji: '?“¢',
    color: '#3B82F6',
    neonColor: '0 0 10px rgba(59, 130, 246, 0.4)',
    criteria: 'ê³µëª¨???ì„¸ ?•ë³´?ì„œ [?ˆí•œ???±ì´?? ë§í¬ ê³µìœ ë¥?ë³´ë‚´ë©??ë“!'
  },
  'ìº˜ë¦°??ë§ˆìŠ¤??: {
    emoji: '?“…',
    color: '#8B5CF6',
    neonColor: '0 0 10px rgba(139, 92, 246, 0.4)',
    criteria: 'ê³µëª¨???ì„¸ ?•ë³´???¬ë ¥ ë²„íŠ¼???ŒëŸ¬ ??ê¸°ë³¸ ìº˜ë¦°?”ì— ?¼ì •???€?¥í•˜ë©??ë“!'
  },
  '?¸ì‹¸???„ìƒ': {
    emoji: '?¤',
    color: '#FF007F',
    neonColor: '0 0 10px rgba(255, 0, 127, 0.4)',
    criteria: 'ë§ˆì´?˜ì´ì§€???¤ì •?ì„œ ì¹œêµ¬ ì´ˆë? ?ìš© ?„ë£Œ ???ë“!'
  },
  '??ë§ˆìŠ¤??: {
    emoji: '?‘‘',
    color: '#F59E0B',
    neonColor: '0 0 10px rgba(245, 158, 11, 0.4)',
    criteria: 'ë©”ì¸ ????—??ì¹´ë“œë¥??¤ì??´í”„?˜ì—¬ ?˜ê¸°??ê²ƒì„ 5???´ìƒ ?±ê³µ?˜ë©´ ?ë“!'
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ì¶”ì²œ');

  // B2C ?™ìƒ??ë·?ëª¨ë“œ: 'swipe' (? ìŠ¤???¤ì??´í”„ ë§¤ì¹­) vs 'list' (ë¦¬ìŠ¤??ë·?
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');

  // ?¤ì??´í”„ Pass ì²˜ë¦¬?˜ì–´ ?êµ¬ ?œì™¸??ê³µê³  ID ëª©ë¡
  const [passedIds, setPassedIds] = useState<string[]>([]);

  // ì¹œêµ¬ ì´ˆë? ë°?ì¶”ì²œ ê°€??ê²Œì´ë¯¸í”¼ì¼€?´ì…˜ ?íƒœ
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isNeonThemeUnlocked, setIsNeonThemeUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_neon_theme') === 'true';
  });
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kkeul_premium_unlocked') === 'true';
  });

  // ?œë??ˆì´??ê°€?´ë“œ ê´€???íƒœ
  const [showSimulation, setShowSimulation] = useState<boolean>(false); // ?œí† ë¦¬ì–¼ ?ë™ ?œì‹œ ë¹„í™œ?±í™”
  const [simulationStep, setSimulationStep] = useState<number>(1);
  const [showCalendarSimModal, setShowCalendarSimModal] = useState<boolean>(false);
  const [showSimCompleteModal, setShowSimCompleteModal] = useState<boolean>(false);

  // B2B Stats selected announcement state
  const [selectedStatsAnnId, setSelectedStatsAnnId] = useState<string>('');

  // ?™ì•„ë¦?SaaS ë°?B2B ?™êµ ?€?œë³´??ê´€??State
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
  const [selectedSchoolB2B, setSelectedSchoolB2B] = useState<string>('?˜ë‚˜ê³ ë“±?™êµ');
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


  // ?™ì•„ë¦?SaaS ê´€???°ì´??ì¡°íšŒ
  useEffect(() => {
    const fetchClubs = async () => {
      const schoolName = profile.school || '?˜ë‚˜ê³ ë“±?™êµ';
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
      await showAlert('?´ë¦„???…ë ¥??ì£¼ì„¸??');
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
    onTriggerMockPush('?„ë¡œ???…ë°?´íŠ¸', '?¬íŠ¸?´ë¦¬???•ë³´ê°€ ?•ìƒ?ìœ¼ë¡??€?¥ë˜?ˆìŠµ?ˆë‹¤.');
    setProfileSubTab('portfolio');
  };

  // ?™ì•„ë¦?ì§€??? ì²­ ì²˜ë¦¬
  const handleApplyToClub = async (club: ClubAnnouncement) => {
    if (!profile) return;
    
    await db.applyToClub({
      club_id: club.id,
      user_id: profile.id,
      user_name: profile.name,
      user_school: profile.school || '?˜ë‚˜ê³ ë“±?™êµ',
      user_grade: profile.grade || '2?™ë…„',
      user_contact: profile.contact || profile.email || 'ë¯¸ì…??,
      user_skills: [],
      user_awards: [],
      introduction_summary: `?°ìˆ˜????Ÿ‰ê³??´ì •?¼ë¡œ ${club.club_name} ?™ì•„ë¦¬ì— ê¼??©ë¥˜?˜ì—¬ ?œë„ˆì§€ë¥??´ê³  ?¶ìŠµ?ˆë‹¤.`
    });

    const updatedApplied = [...appliedClubIds, club.id];
    setAppliedClubIds(updatedApplied);
    localStorage.setItem('kkeul_applied_club_ids', JSON.stringify(updatedApplied));

    // ë¦¬ì›Œ??ì§€ê¸?(+10 XP)
    const updatedProfile = { ...profile, xp: (profile.xp || 0) + 10 };
    await onUpdateProfile(updatedProfile);

    onTriggerMockPush(
      '?™ì•„ë¦?ì§€???„ë£Œ',
      `${club.school} '${club.club_name}' ?™ì•„ë¦¬ì— Kkeul ?„ë¡œ?„ë¡œ 1ì´?ì§€???„ë£Œ! ?œë¥˜ê°€ ?•ìƒ ê²€??ì¤‘ì…?ˆë‹¤.`
    );
    await showAlert(`'${club.club_name}' ?™ì•„ë¦¬ì— Kkeul ?„ë¡œ?„ë¡œ ì¦‰ì‹œ ì§€?ë˜?ˆìŠµ?ˆë‹¤! (+10 XP ?ë“)`);
  };

  // ?™ì•„ë¦?ëª¨ì§‘ ê³µê³  ?±ë¡ ì²˜ë¦¬ (ê¸°ì¥)
  const handleCreateClubAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubRegName.trim() || !clubRegTitle.trim() || !clubRegDetails.trim()) {
      await showAlert('ëª¨ë“  ?„ìˆ˜ ?•ë³´ë¥??…ë ¥??ì£¼ì„¸??');
      return;
    }

    const tags = clubRegTags ? clubRegTags.split(',').map(t => t.trim()) : ['ê¸°íš', 'ê°œë°œ'];
    const newAnn = await db.createClubAnnouncement({
      school: profile.school || '?˜ë‚˜ê³ ë“±?™êµ',
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
    
    await showAlert('?™ì•„ë¦?ëª¨ì§‘ ê³µê³ ê°€ ?•ìƒ?ìœ¼ë¡??±ë¡?˜ì—ˆ?µë‹ˆ??');
  };

  // ?™ì•„ë¦?ì§€?ì ?¬ì‚¬ ê²°ê³¼ ?…ë°?´íŠ¸ (ê¸°ì¥)
  const handleUpdateApplicantStatus = async (appId: string, applicantName: string, status: 'approved' | 'rejected') => {
    const success = await db.updateClubApplicantStatus(appId, status);
    if (success) {
      setClubApplicants(prev =>
        prev.map(app => app.id === appId ? { ...app, status } : app)
      );
      
      const statusText = status === 'approved' ? '?œë¥˜ ?©ê²©' : 'ë¶ˆí•©ê²?;
      
      if (status === 'approved') {
        onTriggerMockPush(
          '?™ì•„ë¦??¬ì‚¬ ê²°ê³¼',
          `[?©ê²© ?Œë¦¼] ${applicantName}?? ${profile.school || '?˜ë‚˜ê³ ë“±?™êµ'} '${selectedClub?.club_name || 'ALGO'}' ?™ì•„ë¦??œë¥˜ ?¬ì‚¬???©ê²©?˜ì…¨?µë‹ˆ?? ë©´ì ‘ ?¼ì •??ì¡°ìœ¨??ì£¼ì„¸??`
        );
      } else {
        onTriggerMockPush(
          '?™ì•„ë¦??¬ì‚¬ ê²°ê³¼',
          `[?¬ì‚¬ ê²°ê³¼] ${applicantName}?˜ì˜ ì§€???œë¥˜ ?¬ì‚¬ ê²°ê³¼ê°€ ?…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ??`
        );
      }
      await showAlert(`ì§€?ì ${applicantName}?˜ì˜ ?¬ì‚¬ ?íƒœë¥?[${statusText}]ë¡?ë³€ê²½í•˜?€?µë‹ˆ??`);
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

  // ?¤ì œ ê°€?…ì ??ì¿¼ë¦¬ë¥??„í•œ ?„ë¡œ??ëª©ë¡ ?íƒœ
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        const profilesData = await db.getAllProfiles();
        setAllProfiles(profilesData);
      } catch (err) {
        console.warn('?„ì²´ ?„ë¡œ??ë¡œë“œ ?¤íŒ¨:', err);
      }
    };
    loadAllProfiles();
  }, []);

  // ?œë˜ê·??œìŠ¤ì²??íƒœ
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'like' | 'pass' | null>(null);
  const [swipeDismissedId, setSwipeDismissedId] = useState<string | null>(null);

  // user_actions ë³µì› ??
  useEffect(() => {
    const loadActions = async () => {
      if (!profile || profile.role === 'host') return;
      try {
        const actions = await db.getUserActions(profile.id, profile.email);
        const passed = actions.filter(a => a.action_type === 'pass').map(a => a.announcement_id);
        setPassedIds(passed);
      } catch (err) {
        console.warn('?¬ìš©???¡ì…˜ ì¡°íšŒ ?¤íŒ¨, ë¡œì»¬ ìºì‹œë¥??¬ìš©?©ë‹ˆ??', err);
      }
    };
    loadActions();
  }, [profile]);

  // ?¤ì??´í”„ ?°ì¹˜/ë§ˆìš°???´ë²¤???¸ë“¤??
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
    
    // ?˜í‰ ?œë˜ê·¸ì¼ ?Œë§Œ ?”ë©´ ?¤í¬ë¡?ë°©ì?
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

    const threshold = 100; // ê°€ë¡?100px ?´ìƒ ?œë˜ê·???ê²°ì • ?•ì • (?„ê³„ê°?
    const isLike = dragOffset.x >= threshold;
    const isPass = dragOffset.x <= -threshold;

    if (isLike || isPass) {
      // 1. Capacitor Haptics ?¸ì¶œ (ë¬¼ë¦¬ ?¼ë“œë°?
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        if ('vibrate' in navigator) navigator.vibrate(40);
      }

      // 2. ?”ë©´ ë°–ìœ¼ë¡??•ê²¨ ? ì•„ê°€??? ë‹ˆë©”ì´???íƒœ ?¸ë¦¬ê±?
      setSwipeDismissedId(card.id);

      // 3. Like / Pass ë°±ì—”??ë°?ë¡œì»¬?¤í† ë¦¬ì? ?ì¬
      const actionType = isLike ? 'like' : 'pass';

      if (card.category === 'AD') {
        // ê´‘ê³  ì¹´ë“œ??ê²½ìš° ?¸ì‹œ ?Œë¦¼ ë°?ë°±ì—”??ë¡œê·¸ ?†ì´ ê·¸ëƒ¥ ??ì§„í–‰ë§??œí‚´
        setPassedIds(prev => [...prev, card.id]);
      } else {
        await db.recordUserAction(profile.id, profile.email, card.id, actionType);

        if (showSimulation && simulationStep === 2) {
          setSimulationStep(3);
        }

        if (isLike) {
          // Like ?? ì¦ê²¨ì°¾ê¸°(ë³´ê??? ì¶”ê? ë°?D-Day ?¸ì‹œ ë¦¬ë§ˆ?¸ë” ?¤ì?ì¤„ë§ ?±ë¡
          if (!bookmarks.includes(card.id)) {
            onToggleBookmark(card.id);
          }
          onTriggerMockPush(
            'ê´€???±ë¡',
            `'${card.title}' ê³µê³ ê°€ ë³´ê??¨ì— ?´ê²¼?µë‹ˆ?? ë§ˆê° 24?œê°„ ?„ì— ?Œë¦¼??ë³´ë‚´?œë¦½?ˆë‹¤.`
          );
        } else {
          // Pass ?? ?¼ë“œ?ì„œ ì¦‰ì‹œ ?œì™¸
          setPassedIds(prev => [...prev, card.id]);

          // Pass ???´ë‹¹ ì¹´í…Œê³ ë¦¬ ?¸ì¶œ ê°•ë„ ?˜í–¥ ì¡°ì • ë©˜íŠ¸
          onTriggerMockPush(
            'ë§¤ì¹­ ?œì™¸',
            `?¼ë“œ?ì„œ ?œì™¸?˜ì—ˆ?µë‹ˆ?? ê´€??ë¶„ì•¼??ì¶”ì²œ ë¹ˆë„ê°€ ì¡°ì •?©ë‹ˆ??`
          );
        }
      }
      // 0.3ì´?? ë‹ˆë©”ì´??ì§„í–‰ ???íƒœ ì´ˆê¸°??
      setTimeout(() => {
        setDragCardId(null);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setSwipeDismissedId(null);
      }, 300);

    } else {
      // ?„ê³„ê°?ë¯¸ë‹¬ ???œìë¦?ë³µê?
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
        'ê´€???±ë¡',
        `'${card.title}' ê³µê³ ê°€ ë³´ê??¨ì— ?´ê²¼?µë‹ˆ?? ë§ˆê° 24?œê°„ ?„ì— ?Œë¦¼??ë³´ë‚´?œë¦½?ˆë‹¤.`
      );
    } else {
      setPassedIds(prev => [...prev, card.id]);
      onTriggerMockPush(
        'ë§¤ì¹­ ?œì™¸',
        `?¼ë“œ?ì„œ ?œì™¸?˜ì—ˆ?µë‹ˆ?? ê´€??ë¶„ì•¼??ì¶”ì²œ ë¹ˆë„ê°€ ì¡°ì •?©ë‹ˆ??`
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

  // ì´ˆë???ë§ˆì´?¬ë¡œ ê³µìœ  ?¨ìˆ˜ (Viral Loop)
  const handleMicroShare = async (e: React.MouseEvent, card: Announcement) => {
    e.stopPropagation();
    
    // ?¬ìš©??ì§€??ê¸°ë°˜ ê³µìœ  ì¹´í”¼
    const userLocation = profile.location || '?„êµ­';
    const shareText = userLocation !== '?„êµ­'
      ? `[${userLocation} ì¶”ì²œ] '${card.title}' ê³µê³ ê°€ ?‘ìˆ˜ ì§„í–‰ ì¤‘ì…?ˆë‹¤. ê´€?¬ì‚¬ ë§¤ì¹­ ê³µê³  ê³µìœ .`
      : `'${card.title}' ?‘ìˆ˜ ì§„í–‰ ì¤? ì¶”ì²œ ?€?¸í™œ??ê³µê³  ê³µìœ .`;
      
    const shareUrl = `${card.apply_url || 'https://kkeul.wjedulab.co.kr'}?ref=${profile.id}&annId=${card.id}`;

    try {
      await Share.share({
        title: `[?? ${card.title} ì¶”ì²œ`,
        text: shareText,
        url: shareUrl,
        dialogTitle: 'ì¹œêµ¬?ê²Œ ê³µìœ ?˜ê¸°'
      });
      // 50XP ë¦¬ì›Œ??ë°??•ë³´ ê³µìœ ??ë°°ì? ë¶€??
      db.saveProfile({
        ...profile,
        xp: profile.xp + 50,
        badges: profile.badges.includes('?•ë³´ ê³µìœ ??) ? profile.badges : [...profile.badges, '?•ë³´ ê³µìœ ??]
      }).then(() => {
        // Only trigger mock push banner on web, skip on native!
        if (!Capacitor.isNativePlatform()) {
          onTriggerMockPush('?•ë³´ ê³µìœ  ?„ë£Œ', 'ì¹œêµ¬?ê²Œ ê³µìœ ê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ?? +50 XP ?ë“ ë°??•ë³´ ê³µìœ ??ë°°ì?ê°€ ë¶€?¬ë˜?ˆìŠµ?ˆë‹¤.');
        }
        if (showSimulation && simulationStep === 4) {
          setSimulationStep(5);
        }
      });
    } catch (err: any) {
      const errMsg = typeof err === 'string' ? err : (err.message || '');
      if (errMsg.toLowerCase().includes('cancel') || err.name === 'AbortError') return;
      // ?´ë¦½ë³´ë“œ ë³µì‚¬ ?´ë°±
      const copyText = `${shareText}\në°”ë¡œë³´ê¸°: ${shareUrl}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(() => {
          onTriggerMockPush('ë§í¬ ë³µì‚¬ ?„ë£Œ', 'ì´ˆë? ë§í¬ê°€ ?´ë¦½ë³´ë“œ??ë³µì‚¬?˜ì—ˆ?µë‹ˆ??');
          if (showSimulation && simulationStep === 4) {
            setSimulationStep(5);
          }
        });

      } else {
        await showAlert('ê³µìœ  ë§í¬: ' + shareUrl);
      }
    }
  };

  // ?¥ë§??ì¶”ì²œ ì½”ë“œ ?…ë ¥ ë°?? ê¸ˆ?´ì œ ?œë??ˆì´??(ê²Œì´ë¯¸í”¼ì¼€?´ì…˜)
  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim()) return;

    // ëª¨ì˜ ?¥ë§??ê°€??ë°?ì´ˆë???ë§¤ì¹­ ?œë??ˆì´???‘ë™
    localStorage.setItem('kkeul_neon_theme', 'true');
    localStorage.setItem('kkeul_premium_unlocked', 'true');
    setIsNeonThemeUnlocked(true);
    setIsPremiumUnlocked(true);

    // ?¹ë³„ ë°°ì? "?¸ì‹¸???„ìƒ" ë°?100XP ë³´ìƒ ì§€ê¸?
    const updatedBadges = profile.badges.includes('?¸ì‹¸???„ìƒ') ? profile.badges : [...profile.badges, '?¸ì‹¸???„ìƒ'];
    db.saveProfile({
      ...profile,
      xp: profile.xp + 100,
      badges: updatedBadges
    }).then(() => {
      onTriggerMockPush('ì´ˆë? ?œíƒ ?ìš© ?„ë£Œ', 'ì¶”ì²œ??ì½”ë“œ ë§¤ì¹­???„ë£Œ?˜ì—ˆ?µë‹ˆ?? 100 XP ?ë¦½ ë°??¤ì˜¨ ?‘í¬ ?¤ì??´í”„ ?Œë§ˆê°€ ?œì„±?”ë˜?ˆìŠµ?ˆë‹¤.');
    });
  };

  // ?¤ë§ˆ????Ÿ‰ ë§¤ì¹­ ?ë ˆ?´ì…˜ ë°?ì¶”ì²œ ?´ìœ  ë¡œì§
  const [matchingRecommendation, setMatchingRecommendation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // ë§¤ì¹­ ?¤ì½”?´ë§ ?¨ìˆ˜ (?¤ì›Œ?? ?œì´?? ?¤íƒ, ?…ì°° ê¸ˆì•¡ ì¢…í•©)
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

  // ì¶”ì²œ ê·¼ê±° ë¬¸êµ¬ ?ì„±ê¸?
  const getRecommendationReason = useCallback((ann: Announcement) => {
    // 3. ê´€??ì¹´í…Œê³ ë¦¬ ë§¤ì¹­

    // 3. ê´€??ì¹´í…Œê³ ë¦¬ ë§¤ì¹­
    const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
    const matchesInterest = (profile.interests || []).some(interest => annCategories.includes(interest));
    if (matchesInterest) {
      return `?¯ ??ê´€?¬ì‚¬(${ann.category})????ë§ëŠ” ê³µê³ ?ˆìš”!`;
    }

    return `?? ì§„ë¡œ ??Ÿ‰??? ë“ ?˜ê²Œ ì±„ìš°??ë§ì¶¤ ê³µê³ ?ˆìš”!`;
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
        : 'ë§ì¶¤ ì§„ë¡œ';
      
      const recommendText = `${profile.name}?˜ì˜ ê´€??ë¶„ì•¼??'${interestsStr}' ?•ë³´ë¥?ë°”íƒ•?¼ë¡œ ê°€???í•©???€?¸í™œ??ë°??„ë¡œ?íŠ¸ë¥??„ì„ ?ˆìŠµ?ˆë‹¤.`;
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
  const [regCategory, setRegCategory] = useState<string>('IT/ê°œë°œ');
  const [regCategories, setRegCategories] = useState<string[]>(['IT/ê°œë°œ']);

  const handleToggleRegCategory = async (cat: string) => {
    let updated: string[];
    if (regCategories.includes(cat)) {
      if (regCategories.length === 1) {
        await showAlert('ìµœì†Œ 1ê°œì˜ ì¹´í…Œê³ ë¦¬ë¥?? íƒ?´ì•¼ ?©ë‹ˆ??');
        return;
      }
      updated = regCategories.filter(c => c !== cat);
    } else {
      if (regCategories.length >= 2) {
        await showAlert('ì¹´í…Œê³ ë¦¬??ìµœë? 2ê°œê¹Œì§€ ? íƒ?????ˆìŠµ?ˆë‹¤.');
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
  const [regRegion, setRegRegion] = useState<string>('?„êµ­');
  const [regGrade, setRegGrade] = useState<string>('ê³ ë“±?™êµ 2?™ë…„');

  // B2B ?¤ì‹œê°??€ê²ŸíŒ… ?œë??ˆì´???íƒœ ë°?ì¹´ìš´??? ë‹ˆë©”ì´??
  const [simulatedStudentsCount, setSimulatedStudentsCount] = useState<number>(0);
  const targetCount = useMemo(() => {
    if (allProfiles.length === 0) return 0;
    return allProfiles.filter(p => {
      // 1. ?¸ìŠ¤?¸ëŠ” ?œì™¸
      if (p.role === 'host') return false;

      // 2. ì§€??ë§¤ì¹­
      const matchesRegion = regRegion === '?„êµ­' || p.location === regRegion;

      // 3. ?™ë…„ ë§¤ì¹­
      const matchesGrade = regGrade.includes('?„ì²´') || p.grade === regGrade;

      // 4. ì¹´í…Œê³ ë¦¬ ë§¤ì¹­
      const matchesCategory = (p.interests || []).some(interest => regCategories.includes(interest));

      return matchesRegion && matchesGrade && matchesCategory;
    }).length;
  }, [allProfiles, regRegion, regGrade, regCategories]);

  useEffect(() => {
    let start = Math.floor(targetCount * 0.7); // 70%ë¶€???œì‘??ë¹ ë¥´ê²??¬ë¼ê°€?„ë¡ ?ì—°?¤ëŸ½ê²??¸íŒ…
    const end = targetCount;
    setSimulatedStudentsCount(start);
    
    const duration = 300; // 0.3ì´?
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
  const categories = ['ì¶”ì²œ', '?„ì²´', ...studentInterests];

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
      return 'ê¸°í•œ ?ˆìŒ';
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
    if (days < 0) return 'ë§ˆê°??;
    return `D-${days}`;
  };

  // ë¹„ê³µê°??„ë¦¬ë¯¸ì—„ ê³µê³  ?•ì˜ (ì¹œêµ¬ ì´ˆë? ê²Œì´ë¯¸í”¼ì¼€?´ì…˜ ?°ë™??
  const premiumLockedAnnouncement = useMemo<Announcement>(() => ({
    id: 'ann-premium-locked',
    title: '[ë¹„ê³µê°??…ì ] ?€ê¸°ì—… ?°ê³„ ì²?†Œ??IT ?˜ë¦¬???¹ë³„ ë©˜í† ë§?1ê¸?,
    host: 'WJedulab (?¼ì„±/?¤ì´ë²??„ì›)',
    category: 'IT/ê°œë°œ',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: '?œìš¸',
    details: '??ê³µê³ ??ì¹œêµ¬ ì´ˆë? 1ëª…ì„ ?„ë£Œ??? ì??ê²Œë§??¹ë³„ ê³µê°œ?˜ëŠ” ë¹„ê³µê°?ê¸°íšŒ?…ë‹ˆ?? êµ?‚´ ?€ê¸°ì—… ?„ì—… ?œë‹ˆ???Œí”„?¸ì›¨???”ì??ˆì–´?¤ì˜ 1:1 ì§„ë¡œ ì½”ì¹­, ?¬íŠ¸?´ë¦¬??ì²¨ì‚­, ?êµ ë³¸ì‚¬ ?¬ì–´ ë°??ì‚¬ê¶??œíƒ??ì£¼ì–´ì§‘ë‹ˆ??',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop',
    apply_url: 'https://wjedulab-mock-apply-form.github.io/premium-mentoring',
    bid_amount: 0,
    created_at: new Date().toISOString()
  }), []);

  // Student matching filters (useMemoë¥??¬ìš©?˜ì—¬ ?±ëŠ¥ ìµœì ??
  const studentMatchedAnnouncements = useMemo(() => {
    // ë¹„ê³µê°??„ë¦¬ë¯¸ì—„ ê³µê³ ë¥?ë¦¬ìŠ¤?¸ì— ì£¼ì…
    const baseList = [...announcements, premiumLockedAnnouncement];

    return baseList
      .filter(ann => {
        const isOver = new Date(ann.deadline).getTime() < Date.now();
        if (isOver) return false;

        if (activeTab === 'bookmarks') {
          return bookmarks.includes(ann.id);
        }

        // ?¤ì??´í”„ Pass(?œì™¸)??ê³µê³  ?êµ¬ ?œì™¸
        if (passedIds.includes(ann.id)) return false;

        if (selectedCategory === '?„ì²´') {
          return true;
        }

        const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];

        if (selectedCategory === 'ì¶”ì²œ') {
          const matchesInterest = studentInterests.some(interest => annCategories.includes(interest));
          const matchesLocation = profile.location === '?„êµ­' || ann.location === '?„êµ­' || ann.location === profile.location;
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

  // ìº˜ë¦°???±ëŠ¥ ìµœì ?”ë? ?„í•œ 2026??5??ë§ˆê°??ìºì‹œ ë§?(O(1) ì¡°íšŒ)
  const mayDeadlinesMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    announcements.forEach(ann => {
      if (bookmarks.includes(ann.id)) {
        try {
          const deadDate = new Date(ann.deadline);
          // ?„ë¡œ? í????œì—°???„í•´ ???ê??†ì´ ?¼ì¹˜?˜ëŠ” '???????œì‹œ
          map[deadDate.getDate()] = true;
        } catch (e) {
          console.warn('Failed to parse deadline for calendar map:', e);
        }
      }
    });
    return map;
  }, [announcements, bookmarks]);
  
  // ?„ì¬ ?¬ë ¥ ?•ë³´ ê³„ì‚°
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
      await showAlert('ëª¨ë“  ?„ìˆ˜ ?•ë³´ë¥??…ë ¥??ì£¼ì„¸??');
      return;
    }
    const finalBidAmount = isBidding ? regBidAmount : 0;
    if (isBidding && regBidAmount < 1000) {
      await showAlert('ìµœì†Œ ?…ì°° ê¸ˆì•¡?€ 1,000?ì…?ˆë‹¤!');
      return;
    }

    if (isBidding) {
      if (Capacitor.isNativePlatform()) {
        try {
          // ì»¤ìŠ¤?€ ?ˆë“œë¡œì´??êµ¬ê? ?Œë ˆ??ê²°ì œ ëª¨ë“ˆ ?¸ì¶œ (?ìœ„?¸ì¶œ ?¨í‚¤ì§€: nochul)
          const result = await purchase('nochul');
          if (!result.success) {
            await showAlert('ê²°ì œê°€ ì·¨ì†Œ?˜ì—ˆê±°ë‚˜ ?¤íŒ¨?ˆìŠµ?ˆë‹¤.');
            setIsBidding(false);
            return;
          }
        } catch (e: any) {
          console.error("Purchase Error", e);
          await showAlert(`ê²°ì œ ëª¨ë“ˆ ?ëŸ¬: ${e.message}`);
          setIsBidding(false);
          return;
        }
      } else {
        // ??ë¸Œë¼?°ì? ?˜ê²½ ???¤ì´?°ë¸Œê°€ ?„ë‹ ??ëª¨ì˜ ê²°ì œ ?œë ˆ??
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
        const defaultNames = ['ê¹€ë¯¼ì?', 'ë°•ì„œì¤€', '?´ì°¬??, 'ìµœì˜ˆ??, '?•ìš°ì§?];
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
          '? ê·œ ê³µê³  ?Œë¦¼',
          `??ë§ì¶¤ ì¡°ê±´ ?™ìƒ ${count}ëª?${namesStr} ???ê²Œ ?¤ì‹œê°??¸ì‹œê°€ ë°œì†¡?˜ì—ˆ?µë‹ˆ??`
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
        setRegCategories(['IT/ê°œë°œ']);
        setRegCategory('IT/ê°œë°œ');
        setRegStep(1);
        // Redirect to host main dashboard
        setActiveTab('home');
      }, 2500);
    } catch (e: any) {
      await showAlert(`ê³µê³  ?±ë¡ ?¤ë¥˜: ${e.message}`);
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
                  ?ˆë…•?˜ì„¸?? {profile.name}??
                </p>
                {!showSimulation && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>

                    {/* ì²´í—˜ ê°€?´ë“œ ?¤í–‰ ë²„íŠ¼ */}
                    <button
                      onClick={() => {
                        localStorage.removeItem('kkeul_simulation_done');
                        setSimulationStep(1);
                        setShowSimulation(true);
                        setViewMode('swipe');
                        onTriggerMockPush('ê°€?´ë“œ ?œì‘', 'ê°€?´ë“œ ?¬ì–´ë¥??œì‘?©ë‹ˆ?? ?”ë©´??ì§€?œë? ?°ë¼ ì§„í–‰??ì£¼ì„¸??');
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
                      ê°€?´ë“œ
                    </button>
                    {/* ë·?ëª¨ë“œ ? ê? ?¤ìœ„ì¹?*/}
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
                        ?¤ì??´í”„ ë§¤ì¹­
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
                        ë¦¬ìŠ¤??ë·?
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
                ?¤ëŠ˜ <span style={{ color: 'var(--color-indigo)' }}>{studentMatchedAnnouncements.filter(a => a.id !== 'ann-premium-locked').length}ê°?/span>??ê¸°íšŒê°€<br />
                ë§¤ì¹­?˜ì—ˆ?µë‹ˆ??
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
                    onTriggerMockPush('ë§ì¶¤ ?ë ˆ?´ì…˜ ?…ë°?´íŠ¸ ?„ë£Œ', '?„ë¡œ??ê´€?¬ì‚¬ ê¸°ë°˜?¼ë¡œ ?ë ˆ?´ì…˜ ?•ë³´ë¥??°ë™ ì¤‘ì…?ˆë‹¤.');
                    if (showSimulation && simulationStep === 1) {
                      setSimulationStep(2);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--color-indigo)" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-indigo)', letterSpacing: '-0.2px' }}>?Œì˜ ë§ì¶¤ ?ë ˆ?´ì…˜ ê°€?´ë“œ</span>
                    {isAiLoading ? (
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={10} className="animate-spin" /> ë¡œë”© ì¤?..
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--color-indigo)', fontWeight: 700 }}>???¤ì‹œê°??™ê¸°???„ë£Œ</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, textAlign: 'left', position: 'relative', zIndex: 1 }}>
                    {matchingRecommendation || '?¤ì •?´ì£¼???¬íŠ¸?´ë¦¬???™ì , ê´€??ë¶„ì•¼ ë°?ë³´ìœ  ??Ÿ‰???í•©??ë§ì¶¤???œë™?¤ì„ ? ë³„?˜ê³  ?ˆìŠµ?ˆë‹¤.'}
                  </p>
                </div>
              )}

            {/* ??ì§€??ë§ì¶¤ ?ë ˆ?´ì…˜ ì¹´ë“œ ?¹ì…˜ */}
            {(selectedCategory === 'ì¶”ì²œ' || selectedCategory === '?„ì²´') && profile.location !== '?„êµ­' && (!showSimulation || simulationStep === 3) && (
              <div 
                id="guide-step-3"
                className={showSimulation && simulationStep === 3 ? 'guide-highlight' : ''}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-4px', padding: showSimulation && simulationStep === 3 ? '12px 16px' : '0', borderRadius: showSimulation && simulationStep === 3 ? '16px' : '0', backgroundColor: showSimulation && simulationStep === 3 ? '#FFFFFF' : 'transparent' }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  ?´ë²ˆ ì£?{profile.location} ê³ ë“±?™ìƒ ?„ìˆ˜ ì°¸ì—¬ ê³µê³ 
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
                              onTriggerMockPush('ë¡œì»¬ ?ë ˆ?´ì…˜ ?•ì¸', '??ì§€??ë§ì¶¤??ê³µê³ ê°€ ?ìƒ‰?˜ì—ˆ?µë‹ˆ??');
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

            {/* VIEW MODE 1: ?¤ì??´í”„ ë§¤ì¹­ ëª¨ë“œ */}
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
                  <span>?’¡</span> ì¹´ë“œë¥?<strong>ì¢Œìš°ë¡??¤ì??´í”„</strong>?˜ê±°???„ë˜ ë²„íŠ¼???´ë¦­??ë³´ì„¸??
                </div>

                {/* ê²¹ì³ì§??¤ì??´í”„ ì¹´ë“œ ??ì»¨í…Œ?´ë„ˆ */}
                <div className="swipe-deck-container">
                  {(() => {
                    // ?„ì§ ?¤ì??´í”„ Like/Pass ?˜ì? ?Šì? ë§¤ì¹­ ì¹´ë“œ ?€ê¸°ì—´ ê³„ì‚° (ë¹„ê³µê°???ì¹´ë“œ???œì™¸)
                    const baseSwipeQueue = studentMatchedAnnouncements.filter(
                      ann => !bookmarks.includes(ann.id) && ann.id !== 'ann-premium-locked'
                    );
                    const swipeQueue = [...baseSwipeQueue];
                    const swipesDone = bookmarks.length + passedIds.length;
                    const adIndices = [5, 11, 17, 23, 29, 35, 41]; // ê´‘ê³ ê°€ ?˜í????ˆë? ?œì„œ (3ë²ˆì§¸, 8ë²ˆì§¸...)
                    let insertedAds = 0;
                    adIndices.forEach((targetIndex) => {
                      const relativePos = targetIndex - swipesDone;
                      // ?„ì§ ì§€?˜ì¹˜ì§€ ?Šì? ê´‘ê³ ë§??ì— ?½ì… (relativePosê°€ 0?´ë©´ ?„ì¬ ë§???
                      if (relativePos >= 0 && relativePos <= swipeQueue.length) {
                        swipeQueue.splice(relativePos + insertedAds, 0, {
                          id: `adfit-native-${targetIndex}`,
                          title: 'AD',
                          host: 'Kakao AdFit',
                          category: 'AD',
                          deadline: new Date().toISOString(),
                          location: '?„êµ­',
                          details: 'ê´‘ê³ ',
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

                        // ?¤íƒ ?¨ê³¼ ?´ë˜??
                        let stackClass = '';
                        if (idx === 1) stackClass = 'stack-1';
                        else if (idx === 2) stackClass = 'stack-2';

                        // ?œë˜ê·?ë°??¬ë¼?´ë“œ?„ì›ƒ ë¬¼ë¦¬ ?¤í???ê³„ì‚°
                        let transformStyle = '';
                        let transitionStyle = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

                        if (isDragging) {
                          const rotate = dragOffset.x / 14;
                          transformStyle = `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotate}deg)`;
                          transitionStyle = 'none'; // ?œë˜ê·?ì¤‘ì—???¤ì‹œê°??¸ë˜??
                        } else if (isDismissed) {
                          // ?„ê³„ê°’ì„ ?˜ì–´ ?•ê²¨ ? ì•„ê°?
                          const flyX = dragOffset.x >= 0 ? 500 : -500;
                          transformStyle = `translate(${flyX}px, ${dragOffset.y}px) rotate(${flyX / 14}deg)`;
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
                              {/* ì¢Œìš° ?œë˜ê·??íƒœ ë°˜íˆ¬ëª?ê°€?´ë“œ ë±ƒì? */}
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

                              {/* ì¹´ë“œ ?¤ë” */}
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
                                      ?¯ ê´€?¬ì‚¬ ë§ì¶¤
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                  {ann.category}
                                </span>
                              </div>

                              {/* ë§¤ì¹­ ì¶”ì²œ ?¬ìœ  ë¬¸êµ¬ */}
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

                              {/* ì¹´ë“œ ë©”ì¸ ë³¸ë¬¸ */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', textAlign: 'left' }}>
                                <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                  {ann.title}
                                </h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {ann.details}
                                </p>
                              </div>

                              {/* ì¹´ë“œ ?¸í„° ë°??í„°ì¹?ê³µìœ  */}
                              <div style={{ borderTop: '1px solid #F2F4F6', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                  <span>{ann.host.slice(0, 10)}</span>
                                  <span>??/span>
                                  <span>{ann.location}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {/* ?í„°ì¹?ë§ˆì´?¬ë¡œ ê³µìœ  ë²„íŠ¼ (Viral Loop) */}
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
                                    title="?¸ìŠ¤?€/ì¹´í†¡?¼ë¡œ ê³µìœ ?˜ê³  ë±ƒì? ë°›ê¸°"
                                  >
                                    <Share2 size={12} />
                                    ?ˆí•œ???±ì´??
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
                                      ?¬ë ¥???€??
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
                                      ?ì„¸
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

                    // ë§¤ì¹­ ì¹´ë“œ ???Œì§„ ???°ë˜ ì¹´ë“œ ?¸ì¶œ
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
                            ?¤ëŠ˜??ê¸°íšŒë¥?ëª¨ë‘ ê²€? í–ˆ?´ìš”!
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            ê´€??ë¶„ì•¼ë¥????“íˆê±°ë‚˜, ë¦¬ìŠ¤??ë·?ëª¨ë“œë¡??´ë™?˜ì—¬ ?¤ì–‘??ê³µê³ ë¥?ì§ì ‘ ?ìƒ‰??ë³´ì„¸??
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPassedIds([]);
                            onTriggerMockPush('ë§¤ì¹­ ?¼ë“œ ì´ˆê¸°??, '?¨ìŠ¤?ˆë˜ ëª¨ë“  ê³µê³ ë¥??¼ë“œ???¤ì‹œ ?¸ì¶œ?©ë‹ˆ??');
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
                          ?¨ìŠ¤??ê³µê³  ?¤ì‹œ ë³´ê¸°
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
                        title="ê´€???†ìŒ (?¼ìª½ ?¤ì??´í”„)"
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
                        title="ê´€???ˆìŒ (?¤ë¥¸ìª??¤ì??´í”„)"
                      >
                        ??
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VIEW MODE 2: ë¦¬ìŠ¤??ë·?ëª¨ë“œ ë°?ê¸°ì¡´ ì»¨í…ì¸?*/}
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
                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>ê¸°íšŒ ?ë“ ?ˆë²¨</span>
                    <span style={{ fontSize: '18px', fontWeight: 800 }}>Lv.{userLevel}</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>{profile.xp} XP</div>
                  
                  {/* XP Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ width: `${(currentLevelXP / xpNeeded) * 100}%`, height: '100%', backgroundColor: '#FFFFFF', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8 }}>
                    <span>?¤ìŒ ?ˆë²¨ê¹Œì? {xpNeeded - currentLevelXP} XP ?„ìš”</span>
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
                  {/* ë¹„ê³µê°??„ë¦¬ë¯¸ì—„ ê³µê³ ë¥?ë¦¬ìŠ¤??ìµœìƒ???˜ë‹¨???¸ì¶œ?˜ì—¬ ì´ˆë? ê°€???•êµ¬ ì´‰ì§„ */}
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
                          ë¹„ê³µê°?ê³ ê¸‰ ë©˜í† ë§?ê³µê³  ? ê?
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, padding: '0 16px' }}>
                          ì¹œêµ¬ ì´ˆë? 1ëª??„ë£Œ ???½ì´ ?´ì œ?˜ì–´ ?´ìš©???´ëŒ?????ˆìŠµ?ˆë‹¤.
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
                          <Lock size={11} /> ?„ë¦¬ë¯¸ì—„ ë¹„ê³µê°?
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
                    .filter(ann => ann.id !== 'ann-premium-locked') // ?¼ë°˜ ë¦¬ìŠ¤?¸ì—?œëŠ” ?„ë¦¬ë¯¸ì—„ ê³ ì • ??ì¹´ë“œ???˜ë‹¨??ë³„ë„ ?¸ì¶œ?ˆìœ¼ë¯€ë¡?ì¤‘ë³µ ?œê±°
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
                                    ìµœìƒ??ì¶”ì²œ
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
                                    ?¯ ê´€?¬ì‚¬ ë§ì¶¤
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

                            {/* ë§¤ì¹­ ì¶”ì²œ ?¬ìœ  ë¬¸êµ¬ */}
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
                      ì¡°ê±´??ë¶€?©í•˜??ë§¤ì¹­ ê¸°íšŒê°€ ?†ìŠµ?ˆë‹¤.<br />
                      ê´€??ë¶„ì•¼ë¥??“íˆê±°ë‚˜ ?„ì²´ ??„ ?•ì¸??ë³´ì„¸??
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
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>?€?¸í™œ???¬ë ¥</h1>
              <p>ì°œí•œ ê³µê³ ?¤ì˜ ?‘ìˆ˜ ë§ˆê°?¼ì„ ?¬ë ¥?ì„œ ë°”ë¡œ ëª¨ì•„ë³´ì„¸??</p>
            </div>

            {/* Toss-style Custom Calendar Widget */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontWeight: 700, fontSize: '16px' }}>
                <span>{currentYear}??{currentMonth}??/span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-red)' }}>??/span>
                <span>??/span><span>??/span><span>??/span><span>ëª?/span><span>ê¸?/span>
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
                  // O(1) ìºì‹œ ë§?ì¡°íšŒë¡?ë§ˆê°???¬ë? ?ë³„ ?±ëŠ¥ ìµœì ??
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
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>?´ë²ˆ ???‘ìˆ˜ ë§ˆê° ?¼ì •</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.filter(ann => bookmarks.includes(ann.id)).map((ann) => {
                  const dday = getDDay(ann.deadline);
                  const deadDate = new Date(ann.deadline);
                  const formattedDate = `${deadDate.getMonth() + 1}??${deadDate.getDate()}??ë§ˆê°`;

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
                    ë³´ê??¨ì— ?´ê¸´ ê³µê³  ë§ˆê° ?¼ì •???¬ê¸°???˜ì—´?©ë‹ˆ??
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKMARKS / ì°?*/}
        {activeTab === 'bookmarks' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>?´ê? ì°œí•œ ê¸°íšŒ â­?/h1>
              <p>ë§ˆê° ?œê°„??ì´‰ë°•????ì¡±ì§‘ê²?ë¦¬ë§ˆ?¸ë“œ ?¸ì‹œê°€ ? ì•„ê°‘ë‹ˆ??</p>
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
                            ìµœìƒ??ì¶”ì²œ
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
                  ?„ì§ ì°œí•œ ê¸°íšŒê°€ ?†ì–´??<br />
                  ë§¤ì¹­ ?¼ë“œ?ì„œ ë§ˆìŒ???œëŠ” ê¸°íšŒ??ë³„í‘œë¥??ŒëŸ¬ë³´ì„¸??
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CLUB RECRUITING SAAS */}
        {activeTab === 'club' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>êµë‚´ ?™ì•„ë¦?ë¦¬í¬ë£¨íŒ… SaaS ?«</h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                ???™êµ??<strong style={{ color: 'var(--color-indigo)' }}>{profile.school || '?˜ë‚˜ê³ ë“±?™êµ'}</strong>???™ì•„ë¦?ë¦¬ìŠ¤?¸ë? ì¡°íšŒ?˜ê³  ê¸°ì¥ê³?ë§¤ì¹­?©ë‹ˆ??
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
                ?™ì•„ë¦?ì§€??
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
                ?œë¥˜ ê´€ë¦?
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
                ?°í•©/êµë¥˜??
              </button>
            </div>

            {/* CLUB ROLE: STUDENT */}
            {clubRole === 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>ëª¨ì§‘ ì¤‘ì¸ ?™ì•„ë¦?({clubAnnouncements.length})</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>??Kkeul ?„ë¡œ?„ë¡œ ì¦‰ì‹œ ?‘ìˆ˜ ê°€??/span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clubAnnouncements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #E5E8EB', borderRadius: '16px' }}>
                      ?„ì¬ ?™êµ??ëª¨ì§‘ ì¤‘ì¸ ?™ì•„ë¦?ê³µê³ ê°€ ?†ìŠµ?ˆë‹¤.<br />
                      ë§ˆì´?˜ì´ì§€?ì„œ ?Œì† ?™êµ ?•ë³´ë¥?ë³€ê²½í•´ë³´ì„¸??
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
                              ë§ˆê°: {getDDay(club.deadline)}
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
                            {hasApplied ? 'Kkeul ?„ë¡œ?„ë¡œ ì§€???„ë£Œ' : 'Kkeul ?„ë¡œ?„ë¡œ 1ì´?ì§€?í•˜ê¸?}
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
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>ëª¨ì§‘ ê³µê³  ê´€ë¦?/h3>
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
                    <Plus size={12} /> ??ê³µê³  ?‘ì„±
                  </button>
                </div>

                {/* Club Selector Dropdown */}
                {clubAnnouncements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)' }}>ê¸°ì¥ ê¶Œí•œ ?™ì•„ë¦?ê³µê³  ? íƒ</label>
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
                      ?“© ?‘ìˆ˜??ì§€???œë¥˜ ë¦¬ìŠ¤??({clubApplicants.length}ê±?
                    </h4>

                    {/* Applicants card list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {clubApplicants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          ?„ì§ ?‘ìˆ˜??ì§€?ì„œê°€ ?†ìŠµ?ˆë‹¤.
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
                                {app.status === 'approved' ? '?œë¥˜?©ê²©' : app.status === 'rejected' ? 'ë¶ˆí•©ê²? : '?¬ì‚¬ì¤?}
                              </span>
                            </div>

                            {/* Contact */}
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-tertiary)' }}>?°ë½ì²?</strong> {app.user_contact}
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
                                  ê±°ì ˆ
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
                                  ???œë¥˜ ?©ê²© ?¹ì¸
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
                    ?±ë¡??ê¸°ì¥ ê¶Œí•œ ?™ì•„ë¦?ëª¨ì§‘ ê³µê³ ê°€ ?†ìŠµ?ˆë‹¤. ?™êµ ?•ë³´ë¥??•ì¸??ì£¼ì„¸??
                  </div>
                )}
              </div>
            )}

            {/* CLUB ROLE: NETWORKING */}
            {clubRole === 'networking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>?€ ?™êµ ?™ì•„ë¦?êµë¥˜ ?œì•ˆ</h3>
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
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>ì§„í–‰ ?¼ì •</span>
                          <span>{event.event_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-block', width: '60px', fontWeight: 700 }}>ëª¨ì§‘ ?€??/span>
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
                        ?¤í”ˆì±„íŒ…?¼ë¡œ ë¬¸ì˜?˜ê¸°
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
                  onClick={() => alert('êµë¥˜???œì•ˆê¸€ ?‘ì„± ê¸°ëŠ¥?€ ì¤€ë¹?ì¤‘ì…?ˆë‹¤.')}
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
            '?„êµ­', '?œìš¸', 'ê²½ê¸°', '?¸ì²œ', 'ë¶€??, '?€êµ?, 
            '?€??, 'ê´‘ì£¼', '?¸ì‚°', '?¸ì¢…', 'ê°•ì›', 'ì¶©ë¶', 
            'ì¶©ë‚¨', '?„ë¶', '?„ë‚¨', 'ê²½ë¶', 'ê²½ë‚¨', '?œì£¼'
          ];

          const grades = [
            'ì¤‘í•™êµ?1?™ë…„', 'ì¤‘í•™êµ?2?™ë…„', 'ì¤‘í•™êµ?3?™ë…„',
            'ê³ ë“±?™êµ 1?™ë…„', 'ê³ ë“±?™êµ 2?™ë…„', 'ê³ ë“±?™êµ 3?™ë…„'
          ];

          const interestOptions = [
            'IT/ê°œë°œ', 'ì°½ì—…', '?˜í•™/ê³¼í•™', '?ˆìˆ /ë¬¸í™”', 
            '?¸ë¬¸??, 'ì²´ìœ¡', 'ë´‰ì‚¬?œë™', '?¸êµ­???´í•™'
          ];

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>???•ë³´ ë°??¤í™</h1>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>??Ÿ‰ ì§„ë‹¨ ë¶„ì„ê³??¬íŠ¸?´ë¦¬?¤ë? ê´€ë¦¬í•©?ˆë‹¤.</p>
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
                    {tab === 'portfolio' ? '???¬íŠ¸?´ë¦¬?? : tab === 'edit' ? '?“ ?¤í™ ?¸ì§‘' : '?™ï¸ ?¤ì •'}
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
                                const newBio = await showPrompt("?˜ë§Œ??ë©‹ì§„ ??ì¤??Œê°œë¥??…ë ¥?´ì£¼?¸ìš”:", profile.bio || '?¸ìƒ??ë°”ê? ê¸°íš??ì§€ë§ìƒ');
                                if (newBio !== null && newBio.trim() !== '') {
                                  onUpdateProfile({ ...profile, bio: newBio });
                                }
                              }}
                              title="?´ë¦­?˜ì—¬ ??ì¤??Œê°œ ?˜ì •?˜ê¸°"
                            >
                              {profile.bio || '?¸ìƒ??ë°”ê? ê¸°íš??ì§€ë§ìƒ'} <span style={{ fontSize: '12px', opacity: 0.5 }}>?ï¸</span>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '46px' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Kkeul ID</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>#{profile.id.split('-')[0]}</div>
                          </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 2, marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '100%', maxHeight: '60px', overflowY: 'auto', paddingRight: '4px' }}>
                            {(profile.interests || ['IT/ê¸°íš', '?¤í??¸ì—…']).map(int => (
                              <span key={int} style={{ fontSize: '10px', fontWeight: 600, color: '#3182F6', backgroundColor: '#FFFFFF', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                {int}
                              </span>
                            ))}
                            {profile.play_style?.team_size && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ?‘¥ {profile.play_style.team_size.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.duration && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ??{profile.play_style.duration.split('(')[0]}
                              </span>
                            )}
                            {profile.play_style?.type && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '3px 8px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                ?“ {profile.play_style.type.split(' ')[1] || profile.play_style.type}
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
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 16px 0' }}>??ëª…í•¨???¤ìº”?´ì£¼?¸ìš”!</h3>
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
                            await showAlert(`?°ë½ì²?${result.contacts.length}ê°œë? ?±ê³µ?ìœ¼ë¡?ë¶ˆëŸ¬?”ìŠµ?ˆë‹¤! Kkeul ì¹œêµ¬ ë§¤ì¹­???œì‘?©ë‹ˆ??`);
                          } else {
                            await showAlert('?°ë½ì²??‘ê·¼ ê¶Œí•œ???„ìš”?©ë‹ˆ??');
                          }
                        } catch (e: any) {
                          await showAlert('?°ë½ì²˜ë? ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤: ' + e.message);
                        }
                      } else {
                        await showAlert('[???˜ê²½] ?ˆë“œë¡œì´???±ì—?œë§Œ ?°ë½ì²??°ë™??ì§€?ë©?ˆë‹¤. ëª¨ë°”??ê¸°ê¸°?ì„œ ?œë„??ì£¼ì„¸??');
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
                    <Phone size={18} color="#3182F6" /> ?°ë½ì²˜ë¡œ Kkeul ì¹œêµ¬ ì°¾ê¸°
                  </button>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E8EB', margin: '8px 0' }}></div>

                  {/* CAREER ROADMAP TIMELINE */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px 0', color: '#191F28', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Milestone size={20} color="#3182F6" /> ì§„ë¡œ ?±ì¥ ë¡œë“œë§?
                    </h3>
                    
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                      {/* Timeline Line */}
                      <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#E5E8EB', borderRadius: '1px' }}></div>

                      {/* STEP 1: AI ??Ÿ‰ ì§„ë‹¨ */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #3182F6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3182F6', backgroundColor: '#E8F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 1</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>AI ??Ÿ‰ ì§„ë‹¨ ?„ë£Œ</h4>
                          </div>
                          

                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              <Activity size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                              ë¶„ì„ ê²°ê³¼: <strong>ê¸°íš??/strong>ê³?<strong>ë¦¬ë”??/strong>???‹ë³´?…ë‹ˆ?? ?„ë¡œ?íŠ¸ ë§¤ë‹ˆì§•ì´???´ì»¤??ë¦¬ë” ??• ???í•©????Ÿ‰??ê°–ì¶”ê³??ˆìŠµ?ˆë‹¤.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STEP 2: ?ë“??ë°°ì? (?…ì  ë£? */}
                      <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #10B981', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>STEP 2</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>?¸ì¦ ë°°ì? ì»¬ë ‰??/h4>
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
                                    <div style={{ fontSize: '9px', color: '#64748B' }}>{isUnlocked ? '?ë“ ?„ë£Œ' : '? ê?'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* STEP 3: ?˜ìƒ ë°??œë™ ?¤ì  */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '3px solid #8B5CF6', zIndex: 2 }}></div>
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E8EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', backgroundColor: '#F5F3FF', padding: '2px 6px', borderRadius: '4px' }}>STEP 3</span>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#191F28' }}>?˜ìƒ ?¤ì  & ?¬íŠ¸?´ë¦¬??/h4>
                            </div>
                            <button 
                              onClick={async () => {
                                const type = await showPrompt("?±ë¡??? í˜•???«ìë¡?? íƒ?´ì£¼?¸ìš”:\n1. ?˜ìƒ/?œë™ ?¤ì \n2. ?¬íŠ¸?´ë¦¬??ë§í¬");
                                if (type === '1') {
                                  const title = await showPrompt("?¤ì ëª?(?? NYPC ?¥ë ¤??:");
                                  if (!title) return;
                                  const date = await showPrompt("? ì§œ (?? 2026.08):") || "2026";
                                  const updated = { ...profile, awards: [...(profile.awards || []), { title, date }] };
                                  onUpdateProfile(updated);
                                  await showAlert("?¤ì ???±ë¡?˜ì—ˆ?µë‹ˆ??");
                                } else if (type === '2') {
                                  const url = await showPrompt("?¬íŠ¸?´ë¦¬??ë§í¬ ì£¼ì†Œ (?? https://github.com/my):");
                                  if (!url) return;
                                  const updated = { ...profile, portfolio_urls: [...(profile.portfolio_urls || []), url] };
                                  onUpdateProfile(updated);
                                  await showAlert("?¬íŠ¸?´ë¦¬??ë§í¬ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??");
                                }
                              }}
                              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Plus size={14} /> ?±ë¡?˜ê¸°
                            </button>
                          </div>

                          {/* ?˜ìƒ ?¤ì  ë¦¬ìŠ¤??*/}
                          {profile.awards && profile.awards.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>?† ?œë™ ë°??˜ìƒ ?´ì—­</div>
                              {profile.awards.map((award, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{award.title}</span>
                                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{award.date}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {/* ?¬í´ ë§í¬ ë¦¬ìŠ¤??*/}
                          {profile.portfolio_urls && profile.portfolio_urls.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>?”— ì²¨ë? ë§í¬</div>
                              {profile.portfolio_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', textDecoration: 'none', color: '#3182F6', fontSize: '13px', fontWeight: 600 }}>
                                  <Share2 size={14} /> {url}
                                </a>
                              ))}
                            </div>
                          ) : null}

                          {(!profile.awards || profile.awards.length === 0) && (!profile.portfolio_urls || profile.portfolio_urls.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '13px' }}>
                              ?„ì§ ?±ë¡???¤ì ?´ë‚˜ ë§í¬ê°€ ?†ìŠµ?ˆë‹¤.<br/>?°ì¸¡ ?ë‹¨???±ë¡ ë²„íŠ¼???ŒëŸ¬ ì¶”ê??´ë³´?¸ìš”.
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
                            title: '??ì§„ë¡œ ë¡œë“œë§?ê³µìœ ',
                            text: `[Kkeul] ${profile.name}?˜ì˜ ?¸í„°?™í‹°ë¸?ì§„ë¡œ ë¡œë“œë§µê³¼ ?¤í™???•ì¸?´ë³´?¸ìš”! #Kkeul #ì§„ë¡œë¡œë“œë§?,
                            url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            dialogTitle: 'ë¡œë“œë§?ê³µìœ ?˜ê¸°'
                          });
                        } catch (e: any) {
                          const errMsg = typeof e === 'string' ? e : (e.message || '');
                          if (!errMsg.toLowerCase().includes('cancel') && e.name !== 'AbortError') {
                            await showAlert('ê³µìœ  ?¤íŒ¨: ' + errMsg);
                          }
                        }
                      } else {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: '??ì§„ë¡œ ë¡œë“œë§?ê³µìœ ',
                              text: `[Kkeul] ${profile.name}?˜ì˜ ?¸í„°?™í‹°ë¸?ì§„ë¡œ ë¡œë“œë§µê³¼ ?¤í™???•ì¸?´ë³´?¸ìš”! #Kkeul #ì§„ë¡œë¡œë“œë§?,
                              url: window.location.origin + '/p/' + profile.id.split('-')[0],
                            });
                          } else {
                            await showAlert('[???˜ê²½] ?´ë¦½ë³´ë“œ??ë§í¬ê°€ ë³µì‚¬?˜ì—ˆ?µë‹ˆ??');
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
                    <Share2 size={18} color="#FFFFFF" /> ???¬íŠ¸?´ë¦¬??ê³µìœ ?˜ê¸°
                  </button>

                </div>
              )}

              {/* SUBTAB 2: EDIT */}
              {profileSubTab === 'edit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                  
                  {/* Basic Info fields */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>ê¸°ë³¸ ?¸ì  ?¬í•­</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?´ë¦„</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?™êµëª?/label>
                      <input
                        type="text"
                        value={editSchool}
                        onChange={(e) => setEditSchool(e.target.value)}
                        placeholder="?? ?œìš¸ê³ ë“±?™êµ"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?™ë…„</label>
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
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>ì§€??/label>
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
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?°ë½ì²?/label>
                      <input
                        type="text"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="010-0000-0000"
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>ëª©í‘œ ?„ê³µ (AI ?¸íŠ¹ ë¶„ì„???œìš©)</label>
                      <input
                        type="text"
                        value={editMajor}
                        onChange={(e) => setEditMajor(e.target.value)}
                        placeholder="?? ì»´í“¨?°ê³µ?™ê³¼, ê²½ì˜?™ê³¼, ?”ì?¸ê³¼, ê¸°ê³„ê³µí•™ê³?
                        style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Interest options */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>ê´€??ë¶„ì•¼</h3>
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
                  ?¬íŠ¸?´ë¦¬???€?¥í•˜ê¸??’¾
                </button>
              </div>
            )}

            {/* SUBTAB 3: SETTINGS */}
            {profileSubTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                
                {/* School Profile Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, marginBottom: '14px' }}>?™ì  ?¬í•­</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?™êµ</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.school || 'ë¯¸ì…??}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?™ë…„</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.grade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?´ë¦„</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?´ë©”??/span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                    </div>
                  </div>
                </div>

                {/* Badges card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} style={{ color: 'var(--color-indigo)' }} /> ?ë“???…ì  ë°°ì?
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['?•ë³´ ê³µìœ ??, 'ìº˜ë¦°??ë§ˆìŠ¤??, '?¸ì‹¸???„ìƒ', '??ë§ˆìŠ¤??].map((badge) => {
                      const isUnlocked = profile.badges && profile.badges.includes(badge);
                      return (
                        <div
                          key={badge}
                          onClick={async () => {
                            if (isUnlocked) {
                              setSelectedBadgeToShare(badge);
                            } else {
                              const criteria = BADGE_DETAILS[badge]?.criteria || '';
                              await showAlert(`?”’ [${badge}] ?ë“ ë°©ë²•:\n${criteria}`);
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
                          {badge} ({isUnlocked ? '?ë“ ?„ë£Œ ?ˆï¸' : '? ê? ?”’'})
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
                      ì¹œêµ¬ ì´ˆë??˜ê³  ?¹ë³„ ?œíƒ ?¸ë½?˜ê¸°
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    ê³µìœ ??ë§í¬ë¥??€ê³?ì¹œêµ¬ê°€ ê°€?…í•˜ë©?<strong>?¸ì‹¸???„ìƒ ë±ƒì?</strong>, <strong>?œì •???¤ì˜¨ ?‘í¬ ?¤ì??´í”„ ?Œë§ˆ</strong>, ê·¸ë¦¬ê³?<strong>?€ê¸°ì—… ?¹ë³„ ë©˜í† ë§?ë¹„ê³µê°?ê³µê³ </strong> ?´ëŒ ê¶Œí•œ??ì¦‰ì‹œ ?ë“?©ë‹ˆ??
                  </p>
                  
                  <form onSubmit={handleApplyReferral} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="ì´ˆë? ì½”ë“œ ?ëŠ” ë§í¬ ?…ë ¥"
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
                      ?ìš©
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
                    ë¡œê·¸?„ì›ƒ
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('?•ë§ë¡??ˆí‡´?˜ì‹œê² ìŠµ?ˆê¹Œ? ëª¨ë“  ì°??°ì´?°ì? ê²½í—˜ì¹˜ê? ?? œ?˜ë©° ?˜ëŒë¦????†ìŠµ?ˆë‹¤.')) {
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
                    ?Œì› ?ˆí‡´
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
              ?Œê³¼ ?¨ê»˜?˜ëŠ”<br />?‘ë ¥ ?ŒíŠ¸??
            </h2>
            <p style={{ fontSize: '15px', color: '#8B95A1', margin: 0, lineHeight: 1.5, letterSpacing: '-0.3px' }}>
              ì²?†Œ???±ì¥???„í•´ ?Œê³¼ ?‘ë ¥?˜ëŠ”<br />ê¸°ê?Â·?¸í”Œë£¨ì–¸?œÂ·ê¸°?…Â·í•™êµë? ?Œê°œ?©ë‹ˆ??
            </p>
          </div>

          {/* ê°œë°œ ê¸°ê? WJedulab */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>ê°œë°œ ê¸°ê?</span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '22px' }}>?«</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>WJedulab</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '4px 8px' }}>Kkeul ê°œë°œ ê¸°ê?</span>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#4E5968', margin: '0 0 16px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>??Kkeul)??ê¸°íšÂ·ê°œë°œ??ì²?†Œ??ì£¼ë„ êµìœ¡ ê¸°ìˆ  ?°êµ¬?Œì…?ˆë‹¤. ì²?†Œ?„ì´ ???˜ì? ê¸°íšŒë¥?ë°œê²¬?˜ê³  ?±ì¥?????ˆëŠ” ?Œë«?¼ì„ ë§Œë“¤??ê°‘ë‹ˆ??</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="https://wjedulab.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>?Œ</span>
                  wjedulab.vercel.app
                </a>
                <a href="https://namu.wiki/w/WJedulab" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#505967', fontSize: '14px', fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>?“–</span>
                  ?˜ë¬´?„í‚¤ Â· WJedulab
                </a>
              </div>
            </div>
          </div>

          {/* ?‘ë ¥ ?…ì²´ Â· ê¸°ê? Â· ?™êµ */}
          <div>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#333D4B', letterSpacing: '-0.3px' }}>?‘ë ¥ ?…ì²´ Â· ê¸°ê? Â· ?™êµ</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ê°•ë‚¨?”ë²¨ë¡œí¼??*/}
              <a href="https://www.gangnamdev.com/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}>
                  <img src={partnerGNDevs} alt="ê°•ë‚¨?”ë²¨ë¡œí¼?? style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>ê°•ë‚¨?”ë²¨ë¡œí¼??/span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>ê¸€ë¡œë²Œ HR ?„ë¬¸ê¸°ì—… ë°?ë§ì¶¤??IT ?”ë£¨??êµ¬ì¶• ?ŒíŠ¸??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?”ë£¨??, 'ITì»¨ì„¤??, 'HR'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
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
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?¥ê¸° ê´€???œíœ´ ?ŒíŠ¸??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?¥ê¸°', '?¼ì´??, '?œíœ´'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
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
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', background: 'rgba(249,115,22,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥ ?œë¹„??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?¥ê¸° ê´€???ŒíŠ¸??ë¸Œëœ??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?¥ê¸°', '?œë¹„??, 'ë¸Œëœ??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* ê°•ë??œë‹˜ */}
              <a href="https://www.instagram.com/kangceo_official/" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '1px solid #F0F0F5', background: '#FFFFFF' }}>
                    <img src={partnerKangceo} alt="ê°•ë??œë‹˜" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.3)' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: '22px', height: '22px', borderRadius: '50%', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF', zIndex: 1 }}><Check size={12} strokeWidth={3} color="#FFFFFF" /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>ê°•ë??œë‹˜</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?¸í”Œë£¨ì–¸??/span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?„ìëª…í•¨ ?¬ì—… ?¸í”Œë£¨ì–¸??/p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['?„ìëª…í•¨','?¬ì—…','?¸í”Œë£¨ì–¸??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </a>

              {/* BSBRBO */}
              <a href="https://open.kakao.com/o/gBXNKfEh" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid #F0F0F5' }}>
                  <img src={partnerBsbrbo} alt="BSBRBO" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>Team BSBRBO</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3182F6', background: 'rgba(49,130,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥??/span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', lineHeight: 1.4, letterSpacing: '-0.3px' }}>ì²?†Œ??ì°½ì‘ê¸°ë°˜ ?”í„°?Œì¸ë¨¼íŠ¸???„ë¡œ?íŠ¸ ?€</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {['êµìœ¡','ì½˜í…ì¸?,'e?¤í¬ì¸?,'?Œì•…','?ë‹´'].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}
                  </div>
                </div>
              </a>

              {/* ?™ìƒ ?¥ë ¥?ë“¤??ë°?*/}
              <a href="https://open.kakao.com/o/gzJLwdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#191F28' }}>
                  <Users size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>?™ìƒ ?¥ë ¥?ë“¤??ë°?/span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>ì»¤ë??ˆí‹°</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?¤íŠ¸?Œí‚¹ ë°??Œí†µ ê³µê°„</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['?Œí†µ', '?¤íŠ¸?Œí‚¹'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* ë¸Œë¡¤ ì»¤ë??ˆí‹° ë°?*/}
              <a href="https://open.kakao.com/o/pKJ0jdxi" target="_blank" rel="noopener noreferrer" className="spring-active" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#FFFFFF', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#F2F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={partnerBrawl} alt="ë¸Œë¡¤ ì»¤ë??ˆí‹° ë°? style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>ë¸Œë¡¤ ì»¤ë??ˆí‹° ë°?/span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥ ì»¤ë??ˆí‹°</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>ê²Œì„ ê¸°ë°˜ ì²?†Œ???Œí†µ ë°??€??ê¸°íš ?ŒíŠ¸??/p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['ê²Œì„', '?€??, 'ì¹œëª©'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>

              {/* SWITCHBACK */}
              <div className="spring-active" style={{ background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #F0F0F5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '1px solid #F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#FFFFFF' }}><img src={partnerSwitchback} alt="SWITCHBACK" style={{ width: '90%', height: '90%', objectFit: 'contain' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' }}>SWITCHBACK</span><span style={{ fontSize: '11px', fontWeight: 600, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 6px' }}>?‘ë ¥??/span></div><p style={{ fontSize: '13px', color: '#8B95A1', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>?¨ì…˜?˜ë¥˜ ë¸Œëœ???ŒíŠ¸??/p><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{['?¨ì…˜','?˜ë¥˜','ë¸Œëœ??].map(t => (<span key={t} style={{ fontSize: '11px', fontWeight: 500, color: '#4E5968', background: '#F2F4F6', borderRadius: '6px', padding: '3px 8px' }}>{t}</span>))}</div></div>
              </div>



            </div>
          </div>

          {/* ?ŒíŠ¸?ˆì‹­ CTA (? ìŠ¤ ?¤í??? */}
          <div style={{ background: '#F5F5FC', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Sparkles size={28} color="#5544FF" strokeWidth={2.5} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#191F28', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>?Œê³¼ ?¨ê»˜ ?±ì¥?˜ê³  ?¶ìœ¼? ê???</h4>
            <p style={{ fontSize: '14px', color: '#8B95A1', margin: '0 0 20px 0', lineHeight: 1.5, letterSpacing: '-0.3px' }}>?™êµÂ·ê¸°ê?Â·ê¸°ì—… ?‘ë ¥ ë¬¸ì˜???„ë˜ë¡??°ë½??ì£¼ì„¸??</p>
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
        
        {/* TAB 1: MY ANNOUNCEMENTS (??ê³µê³ ) */}
        {activeTab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>
                {profile.name} ?¸ìŠ¤??ê´€ë¦¬ì???‘‹
              </p>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
                ?„ì¬ ì§„í–‰ ì¤‘ì¸ ê³µê³ ê°€<br />
                <span style={{ color: 'var(--color-indigo)' }}>{hostAnnouncements.length}ê±?/span> ?ˆì–´???“¢
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
                          ?€?? {ann.location}
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
                  ?“¢
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    ?„ì§ ?±ë¡??ê¸°íšŒê°€ ?†ì–´??
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    ?•ë? ?¤ì •???€ê²??™ìƒ?¤ì˜ ?´ë??„í™”ë¡?br />
                    ?¤ì‹œê°??¸ì‹œ ?Œë¦¼??ì¦‰ì‹œ ë°œì†¡??ë³´ì„¸??
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
                  ì²?ê³µê³  ?±ë¡?˜ê¸° ??
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTER (ê³µê³  ?±ë¡) */}
        {activeTab === 'register' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>? ê·œ ê³µê³  ?±ë¡</h1>
              <p>?œì„œ?€ë¡?ê¸°ì…??ì£¼ì‹œë©??Œë¦¼ ë©”ì‹œì§€ë¥??‘ì„±???œë¦½?ˆë‹¤.</p>
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ì£¼ìµœ ê¸°ê?ëª?/ ?™ì•„ë¦¬ëª…</label>
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
                    placeholder="?? WJedulab ì£¼ìµœ ê¸°íš?€"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!regHost) {
                      await showAlert('ê¸°ê?ëª…ì„ ì±„ì›Œì£¼ì„¸??');
                      return;
                    }
                    setRegStep(2);
                  }}
                  style={{ padding: '14px', fontSize: '14px', fontWeight: 600, borderRadius: '12px' }}
                >
                  ?¤ìŒ ?¨ê³„ë¡?
                </button>
              </div>
            )}

            {/* Step 2: Details */}
            {regStep === 2 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ê³µê³  ?œëª©</label>
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
                    placeholder="?? ?????„êµ­ ì²?†Œ??ì°½ì—… ?„ì´?”ì–´ ê²½ì§„?€??
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ê³µê³  ?ì„¸ ?´ìš©</label>
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
                    placeholder="ê³µê³ ???€???Œê°œ, ì°¸ê? ?ê²© ?±ì„ ?ì–´ì£¼ì„¸??"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ê³µê³  ì¹´í…Œê³ ë¦¬ (ìµœë? 2ê°?? íƒ)</label>
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
                    {['IT/ê°œë°œ', 'ì°½ì—…', '?˜í•™/ê³¼í•™', '?ˆìˆ /ë¬¸í™”', '?¸ë¬¸??, 'ì²´ìœ¡', 'ë´‰ì‚¬?œë™', '?¸êµ­???´í•™'].map((cat) => {
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ê³µì‹ ?‘ìˆ˜ ë§í¬ (URL)</label>
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
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>?‘ìˆ˜ ë§ˆê°??/label>
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
                    ?´ì „
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!regTitle || !regDetails || !regApplyUrl) {
                        await showAlert('ëª¨ë“  ?…ë ¥ ì¹¸ì„ ë¹ ì§?†ì´ ì±„ì›Œì£¼ì„¸??');
                        return;
                      }
                      setRegStep(3);
                    }}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    ?¤ìŒ ?¨ê³„ë¡?
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Target Setting */}
            {regStep === 3 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ë°œì†¡ ?€ê²?ì§€???¤ì •</label>
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
                    <option value="?„êµ­">?„êµ­ ?„ì²´</option>
                    <option value="?œìš¸">?œìš¸?¹ë³„??/option>
                    <option value="ê²½ê¸°">ê²½ê¸°??/option>
                    <option value="?¸ì²œ">?¸ì²œê´‘ì—­??/option>
                    <option value="ë¶€??>ë¶€?°ê´‘??‹œ</option>
                    <option value="?€êµ?>?€êµ¬ê´‘??‹œ</option>
                    <option value="?€??>?€?„ê´‘??‹œ</option>
                    <option value="ê´‘ì£¼">ê´‘ì£¼ê´‘ì—­??/option>
                    <option value="?¸ì‚°">?¸ì‚°ê´‘ì—­??/option>
                    <option value="?¸ì¢…">?¸ì¢…?¹ë³„?ì¹˜??/option>
                    <option value="ê°•ì›">ê°•ì›?¹ë³„?ì¹˜??/option>
                    <option value="ì¶©ë¶">ì¶©ì²­ë¶ë„</option>
                    <option value="ì¶©ë‚¨">ì¶©ì²­?¨ë„</option>
                    <option value="?„ë¶">?„ë¼ë¶ë„</option>
                    <option value="?„ë‚¨">?„ë¼?¨ë„</option>
                    <option value="ê²½ë¶">ê²½ìƒë¶ë„</option>
                    <option value="ê²½ë‚¨">ê²½ìƒ?¨ë„</option>
                    <option value="?œì£¼">?œì£¼?¹ë³„?ì¹˜??/option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ë°œì†¡ ?€ê²??™ë…„ ?¤ì •</label>
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
                    <option value="ê³ ë“±?™êµ ?„ì²´">ê³ ë“±?™êµ ?„ì²´</option>
                    <option value="ê³ ë“±?™êµ 2?™ë…„">ê³ ë“±?™êµ 2?™ë…„</option>
                    <option value="ê³ ë“±?™êµ 1?™ë…„">ê³ ë“±?™êµ 1?™ë…„</option>
                    <option value="ì¤‘í•™êµ??„ì²´">ì¤‘í•™êµ??„ì²´</option>
                  </select>
                </div>

                {/* ?¤ì‹œê°??€ê²ŸíŒ… ?œë??ˆì´??ì¹´ë“œ UI */}
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
                    <span>?¯</span> ?¤ì‹œê°??€ê²ŸíŒ… ?œë??ˆì´??
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-indigo)', letterSpacing: '-0.5px' }}>
                    {simulatedStudentsCount.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>ëª?/span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    ?¤ì •?˜ì‹  ì¡°ê±´(<strong>{regRegion} {regGrade}</strong>)ê³??¼ì¹˜?˜ë©°, <strong>{regCategory}</strong> ê´€?¬ì‚¬ë¥?? íƒ???™ìƒ ?˜ì…?ˆë‹¤. ì§€ê¸?ê³µê³ ë¥??¬ë¦¬?œë©´ ???™ìƒ?¤ì˜ ?´ë??„í™”ë¡?ì¦‰ì‹œ ?€ê²ŸíŒ… ?Œë¦¼???˜ì•„ì§‘ë‹ˆ?? ??
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-gray"
                    onClick={() => setRegStep(2)}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    ?´ì „
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setRegStep(4)}
                    style={{ flex: 2, padding: '14px' }}
                  >
                    ?€ê²??¤ì • ?„ë£Œ
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
                  ???¤ì •?˜ì‹  ?€ê²?{regRegion} {regGrade}) ?™ìƒ?¤ì—ê²??¤ì‹œê°??¸ì‹œ ?Œë¦¼??ë³´ë‚¼ ì¤€ë¹„ê? ?ë‚¬?´ìš”.
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
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>? íƒ?¬í•­: ê³µê³  ?¸ì¶œ ë°©ì‹ ? íƒ</span>
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
                      ê¸°ë³¸ ë¬´ë£Œ ?±ë¡ ?Œ±
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
                      ?? ?„ë¦¬ë¯¸ì—„ ìµœìƒ??ê³ ì • (ì¶”ì²œ)
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
                          <span style={{ fontSize: '18px' }}>?’</span> VVIP ìµœìƒ???¸ì¶œ ?¨í‚¤ì§€
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>?í’ˆID: ê³µê³  ?ìœ„?¸ì¶œ ?˜ê¸° (nochul)</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                          2,000<span style={{ fontSize: '15px', fontWeight: 700, marginLeft: '2px' }}>??/span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#FF4747', fontWeight: 700, background: 'rgba(255,71,71,0.1)', padding: '2px 6px', borderRadius: '4px' }}>??1??ê²°ì œë¡???</span>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E5E8EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>1</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>ì¡°íšŒ???‰ê·  <span style={{ color: '#FF4747' }}>10ë°?/span> ?ìŠ¹ ?¨ê³¼!</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>2</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>ì§€?ì ëª¨ì§‘???„ë£Œ???Œê¹Œì§€ <span style={{ color: 'var(--color-indigo)' }}>ìµœìƒ??ê³ ì •</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(49,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182F6', fontWeight: 800, fontSize: '12px' }}>3</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>?„êµ­ ì²?†Œ???€???€ê²??¸ì‹œ ?Œë¦¼ ?°ì„  ë°œì†¡</span>
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
                      ?¦ ë¬´í†µ???…ê¸ˆ ?ˆë‚´ ê³„ì¢Œ
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                      NH?í˜‘ 3516-3767-60453 <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}>(?ˆê¸ˆì£? ?¼ìš°ì§?</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#6B4F00' }}>
                      ?’¡ ?…ê¸ˆ?ëª…ê³??Œì›ê°€?????ìœ¼??ê¸°ê?ëª??´ë‹¹?ëª…(<strong>{profile.name}</strong>)???™ì¼?˜ê²Œ ?…ê¸ˆ??ì£¼ì„¸?? ?…ê¸ˆ ?•ì¸ ?„ë£Œ ??10ë¶??´ë‚´???Œì˜¬ ?Œê³ ë¦¬ì¦˜???ìš©?©ë‹ˆ??
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
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 600 }}>ì²?†Œ??ë§¤ì¹­ ?Œë«??/span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-indigo)' }}>KKEUL ?ìˆ˜ì¦?/span>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>ê³µê³ ëª?/div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{regTitle}</div>
                  </div>

                  <div style={{ borderBottom: '1px dashed #E5E8EB', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ë§¤ì¹­ ?€ê²?/span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regRegion} / {regGrade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ê´€??ë¶„ì•¼ ë§¤ì¹­</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{regCategory}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ì´??±ë¡/?…ì°° ë¹„ìš©</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>
                      {isBidding ? `${regBidAmount.toLocaleString()} ?? : '0 ??(ë¬´ë£Œ)'}
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
                    ?´ì „
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
                    {isBidding ? `${regBidAmount.toLocaleString()}???…ì°° ? ì²­ ë°??Œë¦¼ ?±ë¡ ??` : 'ë¬´ë£Œë¡?ê³µê³  ?±ë¡?˜ê³  ?Œë¦¼ ?˜ê¸° ??'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STATS (?µê³„) */}
        {activeTab === 'stats' && (() => {
          if (hostAnnouncements.length === 0) {
            return (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px' }}>?“Š</div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>ë¶„ì„??ë°œì†¡ ?±ê³¼ê°€ ?†ìŠµ?ˆë‹¤</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  ?„ì¬ ?±ë¡?˜ì‹  ê³µê³ ê°€ ?†ê±°??ë°œì†¡ ?´ë ¥???†ìŠµ?ˆë‹¤.<br />
                  ë¨¼ì? ? ê·œ ê³µê³ ë¥??±ë¡?˜ê³  ?¤ì‹œê°??Œë¦¼??ë³´ë‚´ë³´ì„¸??
                </p>
                <button
                  onClick={() => {
                    setRegStep(1);
                    setActiveTab('register');
                  }}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, width: 'auto', alignSelf: 'center' }}
                >
                  ì²?ê³µê³  ?±ë¡?˜ëŸ¬ ê°€ê¸???
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
            const regMatch = currentAnn.location === '?„êµ­' || p.location === '?„êµ­' || p.location === currentAnn.location;
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
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>ë°œì†¡ ?±ê³¼ ?µê³„ ?“Š</h1>
                <p>ë°œì†¡???€ê²??¸ì‹œ ?Œë¦¼???„ë‹¬ ë°??´ë¦­ë¥?ë¦¬í¬?¸ì…?ˆë‹¤.</p>
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
                <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>ì¡°íšŒ??ë°œì†¡ ê³µê³  ? íƒ</label>
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
                  <span>?…ì°°ê°€: {currentBid > 0 ? `${currentBid.toLocaleString()}?? : 'ë¬´ë£Œ'}</span>
                  <span>??/span>
                  <span>ì¹´í…Œê³ ë¦¬: {currentAnn.category}</span>
                </div>
              </div>

              {/* Metrics cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?„ë‹¬ ?™ìƒ ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{reachCount.toLocaleString()} ëª?/div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?¸ì‹œ ?Œë¦¼ ?´ëŒë¥?/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>{openRate} %</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>?ì„¸ ?˜ì´ì§€ ?´ë¦­ ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{clickCount.toLocaleString()} ??/div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E5E8EB' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>ê´€???±ë¡(ì°? ??/div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{bookmarkCount.toLocaleString()} ??/div>
                </div>
              </div>

              {/* CSS graph */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>ì£¼ê°„ ?ì„¸ ?˜ì´ì§€ ë°©ë¬¸ ì¶”ì´</h3>
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
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ëª?/span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: `${Math.max(10, Math.floor(clickCount * 0.30))}px`, backgroundColor: 'var(--color-indigo-light)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ê¸?/span>
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
              <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>ê¸°ê? ê´€ë¦¬ì ?•ë³´</h1>
              <p>?Œì† ê¸°ê? ?¤ì • ë°?ê°€???ì„¸ ?•ë³´ë¥??•ì¸?©ë‹ˆ??</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E8EB' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>ê¸°ê?/?™ì•„ë¦¬ëª…</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?´ë‹¹???´ë©”??/span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.email}</span>
                </div>
                {profile.contact && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F4F6', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>?°ë½ì²?/span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.contact}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>ê¶Œí•œ êµ¬ë¶„</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-indigo)' }}>ì£¼ìµœ??(B2B Host)</span>
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
                ë¡œê·¸?„ì›ƒ
              </button>
              <button
                onClick={() => {
                  if (confirm('?•ë§ë¡??ˆí‡´?˜ì‹œê² ìŠµ?ˆê¹Œ? ?±ë¡?˜ì‹  ëª¨ë“  ?€?¸í™œ???•ë³´ê°€ ?? œ?˜ë©° ë³µêµ¬?????†ìŠµ?ˆë‹¤.')) {
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
                ?Œì› ?ˆí‡´
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
          WJedulab (?”ë¸”? ì œ?´ì—?€??
        </div>
        <div>
          ?€?œì: ?¼ìš°ì§?| ?´ë©”?? <a href="mailto:woojin052501@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>woojin052501@gmail.com</a>
        </div>
        <div>
          ?¬ì—…?ë“±ë¡ë²ˆ?? 243-09-03290
        </div>
        <div style={{ marginTop: '4px' }}>
          ê¸°íšŒê°€ ?Œì•„???Œë ¤?¤ëŠ” ê³? ??(Kkeul) Â© 2026 WJedulab. All rights reserved.
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
              ìº˜ë¦°??
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
              ë³´ê???
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
              ?™ì•„ë¦?
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
              ???•ë³´
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
              ?ŒíŠ¸??
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
              ??ê³µê³ 
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
              ?±ë¡ ??
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
              ?µê³„
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
              ë§ˆì´?˜ì´ì§€
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
            ê²°ì œê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ??
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
            ?¤ì •?˜ì‹  ?€ê²?{regRegion} {regGrade}) ?™ìƒ?¤ì—ê²?br />
            ?¤ì‹œê°??¸ì‹œ ?Œë¦¼??ì¦‰ì‹œ ë°œì†¡?©ë‹ˆ????
          </p>
        </div>
      )}

      {/* --- INTERACTIVE SIMULATION GUIDE SYSTEM --- */}
      {showSimulation && !showCalendarSimModal && !showSimCompleteModal && (
        <>
          {/* ?´ë‘???¤ë“œ ?¤ë²„?ˆì´ */}
          <div className="guide-dimmer" />

          {/* ?¨ê³„ë³?ê°€?´ë“œ ?´íŒ */}
          {(() => {
            let tooltipStyle: React.CSSProperties = {};
            let tooltipClass = 'guide-tooltip bottom';
            let tooltipText = '';

            if (simulationStep === 1) {
              // 1?¨ê³„: ë§ì¶¤ ?ë ˆ?´ì…˜
              tooltipStyle = { top: '220px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[1?¨ê³„] ë§ì¶¤ ?ë ˆ?´ì…˜\n???„ë¡œ?„ì— ìµœì ?”ëœ ê³µê³ ë¥?ì¶”ì²œ?©ë‹ˆ?? ì¹´ë“œë¥??ŒëŸ¬ ?œì‘??ë³´ì„¸??';
            } else if (simulationStep === 2) {
              // 2?¨ê³„: ?¤ì??´í”„ ë§¤ì¹­ & ë²„íŠ¼ ì»¨íŠ¸ë¡?
              tooltipStyle = { top: '80px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[2?¨ê³„] ?¤ì??´í”„ ë§¤ì¹­\nì¹´ë“œë¥?ì¢Œìš°ë¡?ë°€ê±°ë‚˜ ?˜ë‹¨ ë²„íŠ¼?¼ë¡œ ë§¤ì¹­??ì§„í–‰?˜ì„¸??\n\n??ë²„íŠ¼: ë³´ê????€??n??ë²„íŠ¼: ?¼ë“œ ?œì™¸';
            } else if (simulationStep === 3) {
              // 3?¨ê³„: ì²œì•ˆ ë¡œì»¬ ?ë ˆ?´ì…˜
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[3?¨ê³„] ë¡œì»¬ ë§ì¶¤ ê³µê³ \n??ê·¼ì²˜ ì§€??˜ ê³µê³ ë§?ëª¨ì•„ ë³´ì—¬ì¤ë‹ˆ?? ?˜ì´?¼ì´?¸ëœ ì¹´ë“œë¥?? íƒ?˜ì„¸??';
            } else if (simulationStep === 4) {
              // 4?¨ê³„: ë§ˆì°° ?†ëŠ” 1ì´?ê³µìœ 
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[4?¨ê³„] ?í„°ì¹??•ë³´ ê³µìœ \nê³µìœ  ë²„íŠ¼???ŒëŸ¬ ì¹œêµ¬?¤ì—ê²?ê³µê³ ë¥?ë³´ë‚´ê³?ê²½í—˜ì¹˜ë? ?ë“??ë³´ì„¸??';
            } else if (simulationStep === 5) {
              // 5?¨ê³„: ìº˜ë¦°???±ë¡
              tooltipStyle = { top: '150px', left: '50%', transform: 'translateX(-50%)' };
              tooltipClass = 'guide-tooltip bottom';
              tooltipText = '[5?¨ê³„] ìº˜ë¦°???™ê¸°??n?¬ë ¥???€??ë²„íŠ¼???„ë¥´ë©??¤ë§ˆ?¸í° ìº˜ë¦°?”ì— ë§ˆê°?¼ì´ ?°ë™?©ë‹ˆ??';
            }

            return (
              <div className={tooltipClass} style={tooltipStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-indigo)', fontSize: '14px' }}>?œë¹„???´ìš© ê°€?´ë“œ</span>
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
                {/* ?¤í‚µ ë°??¤ìŒ ?¨ê³„ ?´ë™ ?˜ë™ ?¸ë¦¬ê±?*/}
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
                    ê°€?´ë“œ ê±´ë„ˆ?°ê¸°
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
                    ?¤ìŒ ?¨ê³„ ??
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
              ?“…
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              '??Kkeul)'???¬ë ¥??br />?‘ê·¼?˜ë ¤ê³??©ë‹ˆ??
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              ?€?¸í™œ??ë§ˆê° ?¼ì • ?ë™ ê¸°ë¡ ë°?ë¦¬ë§ˆ?¸ë” ?¸ì‹œ ?ˆì•½???„í•´ ?´ë???ê¸°ë³¸ ìº˜ë¦°???½ê¸°/?°ê¸° ê¶Œí•œ ?ˆìš©???„ìš”?©ë‹ˆ??
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
                ?ˆìš© ????
              </button>
              <button
                onClick={async () => {
                  try {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                  } catch (e) {}
                  
                  // ë¦¬ì›Œ???…ë°?´íŠ¸ & ?„ë£Œ ?ì—…?¼ë¡œ
                  const updatedBadges = profile.badges.includes('??ë§ˆìŠ¤??) ? profile.badges : [...profile.badges, '??ë§ˆìŠ¤??];
                  db.saveProfile({
                    ...profile,
                    xp: profile.xp + 100,
                    badges: updatedBadges
                  }).then(() => {
                    setShowCalendarSimModal(false);
                    setShowSimCompleteModal(true);
                    onTriggerMockPush('ìº˜ë¦°???°ë™ ?„ë£Œ', '?¼ì •??ê¸°ê¸° ìº˜ë¦°?”ì— ?•ìƒ ?±ë¡?˜ì—ˆ?µë‹ˆ??');
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
                ?ˆìš©
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
            ê°€?´ë“œ ?¬ì–´ ?„ë£Œ
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
            ì¶•í•˜?©ë‹ˆ?? ??Kkeul)??ëª¨ë“  ?µì‹¬ ê¸°ëŠ¥??ë§ˆìŠ¤?°í•˜?¨ìŠµ?ˆë‹¤.<br />
            ë³´ìƒ?¼ë¡œ <strong>+100 XP</strong> ê²½í—˜ì¹˜ì?<br />
            <strong>&apos;??ë§ˆìŠ¤??apos;</strong> ?œì • ?…ì  ë°°ì?ê°€ ì§€ê¸‰ë˜?ˆìŠµ?ˆë‹¤.
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
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>? ê·œ ë°°ì? ?ë“</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>??ë§ˆìŠ¤??(ê°€?´ë“œ ?¬ì–´ ?•ë³µ??</div>
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
            ì²´í—˜ ?„ë£Œ?˜ê³  ?ˆìœ¼ë¡?ê°€ê¸?
          </button>
        </div>
      )}

      {/* ?™ì•„ë¦???ëª¨ì§‘ ê³µê³  ?‘ì„± ëª¨ë‹¬ (ê¸°ì¥?? */}
      {showClubRegModal && (
        <div className="calendar-success-overlay" onClick={() => setShowClubRegModal(false)} style={{ zIndex: 140, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ?« ???™ì•„ë¦?ëª¨ì§‘ ê³µê³  ?±ë¡
            </h3>
            
            <form onSubmit={handleCreateClubAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?™ì•„ë¦??´ë¦„</label>
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>ëª¨ì§‘ ê³µê³  ?œëª©</label>
                <input
                  type="text"
                  value={clubRegTitle}
                  onChange={(e) => setClubRegTitle(e.target.value)}
                  placeholder="?? 2026 ?Œê³ ë¦¬ì¦˜ ?™ì•„ë¦?ë¶€??ëª¨ì§‘"
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>ê³µê³  ?¸ë? ?¤ëª…</label>
                <textarea
                  value={clubRegDetails}
                  onChange={(e) => setClubRegDetails(e.target.value)}
                  placeholder="?™ì•„ë¦??Œê°œ ë°??œë™ ëª©í‘œ, ? ë°œ ë°©ì‹???ì–´ì£¼ì„¸??"
                  rows={4}
                  style={{ padding: '10px 12px', fontSize: '13px', border: '1px solid #E5E8EB', borderRadius: '8px', resize: 'none', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>?™ì•„ë¦??œê·¸ (?¼í‘œë¡?êµ¬ë¶„)</label>
                <input
                  type="text"
                  value={clubRegTags}
                  onChange={(e) => setClubRegTags(e.target.value)}
                  placeholder="?? IT/ì½”ë”©, ?™ìˆ , ?¸ê¸°"
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
                  ì·¨ì†Œ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, height: '44px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700 }}
                >
                  ê³µê³  ?¬ë¦¬ê¸?
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ?±ê³¼ ê´€ë¦?B2B ?€?œë³´??PC Web ?ë??ˆì´??ëª¨ë‹¬ */}
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
                <div onClick={() => setShowB2BSchoolModal(false)} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', cursor: 'pointer' }} title="?«ê¸°" />
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
                ?”’ {window.location.origin}/school-dashboard/manage
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
                    B2B ?°ìˆ˜ ?¸ì¬ ?±ê³¼ ê´€ë¦??”ë£¨??
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0' }}>
                    ì§„ë¡œì§€??ë°??€?¸í™œ???±ê³¼ ?´ë“œë¯??€?œë³´??
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>?™êµ ? íƒ:</span>
                  <select
                    value={selectedSchoolB2B}
                    onChange={(e) => setSelectedSchoolB2B(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #CBD5E1', borderRadius: '8px', background: '#FFFFFF', outline: 'none', fontWeight: 700, color: '#0F172A' }}
                  >
                    <option value="?˜ë‚˜ê³ ë“±?™êµ">?˜ë‚˜ê³ ë“±?™êµ</option>
                    <option value="?œêµ­?”ì??¸ë??”ì–´ê³ ë“±?™êµ">?œêµ­?”ì??¸ë??”ì–´ê³ ë“±?™êµ</option>
                    <option value="? ë¦°?¸í„°?·ê³ ?±í•™êµ?>? ë¦°?¸í„°?·ê³ ?±í•™êµ?/option>
                  </select>
                </div>
              </div>

              {(() => {
                // Generate metrics based on selected school
                const getSchoolMetrics = (sch: string) => {
                  if (sch === '?œêµ­?”ì??¸ë??”ì–´ê³ ë“±?™êµ') {
                    return {
                      activeStudents: 168,
                      submissions: 482,
                      awards: 64,
                      clubs: 18,
                      chart: { dev: 98, startup: 28, science: 14, art: 28 },
                      table: [
                        { name: 'ê¹€ë¯¼ì?', major: 'ì»´í“¨?°ê³µ?™ê³¼', club: 'ALGO', award: '2026 NYPC ë³¸ì„  ì§„ì¶œ (#?ë£Œêµ¬ì¡°)' },
                        { name: '?´ì°¬??, major: '?Œí”„?¸ì›¨?´ê³¼', club: 'ALGO', award: '?œêµ­?•ë³´?¬ë¦¼?¼ì•„??ê¸ˆìƒ (#?Œê³ ë¦¬ì¦˜ìµœì ??' },
                        { name: '?•ìš°ì§?, major: '?”ì?¸ê³¼', club: 'Motion', award: 'ê¸°ìƒì²??í¼ ê³µëª¨???€??(#ë¯¸ë””?´ìŠ¤? ë¦¬)' }
                      ]
                    };
                  }
                  if (sch === '? ë¦°?¸í„°?·ê³ ?±í•™êµ?) {
                    return {
                      activeStudents: 154,
                      submissions: 418,
                      awards: 52,
                      clubs: 16,
                      chart: { dev: 84, startup: 32, science: 18, art: 20 },
                      table: [
                        { name: 'ë°•ì„œì¤€', major: 'ê²½ì˜ê³µí•™ê³?, club: 'SPARK', award: 'ì£¼ë‹ˆ??ë°œëª…ì°½ì˜?€??ìµœìš°?˜ìƒ (#ë¹„ì¦ˆ?ˆìŠ¤ëª¨ë¸)' },
                        { name: 'ìµœì˜ˆ??, major: 'UX?”ì?¸ê³¼', club: 'Motion', award: '?¼ì„± ì£¼ë‹ˆ??SWì°½ì‘?€???¥ë ¤??(#UIUX?„ë¡œ? í???' },
                        { name: '?¤ì???, major: '?•ë³´ê¸°ê¸°ê³?, club: 'ALGO', award: '?„ë² ?”ë“œ SW ê²½ì§„?€???°ìˆ˜??(#IoT?¤ê³„)' }
                      ]
                    };
                  }
                  // ?˜ë‚˜ê³ ë“±?™êµ (ê¸°ë³¸)
                  return {
                    activeStudents: 124,
                    submissions: 312,
                    awards: 46,
                    clubs: 12,
                    chart: { dev: 38, startup: 45, science: 28, art: 13 },
                    table: [
                      { name: 'ê¹€ë¯¼ì?', major: 'ì»´í“¨?°ê³µ?™ê³¼', club: 'ALGO', award: '?„êµ­ ê³ êµ ?Œê³ ë¦¬ì¦˜ ê²½ì‹œ ?€??(#?ë£Œêµ¬ì¡°)' },
                      { name: 'ë°•ì„œì¤€', major: 'ê²½ì˜?™ê³¼', club: 'SPARK', award: 'ì²?†Œ???¤í??¸ì—… ?„ì´?”ì–´ ?€??(#?œì¥?€?¹ì„±)' },
                      { name: 'ìµœì˜ˆ??, major: 'ë¯¸ë””?´ë””?ì¸', club: 'Motion', award: '?€?œë?êµ??™ìƒ ë¯¸ìˆ ?€???€??(#?œê°?œì¸??' }
                    ]
                  };
                };

                const metrics = getSchoolMetrics(selectedSchoolB2B);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    {/* Top Row: Numeric Indicators */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      {[
                        { title: '?€???œë™ ?œì„± ?™ìƒ', val: `${metrics.activeStudents}ëª?, desc: '?€ë¹?ì°¸ì—¬??76.5%' },
                        { title: '?„ì  ê³µëª¨ ?‘ìˆ˜??, val: `${metrics.submissions}ê±?, desc: '?„ì›” ?€ë¹?+18%' },
                        { title: '?¸ë? ?€???…ìƒ ?¤ì ', val: `${metrics.awards}ê±?, desc: '?°ê°„ ?„ì  ì¹´ìš´?? },
                        { title: '?œë™ ?°ê³„ ?™ì•„ë¦¬ìˆ˜', val: `${metrics.clubs}ê°?, desc: 'ëª¨ì§‘ ê¸°í•œ ?´ì˜ ì¤? }
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
                          ?“Š ?™ìƒ ?€???±ê³¼ ?„ê³µ ì¹´í…Œê³ ë¦¬ ë¶„í¬
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                          {[
                            { name: 'IT / ê°œë°œ ë°?SWê³µí•™', val: metrics.chart.dev, color: 'var(--color-indigo)' },
                            { name: 'ê²½ì˜ / ì°½ì—… / ë¹„ì¦ˆ?ˆìŠ¤', val: metrics.chart.startup, color: '#F59E0B' },
                            { name: '?˜í•™ / ê¸°ì´ˆê³¼í•™ / ?°êµ¬', val: metrics.chart.science, color: '#EF4444' },
                            { name: 'ë¯¸ìˆ  / ì½˜í…ì¸?/ ?”ì??, val: metrics.chart.art, color: '#10B981' }
                          ].map((bar, idx) => {
                            const total = metrics.chart.dev + metrics.chart.startup + metrics.chart.science + metrics.chart.art;
                            const pct = Math.round((bar.val / total) * 100);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{bar.name}</span>
                                  <span style={{ color: 'var(--text-primary)' }}>{bar.val}ëª?({pct}%)</span>
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
                          ?“¢ ?¤ì‹œê°??™ìƒ ì°¸ê? ì§‘ì¤‘ ?¸ë? ?€??(Top 3)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          {[
                            { title: '?¥ìŠ¨ ì²?†Œ???„ë¡œê·¸ë˜ë°?ì±Œë¦°ì§€ (NYPC)', count: 42, color: '#EEF2FF', border: '#C7D2FE', text: 'var(--color-indigo)' },
                            { title: '?œêµ­?•ë³´?¬ë¦¼?¼ì•„??ê²½ì‹œë¶€ë¬?(KOI)', count: 28, color: '#FDF2F8', border: '#FBCFE8', text: '#D946EF' },
                            { title: '????ê¸°ìƒì²??¬ì½¤ê¸°í›„ ê³µëª¨??, count: 15, color: '#ECFDF5', border: '#A7F3D0', text: '#059669' }
                          ].map((item, idx) => (
                            <div key={idx} style={{ backgroundColor: item.color, border: `1px solid ${item.border}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: item.text }}>{item.count}ëª??„ì „ ì¤?/span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Detailed student performance table */}
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        ?† êµë‚´ ?€???¤ì  ë°??¸íŠ¹ ì¶”ì²œ ??ª© ëª¨ë‹ˆ??
                      </h3>
                      
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>ì§€???™ìƒ</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?¬ë§ ëª©í‘œ?„ê³µ</th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?Œì† ?™ì•„ë¦?/th>
                              <th style={{ padding: '8px 12px', fontWeight: 700 }}>?¸ë? ?€???˜ìƒ ?±ê³¼ / ?¸íŠ¹ ë§¤ì¹­ ?¤ì›Œ??/th>
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
                          ?’¡ <strong>ì§„ë¡œì§€??? ìƒ?˜ì„ ?„í•œ ?í´ë¦?ë³´ê³ ??ì¶”ì¶œ:</strong> ??Kkeul) B2B ?•ì‹ ê³„ì•½ ?™êµ???™ìƒ?¤ì´ ?œì¶œ???¤ì ê³?AI ?ë™ ?”ì•½ ?¸íŠ¹ ë¬¸ì¥????ë²ˆì— ëª¨ì•„ ?í™œê¸°ë¡ë¶€ ê¸°ì¬ ?‘ì‹ ?‘ì? ?Œì¼ë¡?ë°”ë¡œ ì¶œë ¥?????ˆìŠµ?ˆë‹¤.
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await showAlert('ë³´ê³ ???‘ì? ?´ë³´?´ê¸°ê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ?? (?¤ìš´ë¡œë“œ ?Œì¼: kkeul_school_report.xlsx)');
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
                        ?“¥ ?‘ì? ?¤ì  ?°ì´??ì¶œë ¥
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
                <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 800 }}>?¸ìŠ¤?€ê·¸ë¨ ?¤í† ë¦??„ë¦¬ë·??“±</span>
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
                        {profile.name} ({profile.school || '?˜ë‚˜ê³ ë“±?™êµ'})
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
                      <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#FFFFFF' }}>?¤ìº”?´ì„œ ?˜ë„ ?œì‘?˜ê¸°</div>
                      <div style={{ fontSize: '7.5px', color: '#CBD5E1', marginTop: '1px' }}>10?€ ê³µëª¨??& ?€??ë§¤ì¹­ ?Œë«??'??</div>
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
                        
                        onTriggerMockPush('?† ë°°ì? ?¤í† ë¦?ê³µìœ  ë³´ìƒ', `?¸ìŠ¤?€ê·¸ë¨ ?¤í† ë¦¬ì— [${selectedBadgeToShare}] ë°°ì?ë¥??ë‘?˜ì—¬ 50 XPê°€ ì§€ê¸‰ë˜?ˆìŠµ?ˆë‹¤!`);
                      } else {
                        onTriggerMockPush('?ï¸ ë°°ì? ?¤í† ë¦?ê³µìœ ', `?¸ìŠ¤?€ê·¸ë¨ ?¤í† ë¦¬ì— [${selectedBadgeToShare}] ë°°ì?ë¥??ë‘?ˆìŠµ?ˆë‹¤! (ì¤‘ë³µ ê³µìœ ë¡?XP??ì§€ê¸‰ë˜ì§€ ?ŠìŠµ?ˆë‹¤.)`);
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
                      ?¤í† ë¦¬ë¡œ ê³µìœ  ì¤?..
                    </>
                  ) : (
                    <>
                      <span>?¤í† ë¦?ê³µìœ ?˜ê³  50 XP ë°›ê¸° ??</span>
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
