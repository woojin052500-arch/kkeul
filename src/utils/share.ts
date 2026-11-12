import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export const SITE_URL = 'https://kkeul.telosix.co.kr';

// 구인글 링크. 열면 그 대회의 팀 빌딩 게시판에서 이 글로 바로 이동한다.
export const teamPostUrl = (announcementId: string, postId: string) =>
  `${SITE_URL}/contest/${encodeURIComponent(announcementId)}?post=${encodeURIComponent(postId)}`;

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

const copy = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 아래 방법으로
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

// 휴대폰 공유창(카톡 등)을 띄우고, 안 되면 링크를 복사한다.
export const shareLink = async ({ title, text, url }: { title: string; text: string; url: string }): Promise<ShareResult> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, url, dialogTitle: title });
      return 'shared';
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    const msg = String((err as { message?: string } | null)?.message || '');
    if (name === 'AbortError' || /cancel/i.test(msg)) return 'cancelled';
    // 공유창이 실패하면 복사로
  }
  return (await copy(`${text}\n${url}`)) ? 'copied' : 'failed';
};
