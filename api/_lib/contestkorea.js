// 콘테스트코리아 API → 끌 announcements 행으로 변환
// API 명세: DEMO v1.1 (2026.11.10). 키는 환경변수 CONTESTKOREA_API_KEY 로만 받는다.
import { createHash } from 'node:crypto';

const API_BASE = 'https://www.contestkorea.com/api/meeting_info_api.php';

// 메뉴 코드 → 끌 관심 분야 (쉼표로 여러 개)
export const MENUS = [
  // 대회·공모전
  { code: '030110001', name: '문학•문예', category: '인문학' },
  { code: '030210001', name: '네이밍•슬로건', category: '기획/아이디어' },
  { code: '030310001', name: '학문•과학•IT', category: 'IT/개발, 수학/과학' },
  { code: '030810001', name: '스포츠', category: '체육' },
  { code: '030610001', name: '미술•디자인•웹툰', category: '디자인, 예술/문화' },
  { code: '030910001', name: '음악•콩쿠르•댄스', category: '예술/문화' },
  { code: '031210001', name: '사진•영상•영화제', category: '예술/문화' },
  { code: '031410001', name: '아이디어•건축•창업', category: '기획/아이디어, 창업' },
  { code: '031610001', name: '요리•뷰티•배우•오디션', category: '예술/문화' },
  { code: '031810001', name: 'The 다양한 분야', category: '기획/아이디어' },
  // 대외활동
  { code: '040110001', name: '서포터즈•기자단', category: '기획/아이디어' },
  { code: '040210001', name: '인턴•체험•탐방•봉사•동아리', category: '봉사활동' },
  { code: '040310001', name: '서평단•참여단•평가단•자문단', category: '인문학' },
  { code: '040710001', name: '기획•홍보•마케팅', category: '기획/아이디어' },
  { code: '040410001', name: '교육•강연•멘토링•세미나', category: '인문학' },
  { code: '040510001', name: '전시•박람•행사•축제', category: '예술/문화' },
  { code: '040610001', name: 'The 다양한 대외활동', category: '기획/아이디어' }
];

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// 같은 공고는 항상 같은 ID가 되도록 (다시 받아도 중복이 생기지 않음)
export const contestId = (meetCode) => {
  const h = createHash('md5').update(`contestkorea:${meetCode}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// "11.02~01.15" 처럼 연도 없는 접수기간의 마감일을 구한다.
// 등록일(공고 코드 앞 8자리)을 기준으로, 등록 60일 전 이후에 오는 가장 가까운 날짜를 마감일로 본다.
// 예) 10월 등록 · 02.22~02.26 → 다음 해 2월 / 1월 등록 · 12.20~01.10 → 그해 1월
export const parseDeadline = (date1, meetCode) => {
  const reg = /^(\d{4})(\d{2})(\d{2})/.exec(String(meetCode || ''));
  const parts = String(date1 || '').split('~').map((s) => s.trim());
  const end = /^(\d{1,2})\.(\d{1,2})$/.exec(parts[parts.length - 1] || '');
  if (!reg || !end) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const regTime = new Date(`${reg[1]}-${reg[2]}-${reg[3]}T00:00:00+09:00`).getTime();
  if (Number.isNaN(regTime)) return null;
  const earliest = regTime - 60 * 24 * 60 * 60 * 1000;

  for (const year of [Number(reg[1]) - 1, Number(reg[1]), Number(reg[1]) + 1]) {
    const iso = `${year}-${pad(Number(end[1]))}-${pad(Number(end[2]))}T23:59:59+09:00`; // 한국 시간 그날 끝
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t) && t >= earliest) return iso;
  }
  return null;
};

const normalizeRegion = (area) => {
  const a = String(area || '').replace(/\s+/g, '');
  return REGIONS.find((r) => a === r || a.startsWith(r)) || '전국';
};

const cleanTarget = (target) => {
  const list = String(target || '')
    .split(',')
    .map((t) => t.replace(/▶/g, '').trim())
    .filter((t) => t && t !== '해당자');
  return list.includes('누구나') ? '누구나' : list.join(', ');
};

// 중·고등학생이 참가할 수 있는 공고만 가져온다
const isForTeens = (target) => /중학생|고등학생|청소년|누구나/.test(String(target || ''));

export const toAnnouncement = (item, menu, now = Date.now()) => {
  const code = String(item.STR_MEETCODE || '').trim();
  const title = String(item.STR_MEETING || '').trim();
  if (!code || !title) return null;
  if (item.STR_SERVICE && item.STR_SERVICE !== 'Y') return null;
  if (!isForTeens(item.STR_TARGET)) return null;

  const deadline = parseDeadline(item.STR_DATE1, code);
  if (!deadline || new Date(deadline).getTime() < now) return null; // 이미 마감된 공고는 받지 않음

  const target = cleanTarget(item.STR_TARGET);
  const lines = [
    target && `참가 대상: ${target}`,
    item.STR_DATE1 && `접수 기간: ${item.STR_DATE1}`,
    item.STR_DATE2 && `심사 기간: ${item.STR_DATE2}`,
    item.STR_DATE3 && `결과 발표: ${item.STR_DATE3}`,
    `분야: ${String(item.STR_MENU || menu.name).trim()}`,
    '',
    '자세한 모집 요강과 접수는 콘테스트코리아 공고에서 확인하세요.'
  ].filter((l) => l !== false && l !== null && l !== undefined && l !== 0);

  return {
    id: contestId(code),
    title,
    host: String(item.STR_HOST || '').trim() || '주최 미상',
    category: menu.category,
    deadline,
    location: normalizeRegion(item.STR_AREA),
    details: lines.join('\n'),
    image_url: String(item.STR_IMG || '').trim(),
    apply_url: String(item.STR_URL || '').trim(),
    bid_amount: 0,
    source: 'contestkorea',
    source_id: code,
    target
  };
};

export const fetchMenu = async (apiKey, menu, limit = 100) => {
  const url = `${API_BASE}?apikey=${encodeURIComponent(apiKey)}&Txt_bcode=${menu.code}&limitsu=${limit}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`콘테스트코리아 응답 ${res.status} (${menu.name})`);
  const text = (await res.text()).replace(/^﻿/, '');
  const parsed = JSON.parse(text);
  const body = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!body || String(body.resultcode) !== '1') {
    throw new Error(`콘테스트코리아 오류 (${menu.name}): ${body ? body.resultmsg : '빈 응답'}`);
  }
  return Array.isArray(body.Data) ? body.Data : [];
};

// 모든 분야를 받아 끌 공고 행으로 바꾼다. 여러 분야에 걸친 공고는 분야를 합친다.
export const collectAnnouncements = async (apiKey, { limit = 100, now = Date.now() } = {}) => {
  const byId = new Map();
  const errors = [];
  let fetched = 0;
  for (let i = 0; i < MENUS.length; i += 4) {
    const batch = MENUS.slice(i, i + 4);
    const results = await Promise.allSettled(batch.map((m) => fetchMenu(apiKey, m, limit)));
    results.forEach((r, idx) => {
      const menu = batch[idx];
      if (r.status === 'rejected') {
        errors.push(String(r.reason && r.reason.message ? r.reason.message : r.reason));
        return;
      }
      fetched += r.value.length;
      for (const item of r.value) {
        const row = toAnnouncement(item, menu, now);
        if (!row) continue;
        const prev = byId.get(row.id);
        if (prev) {
          const cats = new Set([...prev.category.split(','), ...row.category.split(',')].map((c) => c.trim()));
          prev.category = [...cats].join(', ');
        } else {
          byId.set(row.id, row);
        }
      }
    });
  }
  return { rows: [...byId.values()], fetched, errors };
};
