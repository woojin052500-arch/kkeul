# 신규 가입 알림 메일

새 회원이 가입(프로필 생성)하면 운영자에게 메일이 갑니다.
메일에는 이름, 회원 구분, 학교·학년, 지역, 관심 분야, 가입 시각, 누적 가입자 수가 담깁니다. (이메일·연락처는 담지 않음)

흐름: Supabase `profiles` INSERT 트리거 → `https://kkeul.telosix.co.kr/api/notify-signup` → Resend → 메일

## 설정 (한 번만)

### 1. Resend API 키
1. https://resend.com 에 **메일을 받을 주소(woojin052501@gmail.com)로** 가입하세요.
   도메인 인증 없이는 가입한 본인 주소로만 보낼 수 있어서, 이 주소로 가입해야 합니다.
2. **API Keys → Create API Key** 로 키를 만드세요.

### 2. Vercel 환경변수
Vercel → kkeul → Settings → Environment Variables 에 추가하고 **Redeploy** 하세요.

| 이름 | 값 |
|---|---|
| `RESEND_API_KEY` | 1번에서 만든 키 |

(`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` 는 공고 동기화 때 넣은 것을 그대로 씁니다.)

### 3. SQL
Supabase → SQL Editor 에서 차례로 실행하세요.

1. `supabase/migrations/20261112_signup_notify.sql`
2. 설정값 (secret 자리에 Vercel 의 `CRON_SECRET` 값)

```sql
insert into public.app_config (key, value) values
  ('signup_webhook_url', 'https://kkeul.telosix.co.kr/api/notify-signup'),
  ('signup_webhook_secret', '여기에_CRON_SECRET')
on conflict (key) do update set value = excluded.value;
```

### 4. 확인
새 계정으로 가입해 보세요. 1분 안에 메일이 옵니다.
안 오면 Supabase SQL Editor 에서 최근 호출 결과를 볼 수 있습니다.

```sql
select id, status_code, content, error_msg, created
from net._http_response order by created desc limit 5;
```

- `401`: `app_config` 의 secret 이 Vercel 의 `CRON_SECRET` 과 다름
- `500` + RESEND_API_KEY: Vercel 환경변수 누락 또는 Redeploy 안 함
- `502`: Resend 가 거절 (받는 주소가 Resend 가입 주소와 다름 등)

## 바꾸기
- 받는 주소: Vercel 환경변수 `SIGNUP_NOTIFY_TO` (도메인 인증 전에는 Resend 가입 주소만 가능)
- 보내는 주소: `SIGNUP_NOTIFY_FROM` (Resend 에서 `telosix.co.kr` 도메인을 인증한 뒤)
- 알림 끄기: `delete from public.app_config where key = 'signup_webhook_url';`
