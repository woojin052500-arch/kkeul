import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';

// 인스타그램 스토리 크기(1080x1920)의 진단 결과 카드를 캔버스로 그린다.
// 위·아래 250px 안쪽은 인스타 화면 버튼에 가려지므로 중요한 내용을 두지 않는다.

export interface StoryCardData {
  track: string;
  level: string;
  role: string;
  rank: number;
  score: number;
  title: string;
  host: string;
  dday: string;
  reasons: string[];
  interestTotal: number;
}

const W = 1080;
const H = 1920;
const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// 띄어쓰기 단위로 줄을 바꾸고, 한 단어가 너무 길 때만 글자 단위로 자른다
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] => {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    lines.push(line);
    line = '';
  };
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) push();
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    for (const ch of Array.from(word)) {
      if (ctx.measureText(line + ch).width > maxWidth && line) push();
      line += ch;
    }
  }
  if (line) push();
  if (lines.length <= maxLines) return lines;
  let last = lines[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  return [...lines.slice(0, maxLines - 1), `${last}…`];
};

export const drawStoryCard = async (data: StoryCardData): Promise<HTMLCanvasElement> => {
  try {
    await Promise.all([
      document.fonts.load(`900 100px ${FONT}`),
      document.fonts.load(`700 40px ${FONT}`),
      document.fonts.load(`500 40px ${FONT}`)
    ]);
  } catch {
    // 글꼴을 못 불러와도 기본 글꼴로 그린다
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 만들 수 없는 브라우저예요.');

  // 배경
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#4F46E5');
  bg.addColorStop(1, '#312E81');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(W - 60, 330, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, H - 380, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  const left = 90;

  // 머리말
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText('끌', left, 296);
  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('청소년 대회 팀원 찾기', left + 84, 292);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText('나한테 맞는 대회', left, 404);

  // 내가 고른 값
  let x = left;
  ctx.font = `700 36px ${FONT}`;
  for (const chip of [data.track, data.level, data.role]) {
    const w = ctx.measureText(chip).width + 56;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, x, 440, w, 72, 36);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(chip, x + 28, 489);
    x += w + 16;
  }

  // 결과 카드
  const cardX = 60;
  const cardY = 560;
  const cardW = W - 120;
  const inner = cardW - 120;
  ctx.font = `800 58px ${FONT}`;
  const titleLines = wrap(ctx, data.title, inner, 2);
  ctx.font = `500 36px ${FONT}`;
  const reasonLines = data.reasons.slice(0, 3).map(r => wrap(ctx, r, inner - 50, 1));
  // 아래 그리는 순서와 같은 간격으로 카드 높이를 구한다
  const cardH =
    110 + 165 + 24 + titleLines.length * 76 + (data.host ? 58 : 0) + 34 + reasonLines.length * 62 + 48 + 96 + 48;

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const cx = cardX + 60;
  let y = cardY + 110;

  // 순위 · D-day
  ctx.font = `800 38px ${FONT}`;
  const rankText = `핏 ${data.rank}위`;
  const rankW = ctx.measureText(rankText).width + 52;
  ctx.fillStyle = '#4F46E5';
  roundRect(ctx, cx, y - 54, rankW, 76, 20);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rankText, cx + 26, y);
  if (data.dday) {
    ctx.fillStyle = '#EF4444';
    ctx.textAlign = 'right';
    ctx.fillText(data.dday, cardX + cardW - 60, y);
    ctx.textAlign = 'left';
  }

  // 점수
  y += 165;
  ctx.fillStyle = '#4F46E5';
  ctx.font = `900 170px ${FONT}`;
  const scoreText = String(data.score);
  ctx.fillText(scoreText, cx - 8, y);
  const scoreW = ctx.measureText(scoreText).width;
  ctx.font = `800 60px ${FONT}`;
  ctx.fillText('점', cx + scoreW + 8, y);

  // 대회명
  y += 24;
  ctx.fillStyle = '#191F28';
  ctx.font = `800 58px ${FONT}`;
  for (const line of titleLines) {
    y += 76;
    ctx.fillText(line, cx, y);
  }
  if (data.host) {
    y += 58;
    ctx.fillStyle = '#6B7684';
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(wrap(ctx, data.host, inner, 1)[0] || '', cx, y);
  }

  // 이유
  y += 34;
  ctx.font = `500 36px ${FONT}`;
  for (const lines of reasonLines) {
    y += 62;
    ctx.fillStyle = '#4F46E5';
    ctx.fillText('✓', cx, y);
    ctx.fillStyle = '#4E5968';
    ctx.fillText(lines[0] || '', cx + 50, y);
  }

  // 같이 나갈 사람
  y += 48;
  ctx.fillStyle = '#EEF2FF';
  roundRect(ctx, cx, y, inner, 96, 24);
  ctx.fill();
  ctx.fillStyle = '#4338CA';
  ctx.font = `800 38px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.interestTotal > 0 ? `지금 ${data.interestTotal}명이 팀원 찾는 중` : '같이 나갈 팀원 구해요', cx + inner / 2, y + 62);

  // 아래 안내
  const bottom = Math.min(cardY + cardH + 112, H - 320);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText('이 대회 같이 나갈 사람?', W / 2, bottom);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText('kkeul.telosix.co.kr 에서 3초 만에 내 핏 보기', W / 2, bottom + 70);
  ctx.textAlign = 'left';

  return canvas;
};

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요.'))), 'image/png'));

const FILE_NAME = 'kkeul-story.png';

export type StoryShareResult = 'shared' | 'saved' | 'cancelled' | 'unsupported';

const isCancel = (err: unknown) => {
  const e = err as { name?: string; message?: string } | null;
  return e?.name === 'AbortError' || /cancel/i.test(String(e?.message || ''));
};

// 공유창을 띄운다. 거기서 인스타그램 "스토리"를 고르면 된다.
export const shareStoryImage = async (canvas: HTMLCanvasElement): Promise<StoryShareResult> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      const file = await Filesystem.writeFile({ path: FILE_NAME, data: base64, directory: Directory.Cache });
      await Share.share({ files: [file.uri], dialogTitle: '스토리에 공유' });
      return 'shared';
    } catch (err) {
      return isCancel(err) ? 'cancelled' : 'unsupported';
    }
  }
  try {
    const file = new File([await canvasToBlob(canvas)], FILE_NAME, { type: 'image/png' });
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return 'shared';
    }
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
  }
  return 'unsupported';
};

// 이미지 파일로 내려받는다 (PC, 공유창이 없는 브라우저)
export const downloadStoryImage = async (canvas: HTMLCanvasElement): Promise<void> => {
  const url = URL.createObjectURL(await canvasToBlob(canvas));
  const a = document.createElement('a');
  a.href = url;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};
