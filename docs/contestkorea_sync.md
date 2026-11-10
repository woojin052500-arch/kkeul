# 콘테스트코리아 공고 연동

하루 한 번(한국 시간 새벽 5시) 서버가 콘테스트코리아 API에서 공고를 받아 Supabase `announcements` 테이블에 넣습니다.
API 키는 서버 환경변수로만 쓰고, 사이트 코드와 저장소에는 넣지 않습니다.

- 받는 공고: 17개 분야 최근 100건씩 중, **중·고등학생이 참가할 수 있고 아직 접수 중인 공고**
- 같은 공고는 다시 받아도 중복되지 않고 내용만 갱신됩니다.
- 마감 후 7일이 지난 콘테스트코리아 공고는 자동으로 지웁니다. (끌에서 직접 등록한 공고는 지우지 않음)
- 화면에는 출처(콘테스트코리아)를 표시하고, "이동" 버튼은 콘테스트코리아 공고로 연결합니다.

## 설정 (한 번만)

### 1. SQL 실행
Supabase → SQL Editor 에서 `supabase/migrations/20261110_contestkorea.sql` 을 실행하세요.
(출처 컬럼 추가 + 이미 마감된 지난 공고 삭제)

### 2. Vercel 환경변수
Vercel → kkeul 프로젝트 → Settings → Environment Variables 에 추가하세요.

| 이름 | 값 |
|---|---|
| `CONTESTKOREA_API_KEY` | 콘테스트코리아에서 받은 인증키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` 키 (비밀 키. 다른 곳에 붙여넣지 마세요) |
| `CRON_SECRET` | 아무 긴 임의 문자열 (직접 정하기) |

추가한 뒤 **Deployments → 맨 위 배포 → Redeploy** 를 눌러야 적용됩니다.

### 3. 첫 실행
브라우저에서 아래 주소를 열면 바로 한 번 실행됩니다. (`CRON_SECRET` 자리에 2번에서 정한 값)

```
https://kkeul.telosix.co.kr/api/sync-contests?key=CRON_SECRET
```

`{"ok":true,"fetched":1700,"upserted":241,...}` 처럼 나오면 성공입니다. 이후에는 매일 자동으로 실행됩니다.

## 키가 바뀌면
데모 키는 2026-11-24까지입니다. 정식 키를 받으면 Vercel의 `CONTESTKOREA_API_KEY` 값만 바꾸고 Redeploy 하세요.
키가 만료되면 동기화가 실패할 뿐, 이미 받은 공고는 그대로 남습니다.

## 분야 매핑
`api/_lib/contestkorea.js` 의 `MENUS` 에서 콘테스트코리아 분야 → 끌 관심 분야를 정합니다.
