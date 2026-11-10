// 신규 가입 알림 메일. Supabase 의 profiles INSERT 트리거가 호출한다
// (supabase/migrations/20261112_signup_notify.sql). 설정: docs/signup_email_setup.md
//
// 필요한 Vercel 환경변수
//   RESEND_API_KEY             Resend(https://resend.com) API 키
//   CRON_SECRET                트리거가 Authorization 헤더로 보내는 값과 같아야 함 (이미 등록돼 있음)
//   SUPABASE_SERVICE_ROLE_KEY  누적 가입자 수 조회용 (이미 등록돼 있음)
//   SIGNUP_NOTIFY_TO           (선택) 받을 주소. 기본값 woojin052501@gmail.com
//   SIGNUP_NOTIFY_FROM         (선택) 보내는 주소. 기본값 Resend 테스트 주소
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mzhwbygibrymzjaavyuu.supabase.co';
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const DEFAULT_TO = 'woojin052501@gmail.com';
const DEFAULT_FROM = '끌 가입 알림 <onboarding@resend.dev>';

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

// 누적 가입자 수 (실패해도 메일은 보낸다)
const countMembers = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
      method: 'HEAD',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }
    });
    const total = (r.headers.get('content-range') || '').split('/')[1];
    return total && total !== '*' ? Number(total) : null;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ ok: false, error: '환경변수 RESEND_API_KEY 가 필요해요.' });
    return;
  }

  try {
    const payload = await readBody(req);
    const p = payload && payload.record;
    if (!p || payload.table !== 'profiles') {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const isHost = p.role === 'host';
    const interests = Array.isArray(p.interests) ? p.interests.join(', ') : '';
    const total = await countMembers();
    const when = new Date(p.created_at || Date.now()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const rows = [
      ['이름', p.name],
      ['구분', isHost ? '주최 회원' : '학생 회원'],
      !isHost && ['학교·학년', [p.school, p.grade].filter(Boolean).join(' ')],
      ['지역', p.location],
      !isHost && ['관심 분야', interests],
      ['가입 시각', when],
      total !== null && ['누적 가입자', `${total.toLocaleString('ko-KR')}명`]
    ].filter((r) => r && r[1]);

    const html = `
      <h2 style="margin:0 0 12px">끌에 새 회원이 가입했어요</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `<tr><td style="color:#6b7280">${escapeHtml(k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`).join('')}
      </table>
      <p style="font-size:12px;color:#6b7280;margin-top:16px">이메일 등 자세한 정보는 Supabase → Authentication → Users 에서 볼 수 있어요.</p>`;

    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.SIGNUP_NOTIFY_FROM || DEFAULT_FROM,
        to: [process.env.SIGNUP_NOTIFY_TO || DEFAULT_TO],
        subject: `[끌] 신규 가입: ${p.name || '이름 없음'} (${isHost ? '주최' : '학생'})${total !== null ? ` · 누적 ${total}명` : ''}`,
        html
      })
    });
    if (!r.ok) {
      res.status(502).json({ ok: false, error: `메일 발송 실패 ${r.status}: ${(await r.text()).slice(0, 300)}` });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
