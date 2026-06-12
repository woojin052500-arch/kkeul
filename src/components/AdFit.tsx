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

export const AdFitNativeCard: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-V9hsnH4cMSNICaii', width = '100%', height = '100%', className, style, isActive = true }) => {
  return (
    <div className={className} style={{ ...style, position: 'relative', width: width === '100%' ? '100%' : `${width}px`, height: height === '100%' ? '100%' : `${height}px`, background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF0F5 100%)',  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(255, 182, 193, 0.15)',  padding: '20px', opacity: isActive ? 1 : 0, transition: 'opacity 0.3s ease-in-out', pointerEvents: isActive ? 'auto' : 'none' }}>
      
      
      {/* 귀여운 문구 영역 */}
      <div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>💖</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FF6B6B', margin: 0, letterSpacing: '-0.5px' }}>서버비에 큰 도움이 됩니다!</h3>
          <span style={{ fontSize: '20px' }}>💖</span>
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#495057', margin: 0, background: 'rgba(255,255,255,0.6)', padding: '4px 12px', borderRadius: '12px' }}>
          개발자를 위해 한 번씩만 눌러주세요 🥺
        </p>
      </div>

      {/* 250x250 카카오 광고 컨테이너 - 시각적 분리감 부여 */}
      <div style={{ width: '250px', height: '250px',   boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.04)', position: 'relative' }}>
        {isActive && !Capacitor.isNativePlatform() && (
          <iframe 
            src={`/adfit.html?unit=${unit}&width=250&height=250`} 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            scrolling="no" 
            title="Kakao AdFit" 
          />
        )}
      </div>

      
      
      
      
      
    </div>
  );
});

export const AdFitBanner100: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-EdZGhdPNNZvANVdn', width = '100%', className, style }) => {
  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6',  display: 'flex', alignItems: 'center', justifyContent: 'center',  margin: '16px 0', position: 'relative' }}>
      
      {!Capacitor.isNativePlatform() && (
        <iframe 
          src={`/adfit.html?unit=${unit}&width=${width === '100%' ? '320' : width.toString()}&height=100`} 
          style={{ width: '100%', height: '100px', border: 'none' }} 
          scrolling="no" 
          title="Kakao AdFit Banner" 
        />
      )}
    </div>
  );
});

export const AdFitBanner100_Second: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-nADIaKSVsknAYWek', width = '100%', className, style }) => {
  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6',  display: 'flex', alignItems: 'center', justifyContent: 'center',  margin: '16px 0', position: 'relative' }}>
      
      {!Capacitor.isNativePlatform() && (
        <iframe 
          src={`/adfit.html?unit=${unit}&width=${width === '100%' ? '320' : width.toString()}&height=100`} 
          style={{ width: '100%', height: '100px', border: 'none' }} 
          scrolling="no" 
          title="Kakao AdFit Banner" 
        />
      )}
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
