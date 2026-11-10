// 학교 검색. 교육부 나이스(NEIS) 교육정보 개방 포털의 학교기본정보를 조회한다.
// 예) /api/schools?q=하나  →  { ok: true, schools: [{ name, kind, region, code }] }
//
// 선택 환경변수
//   NEIS_API_KEY  나이스 인증키(open.neis.go.kr 에서 무료 발급). 없으면 학교급별 5개까지만 받을 수 있다.
const NEIS_URL = 'https://open.neis.go.kr/hub/schoolInfo';
const KINDS = ['중학교', '고등학교'];

const shortRegion = (name) =>
  String(name || '')
    .replace(/특별자치시|특별자치도|특별시|광역시/g, '')
    .replace(/^.*\((.+)\)$/, '$1') // "전남광주통합특별시(광주)" → "광주"
    .replace(/^(충청|전라|경상)(남|북)도$/, (_, a, b) => a[0] + b)
    .replace(/도$/, '')
    .trim();

const searchKind = async (q, kind, key) => {
  const params = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: key ? '20' : '5', SCHUL_NM: q, SCHUL_KND_SC_NM: kind });
  if (key) params.set('KEY', key);
  const res = await fetch(`${NEIS_URL}?${params}`);
  if (!res.ok) throw new Error(`NEIS ${res.status}`);
  const data = await res.json();
  // 결과가 없으면 { RESULT: { CODE: 'INFO-200' } } 형태로 온다
  const rows = data && data.schoolInfo && data.schoolInfo[1] ? data.schoolInfo[1].row : [];
  return (rows || []).map((r) => ({
    name: String(r.SCHUL_NM || '').trim(),
    kind: String(r.SCHUL_KND_SC_NM || '').trim(),
    region: shortRegion(r.LCTN_SC_NM),
    code: String(r.SD_SCHUL_CODE || '').trim()
  }));
};

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2 || q.length > 30) {
    res.status(400).json({ ok: false, error: '검색어는 2~30자로 입력해 주세요.' });
    return;
  }
  try {
    const results = await Promise.allSettled(KINDS.map((k) => searchKind(q, k, process.env.NEIS_API_KEY)));
    if (results.every((r) => r.status === 'rejected')) throw new Error('학교 정보를 불러오지 못했어요.');

    const schools = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter((s) => s.name)
      // 검색어로 시작하는 학교를 먼저, 그다음 이름 순
      .sort((a, b) => Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)) || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 20);

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ ok: true, schools });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
