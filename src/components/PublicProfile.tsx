import React, { useEffect, useState } from 'react';
import { db } from '../supabaseClient';

interface PublicProfileData {
  name: string;
  grade: string | null;
  bio: string | null;
  interests: string[];
  badges: string[];
  awards: { title: string; date?: string }[];
  portfolio_urls: string[];
  xp: number;
}

// 명함 QR로 여는 공개 프로필 (로그인 없이 열람, 학교·지역·연락처는 표시하지 않음)
export const PublicProfile: React.FC<{ shortId: string }> = ({ shortId }) => {
  const [state, setState] = useState<'loading' | 'found' | 'missing' | 'error'>('loading');
  const [data, setData] = useState<PublicProfileData | null>(null);

  useEffect(() => {
    let alive = true;
    db.getPublicProfile(shortId)
      .then((res) => {
        if (!alive) return;
        if (res) {
          setData(res as unknown as PublicProfileData);
          setState('found');
        } else {
          setState('missing');
        }
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [shortId]);

  const ink = '#1F1D1A';
  const muted = '#7A7368';
  const rule = '#E6E0D6';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-gray)', padding: '32px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '1px', background: 'var(--color-indigo)' }} />
          KKEUL
        </div>

        {state === 'loading' && <p style={{ color: muted, fontSize: '14px' }}>프로필을 불러오는 중…</p>}
        {(state === 'missing' || state === 'error') && (
          <div style={{ background: '#FFFFFF', border: `1px solid ${rule}`, borderRadius: '14px', padding: '20px' }}>
            <h1 style={{ fontSize: '18px', margin: '0 0 6px', color: ink }}>프로필을 찾을 수 없어요</h1>
            <p style={{ fontSize: '14px', color: muted, margin: 0, lineHeight: 1.5 }}>
              {state === 'error' ? '잠시 후 다시 시도해 주세요.' : '링크가 잘못되었거나 공개되지 않은 프로필이에요.'}
            </p>
          </div>
        )}

        {state === 'found' && data && (
          <div style={{ background: '#FBF9F5', border: `1px solid ${rule}`, borderRadius: '14px', padding: '22px', color: ink, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{data.name}</h1>
              {data.bio && <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#4A453E', lineHeight: 1.5 }}>{data.bio}</p>}
            </div>
            <div style={{ borderTop: `1px solid ${rule}`, paddingTop: '12px', fontSize: '13px', color: muted, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {data.grade && <div style={{ color: ink, fontWeight: 500 }}>{data.grade}</div>}
              {data.interests.length > 0 && <div>{data.interests.join(' · ')}</div>}
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{data.xp.toLocaleString()} XP · 배지 {data.badges.length}개</div>
            </div>
            {data.awards.length > 0 && (
              <section>
                <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 6px', color: ink }}>활동 및 수상</h2>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#4A453E', lineHeight: 1.6 }}>
                  {data.awards.map((a, i) => (
                    <li key={i}>{a.title}{a.date ? ` (${a.date})` : ''}</li>
                  ))}
                </ul>
              </section>
            )}
            {data.portfolio_urls.length > 0 && (
              <section>
                <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 6px', color: ink }}>포트폴리오</h2>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.6 }}>
                  {data.portfolio_urls.map((u) => (
                    <li key={u} style={{ wordBreak: 'break-all' }}>
                      <a href={/^https?:\/\//i.test(u) ? u : `https://${u}`} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--color-indigo)' }}>{u}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <a href="/" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>끌에서 나도 시작하기</a>
      </div>
    </div>
  );
};
