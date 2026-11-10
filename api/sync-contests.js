// 콘테스트코리아 공고를 받아 Supabase announcements 테이블에 넣는다.
// Vercel Cron 이 하루 한 번 호출한다 (vercel.json). 직접 실행: /api/sync-contests?key=<CRON_SECRET>
//
// 필요한 Vercel 환경변수 (Settings → Environment Variables)
//   CONTESTKOREA_API_KEY       콘테스트코리아 인증키
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API → service_role (비밀! 사이트 코드에 넣지 말 것)
//   CRON_SECRET                아무 긴 임의 문자열 (Vercel Cron 이 자동으로 Authorization 헤더에 넣어 줌)
//   SUPABASE_URL               (선택) 기본값은 끌 프로젝트 주소
import { collectAnnouncements } from './_lib/contestkorea.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mzhwbygibrymzjaavyuu.supabase.co';
// 마감 후 이 기간이 지난 콘테스트코리아 공고는 DB에서 지운다
const KEEP_CLOSED_DAYS = 7;

const authorized = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || '';
  const url = new URL(req.url, 'http://localhost');
  return header === `Bearer ${secret}` || url.searchParams.get('key') === secret;
};

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  const apiKey = process.env.CONTESTKOREA_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !serviceKey) {
    res.status(500).json({ ok: false, error: '환경변수 CONTESTKOREA_API_KEY / SUPABASE_SERVICE_ROLE_KEY 가 필요해요.' });
    return;
  }

  const supabase = (path, init = {}) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    });

  try {
    const { rows, fetched, errors } = await collectAnnouncements(apiKey);

    // 모든 분야가 실패했으면(키 만료 등) DB를 건드리지 않는다
    if (rows.length === 0 && errors.length > 0) {
      res.status(502).json({ ok: false, error: '콘테스트코리아에서 공고를 받지 못했어요.', errors });
      return;
    }

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const r = await supabase('announcements?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(chunk)
      });
      if (!r.ok) throw new Error(`DB 저장 실패 ${r.status}: ${(await r.text()).slice(0, 300)}`);
      upserted += chunk.length;
    }

    const cutoff = new Date(Date.now() - KEEP_CLOSED_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const del = await supabase(`announcements?source=eq.contestkorea&deadline=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' }
    });
    if (!del.ok) throw new Error(`지난 공고 정리 실패 ${del.status}: ${(await del.text()).slice(0, 300)}`);
    const removed = (await del.json()).length;

    res.status(200).json({ ok: true, fetched, upserted, removed, errors });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
