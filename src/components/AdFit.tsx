import React from 'react';
import { Capacitor } from '@capacitor/core';

interface AdFitProps {
  unit?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  isActive?: boolean;
}

// 스와이프 카드 사이에 들어가는 250x250 광고.
// AdFit 정책: 광고 스크립트 변형·강조(둥근 모서리, 그림자, 테두리 등) 금지, 클릭 유도 문구 금지.
// 그래서 광고 주변에는 "광고" 표시만 두고 아무것도 꾸미지 않는다.
export const AdFitNativeCard: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-V9hsnH4cMSNICaii', width = '100%', height = '100%', className, style, isActive = true }) => {
  if (Capacitor.isNativePlatform()) return null; // 앱에서는 웹 광고를 쓰지 않음 (네이티브 하단 배너 사용)
  return (
    <div className={className} style={{ ...style, position: 'relative', width: width === '100%' ? '100%' : `${width}px`, height: height === '100%' ? '100%' : `${height}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--color-card-bg)', opacity: isActive ? 1 : 0, transition: 'opacity 0.3s ease-in-out', pointerEvents: isActive ? 'auto' : 'none' }}>
      <span style={{ alignSelf: 'center', width: '250px', fontSize: '11px', color: 'var(--text-tertiary)' }}>광고</span>
      <div style={{ width: '250px', height: '250px' }}>
        {isActive && (
          <iframe
            src={`/adfit.html?unit=${unit}&width=250&height=250`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            scrolling="no"
            title="Kakao AdFit"
          />
        )}
      </div>
    </div>
  );
});

export const AdFitBanner100: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-EdZGhdPNNZvANVdn', width = '100%', className, style }) => {
  if (Capacitor.isNativePlatform()) return null; // 앱에서는 네이티브 하단 배너만 사용
  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6',  display: 'flex', alignItems: 'center', justifyContent: 'center',  margin: '16px 0', position: 'relative' }}>
      
      <iframe 
        src={`/adfit.html?unit=${unit}&width=${width === '100%' ? '320' : width.toString()}&height=100`} 
        style={{ width: '100%', height: '100px', border: 'none' }} 
        scrolling="no" 
        title="Kakao AdFit Banner" 
      />
    </div>
  );
});

export const AdFitBanner100_Second: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-nADIaKSVsknAYWek', width = '100%', className, style }) => {
  if (Capacitor.isNativePlatform()) return null; // 앱에서는 네이티브 하단 배너만 사용
  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6',  display: 'flex', alignItems: 'center', justifyContent: 'center',  margin: '16px 0', position: 'relative' }}>
      
      <iframe 
        src={`/adfit.html?unit=${unit}&width=${width === '100%' ? '320' : width.toString()}&height=100`} 
        style={{ width: '100%', height: '100px', border: 'none' }} 
        scrolling="no" 
        title="Kakao AdFit Banner" 
      />
    </div>
  );
});

export const AdFitFixedBanner50: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-xDjPylBX9XVfPMUY', width = '100%', className, style }) => {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  React.useEffect(() => {
    const mainContainer = document.querySelector('.main-feed-container') as HTMLElement | null;
    if (mainContainer) {
      const currentPb = parseInt(window.getComputedStyle(mainContainer).paddingBottom || '0');
      if (currentPb < 100) {
        mainContainer.style.paddingBottom = '110px';
      }
    }
  }, []);

  return (
    <div className={className} style={{ ...style, position: 'fixed', bottom: '65px', left: 0, width: '100%', zIndex: 999, minHeight: '50px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #E5E8EB', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)' }}>
      <iframe 
        src={`/adfit.html?unit=${unit}&width=${width === '100%' ? '320' : width.toString()}&height=50`} 
        style={{ width: '100%', height: '50px', border: 'none' }} 
        scrolling="no" 
        title="Kakao AdFit Fixed Banner" 
      />
    </div>
  );
});
