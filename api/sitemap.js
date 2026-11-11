// /sitemap.xml → 구글 서치 콘솔·네이버 서치어드바이저에 제출하는 사이트맵
import { SITE_URL, contestUrl, esc, sb, todayKst } from './_lib/seo.js';

export default async function handler(req, res) {
  let rows = [];
  try {
    rows = await sb('announcements?select=id,created_at,deadline&order=deadline.desc&limit=5000');
  } catch {
    rows = [];
  }
  const today = todayKst();
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/contests`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    ...rows.map((a) => {
      const open = !a.deadline || String(a.deadline).slice(0, 10) >= today;
      return {
        loc: contestUrl(a.id),
        lastmod: a.created_at ? String(a.created_at).slice(0, 10) : undefined,
        changefreq: open ? 'daily' : 'monthly',
        priority: open ? '0.8' : '0.3'
      };
    })
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.end(xml);
}
