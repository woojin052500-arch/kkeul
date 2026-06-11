import React, { useState, useEffect } from 'react';
import type { Announcement, Profile, TeamPost } from '../types';
import { ArrowLeft, Share2, Calendar as CalendarIcon, ExternalLink, Edit, Trash2, Link, Users, Check, Plus, Sparkles, Copy } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Calendar } from '@awesome-cordova-plugins/calendar';
import { db } from '../supabaseClient';

interface DetailViewProps {
  announcement: Announcement;
  profile?: Profile;
  onBack: () => void;
  onOpenBrowser: (url: string, title: string) => void;
  onAwardXP: (amount: number, reason: string) => void;
  onAwardBadge: (badgeName: string) => void;
  isHostUser?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updatedFields: Partial<Announcement>) => void;
  backRef?: React.MutableRefObject<(() => boolean) | null>;
}

export const DetailView: React.FC<DetailViewProps> = ({
  announcement,
  profile,
  onBack,
  onOpenBrowser,
  onAwardXP,
  onAwardBadge,
  isHostUser,
  onDelete,
  onUpdate,
  backRef
}) => {
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showRedirectModal, setShowRedirectModal] = useState<boolean>(false);
  const [xpParticles, setXpParticles] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [particleId, setParticleId] = useState<number>(0);

  // 1초 서류 자동 완성 모달 State
  const [show1ClickModal, setShow1ClickModal] = useState<boolean>(false);
  const [isFillingForm, setIsFillingForm] = useState<boolean>(false);
  const [applyProgress, setApplyProgress] = useState<number>(0);
  const [fillingStepMessage, setFillingStepMessage] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // 신규 피처 관련 State
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'jokbo'>('info');
  const [teamPosts, setTeamPosts] = useState<TeamPost[]>([]);
  const [showTeamPostModal, setShowTeamPostModal] = useState<boolean>(false);
  const [myRole, setMyRole] = useState<'기획' | '디자인' | '개발'>('개발');
  const [wantedRole, setWantedRole] = useState<'기획' | '디자인' | '개발'>('기획');
  const [teamComment, setTeamComment] = useState<string>('');
  const [teamContact, setTeamContact] = useState<string>('');
  const [requestedPostIds, setRequestedPostIds] = useState<string[]>(() => {
    const local = localStorage.getItem('kkeul_requested_team_posts');
    return local ? JSON.parse(local) : [];
  });

  // 공고별 팀 포스트 조회
  useEffect(() => {
    const fetchTeamPosts = async () => {
      const posts = await db.getTeamPosts(announcement.id);
      setTeamPosts(posts);
    };
    fetchTeamPosts();
    if (profile) {
      setTeamContact(profile.contact || profile.email || '');
    }
  }, [announcement.id, profile]);

  const startAutoApply = () => {
    setIsFillingForm(true);
    setApplyProgress(0);
    setFillingStepMessage('포트폴리오 데이터 추출 중...');

    const interval = setInterval(() => {
      setApplyProgress((prev) => {
        const next = prev + 5;
        if (next === 25) {
          setFillingStepMessage('신청서 항목 매칭 및 자동 완성 중...');
        } else if (next === 60) {
          setFillingStepMessage('자기소개 요약서(경험 기반) 작성 완료...');
        } else if (next === 85) {
          setFillingStepMessage('최종 검토 및 서류 제출 중...');
        } else if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setSubmitSuccess(true);
            setIsFillingForm(false);
            onAwardXP(10, '1초 서류 자동 완성 지원');
          }, 300);
          return 100;
        }
        return next;
      });
    }, 70);
  };

  const handleCreateTeamPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamComment.trim()) {
      alert('동아리/대회 한줄 소개 및 각오를 입력해 주세요!');
      return;
    }
    if (!teamContact.trim()) {
      alert('연락처(전화번호 또는 카카오톡 ID 등)를 입력해 주세요!');
      return;
    }

    const newPost = await db.createTeamPost({
      announcement_id: announcement.id,
      user_id: profile?.id || 'guest',
      user_name: profile?.name || '익명 학생',
      role_wanted: wantedRole,
      my_role: myRole,
      comment: teamComment,
      contact: teamContact
    });

    setTeamPosts(prev => [newPost, ...prev]);
    setTeamComment('');
    setShowTeamPostModal(false);
    alert('팀원 구인글이 등록되었습니다!');
  };

  const handleSendJoinRequest = async (post: TeamPost) => {
    if (!profile) return;
    
    const updated = [...requestedPostIds, post.id];
    setRequestedPostIds(updated);
    localStorage.setItem('kkeul_requested_team_posts', JSON.stringify(updated));

    await db.sendJoinRequest({
      post_id: post.id,
      user_id: profile.id,
      user_name: profile.name,
      user_role: '기획/개발/디자인',
      message: `${profile.name}님이 팀 합류를 신청했습니다.`
    });

    alert(`'${post.user_name}'님께 합류 요청이 성공적으로 발송되었습니다!`);
  };

  const [copied, setCopied] = useState<boolean>(false);
  const handleCopyInsight = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 수정용 로컬 State
  const [isEditing, setIsEditing] = useState<boolean>(false);

  React.useEffect(() => {
    if (backRef) {
      backRef.current = () => {
        if (showRedirectModal) {
          setShowRedirectModal(false);
          return true;
        }
        if (showShareModal) {
          setShowShareModal(false);
          return true;
        }
        if (show1ClickModal) {
          if (!isFillingForm) {
            setShow1ClickModal(false);
            setSubmitSuccess(false);
          }
          return true;
        }
        if (isEditing) {
          setIsEditing(false);
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
  }, [showRedirectModal, showShareModal, show1ClickModal, isFillingForm, isEditing, backRef]);
  const [editTitle, setEditTitle] = useState<string>(announcement.title);
  const [editDetails, setEditDetails] = useState<string>(announcement.details);
  const [editApplyUrl, setEditApplyUrl] = useState<string>(announcement.apply_url);
  const [editLocation, setEditLocation] = useState<string>(announcement.location);
  const [editBidAmount, setEditBidAmount] = useState<number>(announcement.bid_amount || 0);
  const [editCategories, setEditCategories] = useState<string[]>(
    announcement.category ? announcement.category.split(',').map(s => s.trim()) : ['IT/개발']
  );

  const handleToggleEditCategory = (cat: string) => {
    let updated: string[];
    if (editCategories.includes(cat)) {
      if (editCategories.length === 1) {
        alert('최소 1개의 카테고리를 선택해야 합니다.');
        return;
      }
      updated = editCategories.filter(c => c !== cat);
    } else {
      if (editCategories.length >= 2) {
        alert('카테고리는 최대 2개까지 선택할 수 있습니다.');
        return;
      }
      updated = [...editCategories, cat];
    }
    setEditCategories(updated);
  };

  // XP 파티클 띄우기 함수
  const spawnXPParticle = (text: string, clientX: number, clientY: number) => {
    const newParticle = {
      id: particleId,
      x: clientX || window.innerWidth / 2,
      y: clientY || window.innerHeight / 2,
      text
    };
    setXpParticles((prev) => [...prev, newParticle]);
    setParticleId((id) => id + 1);

    // 1.2초 뒤 파티클 제거
    setTimeout(() => {
      setXpParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 1200);
  };

  // 캘린더 저장 클릭 (휴대폰 네이티브 캘린더 연동 및 권한 팝업)
  const handleSaveToCalendar = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!announcement.deadline) {
      alert('마감일 정보가 제공되지 않아 일정을 저장할 수 없습니다.');
      return;
    }
    
    let startDate: Date;
    try {
      startDate = new Date(announcement.deadline);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      alert('올바르지 않은 마감일 형식입니다.');
      return;
    }

    try {
      // 1. 네이티브 기기 캘린더 권한 확인 및 요청
      const hasPermission = await Calendar.hasReadWritePermission();
      if (!hasPermission) {
        const granted = await Calendar.requestReadWritePermission();
        if (!granted) {
          alert('휴대폰 캘린더 접근 권한이 거부되어 일정을 저장할 수 없습니다. 설정에서 권한을 허용해 주세요.');
          return;
        }
      }

      // 2. 대화상자(기기 네이티브 캘린더 등록 화면) 띄우기
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1시간 일정
      
      await Calendar.createEventInteractively(
        `[끌] ${announcement.title}`,
        announcement.location || '',
        `${announcement.details}\n\n지원 주소: ${announcement.apply_url || ''}`,
        startDate,
        endDate
      );

      // 3. 성공 시 초록색 체크마크 애니메이션 및 XP 보상
      setShowCheckmark(true);
      
      try {
        onAwardXP(30, '캘린더 일정 추가');
        onAwardBadge('캘린더 마스터');
        spawnXPParticle('+30 XP', e.clientX, e.clientY);
      } catch (xpErr) {
        console.warn('Awarding XP failed in handleSaveToCalendar:', xpErr);
      }

      setTimeout(() => {
        setShowCheckmark(false);
      }, 1800);

    } catch (err: any) {
      console.warn('Native calendar registration failed, falling back to Google Calendar Web link:', err);
      
      // 모바일 기기가 아니거나 플러그인 에러 시 구글 캘린더 웹 폴백 작동
      setShowCheckmark(true);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const formatCalDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      };

      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        announcement.title
      )}&dates=${formatCalDate(startDate)}/${formatCalDate(endDate)}&details=${encodeURIComponent(
        `${announcement.details}\n\n지원 링크: ${announcement.apply_url || ''}`
      )}&location=${encodeURIComponent(announcement.location || '')}`;

      setTimeout(() => {
        setShowCheckmark(false);
        window.open(googleCalUrl, '_blank');
      }, 1800);
    }
  };

  // 공유하기 클릭 (Capacitor Share 네이티브 모듈 연동 및 클립보드 폴백)
  const handleShare = async () => {
    const deadlineText = announcement.deadline
      ? `${new Date(announcement.deadline).toLocaleDateString()}까지`
      : '상세 정보 참조';
    const shareText = `[끌(Kkeul) 기회 공유] ${announcement.title}\n마감: ${deadlineText}`;
    const shareUrl = announcement.apply_url || window.location.href;

    try {
      // 1. Capacitor Share 플러그인으로 네이티브 공유 시트 실행
      await Share.share({
        title: `[끌] ${announcement.title}`,
        text: shareText,
        url: shareUrl,
        dialogTitle: '공모전 공유하기'
      });
      
      // 2. 공유 성공 시 리워드 처리 분기
      if (Capacitor.isNativePlatform()) {
        onAwardXP(50, '친구에게 공유');
        onAwardBadge('정보 공유왕');
        spawnXPParticle('+50 XP', window.innerWidth / 2, window.innerHeight / 2 - 50);
      } else {
        setShowShareModal(true);
      }
    } catch (error: any) {
      console.log('Native share failed or dismissed, falling back to copy', error);
      // 유저가 공유 창을 취소하여 닫은 경우(AbortError 등)에는 폴백(클립보드 복사)을 하지 않고 중단
      if (error.name === 'AbortError' || (error.message && error.message.includes('share activity'))) {
        return;
      }
      fallbackShare();
    }
  };

  const copyUsingTextarea = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShowShareModal(true);
    } catch (e) {
      console.error('Fallback copy failed', e);
      alert('링크 복사에 실패했습니다. 지원 사이트 주소: ' + (announcement.apply_url || ''));
    }
  };

  const fallbackShare = () => {
    const deadlineText = announcement.deadline
      ? `${new Date(announcement.deadline).toLocaleDateString()}까지`
      : '상세 정보 참조';
    const textToCopy = `[끌(Kkeul) 기회 공유] ${announcement.title}\n마감: ${deadlineText}\n바로보기: ${announcement.apply_url || ''}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setShowShareModal(true);
        })
        .catch((err) => {
          console.warn('Clipboard API blocked, using textarea', err);
          copyUsingTextarea(textToCopy);
        });
    } else {
      copyUsingTextarea(textToCopy);
    }
  };

  const confirmMockShare = () => {
    setShowShareModal(false);
    // XP 보상 (+50 XP) 및 배지 부여
    onAwardXP(50, '친구에게 공유');
    onAwardBadge('정보 공유왕');
    spawnXPParticle('+50 XP', window.innerWidth / 2, window.innerHeight / 2 - 50);
  };

  const getFormattedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#FFFFFF', minHeight: '100vh', position: 'relative' }}>
      
      {/* XP Floating Particles */}
      {xpParticles.map((particle) => (
        <div
          key={particle.id}
          className="xp-gain-particle"
          style={{ left: `${particle.x}px`, top: `${particle.y}px` }}
        >
          {particle.text}
        </div>
      ))}

      {/* Success Animation Circle Overlay */}
      {showCheckmark && (
        <div className="calendar-success-overlay">
          <div className="calendar-success-modal">
            <div className="checkmark-circle">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <path className="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <div className="calendar-success-text">캘린더에 쏙 들어갔어요</div>
            <div className="calendar-success-subtext">구글 캘린더에 일정을 저장합니다</div>
          </div>
        </div>
      )}

      {/* Share Simulation Dialog Modal */}
      {showShareModal && (
        <div className="calendar-success-overlay" onClick={() => setShowShareModal(false)}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '310px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#FEE500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '24px',
              color: '#371C1D',
              marginBottom: '16px'
            }}>
              talk
            </div>
            <div className="calendar-success-text" style={{ fontSize: '17px', marginBottom: '8px' }}>
              카카오톡 공유 링크 복사 완료!
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              친구에게 지원 링크가 클립보드에 복사되었습니다. 카카오톡 창에 바로 붙여넣기 하실 수 있어요.<br />
              <strong>확인 버튼을 누르시면 50 XP가 지급됩니다!</strong>
            </p>
            <button className="btn btn-primary" onClick={confirmMockShare} style={{ padding: '12px' }}>
              공유 완료하고 XP 받기
            </button>
          </div>
        </div>
      )}

      {/* Sticky Top Header Navigation */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #F2F4F6',
        position: 'sticky',
        top: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 100
      }}>
        <button
          onClick={onBack}
          className="spring-active"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>공고 상세 보기</span>
        <button
          onClick={handleShare}
          className="spring-active"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Share2 size={22} />
        </button>
      </div>

      {/* Detail Content Scroll Area */}
      <div style={{ padding: '24px 20px 120px 20px', overflowY: 'auto' }}>
        {isEditing ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>공고 정보 수정</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>공고 제목</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ padding: '12px', border: '1px solid #E5E8EB', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>지원 홈페이지 링크</label>
              <input
                type="text"
                value={editApplyUrl}
                onChange={(e) => setEditApplyUrl(e.target.value)}
                style={{ padding: '12px', border: '1px solid #E5E8EB', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>모집 지역</label>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  style={{ padding: '12px', border: '1px solid #E5E8EB', borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  {['전국', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'].map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>분야 (최대 2개 선택)</label>
                  <span style={{ fontSize: '12px', color: editCategories.length >= 2 ? 'var(--color-indigo)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                    {editCategories.length} / 2
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginTop: '4px'
                }}>
                  {['IT/개발', '창업', '수학/과학', '예술/문화', '인문학', '체육', '봉사활동', '외국어/어학'].map((cat) => {
                    const isSelected = editCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        className="spring-active"
                        onClick={() => handleToggleEditCategory(cat)}
                        style={{
                          padding: '10px 4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '10px',
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>최상단 노출 입찰 금액 수정 (최소 1,000원 또는 0원 설정)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={editBidAmount}
                  onChange={(e) => setEditBidAmount(Number(e.target.value))}
                  style={{ flex: 1, padding: '12px', border: '1px solid #E5E8EB', borderRadius: '10px', fontSize: '14px', outline: 'none', fontWeight: 700 }}
                />
                <span style={{ fontWeight: 700 }}>원</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>
                * 입금을 증액하시는 경우, NH농협 3516-3767-60453(염우진)으로 가입 기관명과 함께 차액을 송금해 주시면 확인 즉시 우선 노출 알고리즘이 적용됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>모집 요강 내용</label>
              <textarea
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                rows={6}
                style={{ padding: '12px', border: '1px solid #E5E8EB', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-gray"
                style={{ flex: 1, padding: '12px' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editBidAmount > 0 && editBidAmount < 1000) {
                    alert('끌올 입찰 신청 금액은 최소 1,000원입니다. (혹은 0원으로 비활성화 가능)');
                    return;
                  }
                  if (onUpdate) {
                    onUpdate(announcement.id, {
                      title: editTitle,
                      details: editDetails,
                      apply_url: editApplyUrl,
                      location: editLocation,
                      category: editCategories.join(', '),
                      bid_amount: editBidAmount
                    });
                  }
                  setIsEditing(false);
                }}
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px' }}
              >
                저장하기
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Host Management Panel */}
            {isHostUser && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F5F6FF',
                borderRadius: '16px',
                padding: '14px 18px',
                marginBottom: '20px',
                border: '1px dashed var(--color-indigo)'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>공고 관리자 패널</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-indigo)', marginTop: '2px' }}>
                    현재 입찰: {announcement.bid_amount ? `${announcement.bid_amount.toLocaleString()}원` : '0원 (무료)'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: 'var(--color-indigo-light)',
                      color: 'var(--color-indigo)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit size={14} />
                      수정
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('정말 이 공고를 삭제하시겠습니까? 학생 피드에서 즉시 제거됩니다.')) {
                        if (onDelete) onDelete(announcement.id);
                      }
                    }}
                    className="btn"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#FEE2E2',
                      color: '#EF4444',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={14} />
                      삭제
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Category & Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-indigo)',
                backgroundColor: 'var(--color-indigo-light)',
                padding: '4px 10px',
                borderRadius: '6px',
                width: 'fit-content'
              }}>
                {announcement.category}
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.3px' }}>
                {announcement.title}
              </h1>
            </div>

            {/* Poster Image */}
            <div style={{
              width: '100%',
              height: '220px',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#FAFBFC',
              marginBottom: '24px',
              border: '1px solid #F2F4F6'
            }}>
              <img
                src={announcement.image_url}
                alt={announcement.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=600&auto=format&fit=crop';
                }}
              />
            </div>

            {/* Info Grid */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', fontSize: '14px' }}>
                <span style={{ width: '80px', color: 'var(--text-tertiary)', fontWeight: 600 }}>주최 기관</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{announcement.host}</span>
              </div>
              <div style={{ display: 'flex', fontSize: '14px' }}>
                <span style={{ width: '80px', color: 'var(--text-tertiary)', fontWeight: 600 }}>접수 마감</span>
                <span style={{ color: 'var(--color-red)', fontWeight: 700 }}>
                  {getFormattedDate(announcement.deadline)}
                </span>
              </div>
              <div style={{ display: 'flex', fontSize: '14px' }}>
                <span style={{ width: '80px', color: 'var(--text-tertiary)', fontWeight: 600 }}>모집 지역</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{announcement.location}</span>
              </div>
            </div>

            {/* Tab Switcher: 모집 요강 vs 합격 족보 */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #E5E8EB',
              marginBottom: '20px',
              gap: '16px'
            }}>
              <button
                onClick={() => setActiveDetailTab('info')}
                style={{
                  padding: '10px 4px',
                  fontSize: '15.5px',
                  fontWeight: activeDetailTab === 'info' ? 800 : 500,
                  color: activeDetailTab === 'info' ? 'var(--color-indigo)' : 'var(--text-secondary)',
                  borderBottom: activeDetailTab === 'info' ? '2.5px solid var(--color-indigo)' : 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                모집 요강
              </button>
              <button
                onClick={() => setActiveDetailTab('jokbo')}
                style={{
                  padding: '10px 4px',
                  fontSize: '15.5px',
                  fontWeight: activeDetailTab === 'jokbo' ? 800 : 500,
                  color: activeDetailTab === 'jokbo' ? 'var(--color-indigo)' : 'var(--text-secondary)',
                  borderBottom: activeDetailTab === 'jokbo' ? '2.5px solid var(--color-indigo)' : 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🏆 Kkeul 합격 족보
              </button>
            </div>

            {/* TAB CONTENT: INFO */}
            {activeDetailTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', textAlign: 'left' }}>
                {/* Details Text Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, borderLeft: '4px solid var(--color-indigo)', paddingLeft: '8px', margin: 0 }}>상세 모집 요강</h2>
                  <p style={{
                    fontSize: '14.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {announcement.details}
                  </p>
                </div>

                {/* AI 세특(생기부) 핏 분석기 */}
                {!isHostUser && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #E5E8EB',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="var(--color-indigo)" /> AI 세특(생기부) 핏 분석기
                      </h3>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', backgroundColor: '#F2F4F6', padding: '3px 8px', borderRadius: '6px' }}>
                        목표: {profile?.major || '컴퓨터공학'}
                      </span>
                    </div>

                    {(() => {
                      // AI 세특 적합도 계산
                      const targetMajor = profile?.major || '컴퓨터공학';
                      const title = announcement.title.toLowerCase();
                      const category = announcement.category.toLowerCase();
                      
                      let score = 75;
                      let hashtags: string[] = [];
                      let insight = '';
                      
                      if (targetMajor.includes('컴퓨터') || targetMajor.includes('컴공') || targetMajor.includes('it') || targetMajor.includes('소프트웨어') || targetMajor.includes('sw') || targetMajor.includes('개발')) {
                        if (category.includes('it') || category.includes('개발') || title.match(/(코딩|sw|알고리즘|해커톤|로봇|웹|앱|임베디드)/)) {
                          score = 96;
                          hashtags = ['#알고리즘최적화', '#데이터분석', '#SW설계능력'];
                        } else {
                          score = 82;
                          hashtags = ['#IT기술융합', '#자료구조설계', '#문제해결력'];
                        }
                        insight = `대회 과정에서 ${announcement.host}의 핵심 과제를 해결하기 위해 데이터를 구조화하고, 효율적인 알고리즘적 설계를 설계 및 반영함. 특히 실질적인 문제 개선 프로세스를 소프트웨어 모듈로 구상하며 소프트웨어 엔지니어로서의 협업 설계 능력을 주도적으로 발휘함.`;
                      } else if (targetMajor.includes('경영') || targetMajor.includes('경제') || targetMajor.includes('비즈니스') || targetMajor.includes('창업') || targetMajor.includes('기획') || targetMajor.includes('마케팅')) {
                        if (category.includes('창업') || category.includes('기획') || category.includes('아이디어') || title.match(/(창업|아이디어|기획|마케팅|비즈니스|경영)/)) {
                          score = 98;
                          hashtags = ['#비즈니스모델', '#시장타당성검증', '#린스타트업'];
                        } else {
                          score = 85;
                          hashtags = ['#수익모델기획', '#고객문제도출', '#프로젝트조율'];
                        }
                        insight = `시장 동향 분석과 사용자 페인포인트를 바탕으로 실효성 있는 비즈니스 솔루션을 제안함. 린 스타트업 관점에서 비즈니스 타당성을 검토하고 협업을 지휘하며 문제 기획 및 리더십 역량을 증명함.`;
                      } else if (targetMajor.includes('디자인') || targetMajor.includes('미술') || targetMajor.includes('영상') || targetMajor.includes('콘텐츠') || targetMajor.includes('미디어')) {
                        if (category.includes('디자인') || category.includes('미술') || category.includes('영상') || category.includes('콘텐츠') || title.match(/(미술|디자인|영상|숏폼|콘텐츠|그림|웹툰)/)) {
                          score = 95;
                          hashtags = ['#사용자경험UX', '#프로토타이핑', '#시각화커뮤니케이션'];
                        } else {
                          score = 80;
                          hashtags = ['#콘텐츠기획', '#시각전달설계', '#UI디자인'];
                        }
                        insight = `Figma 및 미디어 디자인 실무 툴을 적극 활용하여 기획안의 핵심 요소를 유려한 목업과 프로토타입으로 제작함. 디자인 사고 방식을 바탕으로 사용자 중심의 매체 디자인을 실현하며 시각적 스토리텔링과 매체 설계 역량을 발휘함.`;
                      } else if (targetMajor.includes('인문') || targetMajor.includes('사회') || targetMajor.includes('교육') || targetMajor.includes('언어') || targetMajor.includes('문학')) {
                        score = 92;
                        hashtags = ['#인문학적통찰', '#사회문제분석', '#논리적글쓰기'];
                        insight = `사회적 제반 이슈에 대한 인문학적 고찰과 데이터 분석을 기반으로 설득력 있는 논리 체계를 구축함. 다각적 문헌 조사와 실증 대안을 포함한 논술/제안을 완성하여 비판적 분석력과 창의적 의사소통력을 나타냄.`;
                      } else {
                        score = 88;
                        hashtags = ['#문제해결적용', '#다학제간융합', '#협업시너지'];
                        insight = `주어진 진로 분야와 공모 과제 간의 융합 탐구 지향점을 설정하고 성실히 프로젝트에 참여함. 팀원의 역량을 융합하여 실용적 결과물을 이끌어내는 데 크게 기여하였음.`;
                      }

                      return (
                        <>
                          {/* Score and Bar */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>생기부 세특 연계 적합도</span>
                              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-indigo)' }}>{score}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#F2F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${score}%`, height: '100%', backgroundColor: 'var(--color-indigo)', borderRadius: '4px' }} />
                            </div>
                          </div>

                          {/* Hashtags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {hashtags.map(tag => (
                              <span key={tag} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-indigo)', backgroundColor: 'var(--color-indigo-light)', padding: '4px 8px', borderRadius: '6px' }}>
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Insight box */}
                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #EEF2F6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700 }}>추천 세특 서술식 단락</span>
                              <button
                                onClick={() => handleCopyInsight(insight)}
                                style={{
                                  background: '#FFFFFF',
                                  color: 'var(--text-secondary)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #E5E8EB',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                              >
                                {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                                {copied ? '복사 완료' : '문장 복사'}
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic', wordBreak: 'keep-all' }}>
                              &ldquo;{insight}&rdquo;
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 대회 팀원 매칭 (Team-building) */}
                {!isHostUser && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #E5E8EB',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} color="var(--color-indigo)" /> 대회 팀 빌딩 (Team Matching)
                      </h3>
                      <button
                        onClick={() => setShowTeamPostModal(true)}
                        style={{
                          border: 'none',
                          background: 'var(--color-indigo-light)',
                          color: 'var(--color-indigo)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <Plus size={12} /> 구인글 등록
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {teamPosts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '13px', border: '1.5px dashed #F2F4F6', borderRadius: '12px' }}>
                          아직 이 대회에 등록된 팀 구인글이 없습니다.<br />
                          첫 구인글을 올리고 함께할 팀원을 찾아보세요!
                        </div>
                      ) : (
                        teamPosts.map(post => {
                          const isMyPost = post.user_id === profile?.id;
                          const hasRequested = requestedPostIds.includes(post.id);
                          
                          // Badges mapping colors
                          const getRoleColor = (role: string) => {
                            if (role === '개발') return { bg: '#E5F6FF', txt: '#0070F3' };
                            if (role === '기획') return { bg: '#FFF3E0', txt: '#E65100' };
                            return { bg: '#E8F5E9', txt: '#2E7D32' };
                          };
                          
                          const myRoleColor = getRoleColor(post.my_role);
                          const wantedRoleColor = getRoleColor(post.role_wanted);

                          return (
                            <div key={post.id} style={{
                              border: '1px solid #E5E8EB',
                              borderRadius: '14px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              backgroundColor: '#FFFFFF',
                              textAlign: 'left'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>{post.user_name}</span>
                                  {isMyPost && <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#F2F4F6', color: 'var(--text-secondary)', padding: '2px 5px', borderRadius: '4px' }}>내 구인글</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <span style={{ fontSize: '9.5px', fontWeight: 700, backgroundColor: myRoleColor.bg, color: myRoleColor.txt, padding: '2px 6px', borderRadius: '4px' }}>
                                    직무: {post.my_role}
                                  </span>
                                  <span style={{ fontSize: '9.5px', fontWeight: 800, backgroundColor: wantedRoleColor.bg, color: wantedRoleColor.txt, padding: '2px 6px', borderRadius: '4px', border: '1px solid currentColor' }}>
                                    구함: {post.role_wanted}
                                  </span>
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                {post.comment}
                              </p>
                              {!isMyPost && (
                                <button
                                  onClick={() => handleSendJoinRequest(post)}
                                  disabled={hasRequested}
                                  style={{
                                    border: 'none',
                                    borderRadius: '8px',
                                    height: '36px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: hasRequested ? 'default' : 'pointer',
                                    backgroundColor: hasRequested ? '#ECFDF5' : 'var(--color-indigo)',
                                    color: hasRequested ? '#10B981' : '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {hasRequested ? <Check size={12} /> : null}
                                  {hasRequested ? '합류 요청 완료' : '🤝 팀 합류 요청 보내기'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: JOKBO */}
            {activeDetailTab === 'jokbo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }} className="animate-fade-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🏆 선배들의 합격 족보 & 역설계
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    이전 대회에서 우수한 성적을 거둔 선배들의 프로젝트 요약과 핵심 기법 분석입니다.
                  </p>
                </div>

                {(() => {
                  const category = announcement.category.toLowerCase();
                  
                  let winnerTitle = '2025 대상 선배의 프로젝트 요약';
                  let projectName = '진로 교육 격차 해소를 위한 온라인 멘토링 메이커스 프로젝트';
                  let stackList = ['Canva', 'Notion', 'PowerPoint'];
                  let successPoint = '기성 아이디어들의 맹점을 정리한 뒤, 설문 조사를 통해 사용자가 진짜 겪는 애로사항을 파악하고 이에 대한 직접 행동 해결책을 3단계로 명확히 제시한 것이 수상의 핵심 열쇠였습니다.';

                  if (category.includes('it') || category.includes('개발')) {
                    winnerTitle = '2025 대상 선배의 역설계 분석';
                    projectName = `인공지능 기반 청소년 스터디 플래너 및 이탈 예측 시스템 'StudyFit'`;
                    stackList = ['Python', 'React Native', 'Figma', 'PyTorch'];
                    successPoint = '단순 아이디어 코딩에 그치지 않고, 30명의 고교 친구들에게 3일간 베타 테스트를 진행해 받아낸 피드백 데이터(오류 발생 수, 이탈률 등)를 수치 시각화하여 최종 심사 발표에 포함했던 점이 결정적 차별점이었습니다.';
                  } else if (category.includes('창업') || category.includes('기획') || category.includes('아이디어')) {
                    winnerTitle = '2025 최우수상 선배의 사업서 역설계';
                    projectName = `천안 지역 소상공인 공동 배송 쉐어링 플랫폼 '마을배달'`;
                    stackList = ['Figma', 'Google Docs', 'Miro', 'Spreadsheet'];
                    successPoint = '공공 데이터를 분석해 타겟 고객의 이동 경로와 사용 금액을 정확히 추산하고, 실제 천안 불당동 소상공인 상점 3곳을 직접 발로 뛰어 인터뷰해 확보한 현실적 애로사항과 파트너쉽 계약안을 추가하여 기획의 실현 가능성을 강력히 어필했습니다.';
                  } else if (category.includes('디자인') || category.includes('미술') || category.includes('영상') || category.includes('콘텐츠')) {
                    winnerTitle = '2025 대상 선배의 디자인 인사이트';
                    projectName = `청소년 기후 환경 보호를 위한 1분 모션그래픽 숏폼 콘텐츠 '그린어스'`;
                    stackList = ['After Effects', 'Premiere Pro', 'Figma', 'Illustrator'];
                    successPoint = '기후 위기의 방대한 건조 데이터들을 직관적 인포그래픽과 쫀득한 스프링 모션 그래픽으로 시각화하여 눈길을 사로잡았고, 텍스트 설명을 20자 내로 줄이는 대신 감성 사운드와 AI 내레이션의 싱크를 조절해 극적 몰입감을 배가시켰습니다.';
                  }

                  return (
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '20px',
                      padding: '20px',
                      border: '1px solid #E5E8EB',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#D97706', backgroundColor: '#FFFBEB', padding: '3px 8px', borderRadius: '6px' }}>
                          {winnerTitle}
                        </span>
                        <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                          {projectName}
                        </h4>
                      </div>

                      {/* Tech Stack used */}
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>활용 기술 & 툴</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {stackList.map(stk => (
                            <span key={stk} style={{ fontSize: '11.5px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                              {stk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Key point */}
                      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          💡 수상 선배의 합격 치트키
                        </span>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55, wordBreak: 'keep-all' }}>
                          {successPoint}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Bottom Fixed Action Buttons (Centered & Pinned at bottom of 480px viewport) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        height: '84px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #E5E8EB',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
        zIndex: 80
      }}>
        {/* Calendar Sync Button */}
        <button
          onClick={handleSaveToCalendar}
          className="btn btn-gray"
          style={{
            width: '46px',
            height: '48px',
            padding: 0,
            borderRadius: '10px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="캘린더에 일정 저장"
        >
          <CalendarIcon size={16} />
          <span style={{ fontSize: '9px', fontWeight: 600 }}>저장</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="btn btn-secondary"
          style={{
            width: '46px',
            height: '48px',
            padding: 0,
            borderRadius: '10px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="공모전 공유하기"
        >
          <Share2 size={16} />
          <span style={{ fontSize: '9px', fontWeight: 600 }}>공유</span>
        </button>

        {/* ⚡ 1초 서류 자동 완성 버튼 */}
        {!isHostUser && (
          <button
            onClick={() => {
              setShow1ClickModal(true);
              setApplyProgress(0);
              setIsFillingForm(false);
              setSubmitSuccess(false);
            }}
            className="spring-active"
            style={{
              height: '48px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-indigo)',
              backgroundColor: '#F5F6FF',
              color: 'var(--color-indigo)',
              fontWeight: 800,
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.08)',
              flexShrink: 0
            }}
          >
            ⚡ Kkeul 프로필로 지원
          </button>
        )}

        {/* Web Application Apply Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!announcement.apply_url) {
              alert('접수 사이트 링크가 등록되어 있지 않습니다.');
              return;
            }
            setShowRedirectModal(true);
          }}
          className="btn btn-primary"
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '10px',
            gap: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          이동
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Toss-Style Redirect Confirmation Modal */}
      {showRedirectModal && (
        <div className="calendar-success-overlay" onClick={() => setShowRedirectModal(false)} style={{ zIndex: 120, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '320px', padding: '28px 24px', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              backgroundColor: '#F2F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Link size={24} color="var(--text-secondary)" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
              외부 사이트로 이동할까요?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: '20px' }}>
              공식 접수 사이트로 안전하게 연결해 드릴게요. 사이트에서 접수 요강을 다시 확인해 보세요.
            </p>
            
            {/* Domain Info Card */}
            <div style={{
              width: '100%',
              backgroundColor: '#FAFBFC',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              border: '1px solid #F2F4F6',
              marginBottom: '24px',
              textAlign: 'left',
              wordBreak: 'break-all',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>이동할 페이지 주소</span>
              <span style={{ fontWeight: 600, color: 'var(--color-indigo)' }}>{announcement.apply_url}</span>
            </div>

            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button 
                className="btn btn-gray" 
                onClick={() => setShowRedirectModal(false)} 
                style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
              >
                취소
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowRedirectModal(false);
                  onOpenBrowser(announcement.apply_url, announcement.title);
                }} 
                style={{ flex: 2, height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
              >
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1초 서류 자동 완성 모달 시트 */}
      {show1ClickModal && (
        <div className="calendar-success-overlay" onClick={isFillingForm ? undefined : () => { setShow1ClickModal(false); setSubmitSuccess(false); }} style={{ zIndex: 130, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            {submitSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>지원 서류 제출 완료!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
                  스마트 포트폴리오를 기반으로 한 입사 서류가 주최 기관에 정상 전달되었습니다.<br />
                  <strong style={{ color: 'var(--color-indigo)' }}>+10 XP 리워드</strong>를 획득했습니다!
                </p>
                <button
                  onClick={() => {
                    setShow1ClickModal(false);
                    setSubmitSuccess(false);
                  }}
                  className="btn btn-primary spring-active"
                  style={{ width: '100%', height: '48px', borderRadius: '12px', marginTop: '10px', fontWeight: 700 }}
                >
                  확인
                </button>
              </div>
            ) : isFillingForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
                {/* Loader Spinner */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #E5E8EB',
                  borderTop: '3px solid var(--color-indigo)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    <span>{fillingStepMessage}</span>
                    <span>{applyProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E8EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${applyProgress}%`, height: '100%', backgroundColor: 'var(--color-indigo)', borderRadius: '3px', transition: 'width 0.1s linear' }} />
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
                  서류가 자동으로 구성되고 있으니 잠시만 기다려주세요.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    1초 서류 자동 완성
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  내 마이페이지 스마트 포트폴리오 정보를 기반으로 지원 신청서가 즉시 자동 작성됩니다.
                </p>

                {/* Auto-filled details panel */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E5E8EB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12.5px'
                }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F6', paddingBottom: '6px' }}>
                    <span style={{ width: '90px', color: 'var(--text-tertiary)', fontWeight: 600 }}>이름</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{profile?.name || '홍길동'}</span>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F6', paddingBottom: '6px' }}>
                    <span style={{ width: '90px', color: 'var(--text-tertiary)', fontWeight: 600 }}>소속 학적</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {profile?.school ? `${profile.school} (${profile.grade || '고등2'})` : `고등학교 (${profile?.grade || '2학년'})`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F6', paddingBottom: '6px' }}>
                    <span style={{ width: '90px', color: 'var(--text-tertiary)', fontWeight: 600 }}>연락처</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{profile?.contact || profile?.email || '미입력'}</span>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F6', paddingBottom: '6px' }}>
                    <span style={{ width: '90px', color: 'var(--text-tertiary)', fontWeight: 600 }}>매칭 역량</span>
                    <span style={{ color: 'var(--color-indigo)', fontWeight: 700 }}>
                      Figma, VS Code, Git
                    </span>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #EEF2F6', paddingBottom: '6px' }}>
                    <span style={{ width: '90px', color: 'var(--text-tertiary)', fontWeight: 600 }}>대표 수상경력</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      교내 정보올림피아드 (최우수상)
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>자기소개서 자동 요약</span>
                    <p style={{
                      margin: 0,
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      backgroundColor: '#FFFFFF',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #E5E8EB',
                      fontStyle: 'italic'
                    }}>
                      "저는 기획/개발/디자인 스택을 다룰 수 있는 청소년입니다. 교내 대회 등에서 수상하며 협업과 문제 해결 능력을 검증받았으며, 향후 프로젝트에서 성과를 내기 위해 지원합니다."
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => setShow1ClickModal(false)}
                    className="btn btn-gray"
                    style={{ flex: 1, height: '44px', borderRadius: '10px', fontWeight: 700, fontSize: '13px' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={startAutoApply}
                    className="btn btn-primary spring-active"
                    style={{
                      flex: 2,
                      height: '44px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, var(--color-indigo) 0%, #6366F1 100%)',
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    ⚡ 서류 자동 제출
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 팀원 구인 등록 모달 */}
      {showTeamPostModal && (
        <div className="calendar-success-overlay" onClick={() => setShowTeamPostModal(false)} style={{ zIndex: 130, backdropFilter: 'blur(5px)' }}>
          <div className="calendar-success-modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ width: '360px', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'left' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤝 팀원 구인글 올리기
            </h3>
            
            <form onSubmit={handleCreateTeamPost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>내 직무 역할</label>
                <select
                  value={myRole}
                  onChange={(e) => setMyRole(e.target.value as any)}
                  style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', background: '#FFFFFF', outline: 'none' }}
                >
                  <option value="개발">개발 (Developer)</option>
                  <option value="기획">기획 (Planner)</option>
                  <option value="디자인">디자인 (Designer)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>찾는 팀원 역할</label>
                <select
                  value={wantedRole}
                  onChange={(e) => setWantedRole(e.target.value as any)}
                  style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', background: '#FFFFFF', outline: 'none' }}
                >
                  <option value="기획">기획 (Planner)</option>
                  <option value="디자인">디자인 (Designer)</option>
                  <option value="개발">개발 (Developer)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>구인 한줄 소개 및 포부</label>
                <textarea
                  value={teamComment}
                  onChange={(e) => setTeamComment(e.target.value)}
                  placeholder="예: 경시대회 출전 목표이며, 기획안이 준비되어 있는 figma 웹 디자이너 한 분 모십니다!"
                  rows={3}
                  style={{ padding: '10px', fontSize: '13px', border: '1px solid #E5E8EB', borderRadius: '8px', resize: 'none', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>연락 정보 (전화번호, 카톡ID 등)</label>
                <input
                  type="text"
                  value={teamContact}
                  onChange={(e) => setTeamContact(e.target.value)}
                  placeholder="예: 010-1234-5678 또는 카톡아이디 study12"
                  style={{ padding: '10px', fontSize: '14px', border: '1px solid #E5E8EB', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTeamPostModal(false)}
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
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
