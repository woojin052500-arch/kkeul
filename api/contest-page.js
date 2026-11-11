// /contest/:id → 대회 한 건의 검색용 페이지 (vercel.json rewrite)
// 검색엔진은 여기 들어 있는 제목·설명·본문을 읽고, 사람이 열면 앱이 그 대회를 바로 보여 준다.
import {
  PAGE_STYLE, SITE_NAME, SITE_URL, categoriesOf, contestUrl, ddayText, esc, formatDeadline,
  isClosed, loadBaseHtml, oneLine, renderPage, sb, sendHtml, seteukPointsFor, todayKst
} from './_lib/seo.js';

const ID_RE = /^[0-9A-Za-z-]{1,64}$/;

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const id = (url.searchParams.get('id') || '').trim();
  const base = await loadBaseHtml(req);

  let a = null;
  if (ID_RE.test(id)) {
    try {
      const rows = await sb(`announcements?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
      a = rows[0] || null;
    } catch {
      // DB 오류면 앱만 띄운다 (검색엔진에는 잠시 오류로)
      sendHtml(res, 503, renderPage(base, {
        title: `${SITE_NAME} - 청소년 공모전·대회 팀원 찾기`,
        description: '잠시 후 다시 시도해 주세요.',
        robots: 'noindex',
        body: ''
      }), 30);
      return;
    }
  }

  if (!a) {
    sendHtml(res, 404, renderPage(base, {
      title: `찾는 대회가 없어요 | ${SITE_NAME}`,
      description: '마감되어 내려간 대회일 수 있어요. 끌에서 지금 접수 중인 공모전과 대회를 찾아보세요.',
      robots: 'noindex,follow',
      body: `${PAGE_STYLE}<main class="seo"><h1>찾는 대회가 없어요</h1><p>마감되어 내려간 대회일 수 있어요.</p><p><a href="/contests">지금 접수 중인 대회 보기</a></p></main>`
    }), 300);
    return;
  }

  const [teamCount, related] = await Promise.all([
    sb('rpc/team_post_count', { method: 'POST', body: JSON.stringify({ p_announcement_id: a.id }) }).catch(() => 0),
    (async () => {
      const cat = categoriesOf(a)[0];
      if (!cat) return [];
      const rows = await sb(
        `announcements?select=id,title,host,deadline&category=ilike.*${encodeURIComponent(cat)}*&deadline=gte.${todayKst()}&id=neq.${encodeURIComponent(a.id)}&order=deadline.asc&limit=8`
      ).catch(() => []);
      return rows;
    })()
  ]);

  const closed = isClosed(a.deadline);
  const deadline = formatDeadline(a.deadline);
  const cats = categoriesOf(a);
  const canonical = contestUrl(a.id);
  const title = `${oneLine(a.title, 60)} 팀원 모집·세특 활용 | ${SITE_NAME}`;
  const description = oneLine(
    `${a.title}${a.host ? ` (${a.host})` : ''}${deadline ? ` · 마감 ${deadline}` : ''}. 함께 나갈 팀원을 끌에서 찾고, 세특(생기부)에 이어 쓸 포인트까지 확인하세요. ${a.details || ''}`,
    155
  );
  const points = seteukPointsFor(a);
  const n = Number(teamCount) || 0;

  const body = `${PAGE_STYLE}<main class="seo">
<nav><a href="/">끌</a> › <a href="/contests">공모전·대회</a>${cats[0] ? ` › ${esc(cats[0])}` : ''}</nav>
<article>
<p>${cats.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}${closed ? '<span class="tag">마감</span>' : `<span class="tag">${esc(ddayText(a.deadline))}</span>`}</p>
<h1>${esc(a.title)}</h1>
${a.host ? `<p class="meta">주최·주관: ${esc(a.host)}</p>` : ''}
${deadline ? `<p class="meta">접수 마감: ${esc(deadline)}${closed ? ' (마감됨)' : ''}</p>` : ''}
${a.target ? `<p class="meta">참가 대상: ${esc(a.target)}</p>` : ''}
${a.location ? `<p class="meta">지역: ${esc(a.location)}</p>` : ''}

<h2>${esc(oneLine(a.title, 40))} 팀원 모집</h2>
<p>${n > 0 ? `지금 끌에 이 대회 팀원 모집글이 <strong>${n}개</strong> 있어요.` : '아직 이 대회 팀원 모집글이 없어요. 먼저 올리면 같은 대회를 준비하는 학생들이 연락해 와요.'}
 끌에서 역할(개발·디자인·기획 등)을 적고 구인글을 올리거나, 올라온 글에 합류 요청을 보낼 수 있어요.</p>
<a class="cta" href="${esc(canonical)}">끌에서 팀원 찾기</a>

<h2>세특(생기부)에 이어 쓰기 좋은 점</h2>
<p>대회 참여는 교과 세부능력 및 특기사항(세특)이나 창의적 체험활동에 이어 쓸 수 있어요. 이 대회는 이런 점을 남기기 좋아요.</p>
<ul>${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>

${a.details ? `<h2>대회 소개</h2><div class="details">${esc(String(a.details).replace(/<[^>]*>/g, "").slice(0, 3000))}</div>` : ''}
${a.apply_url ? `<p><a href="${esc(a.apply_url)}" rel="nofollow noopener" target="_blank">공식 공고 보기</a></p>` : ''}
</article>
${related.length ? `<h2>비슷한 대회</h2><ul>${related.map((r) => `<li><a href="/contest/${encodeURIComponent(r.id)}">${esc(r.title)}</a>${r.deadline ? ` · ${esc(ddayText(r.deadline))}` : ''}</li>`).join('')}</ul>` : ''}
<footer>끌 · 중·고·대학생 공모전·대회 팀원 찾기 · <a href="/contests">전체 대회</a></footer>
</main>`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: '공모전·대회', item: `${SITE_URL}/contests` },
        { '@type': 'ListItem', position: 3, name: a.title, item: canonical }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
      inLanguage: 'ko-KR',
      ...(a.created_at ? { datePublished: a.created_at } : {})
    }
  ];

  sendHtml(res, 200, renderPage(base, {
    title,
    description,
    canonical,
    ogType: 'article',
    image: /^https:\/\//.test(a.image_url || '') ? a.image_url : undefined,
    jsonLd,
    body
  }));
}
