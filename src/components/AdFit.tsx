import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface AdFitProps {
  unit?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

// 공통 로직: 컨테이너에 스크립트와 ins 태그 삽입
const insertAdFitScript = (container: HTMLDivElement | null, unit: string, width: string | number, height: string | number) => {
  if (!container) return;
  container.innerHTML = '';
  
  const ins = document.createElement('ins');
  ins.className = 'kakao_ad_area';
  ins.style.display = 'none';
  ins.setAttribute('data-ad-unit', unit);
  ins.setAttribute('data-ad-width', width === '100%' ? '320' : width.toString());
  ins.setAttribute('data-ad-height', height === '100%' ? '250' : height.toString());

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://t1.kakaocdn.net/kas/static/ba.min.js';
  script.async = true;

  container.appendChild(ins);
  container.appendChild(script);
};

export const AdFitNativeCard: React.FC<AdFitProps> = ({ unit = 'DAN-V9hsnH4cMSNICaii', width = '250', height = '250', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    insertAdFitScript(containerRef.current, unit, width, height);
  }, [unit, width, height]);

  return (
    <div className={className} style={{ ...style, position: 'relative', width, height, background: '#FFFFFF', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 앱에서 광고가 뜨지 않더라도 원래의 레이아웃(틀)을 유지하기 위함 */}
      </div>
    </div>
  );
};

export const AdFitBanner100: React.FC<AdFitProps> = ({ unit = 'DAN-EdZGhdPNNZvANVdn', width = '320', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    insertAdFitScript(containerRef.current, unit, width, 100);
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, minHeight: '100px', width, background: '#F2F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '16px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '9px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px', zIndex: 10 }}>AD</div>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    </div>
  );
};

export const AdFitFixedBanner50: React.FC<AdFitProps> = ({ unit = 'DAN-xDjPylBX9XVfPMUY', width = '100%', className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 안드로이드 네이티브 앱 환경일 경우 MainActivity.java에서 네이티브 배너를 이미 띄우고 있으므로
  // 웹(React)에서는 렌더링하지 않아 중복 노출을 방지합니다. (로컬호스트/웹에서는 정상 노출)
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  useEffect(() => {
    const mainContainer = document.querySelector('.main-feed-container') as HTMLElement | null;
    if (mainContainer) {
      const currentPb = parseInt(window.getComputedStyle(mainContainer).paddingBottom || '0');
      if (currentPb < 100) {
        mainContainer.style.paddingBottom = '110px';
      }
    }
    insertAdFitScript(containerRef.current, unit, width, 50);
  }, [unit, width]);

  return (
    <div className={className} style={{ ...style, position: 'fixed', bottom: '65px', left: 0, width: '100%', zIndex: 999, minHeight: '50px', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #E5E8EB', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    </div>
  );
};
