import React, { useContext, useEffect, useId, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ADFIT_UNITS, AD_PLACEMENTS, type AdPlacement } from '../config/adfit';
import { AdScope } from './adScope';

// AdFit 정책을 지키기 위한 규칙
// - 광고 스크립트를 바꾸거나 꾸미지 않는다 (둥근 모서리·그림자·테두리·강조 금지)
// - 광고를 누르라고 유도하는 문구를 쓰지 않는다
// - 같은 광고 단위를 한 화면에 두 번 띄우지 않는다 (AD_PLACEMENTS 참고)
// - 광고가 없으면 빈칸을 남기지 않고 자리를 접는다


type AdMessage = { source: 'kkeul-adfit'; slot: string; status: 'fail' | 'ok' };

const useAdStatus = (slot: string, onFail?: () => void) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as Partial<AdMessage> | null;
      if (!data || data.source !== 'kkeul-adfit' || data.slot !== slot) return;
      if (data.status === 'fail') {
        setFailed(true);
        onFail?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slot, onFail]);
  return failed;
};

const adSrc = (unit: string, width: number, height: number, slot: string) =>
  `/adfit.html?unit=${encodeURIComponent(unit)}&width=${width}&height=${height}&slot=${encodeURIComponent(slot)}`;

interface AdSlotProps {
  placement: AdPlacement;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  // true 면 광고가 오지 않아도 자리를 접지 않는다
  keep?: boolean;
}

// 콘텐츠 사이에 들어가는 배너 (기본 320x100)
export const AdSlot: React.FC<AdSlotProps> = ({ placement, width = 320, height = 100, style, keep = false }) => {
  const scopeActive = useContext(AdScope);
  const slot = useId();
  const failed = useAdStatus(slot);
  const unit = ADFIT_UNITS[AD_PLACEMENTS[placement]];

  if (Capacitor.isNativePlatform() || !scopeActive || (failed && !keep) || !unit) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: `${height}px`, ...style }}>
      <iframe
        src={adSrc(unit, width, height, slot)}
        width={width}
        height={height}
        loading="lazy"
        scrolling="no"
        title="광고"
        style={{ border: 'none', display: 'block', maxWidth: '100%' }}
      />
    </div>
  );
};

interface AdFitCardProps {
  isActive?: boolean;
}

// 스와이프 카드 사이에 들어가는 250x250 광고. 광고가 오지 않아도 카드는 유지한다.
export const AdFitNativeCard: React.FC<AdFitCardProps> = React.memo(({ isActive = true }) => {
  const scopeActive = useContext(AdScope);
  const slot = useId();
  const unit = ADFIT_UNITS[AD_PLACEMENTS.homeSwipeDeck];

  if (Capacitor.isNativePlatform() || !unit) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: 'var(--color-card-bg)',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      <span style={{ width: '250px', fontSize: '11px', color: 'var(--text-tertiary)' }}>광고</span>
      <div style={{ width: '250px', height: '250px' }}>
        {isActive && scopeActive && (
          <iframe
            src={adSrc(unit, 250, 250, slot)}
            width={250}
            height={250}
            scrolling="no"
            title="광고"
            style={{ border: 'none', display: 'block' }}
          />
        )}
      </div>
    </div>
  );
});
