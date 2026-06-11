import React, { useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // Only attempt to load if Capacitor is not Native (it's web)
    if (Capacitor.isNativePlatform()) {
      return;
    }

    if (!isActive) return;

    if (containerRef.current && !isLoaded.current) {
      const ins = document.createElement('ins');
      ins.className = 'kakao_ad_area';
      ins.style.display = 'none';
      ins.setAttribute('data-ad-unit', unit);
      ins.setAttribute('data-ad-width', width.toString());
      ins.setAttribute('data-ad-height', height.toString());
      
      // 대체 스크립트 실행 함수 등록
      (window as any).kakaoAdFailCallback = () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8B 100%); color: white; border-radius: 12px; font-weight: bold; padding: 20px; box-sizing: border-box; text-align: center;">
              <span style="font-size: 24px; margin-bottom: 8px;">KKEUL</span>
              <span style="font-size: 14px; opacity: 0.9;">Sponsored Space</span>
            </div>
          `;
        }
      };
      ins.setAttribute('data-ad-onfail', 'kakaoAdFailCallback');

      containerRef.current.appendChild(ins);

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://t1.kakaocdn.net/kas/static/ba.min.js';
      containerRef.current.appendChild(script);

      isLoaded.current = true;
    }
  }, [unit, width, height, isActive]);

  return (
    <div className={className} style={{ ...style, position: 'relative', width: width === '100%' ? '100%' : `${width}px`, height: height === '100%' ? '100%' : `${height}px`, background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF0F5 100%)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(255, 182, 193, 0.15)', overflow: 'hidden', padding: '20px', opacity: isActive ? 1 : 0, transition: 'opacity 0.3s ease-in-out', pointerEvents: isActive ? 'auto' : 'none' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', zIndex: 10, letterSpacing: '0.5px' }}>AD</div>
      
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
      <div style={{ width: '250px', height: '250px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.04)', position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
      </div>

      {/* 드래그를 가능하게 하는 투명 오버레이 (가장자리 40px) */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40px', zIndex: 20 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '40px', zIndex: 20 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', zIndex: 20 }} />
    </div>
  );
});

export const AdFitBanner100: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-EdZGhdPNNZvANVdn', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current || !containerRef.current) return;
    isLoaded.current = true;

    containerRef.current.innerHTML = '';

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
    ins.setAttribute('data-ad-height', '100');

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '16px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '9px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    </div>
  );
});

export const AdFitBanner100_Second: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-nADIaKSVsknAYWek', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current || !containerRef.current) return;
    isLoaded.current = true;

    containerRef.current.innerHTML = '';

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
    ins.setAttribute('data-ad-height', '100');

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '16px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '9px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    </div>
  );
});

export const AdFitFixedBanner50: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-xDjPylBX9XVfPMUY', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  if (Capacitor.isNativePlatform()) {
    return null;
  }

  useEffect(() => {
    if (isLoaded.current || !containerRef.current) return;
    isLoaded.current = true;

    const mainContainer = document.querySelector('.main-feed-container') as HTMLElement | null;
    if (mainContainer) {
      const currentPb = parseInt(window.getComputedStyle(mainContainer).paddingBottom || '0');
      if (currentPb < 100) {
        mainContainer.style.paddingBottom = '110px';
      }
    }

    containerRef.current.innerHTML = '';

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
    ins.setAttribute('data-ad-height', '50');

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, position: 'fixed', bottom: '65px', left: 0, width: '100%', zIndex: 999, minHeight: '50px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #E5E8EB', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    </div>
  );
});
