// /contests → 지금 접수 중인 대회 전체 목록 (검색엔진이 대회 페이지를 찾아가는 길)
import {
  PAGE_STYLE, SETEUK_POINTS, SITE_NAME, SITE_URL, categoriesOf, ddayText, esc,
  loadBaseHtml, renderPage, sb, sendHtml, todayKst
} from './_lib/seo.js';

export default async function handler(req, res) {
  const base = await loadBaseHtml(req);
  let rows = [];
  try {
    rows = await sb(`announcements?select=id,title,host,category,deadline&deadline=gte.${todayKst()}&order=deadline.asc&limit=1000`);
  } catch {
    rows = [];
  }

  const groups = new Map();
  for (const a of rows) {
    const cat = categoriesOf(a)[0] || '기타';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(a);
  }
  const order = [...Object.keys(SETEUK_POINTS), '기타'].filter((c) => groups.has(c));
  for (const c of groups.keys()) if (!order.includes(c)) order.push(c);

  const title = `청소년 공모전·대회 팀원 모집 ${rows.length ? `${rows.length}개 ` : ''}| ${SITE_NAME}`;
  const description =
    '중·고·대학생이 지금 지원할 수 있는 공모전, 해커톤, 경진대회, 대외활동을 마감 순으로 모았어요. 대회별로 함께 나갈 팀원을 찾고 세특(생기부)에 이어 쓸 포인트도 확인하세요.';

  const body = `${PAGE_STYLE}<main class="seo">
<nav><a href="/">끌</a> › 공모전·대회</nav>
<h1>지금 접수 중인 청소년 공모전·대회</h1>
<p>${rows.length}개 대회가 접수 중이에요. 대회를 누르면 그 대회 팀원 모집 게시판으로 가요.</p>
${order.length ? `<p>${order.map((c) => `<a href="#${encodeURIComponent(c)}">${esc(c)}</a>`).join(' · ')}</p>` : ''}
${order
  .map(
    (c) => `<section><h2 id="${esc(encodeURIComponent(c))}">${esc(c)} 공모전·대회</h2><ul>${groups
      .get(c)
      .map((a) => `<li><a href="/contest/${encodeURIComponent(a.id)}">${esc(a.title)}</a>${a.host ? ` · ${esc(a.host)}` : ''} · ${esc(ddayText(a.deadline))}</li>`)
      .join('')}</ul></section>`
  )
  .join('\n')}
<footer>끌 · 중·고·대학생 공모전·대회 팀원 찾기</footer>
</main>`;

  sendHtml(res, 200, renderPage(base, {
    title,
    description,
    canonical: `${SITE_URL}/contests`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: '지금 접수 중인 청소년 공모전·대회',
        itemListElement: rows.slice(0, 100).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/contest/${encodeURIComponent(a.id)}`, name: a.title }))
      }
    ],
    body
  }), 1800);
}
