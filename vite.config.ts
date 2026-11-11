import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// 구글 서치 콘솔 / 네이버 서치어드바이저 소유 확인 태그.
// Vercel 환경변수 GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION 에 확인 코드(content 값)만 넣으면 빌드할 때 들어간다.
const siteVerification = (env: Record<string, string>): Plugin => ({
  name: 'site-verification',
  transformIndexHtml(html) {
    const clean = (v?: string) => (v || '').trim().replace(/[^A-Za-z0-9_-]/g, '')
    // index.html 에 이미 들어 있는 태그는 다시 넣지 않는다
    const has = (name: string) => html.includes(`name="${name}"`)
    const tags = [
      !has('google-site-verification') && clean(env.GOOGLE_SITE_VERIFICATION) && `<meta name="google-site-verification" content="${clean(env.GOOGLE_SITE_VERIFICATION)}" />`,
      !has('naver-site-verification') && clean(env.NAVER_SITE_VERIFICATION) && `<meta name="naver-site-verification" content="${clean(env.NAVER_SITE_VERIFICATION)}" />`
    ].filter(Boolean)
    return tags.length ? html.replace('<!--seo:start-->', `${tags.join('\n    ')}\n    <!--seo:start-->`) : html
  }
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), siteVerification({ ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>)],
}))
