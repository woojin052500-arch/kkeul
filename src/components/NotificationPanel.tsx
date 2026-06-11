import React, { useState } from 'react';
import type { Announcement } from '../types';
import { Bell, Sparkles, AlertCircle, Play } from 'lucide-react';

interface NotificationPanelProps {
  announcements: Announcement[];
  bookmarks: string[];
  onTriggerPush: (title: string, message: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  announcements,
  bookmarks,
  onTriggerPush
}) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(
    'Notification' in window ? Notification.permission === 'granted' : false
  );

  const bookmarkedAnnouncements = announcements.filter((ann) =>
    bookmarks.includes(ann.id)
  );

  // 브라우저 네이티브 알림 요청
  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림 API를 지원하지 않습니다.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPermissionGranted(true);
      onTriggerPush('알림 승인 완료', '이제 끌(Kkeul)에서 실시간으로 마감 알림을 보내드릴게요!');
    }
  };

  // 모의 24시간 전 푸시 트리거
  const handleTest24hPush = (annTitle: string) => {
    onTriggerPush(
      '마감 24시간 전 리마인드',
      `찜해두신 '${annTitle}' 공고 마감이 24시간 남았어요! 일정 조율에 늦지 마세요.`
    );
  };

  // 모의 3시간 전 푸시 트리거
  const handleTest3hPush = (annTitle: string) => {
    onTriggerPush(
      '마감 임박 (3시간 전)',
      `찜해두신 '${annTitle}' 공고 접수 마감이 딱 3시간 남았어요! 바로 지원해 보세요.`
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>족집게 리마인드 푸시</h1>
        <p>찜한 공고의 마감 24시간 전, 3시간 전에 놓치지 않게 스마트 알림을 보내드려요.</p>
      </div>

      {/* Permission Box */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-indigo)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>네이티브 브라우저 알림 설정</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {permissionGranted 
                ? '브라우저 알림이 켜져 있습니다. 실시간 알림 수신이 가능합니다.' 
                : '마감 직전 푸시를 화면에 바로 띄우려면 알림을 허용해 주세요.'}
            </p>
          </div>
        </div>
        {!permissionGranted && (
          <button 
            onClick={requestBrowserPermission}
            className="btn btn-primary"
            style={{ padding: '8px 12px', fontSize: '12px', width: 'auto', flexShrink: 0, borderRadius: '8px' }}
          >
            켜기
          </button>
        )}
      </div>

      {/* Active Reminder Schedules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          현재 동작 중인 알림 ({bookmarkedAnnouncements.length * 2}개)
        </h3>

        {bookmarkedAnnouncements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookmarkedAnnouncements.map((ann) => (
              <div
                key={ann.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E8EB',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ann.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span>24시간 전 푸시 대기</span>
                    <span>•</span>
                    <span>3시간 전 푸시 대기</span>
                  </div>
                </div>

                {/* Tester Buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px dashed #F2F4F6', paddingTop: '10px' }}>
                  <button
                    onClick={() => handleTest24hPush(ann.title)}
                    className="btn btn-gray"
                    style={{
                      padding: '8px 10px',
                      fontSize: '11px',
                      borderRadius: '8px',
                      gap: '4px',
                      flex: 1
                    }}
                  >
                    <Play size={10} />
                    24H 전 알림 테스트
                  </button>
                  <button
                    onClick={() => handleTest3hPush(ann.title)}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 10px',
                      fontSize: '11px',
                      borderRadius: '8px',
                      gap: '4px',
                      flex: 1
                    }}
                  >
                    <Bell size={10} />
                    3H 전 알림 테스트
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#FFFFFF',
            border: '1px dashed #CCD2E3',
            borderRadius: '16px',
            color: 'var(--text-tertiary)',
            fontSize: '13px'
          }}>
            <Bell size={24} style={{ color: '#CCD2E3', marginBottom: '8px' }} />
            <br />
            공고를 찜하면 리마인드 푸시가 자동으로 예약됩니다.
          </div>
        )}
      </div>

      {/* Gamified Explain */}
      <div style={{
        backgroundColor: 'var(--color-cyan-light)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} />
          알고 계셨나요?
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          끌(Kkeul)의 족집게 리마인드 푸시를 통해 공고 마감을 확인하고 외부 접수 사이트에 지원하면 최종 마감 누락 확률이 87%나 줄어듭니다!
        </p>
      </div>

    </div>
  );
};
