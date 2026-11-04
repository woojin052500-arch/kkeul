import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { X } from 'lucide-react';
import logoImg from '../assets/logo.png';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.wjedulab.kkeul';
const DISMISS_KEY = 'kkeul_install_banner_dismissed_at';
const HIDE_DAYS = 7;

type Platform = 'android' | 'ios' | 'desktop';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  // iPadOS 13+ 는 Mac 으로 보이므로 터치 지원 여부로 구분
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
};

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < HIDE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

// 웹 브라우저로 들어온 사람에게 앱 설치를 권하는 띠 배너
export const AppInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    if (Capacitor.isNativePlatform()) return false; // 이미 앱 안
    if (detectPlatform() === 'ios') return false; // iOS 앱은 아직 없음
    return !recentlyDismissed();
  });

  if (!visible) return null;

  const isAndroid = detectPlatform() === 'android';

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장 못 해도 이번엔 닫기
    }
    setVisible(false);
  };

  return (
    <div className="install-banner" role="region" aria-label="끌 앱 설치 안내">
      <img src={logoImg} alt="" className="install-banner-icon" />
      <div className="install-banner-text">
        <strong>끌 앱으로 더 편하게</strong>
        <span>{isAndroid ? '알림을 받고 빠르게 팀원을 찾아요' : '휴대폰에 설치하고 알림을 받아 보세요'}</span>
      </div>
      <a className="install-banner-cta" href={PLAY_URL} target="_blank" rel="noopener noreferrer">
        {isAndroid ? '앱 설치' : 'Google Play'}
      </a>
      <button type="button" className="install-banner-close" onClick={dismiss} aria-label="설치 안내 닫기">
        <X size={16} />
      </button>
    </div>
  );
};
