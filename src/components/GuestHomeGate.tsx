import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Announcement } from '../types';
import { isClosed } from '../utils/dday';

interface GuestHomeGateProps {
  announcements: Announcement[];
  onSignup: () => void;
}

const BENEFITS = [
  '접수 중인 공고 전체와 마감 알림',
  '대회마다 팀원 구하기·합류 요청',
  '세특(생기부)에 이어 쓸 활동 요약 초안',
  '내 계열에 맞춘 스와이프 추천'
];

// 비회원 홈: 공고 목록 대신 가입하면 볼 수 있는 것을 실제 숫자로 보여 준다
export const GuestHomeGate: React.FC<GuestHomeGateProps> = ({ announcements, onSignup }) => {
  const { total, byCategory } = useMemo(() => {
    const open = announcements.filter(a => a.deadline && !isClosed(a.deadline));
    const counts = new Map<string, number>();
    for (const a of open) {
      for (const c of String(a.category || '').split(',').map(x => x.trim()).filter(Boolean)) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    return { total: open.length, byCategory: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
  }, [announcements]);

  return (
    <section className="guest-gate" style={{ alignItems: 'stretch', textAlign: 'left', gap: '14px' }}>
      <div>
        <strong style={{ fontSize: '20px', lineHeight: 1.4, display: 'block' }}>
          {total > 0
            ? <>지금 접수 중인 공고 <span style={{ color: 'var(--color-indigo)' }}>{total.toLocaleString()}개</span></>
            : '접수 중인 공고를 가입하면 볼 수 있어요'}
        </strong>
        <p style={{ marginTop: '4px' }}>가입하면 전부 볼 수 있어요. 가입은 이메일만 있으면 1분이면 돼요.</p>
      </div>

      {byCategory.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {byCategory.map(([name, n]) => (
            <span key={name} style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--color-bg-gray)', padding: '6px 10px', borderRadius: '8px' }}>
              {name} {n}
            </span>
          ))}
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {BENEFITS.map(b => (
          <li key={b} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <Check size={16} color="var(--color-indigo)" strokeWidth={3} style={{ flexShrink: 0, marginTop: '2px' }} />
            {b}
          </li>
        ))}
      </ul>

      <button type="button" className="btn btn-primary" onClick={onSignup}>무료로 가입하고 전체 보기</button>
    </section>
  );
};
