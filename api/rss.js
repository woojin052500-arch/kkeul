// /rss.xml → 새로 들어온 대회 피드 (네이버 서치어드바이저 "RSS 제출"용)
import { SITE_URL, contestUrl, esc, formatDeadline, oneLine, sb } from './_lib/seo.js';

export default async function handler(req, res) {
  let rows = [];
  try {
    rows = await sb('announcements?select=id,title,host,deadline,details,created_at&order=created_at.desc&limit=100');
  } catch {
    rows = [];
  }
  const items = rows
    .map((a) => {
      const desc = oneLine(`${a.host ? `${a.host} · ` : ''}${a.deadline ? `마감 ${formatDeadline(a.deadline)} · ` : ''}${a.details || ''}`, 300);
      return `    <item>
      <title>${esc(`${a.title} 팀원 모집`)}</title>
      <link>${esc(contestUrl(a.id))}</link>
      <guid isPermaLink="true">${esc(contestUrl(a.id))}</guid>
      <description>${esc(desc)}</description>
      ${a.created_at ? `<pubDate>${new Date(a.created_at).toUTCString()}</pubDate>` : ''}
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>끌 - 청소년 공모전·대회 팀원 찾기</title>
    <link>${SITE_URL}/</link>
    <description>중·고·대학생 공모전, 해커톤, 경진대회와 대회별 팀원 모집</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.end(xml);
}
