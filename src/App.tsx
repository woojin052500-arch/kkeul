import { useState, useEffect, useRef } from 'react';
import logoImg from './assets/logo.png';
import { Onboarding } from './components/Onboarding';
import { MainFeed } from './components/MainFeed';
import { DetailView } from './components/DetailView';
import { InAppBrowser } from './components/InAppBrowser';
import { NotificationPanel } from './components/NotificationPanel';
import type { Announcement, Profile } from './types';
import { db, supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [screen, setScreen] = useState<'onboarding' | 'main' | 'detail'>('onboarding');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<string>('home');
  
  // In-App Browser modal
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [browserTitle, setBrowserTitle] = useState<string | null>(null);

  // Active push notification banner
  const [pushNotification, setPushNotification] = useState<{ title: string; msg: string } | null>(null);

  // App initialization loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hardware Back Button Navigation Refs
  const screenRef = useRef(screen);
  const browserUrlRef = useRef(browserUrl);
  const activeTabRef = useRef(activeTab);
  const onboardingBackRef = useRef<(() => boolean) | null>(null);
  const mainFeedBackRef = useRef<(() => boolean) | null>(null);
  const detailViewBackRef = useRef<(() => boolean) | null>(null);

  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { browserUrlRef.current = browserUrl; }, [browserUrl]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleHardwareBackButton = async () => {
      if (browserUrlRef.current) {
        setBrowserUrl(null);
        setBrowserTitle(null);
        return;
      }

      if (screenRef.current === 'detail') {
        if (detailViewBackRef.current) {
          const handled = detailViewBackRef.current();
          if (handled) return;
        }
        setSelectedAnnouncement(null);
        setScreen('main');
        return;
      }

      if (screenRef.current === 'main') {
        if (mainFeedBackRef.current) {
          const handled = mainFeedBackRef.current();
          if (handled) return;
        }
        if (activeTabRef.current !== 'home') {
          setActiveTab('home');
        } else {
          CapacitorApp.exitApp();
        }
        return;
      }

      if (screenRef.current === 'onboarding') {
        if (onboardingBackRef.current) {
          const handled = onboardingBackRef.current();
          if (!handled) {
            CapacitorApp.exitApp();
          }
        } else {
          CapacitorApp.exitApp();
        }
        return;
      }
    };

    const listener = CapacitorApp.addListener('backButton', () => {
      handleHardwareBackButton();
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const getDDay = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '오늘 마감';
    if (days < 0) return '마감됨';
    return `마감 D-${days}`;
  };

  const schedule4HourNotifications = async (userProfile: Profile, currentAnnouncements: Announcement[]) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Native local notifications are only scheduled on native platform');
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        const idsToCancel = pending.notifications
          .filter(n => n.id >= 2000 && n.id <= 2005)
          .map(n => ({ id: n.id }));
        if (idsToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: idsToCancel });
        }
      }

      const userInterests = userProfile.interests || [];
      const matched = currentAnnouncements.filter(ann => {
        const isOver = new Date(ann.deadline).getTime() < Date.now();
        if (isOver) return false;
        const annCategories = ann.category ? ann.category.split(',').map(s => s.trim()) : [];
        return userInterests.some(interest => annCategories.includes(interest));
      });

      const pool = matched.length > 0 ? matched : currentAnnouncements.filter(ann => new Date(ann.deadline).getTime() > Date.now());
      if (pool.length === 0) return;

      const notifications = [];
      const now = Date.now();

      for (let i = 0; i < Math.min(6, pool.length); i++) {
        const ann = pool[i];
        const triggerTime = new Date(now + (i + 1) * 4 * 60 * 60 * 1000);
        const dday = getDDay(ann.deadline);

        // 사용자 지역 맞춤형 정밀 타겟 알림 카피 (전국 범용)
        let notificationBody = `'${ann.title}' 접수가 진행 중입니다 (${dday}). 나에게 맞는 기회를 확인해 보세요.`;
        const userLocation = userProfile.location || '전국';
        const userGrade = userProfile.grade || '';
        const userInterests = userProfile.interests || [];

        // 관심사 매칭 알림
        const matchedInterest = userInterests.find((interest: string) => ann.category.includes(interest));
        if (matchedInterest && userGrade) {
          notificationBody = `${userGrade} ${matchedInterest} 관심사 매칭 공고가 접수 중입니다. 지금 바로 확인해 보세요.`;
        } else if (dday === '오늘 마감' || dday.includes('D-1')) {
          notificationBody = `'${ann.title}' 접수가 곧 마감됩니다. 놓치지 마세요.`;
        } else if (userLocation !== '전국' && ann.location === userLocation) {
          notificationBody = `${userLocation} 지역 '${ann.host}' 공고가 마감 임박했습니다. 매칭 정보를 확인해 보세요.`;
        }

        notifications.push({
          title: `맞춤 공고 추천`,
          body: notificationBody,
          id: 2000 + i,
          schedule: { at: triggerTime },
          sound: 'default',
          smallIcon: 'ic_notification',
          actionTypeId: '',
          extra: { announcementId: ann.id }
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`${notifications.length}개의 4시간 간격 추천 알림 예약 성공!`);
      }
    } catch (e) {
      console.warn('schedule4HourNotifications error:', e);
    }
  };

  const getNotificationIds = (announcementId: string) => {
    let hash = 0;
    for (let i = 0; i < announcementId.length; i++) {
      const char = announcementId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    const baseId = Math.abs(hash) % 10000000;
    return {
      id24h: baseId * 2,
      id3h: baseId * 2 + 1
    };
  };

  const scheduleDeadlineNotifications = async (userProfile: Profile, ann: Announcement) => {
    try {
      const hasPermission = await LocalNotifications.checkPermissions();
      if (hasPermission.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('Local Notification permission denied for deadline reminder');
          return;
        }
      }

      const { id24h, id3h } = getNotificationIds(ann.id);
      const deadlineTime = new Date(ann.deadline).getTime();
      const now = Date.now();
      const notifications = [];

      // 1. 24시간 전 알림 (마감일 전날 저녁 8시: 20:00)
      const target24h = new Date(deadlineTime);
      target24h.setDate(target24h.getDate() - 1);
      target24h.setHours(20, 0, 0, 0);

      if (target24h.getTime() > now) {
        notifications.push({
          title: '마감 24시간 전',
          body: `"${userProfile.name || '학생'}님, 보관함에 담긴 '${ann.title}' 공고 마감 24시간 전입니다. 접수 마감 전 신청을 진행해 주세요."`,
          id: id24h,
          schedule: { at: target24h },
          sound: 'default',
          smallIcon: 'ic_notification',
          actionTypeId: '',
          extra: { announcementId: ann.id }
        });
      }

      // 2. 3시간 전 알림 (마감 3시간 전 시점)
      const target3h = new Date(deadlineTime - 3 * 60 * 60 * 1000);

      if (target3h.getTime() > now) {
        notifications.push({
          title: '마감 임박',
          body: `"${userProfile.name || '학생'}님, 보관함에 담긴 '${ann.title}' 공고 마감 3시간 전입니다. 지금 매칭을 확인해 보세요."`,
          id: id3h,
          schedule: { at: target3h },
          sound: 'default',
          smallIcon: 'ic_notification',
          actionTypeId: '',
          extra: { announcementId: ann.id }
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`Successfully scheduled ${notifications.length} deadline notifications for ${ann.title}`);
      }
    } catch (e) {
      console.warn('scheduleDeadlineNotifications error:', e);
    }
  };

  // 1. 권한 요청 및 초기화
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.warn('LocalNotifications permission request error:', e);
        }
      }
    };
    requestNotificationPermission();

    const initApp = async () => {
      let announcementsData: Announcement[] = [];
      try {
        // 1. 공고 데이터 로드
        announcementsData = await db.getAnnouncements();
        setAnnouncements(announcementsData);
      } catch (err) {
        console.warn('Failed to load announcements during init:', err);
      }

      // 2. 로컬 저장된 프로필 복구 시도 (오프라인/로컬 로그인 최우선)
      let isLoggedIn = false;
      const savedProfile = localStorage.getItem('kkeul_profile');
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile) as Profile;
          // Migrate old mock IDs to UUID format to prevent Supabase 400 Bad Request
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (parsedProfile && parsedProfile.id && !uuidRegex.test(parsedProfile.id)) {
            parsedProfile.id = crypto.randomUUID();
            localStorage.setItem('kkeul_profile', JSON.stringify(parsedProfile));
          }
          setProfile(parsedProfile);
          setScreen('main');
          isLoggedIn = true;

          // 북마크 로드 (오류 방어형)
          db.getBookmarks(parsedProfile.id, parsedProfile.email)
            .then(b => setBookmarks(b))
            .catch(e => console.warn('Failed to load bookmarks:', e));

          // 4시간 간격 추천 알림 등록
          schedule4HourNotifications(parsedProfile, announcementsData);
        } catch (e) {
          console.error('Failed to parse saved profile:', e);
          localStorage.removeItem('kkeul_profile');
        }
      }

      // 3. Supabase Auth 세션 조회 (미로그인 상태일 때 온라인 세션 복구)
      if (!isLoggedIn) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user && session.user.email) {
            const userProfile = await db.getProfile(session.user.email);
            if (userProfile) {
              setProfile(userProfile);
              localStorage.setItem('kkeul_profile', JSON.stringify(userProfile));
              setScreen('main');

              db.getBookmarks(userProfile.id, userProfile.email)
                .then(b => setBookmarks(b))
                .catch(e => console.warn('Failed to load bookmarks:', e));

              schedule4HourNotifications(userProfile, announcementsData);
            }
          }
        } catch (err) {
          console.warn('Supabase session retrieval failed during init (expected if offline):', err);
        }
      }

      setIsLoading(false);
    };
    initApp();

    // Supabase Auth 상태 변경 감지 리스너 추가
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const savedProfile = localStorage.getItem('kkeul_profile');
        if (!savedProfile && session.user.email) {
          const userProfile = await db.getProfile(session.user.email);
          if (userProfile) {
            setProfile(userProfile);
            localStorage.setItem('kkeul_profile', JSON.stringify(userProfile));
            setScreen('main');
            const userBookmarks = await db.getBookmarks(userProfile.id, userProfile.email);
            setBookmarks(userBookmarks);
            // 4시간 간격 추천 알림 등록
            try {
              const currentAnns = await db.getAnnouncements();
              schedule4HourNotifications(userProfile, currentAnns);
            } catch (err) {
              console.warn('Failed to load announcements for notification on auth change:', err);
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // 로컬/모의 로그인 계정인 경우 Supabase 자동 로그아웃 이벤트 무시 (데이터 증발 방지)
        const savedProfile = localStorage.getItem('kkeul_profile');
        if (savedProfile) {
          try {
            const prof = JSON.parse(savedProfile);
            // Migrate old mock IDs to UUID format to prevent Supabase 400 Bad Request
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (prof && prof.id && !uuidRegex.test(prof.id)) {
              prof.id = crypto.randomUUID();
              localStorage.setItem('kkeul_profile', JSON.stringify(prof));
            }
            // 모의 계정(id가 'u'로 시작하거나 로컬 계정 목록에 있는 경우)이면 초기화하지 않고 리턴
            const mockAccounts = JSON.parse(localStorage.getItem('kkeul_mock_accounts') || '[]');
            const isMock = mockAccounts.some((acc: any) => acc.email === prof.email);
            if (isMock || (prof && prof.id && prof.id.startsWith('u'))) {
              return;
            }
          } catch (e) {}
        }
        localStorage.removeItem('kkeul_profile');
        localStorage.removeItem('kkeul_bookmarks');
        setProfile(null);
        setBookmarks([]);
        setScreen('onboarding');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. 온보딩 완료 처리
  const handleOnboardingComplete = async (completedProfile: Profile) => {
    setProfile(completedProfile);
    try {
      localStorage.setItem('kkeul_profile', JSON.stringify(completedProfile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
    setScreen('main');

    try {
      // 북마크 로드
      const userBookmarks = await db.getBookmarks(completedProfile.id, completedProfile.email);
      setBookmarks(userBookmarks);
    } catch (e) {
      console.warn('Failed to load bookmarks during onboarding complete:', e);
    }

    try {
      // 4시간 간격 추천 알림 등록
      schedule4HourNotifications(completedProfile, announcements);
    } catch (e) {
      console.warn('Failed to schedule local notifications:', e);
    }

    // 웰컴 푸시 발송
    triggerMockPush(
      '로그인 완료',
      `${completedProfile.name}님만을 위한 청소년 맞춤 기회들을 지금 끌어왔어요!`
    );
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    localStorage.removeItem('kkeul_profile');
    localStorage.removeItem('kkeul_bookmarks');
    setProfile(null);
    setBookmarks([]);
    setScreen('onboarding');
    triggerMockPush('로그아웃', '로그아웃 되었습니다. 다시 만나요!');
  };

  // 회원 탈퇴 처리
  const handleWithdraw = async () => {
    if (profile) {
      try {
        await supabase.from('profiles').delete().eq('id', profile.id);
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Withdraw database/auth error:', e);
      }
      localStorage.removeItem('kkeul_profile');
      localStorage.removeItem('kkeul_bookmarks');
      setProfile(null);
      setBookmarks([]);
      setScreen('onboarding');
      triggerMockPush('회원 탈퇴 완료', '회원 탈퇴 처리가 정상적으로 완료되었습니다.');
    }
  };

  // 3. 북마크 추가/삭제 토글
  const handleToggleBookmark = async (announcementId: string) => {
    if (!profile) return;
    const isBookmarked = bookmarks.includes(announcementId);
    const announcement = announcements.find(a => a.id === announcementId);

    if (isBookmarked) {
      const success = await db.removeBookmark(profile.id, profile.email, announcementId);
      if (success) {
        setBookmarks(prev => prev.filter(id => id !== announcementId));
        triggerMockPush('보관함 해제', '해당 공고가 보관함에서 제외되었습니다. 등록된 마감 알림이 취소됩니다.');
        
        // 예약된 알림 취소
        if (Capacitor.isNativePlatform()) {
          const { id24h, id3h } = getNotificationIds(announcementId);
          try {
            await LocalNotifications.cancel({ notifications: [{ id: id24h }, { id: id3h }] });
            console.log(`Cancelled notifications for announcement ${announcementId}`);
          } catch (e) {
            console.warn('Failed to cancel notifications:', e);
          }
        }
      }
    } else {
      const success = await db.addBookmark(profile.id, profile.email, announcementId);
      if (success) {
        setBookmarks(prev => [...prev, announcementId]);
        // 찜 시 마감 리마인더 예약 푸시 트리거
        triggerMockPush(
          '알림 설정 완료',
          '해당 공고가 보관함에 저장되었습니다. 마감 24시간 전과 3시간 전에 마감 알림을 보내드립니다.'
        );
        
        // 실제 네이티브 기기 로컬 알림 스케줄러 등록
        if (Capacitor.isNativePlatform() && announcement) {
          await scheduleDeadlineNotifications(profile, announcement);
        }

        // XP 보상 (+10 XP)
        handleAwardXP(10, '공고 찜하기');
      }
    }
  };

  // 4. XP 획득 및 레벨업 체크
  const handleAwardXP = async (amount: number, reason: string) => {
    if (!profile) return;
    const oldLevel = Math.floor(profile.xp / 100) + 1;
    const newXP = profile.xp + amount;
    const newLevel = Math.floor(newXP / 100) + 1;

    const updatedProfile = { ...profile, xp: newXP };
    
    // 레벨업 시 배지 또는 축하 푸시 알림
    if (newLevel > oldLevel) {
      triggerMockPush(
        '레벨업 완료',
        `레벨이 ${oldLevel}에서 ${newLevel}로 상승했습니다. 새로운 추천 공고를 확인해 보세요.`
      );
    } else {
      triggerMockPush(
        '경험치 적립',
        `${reason}을 통해 ${amount} XP가 적립되었습니다.`
      );
    }

    const saved = await db.saveProfile(updatedProfile);
    setProfile(saved);
  };

  const handleUpdateProfile = async (updated: Profile) => {
    const saved = await db.saveProfile(updated);
    setProfile(saved);
  };

  // 5. 배지 획득 처리
  const handleAwardBadge = async (badgeName: string) => {
    if (!profile) return;
    if (profile.badges.includes(badgeName)) return;

    const updatedProfile = {
      ...profile,
      badges: [...profile.badges, badgeName]
    };

    const saved = await db.saveProfile(updatedProfile);
    setProfile(saved);

    triggerMockPush(
      '배지 획득 완료',
      `업적 달성으로 '${badgeName}' 배지가 지급되었습니다. 마이페이지에서 확인할 수 있습니다.`
    );
  };

  // 6. 모의 푸시 알림 트리거 (4초 노출 및 모바일 실기기 상단바 푸시 발송)
  const triggerMockPush = async (title: string, msg: string) => {
    setPushNotification({ title, msg });

    // 모바일 네이티브 플랫폼인 경우 상단바 알림도 실시간 노출
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 100000) + 1,
                title,
                body: msg,
                smallIcon: 'ic_notification',
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'default'
              }
            ]
          });
        }
      } catch (err) {
        console.warn('Native notification scheduling failed:', err);
      }
    }

    // 4초 뒤 배너 삭제
    setTimeout(() => {
      setPushNotification(null);
    }, 4000);
  };

  const handleAddAnnouncement = (newAnn: Announcement) => {
    setAnnouncements(prev => [newAnn, ...prev]);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const success = await db.deleteAnnouncement(id);
    if (success) {
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      setBookmarks(prev => prev.filter(bId => bId !== id));
      setSelectedAnnouncement(null);
      setScreen('main');
      triggerMockPush('공고 삭제 완료', '선택하신 공고가 정상적으로 삭제되었습니다.');
    }
  };

  const handleUpdateAnnouncement = async (id: string, updatedFields: Partial<Announcement>) => {
    const success = await db.updateAnnouncement(id, updatedFields);
    if (success) {
      setAnnouncements(prev => prev.map(ann => ann.id === id ? { ...ann, ...updatedFields } : ann));
      setSelectedAnnouncement(prev => prev && prev.id === id ? { ...prev, ...updatedFields } : prev);
      triggerMockPush('✏️ 공고 수정 완료', '공고 정보가 정상적으로 수정되었습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', position: 'relative' }}>
      
      {/* 0. Startup Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          gap: '20px'
        }}>
          <img 
            src={logoImg} 
            alt="끌(Kkeul) 로고" 
            className="animate-scale-in" 
            style={{
              height: '110px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            나에게 맞는 기회를 끌어오는 중...
          </span>
        </div>
      )}

      {/* 1. iOS-style Simulated Push Notification Banner */}
      {pushNotification && (
        <div className="custom-push-banner" onClick={() => setPushNotification(null)}>
          <div className="push-logo" style={{ background: '#FFFFFF', border: '1px solid #E5E8EB', padding: '2px', overflow: 'hidden' }}>
            <img src={logoImg} alt="끌(Kkeul)" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="push-content">
            <div className="push-header">
              <span className="push-app-name">KKEUL</span>
              <span className="push-time">방금 전</span>
            </div>
            <div className="push-title">{pushNotification.title}</div>
            <div className="push-msg">{pushNotification.msg}</div>
          </div>
        </div>
      )}

      {/* 2. Primary Screens Routing */}
      {screen === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} backRef={onboardingBackRef} />
      )}

      {profile && (screen === 'main' || screen === 'detail') && (
        <div style={{ display: screen === 'main' ? 'block' : 'none', height: '100%', width: '100%' }}>
          <MainFeed
            backRef={mainFeedBackRef}
            profile={profile}
            announcements={announcements}
            bookmarks={bookmarks}
            onSelectAnnouncement={(ann) => {
              setSelectedAnnouncement(ann);
              setScreen('detail');
            }}
            onToggleBookmark={handleToggleBookmark}
            onLogout={handleLogout}
            onWithdraw={handleWithdraw}
            onAddAnnouncement={handleAddAnnouncement}
            onTriggerMockPush={triggerMockPush}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              // 다른 탭으로 갈 때 혹은 남아있는 상세 페이지 닫기
              setSelectedAnnouncement(null);
            }}
            onUpdateProfile={handleUpdateProfile}
            notificationPanel={
              <NotificationPanel
                announcements={announcements}
                bookmarks={bookmarks}
                onTriggerPush={triggerMockPush}
              />
            }
          />
        </div>
      )}

      {screen === 'detail' && selectedAnnouncement && (
        <DetailView
          backRef={detailViewBackRef}
          announcement={selectedAnnouncement}
          profile={profile || undefined}
          onBack={() => {
            setSelectedAnnouncement(null);
            setScreen('main');
          }}
          onOpenBrowser={(url, title) => {
            if (!url) {
              alert('접수 사이트 링크가 등록되어 있지 않습니다.');
              return;
            }
            const isMockUrl = url.includes('wjedulab-mock-apply-form.github.io') || url.includes('ideathon') || url.includes('mock');
            if (isMockUrl) {
              setBrowserUrl(url);
              setBrowserTitle(title);
            } else {
              if (Capacitor.isNativePlatform()) {
                Browser.open({ url })
                  .then(() => {
                    triggerMockPush('공식 사이트 이동', `'${title}'의 공식 접수 사이트로 연결되었습니다.`);
                  })
                  .catch((e) => {
                    console.warn('Capacitor Browser plugin error, falling back to window.open', e);
                    window.open(url, '_blank');
                  });
              } else {
                window.open(url, '_blank');
                triggerMockPush('공식 사이트 이동', `'${title}'의 공식 접수 사이트로 연결되었습니다.`);
              }
            }
          }}
          onAwardXP={handleAwardXP}
          onAwardBadge={handleAwardBadge}
          isHostUser={profile?.role === 'host' && selectedAnnouncement.host === profile.name}
          onDelete={handleDeleteAnnouncement}
          onUpdate={handleUpdateAnnouncement}
        />
      )}

      {/* 3. In-App Browser Slide-Up Drawer */}
      {browserUrl && browserTitle && (
        <InAppBrowser
          url={browserUrl}
          title={browserTitle}
          onClose={() => {
            setBrowserUrl(null);
            setBrowserTitle(null);
          }}
          userEmail={profile ? profile.email : ''}
          userGrade={profile ? profile.grade : ''}
          userLocation={profile ? profile.location : ''}
        />
      )}

    </div>
  );
}

export default App;
