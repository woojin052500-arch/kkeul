import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { cleanInviterName } from './deepLink';

export const SITE_URL = 'https://kkeul.telosix.co.kr';

// 구인글 링크. 열면 그 대회의 팀 빌딩 게시판에서 이 글로 바로 이동한다.
export const teamPostUrl = (announcementId: string, postId: string) =>
  `${SITE_URL}/contest/${encodeURIComponent(announcementId)}?post=${encodeURIComponent(postId)}`;

// 대회 1:1 친구 초대 링크. 열면 그 대회 상세에서 초대 배너가 뜬다.
//   invite=1       초대 링크로 들어왔다고 표시
//   from=<이름>    보낸 사람 이름 (링크를 만든 사람이 자기 이름으로 보낼 때만)
//   post=<구인글>  구인글을 올린 직후면 그 글로 이어진다
export const contestInviteUrl = (
  announcementId: string,
  { inviterName, postId }: { inviterName?: string; postId?: string } = {}
) => {
  const params = new URLSearchParams({ invite: '1' });
  const name = cleanInviterName(inviterName || '');
  if (name) params.set('from', name);
  if (postId) params.set('post', postId);
  return `${SITE_URL}/contest/${encodeURIComponent(announcementId)}?${params.toString()}`;
};

// 링크와 함께 보낼 한 줄. 구인글을 올린 뒤면 그 글을, 아니면 같이 나갈 사람을 찾는다는 쪽으로.
export const contestInviteMessage = ({ title, postId }: { title: string; postId?: string }) =>
  postId
    ? `나 '${title}' 팀원 구하는 글 올렸어. 같이 나갈래?`
    : `나 '${title}' 같이 나갈 팀원 찾는 중인데, 너도 여기 봐봐.`;

export const contestInviteText = (
  announcementId: string,
  { title, inviterName, postId }: { title: string; inviterName?: string; postId?: string }
) => `${contestInviteMessage({ title, postId })}\n${contestInviteUrl(announcementId, { inviterName, postId })}`;

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export const copyToClipboard = async (text: string): Promise<boolean> => {
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
  return (await copyToClipboard(`${text}\n${url}`)) ? 'copied' : 'failed';
};
