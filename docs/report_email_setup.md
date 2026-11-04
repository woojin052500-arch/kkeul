# 신고 메일 알림 설정

신고가 들어오면 `reports` 테이블에 행이 생기고, 그 대상은 DB 트리거로 바로 숨겨집니다.
여기에 더해 운영자에게 메일을 보내려면 아래를 한 번만 설정하세요.

## 1. Resend 준비
1. https://resend.com 에 가입하고 **API Keys**에서 키를 만드세요.
2. **Domains**에서 `telosix.co.kr`을 추가하고, 안내된 DNS 레코드를 Cloudflare에 넣어 인증하세요.
   (인증 전에는 `onboarding@resend.dev`로 본인 메일에만 보낼 수 있어요.)

## 2. Edge Function 배포
```bash
npx supabase functions deploy report-notify --project-ref mzhwbygibrymzjaavyuu --no-verify-jwt
```
`--no-verify-jwt`는 웹훅이 로그인 토큰 없이 부르기 때문에 필요해요. 대신 함수가 `x-webhook-secret` 헤더를 확인합니다.

## 3. Secrets 등록
Supabase 대시보드 → **Edge Functions → Secrets**에 추가하세요.

| 이름 | 값 |
|---|---|
| `RESEND_API_KEY` | Resend API 키 |
| `REPORT_NOTIFY_TO` | `ceo@telosix.co.kr` |
| `REPORT_NOTIFY_FROM` | `끌 신고 <report@telosix.co.kr>` |
| `WEBHOOK_SECRET` | 아무 긴 임의 문자열 (아래 4번에서도 똑같이 씀) |

## 4. Database Webhook 만들기
Supabase 대시보드 → **Database → Webhooks → Create a new hook**

- Table: `public.reports`
- Events: **Insert**만 체크
- Type: **Supabase Edge Functions** → `report-notify`
- HTTP Headers: `x-webhook-secret` = 3번의 `WEBHOOK_SECRET` 값

## 5. 확인
앱에서 아무 구인글이나 신고해 보세요. 몇 초 안에 메일이 오고, 메일에 "다시 공개"와 "이용 정지" SQL이 들어 있어요.
메일이 안 오면 **Edge Functions → report-notify → Logs**를 보세요.
