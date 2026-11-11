// 검색엔진(구글·네이버)이 읽을 수 있는 HTML 을 만드는 공통 코드.
// 앱 자체는 그대로 SPA 이고, 여기서는 첫 HTML 에 제목·설명·본문을 미리 넣어 줄 뿐이다.
// 사람이 열면 React 가 #root 를 덮어써서 평소 앱 화면이 뜬다.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SITE_URL = (process.env.SITE_URL || 'https://kkeul.telosix.co.kr').replace(/\/+$/, '');
export const SITE_NAME = '끌';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mzhwbygibrymzjaavyuu.supabase.co';
// 공개(anon) 키. 앱 코드(src/supabaseClient.ts)에도 들어 있는 공개 값이다. 읽기 전용 공개 데이터만 가져온다.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aHdieWdpYnJ5bXpqYWF2eXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzkwNDUsImV4cCI6MjA5NDg1NTA0NX0.QV5O1ciBRPGGT6c6eubBaB2Nb2eBK01QFEZLsaaDBL0';

export const sb = async (pathAndQuery, init = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
};

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const oneLine = (s, max = 160) => {
  const t = String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// KST 기준 오늘 날짜 (YYYY-MM-DD)
export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export const formatDeadline = (deadline) => {
  if (!deadline) return '';
  const d = String(deadline).slice(0, 10);
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return '';
  return `${y}년 ${m}월 ${day}일`;
};

export const isClosed = (deadline) => !!deadline && String(deadline).slice(0, 10) < todayKst();

export const ddayText = (deadline) => {
  if (!deadline) return '';
  const d = String(deadline).slice(0, 10);
  const diff = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${todayKst()}T00:00:00Z`)) / 86400000);
  if (Number.isNaN(diff)) return '';
  if (diff < 0) return '마감';
  if (diff === 0) return 'D-DAY';
  return `D-${diff}`;
};

export const contestUrl = (id) => `${SITE_URL}/contest/${encodeURIComponent(id)}`;

export const categoriesOf = (a) =>
  String(a?.category || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

// 분야별로 세특(학교생활기록부 세부능력 및 특기사항)에 이어 쓰기 좋은 역량
export const SETEUK_POINTS = {
  'IT/개발': ['문제를 정의하고 코드로 해결한 과정', '팀 안에서 맡은 기능과 협업 방식', '정보 교과와 연결되는 알고리즘·데이터 활용'],
  '수학/과학': ['가설을 세우고 검증한 탐구 과정', '자료 분석과 결론 도출', '수학·과학 교과 개념의 실제 적용'],
  '인문학': ['주제를 깊이 읽고 자기 관점으로 정리한 글', '근거를 들어 주장하는 논증', '국어·사회 교과와 연결되는 탐구'],
  '기획/아이디어': ['문제 발견과 해결 아이디어 기획', '조사·인터뷰로 근거를 모은 과정', '발표·보고서로 설득한 경험'],
  '디자인': ['사용자를 고려한 시각 설계', '아이디어를 시안으로 구체화한 과정', '미술·정보 교과와 연결되는 표현'],
  '예술/문화': ['작품의 기획 의도와 제작 과정', '피드백을 반영해 다듬은 경험', '예술 교과와 연결되는 표현 역량'],
  '창업': ['시장·사용자 문제를 찾은 과정', '사업 모델을 세우고 검증한 경험', '경제·사회 교과와 연결되는 탐구'],
  '봉사활동': ['지역·공동체 문제를 발견한 계기', '꾸준히 참여하며 배운 점', '사회 교과와 연결되는 실천'],
  '체육': ['목표를 세우고 꾸준히 훈련한 과정', '팀워크와 리더십', '체육 교과와 연결되는 성장']
};

export const seteukPointsFor = (a) => {
  const out = [];
  for (const c of categoriesOf(a)) for (const p of SETEUK_POINTS[c] || []) if (!out.includes(p)) out.push(p);
  return (out.length ? out : SETEUK_POINTS['기획/아이디어']).slice(0, 4);
};

// 빌드된 index.html (스크립트·스타일 경로가 들어 있음)
let baseHtmlCache = null;
export const loadBaseHtml = async (req) => {
  if (baseHtmlCache) return baseHtmlCache;
  for (const p of [path.join(process.cwd(), 'dist', 'index.html'), path.join(process.cwd(), 'index.html')]) {
    try {
      const html = await readFile(p, 'utf8');
      if (html.includes('/assets/')) return (baseHtmlCache = html);
    } catch {
      /* 다음 후보 */
    }
  }
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const r = await fetch(`${proto}://${host}/index.html`);
    if (r.ok) {
      const html = await r.text();
      if (html.includes('id="root"')) return (baseHtmlCache = html);
    }
  } catch {
    /* 아래 기본 HTML 사용 */
  }
  return '<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>끌</title></head><body><div id="root"></div></body></html>';
};

// index.html 의 <head> 검색용 태그를 바꾸고 #root 안에 본문을 넣는다
export const renderPage = (base, { title, description, canonical, robots = 'index,follow', ogType = 'website', image, jsonLd = [], body }) => {
  let html = base;
  // 기본 페이지에 들어 있던 검색용 태그는 지우고 새로 넣는다
  html = html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, '');
  const img = image || `${SITE_URL}/og-image.png`;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : '',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}" />` : '',
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    ...jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
  ]
    .filter(Boolean)
    .join('\n    ');
  html = html.replace('</head>', () => `    ${head}\n  </head>`);
  const root = `<div id="root"><!--root:start-->${body}<!--root:end--></div>`;
  html = /<!--root:start-->/.test(html)
    ? html.replace(/<div id="root"><!--root:start-->[\s\S]*?<!--root:end--><\/div>/, () => root)
    : html.replace('<div id="root"></div>', () => root);
  return html;
};

// 검색엔진용 본문 스타일 (앱이 뜨기 전 잠깐, 또는 자바스크립트 없이 볼 때)
export const PAGE_STYLE = `<style>
.seo{max-width:720px;margin:0 auto;padding:24px 16px 48px;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#191f28;line-height:1.65;word-break:keep-all}
.seo a{color:#4f46e5}
.seo nav{font-size:13px;color:#6b7684;margin-bottom:12px}
.seo h1{font-size:24px;line-height:1.35;margin:0 0 8px}
.seo h2{font-size:18px;margin:28px 0 8px}
.seo .meta{color:#4e5968;font-size:14px;margin:0 0 4px}
.seo .tag{display:inline-block;background:#eef2ff;color:#4338ca;border-radius:6px;padding:1px 8px;font-size:12px;margin-right:6px}
.seo .cta{display:inline-block;background:#4f46e5;color:#fff;border-radius:10px;padding:12px 18px;text-decoration:none;font-weight:600;margin-top:12px}
.seo ul{padding-left:20px}
.seo .details{white-space:pre-line;background:#f9fafb;border-radius:10px;padding:14px;font-size:14px}
.seo footer{margin-top:40px;font-size:12px;color:#8b95a1}
</style>`;

export const sendHtml = (res, status, html, maxAge = 600) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`);
  res.end(html);
};
