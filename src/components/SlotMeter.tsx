import React from 'react';

interface SlotMeterProps {
  slots?: number;
  filled?: number;
  // 한 줄로 줄여 쓸 때 (저장한 구인글 목록 등)
  compact?: boolean;
}

// 팀원 모집 "남은 자리": 구하는 인원만큼 동그라미를 두고 채워진 자리는 까맣게 보여 준다
export const SlotMeter: React.FC<SlotMeterProps> = ({ slots = 1, filled = 0, compact = false }) => {
  const total = Math.min(Math.max(slots, 1), 10);
  const taken = Math.min(Math.max(filled, 0), total);
  const left = total - taken;
  const text = left === 0 ? `모집 마감 (${taken}/${total})` : left === 1 ? `${total}명 모집 중 · 마지막 1자리` : `${total}명 모집 중 · ${left}자리 남음`;

  return (
    <div className="slot-meter" data-full={left === 0 ? 'true' : undefined} style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px' }} role="img" aria-label={text}>
      <span aria-hidden="true" style={{ display: 'inline-flex', gap: '4px' }}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            style={{
              width: compact ? '9px' : '12px',
              height: compact ? '9px' : '12px',
              borderRadius: '50%',
              border: '1.5px solid var(--color-ink)',
              background: i < taken ? 'var(--color-ink)' : 'transparent',
              boxSizing: 'border-box'
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: compact ? '11.5px' : '12px', fontWeight: 800, color: left === 0 ? 'var(--text-tertiary)' : left === 1 ? 'var(--color-red)' : 'var(--text-primary)' }}>
        {text}
      </span>
    </div>
  );
};
