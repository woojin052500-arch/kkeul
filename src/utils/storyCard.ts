import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';

// 인스타그램 스토리 크기(1080x1920)의 진단 결과 카드를 캔버스로 그린다.
// 위·아래 250px 안쪽은 인스타 화면 버튼에 가려지므로 중요한 내용을 두지 않는다.
// 맨 아래 안내 문구 밑은 사용자가 링크 스티커를 붙이는 자리로 비워 둔다.

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

const INK = '#141414';
const PAPER = '#F3EFE6';
const YELLOW = '#FFE14A';
const BLUE = '#2D4BFF';
const RED = '#F0432C';
const NUM = `'Outfit', ${FONT}`;

// 번짐 없는 그림자가 달린 상자 (종이를 오려 붙인 느낌)
const block = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, shadow = 0) => {
  if (shadow) {
    ctx.fillStyle = INK;
    roundRect(ctx, x + shadow, y + shadow, w, h, r);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
};

export const drawStoryCard = async (data: StoryCardData): Promise<HTMLCanvasElement> => {
  try {
    await Promise.all([
      document.fonts.load(`900 100px ${FONT}`),
      document.fonts.load(`700 40px ${FONT}`),
      document.fonts.load(`500 40px ${FONT}`),
      document.fonts.load(`800 200px 'Outfit'`)
    ]);
  } catch {
    // 글꼴을 못 불러와도 기본 글꼴로 그린다
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 만들 수 없는 브라우저예요.');

  // 종이 바탕 + 옅은 모눈
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(20,20,20,0.045)';
  ctx.lineWidth = 2;
  for (let gx = 60; gx < W; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = 60; gy < H; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const left = 80;
  const right = W - 80;

  // 머리말
  ctx.fillStyle = INK;
  ctx.font = `800 30px ${NUM}`;
  ctx.fillText('KKEUL  FIT  REPORT', left, 300);
  ctx.textAlign = 'right';
  ctx.font = `600 30px ${NUM}`;
  ctx.fillText('kkeul.telosix.co.kr', right, 300);
  ctx.textAlign = 'left';
  ctx.fillRect(left, 322, right - left, 5);

  // 제목: "찾았다"에 형광펜
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText('나한테 맞는 대회,', left, 432);
  const found = '찾았다.';
  const foundW = ctx.measureText(found).width;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(left - 10, 476, foundW + 20, 62);
  ctx.fillStyle = INK;
  ctx.fillText(found, left, 534);

  // 내가 고른 값
  let x = left + foundW + 40;
  ctx.font = `700 32px ${FONT}`;
  for (const chip of [data.track, data.level, data.role]) {
    const w = ctx.measureText(chip).width + 44;
    if (x + w > right) break;
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    roundRect(ctx, x, 474, w, 62, 31);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(chip, x + 22, 517);
    x += w + 12;
  }

  // 결과 티켓
  const cardX = 70;
  const cardY = 592;
  const cardW = W - 140 - 14;
  const cx = cardX + 56;
  const inner = cardW - 112;
  ctx.font = `900 56px ${FONT}`;
  const titleLines = wrap(ctx, data.title, inner, 2);
  ctx.font = `500 36px ${FONT}`;
  const reasonLines = data.reasons.slice(0, 3).map(r => wrap(ctx, r, inner - 46, 1)[0] || '');
  const topH = 96 + 178 + 24 + titleLines.length * 72 + (data.host ? 50 : 0) + 38;
  const bottomH = 26 + reasonLines.length * 56 + 36 + 92 + 40;
  const cardH = topH + bottomH;

  block(ctx, cardX, cardY, cardW, cardH, 28, '#FFFFFF', 14);

  // 순위 · D-day
  let y = cardY + 96;
  ctx.font = `800 34px ${FONT}`;
  const rankText = `FIT ${data.rank}위`;
  const rankW = ctx.measureText(rankText).width + 40;
  ctx.fillStyle = INK;
  roundRect(ctx, cx, y - 46, rankW, 62, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rankText, cx + 20, y - 2);
  if (data.dday) {
    ctx.fillStyle = RED;
    ctx.font = `800 40px ${NUM}`;
    ctx.textAlign = 'right';
    ctx.fillText(data.dday, cardX + cardW - 56, y);
    ctx.textAlign = 'left';
  }

  // 점수: 큰 숫자 아래쪽에 형광펜
  y += 178;
  ctx.font = `800 190px ${NUM}`;
  const scoreText = String(data.score);
  const scoreW = ctx.measureText(scoreText).width;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(cx - 12, y - 58, scoreW + 24, 54);
  ctx.fillStyle = INK;
  ctx.fillText(scoreText, cx - 6, y);
  ctx.font = `900 50px ${FONT}`;
  ctx.fillText('점', cx + scoreW + 16, y);
  ctx.fillStyle = '#8A857A';
  ctx.font = `600 34px ${NUM}`;
  ctx.fillText('/ 100', cx + scoreW + 78, y);

  // 대회명
  y += 24;
  ctx.fillStyle = INK;
  ctx.font = `900 56px ${FONT}`;
  for (const line of titleLines) {
    y += 72;
    ctx.fillText(line, cx, y);
  }
  if (data.host) {
    y += 50;
    ctx.fillStyle = '#6F6A60';
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(wrap(ctx, data.host, inner, 1)[0] || '', cx, y);
  }

  // 티켓 절취선
  const cutY = cardY + topH;
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cardX + 34, cutY);
  ctx.lineTo(cardX + cardW - 34, cutY);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const nx of [cardX, cardX + cardW]) {
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(nx, cutY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(nx, cutY, 24, nx === cardX ? -Math.PI / 2 : Math.PI / 2, nx === cardX ? Math.PI / 2 : (Math.PI * 3) / 2);
    ctx.stroke();
  }
  // 오른쪽 홈 뒤로 비치는 그림자를 종이색으로 덮는다
  ctx.fillStyle = PAPER;
  ctx.fillRect(cardX + cardW + 3, cutY - 20, 14, 40);

  // 이유
  y = cutY + 26;
  ctx.font = `500 36px ${FONT}`;
  for (const line of reasonLines) {
    y += 56;
    ctx.fillStyle = BLUE;
    ctx.fillRect(cx, y - 26, 18, 18);
    ctx.fillStyle = '#2B2B2B';
    ctx.fillText(line, cx + 46, y);
  }

  // 같이 나갈 사람
  y += 36;
  ctx.fillStyle = BLUE;
  roundRect(ctx, cx, y, inner, 92, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 38px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.interestTotal > 0 ? `지금 ${data.interestTotal}명이 팀원 찾는 중` : '같이 나갈 팀원 구해요', cx + inner / 2, y + 60);
  ctx.textAlign = 'left';

  // 비스듬히 붙인 스티커
  ctx.save();
  ctx.translate(cardX + cardW - 150, cardY + 190);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.font = `900 40px ${FONT}`;
  const label = '팀원 구함!';
  const lw = ctx.measureText(label).width + 56;
  block(ctx, -lw / 2, -44, lw, 84, 12, YELLOW, 8);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 14);
  ctx.restore();

  // 아래 안내 (그 밑은 링크 스티커 자리)
  const bottom = Math.min(cardY + cardH + 112, H - 322);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `900 58px ${FONT}`;
  ctx.fillText('이 대회 같이 나갈 사람?', W / 2, bottom);
  ctx.fillStyle = '#5E594F';
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText('아래 링크 누르고 3초 만에 내 핏 보기 ↓', W / 2, bottom + 62);
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
