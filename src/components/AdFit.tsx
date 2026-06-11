import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface AdFitProps {
  unit?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const AdFitNativeCard: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-V9hsnH4cMSNICaii', width = '100%', height = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    if (isLoaded.current || !containerRef.current) return;
    isLoaded.current = true;

    containerRef.current.innerHTML = '';
    
    const failCallbackName = `adfit_fail_${unit.replace(/-/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    (window as any)[failCallbackName] = () => {
      console.log(`AdFit load failed or empty for unit: ${unit}`);
      setIsFailed(true);
    };

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '250' : width.toString());
    ins.setAttribute('data-ad-height', height === '100%' ? '250' : height.toString());
    ins.setAttribute('data-ad-onfail', failCallbackName);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[failCallbackName];
    };
  }, [unit, width, height]);

  return (
    <div className={className} style={{ ...style, position: 'relative', width: width === '100%' ? '100%' : `${width}px`, height: height === '100%' ? '100%' : `${height}px`, background: '#FFFFFF', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      {isFailed ? (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#CBD5E1', letterSpacing: '1px' }}>KKEUL</span>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px', fontWeight: 500 }}>추천을 준비중입니다</span>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
      )}
    </div>
  );
});

export const AdFitBanner100: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-EdZGhdPNNZvANVdn', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    if (isLoaded.current || !containerRef.current) return;
    isLoaded.current = true;

    containerRef.current.innerHTML = '';

    const failCallbackName = `adfit_fail_${unit.replace(/-/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    (window as any)[failCallbackName] = () => {
      console.log(`AdFit load failed or empty for unit: ${unit}`);
      setIsFailed(true);
    };

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
    ins.setAttribute('data-ad-height', '100');
    ins.setAttribute('data-ad-onfail', failCallbackName);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[failCallbackName];
    };
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, width: width === '100%' ? '100%' : `${width}px`, minHeight: '100px', background: '#F2F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '16px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '9px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      {isFailed ? (
        <div style={{ width: '100%', minHeight: '100px', background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#CBD5E1', letterSpacing: '1px' }}>KKEUL</span>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
      )}
    </div>
  );
});

export const AdFitFixedBanner50: React.FC<AdFitProps> = React.memo(({ unit = 'DAN-xDjPylBX9XVfPMUY', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const [isFailed, setIsFailed] = useState(false);

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
    
    const failCallbackName = `adfit_fail_${unit.replace(/-/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    (window as any)[failCallbackName] = () => {
      console.log(`AdFit load failed or empty for unit: ${unit}`);
      setIsFailed(true);
    };

    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.display = 'none';
    ins.setAttribute('data-ad-unit', unit);
    ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
    ins.setAttribute('data-ad-height', '50');
    ins.setAttribute('data-ad-onfail', failCallbackName);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://t1.kakaocdn.net/kas/static/ba.min.js?cb=${Date.now()}`;
    script.async = true;

    containerRef.current.appendChild(ins);
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[failCallbackName];
    };
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, position: 'fixed', bottom: '65px', left: 0, width: '100%', zIndex: 999, minHeight: '50px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #E5E8EB', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)' }}>
      {isFailed ? (
        <div style={{ width: '100%', height: '50px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#CBD5E1', letterSpacing: '1px' }}>KKEUL</span>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
      )}
    </div>
  );
});
