import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart3,
  Bookmark,
  Building2,
  Calendar as CalendarIcon,
  Compass,
  Home,
  PlusCircle,
  ShieldCheck,
  User
} from 'lucide-react';
import type { Announcement, Profile } from '../types';
import logoImg from '../assets/logo.png';
import { LEGAL_DOCS, type LegalDoc } from '../legal/terms';
import { LegalDocModal } from './LegalDocModal';
import { getDDay, isClosed } from '../utils/dday';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.wjedulab.kkeul';

interface DesktopShellProps {
  profile: Profile | null;
  activeTab: string;
  announcements: Announcement[];
  bookmarks: string[];
  onNavigate: (tab: string) => void;
  onOpenAnnouncement: (ann: Announcement) => void;
  // 관리자 계정일 때만 전달됨
  onOpenAdmin?: () => void;
}

const STUDENT_TABS = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'calendar', label: '캘린더', icon: CalendarIcon },
  { id: 'bookmarks', label: '보관함', icon: Bookmark },
  { id: 'club', label: '동아리', icon: Compass },
  { id: 'profile', label: '내 정보', icon: User },
  { id: 'partners', label: '파트너', icon: Building2 }
];

const HOST_TABS = [
  { id: 'home', label: '내 공고', icon: Home },
  { id: 'register', label: '공고 등록', icon: PlusCircle },
  { id: 'stats', label: '통계', icon: BarChart3 },
  { id: 'profile', label: '마이페이지', icon: User }
];


// PC(넓은 화면)에서만 보이는 좌우 패널. 가운데 앱 화면(480px)은 그대로 둔다.
export const DesktopShell: React.FC<DesktopShellProps> = ({
  profile,
  activeTab,
  announcements,
  bookmarks,
  onNavigate,
  onOpenAnnouncement,
  onOpenAdmin
}) => {
  const [openDoc, setOpenDoc] = useState<LegalDoc['id'] | null>(null);
  const isHost = profile?.role === 'host';
  const tabs = isHost ? HOST_TABS : STUDENT_TABS;

  const upcoming = useMemo(() => {
    const now = Date.now();
    return announcements
      .filter(a => a.deadline && !isClosed(a.deadline) && new Date(a.deadline).getTime() > now - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [announcements]);

  const saved = useMemo(
    () => bookmarks.map(id => announcements.find(a => a.id === id)).filter((a): a is Announcement => !!a).slice(0, 5),
    [announcements, bookmarks]
  );

  const legalLinks = (
    <div className="desk-legal">
      <button type="button" onClick={() => setOpenDoc('terms')}>이용약관</button>
      <button type="button" onClick={() => setOpenDoc('policy')}><strong>개인정보 처리방침</strong></button>
      <span>© 2026 Telosix</span>
    </div>
  );

  const installCard = (
    <a className="desk-install" href={PLAY_URL} target="_blank" rel="noopener noreferrer">
      <div className="desk-install-qr">
        <QRCodeSVG value={PLAY_URL} size={64} level="M" />
      </div>
      <div>
        <strong>휴대폰에서 끌 쓰기</strong>
        <span>QR을 찍으면 Google Play로 이동해요</span>
      </div>
    </a>
  );

  return (
    <>
      <aside className="desk-left" aria-label="끌 메뉴">
        <div className="desk-brand">
          <img src={logoImg} alt="" />
          <div>
            <strong>끌</strong>
            <span>청소년 대회 팀원 찾기</span>
          </div>
        </div>

        {profile ? (
          <>
            <nav className="desk-nav">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="desk-nav-item"
                  aria-current={activeTab === id ? 'page' : undefined}
                  onClick={() => onNavigate(id)}
                >
                  <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                  {label}
                </button>
              ))}
              {onOpenAdmin && (
                <button type="button" className="desk-nav-item" onClick={onOpenAdmin}>
                  <ShieldCheck size={18} strokeWidth={1.8} />
                  관리자
                </button>
              )}
            </nav>

            <button type="button" className="desk-me" onClick={() => onNavigate('profile')}>
              <span className="desk-me-avatar" aria-hidden="true">{profile.name.slice(0, 1)}</span>
              <span className="desk-me-text">
                <strong>{profile.name}</strong>
                <span>{[profile.school, profile.grade].filter(Boolean).join(' ') || (isHost ? '주최 회원' : '학생 회원')}</span>
              </span>
              <span className="desk-me-xp">{(profile.xp || 0).toLocaleString()} XP</span>
            </button>
          </>
        ) : (
          <div className="desk-pitch">
            <h2>대회에 같이 나갈 팀원,<br />끌에서 찾으세요</h2>
            <ul>
              <li>관심 분야에 맞춘 청소년 대회 50여 개</li>
              <li>대회별 팀원 모집 게시판</li>
              <li>우리 학교 동아리 모집과 지원</li>
            </ul>
          </div>
        )}

        <div className="desk-left-bottom">
          {installCard}
          {legalLinks}
        </div>
      </aside>

      {profile && !isHost && (
        <aside className="desk-right" aria-label="빠른 보기">
          <section className="desk-panel">
            <h3>마감 임박</h3>
            {upcoming.length === 0 ? (
              <p className="desk-empty">곧 마감되는 공고가 없어요.</p>
            ) : (
              <ul>
                {upcoming.map(a => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onOpenAnnouncement(a)}>
                      <span className="desk-dday">{getDDay(a.deadline)}</span>
                      <span className="desk-item-text">
                        <strong>{a.title}</strong>
                        <span>{a.host}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="desk-panel">
            <h3>찜한 공고</h3>
            {saved.length === 0 ? (
              <p className="desk-empty">마음에 드는 공고를 찜하면 여기 모여요.</p>
            ) : (
              <ul>
                {saved.map(a => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onOpenAnnouncement(a)}>
                      <span className="desk-dday">{getDDay(a.deadline)}</span>
                      <span className="desk-item-text">
                        <strong>{a.title}</strong>
                        <span>{a.host}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {bookmarks.length > saved.length && (
              <button type="button" className="desk-more" onClick={() => onNavigate('bookmarks')}>보관함에서 모두 보기</button>
            )}
          </section>

          <p className="desk-tip">
            스와이프 카드에서 <kbd>←</kbd> 관심 없음 · <kbd>→</kbd> 관심 있음
          </p>
        </aside>
      )}

      {openDoc && <LegalDocModal doc={LEGAL_DOCS[openDoc]} onClose={() => setOpenDoc(null)} />}
    </>
  );
};
