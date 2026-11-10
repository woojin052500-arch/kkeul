-- ==========================================================================
-- 신규 가입 알림 메일 (2026-11-12)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 실행 후, 아래 설정값을 따로 한 번 넣어야 동작합니다 (secret 은 Vercel 의 CRON_SECRET 과 같은 값):
--   insert into public.app_config (key, value) values
--     ('signup_webhook_url', 'https://kkeul.telosix.co.kr/api/notify-signup'),
--     ('signup_webhook_secret', '여기에_CRON_SECRET')
--   on conflict (key) do update set value = excluded.value;
-- 알림 끄기:
--   delete from public.app_config where key = 'signup_webhook_url';
-- ==========================================================================

create extension if not exists pg_net;

-- 서버 전용 설정값. 정책이 없어서 앱(anon/authenticated)에서는 읽을 수도 쓸 수도 없다.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- 새 프로필이 생기면 끌 서버(/api/notify-signup)를 호출한다.
-- 어떤 이유로든 호출이 실패해도 가입은 그대로 진행된다.
create or replace function public.notify_new_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hook_url    text;
  hook_secret text;
begin
  select value into hook_url    from public.app_config where key = 'signup_webhook_url';
  select value into hook_secret from public.app_config where key = 'signup_webhook_secret';
  if hook_url is null or hook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := hook_url,
    body    := jsonb_build_object(
                 'type', 'INSERT',
                 'table', 'profiles',
                 'record', jsonb_build_object(
                   'name',       to_jsonb(new) ->> 'name',
                   'role',       to_jsonb(new) ->> 'role',
                   'school',     to_jsonb(new) ->> 'school',
                   'grade',      to_jsonb(new) ->> 'grade',
                   'location',   to_jsonb(new) ->> 'location',
                   'interests',  to_jsonb(new) -> 'interests',
                   'created_at', to_jsonb(new) ->> 'created_at'
                 )
               ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || hook_secret)
  );
  return new;
exception when others then
  raise warning '가입 알림 호출 실패: %', sqlerrm;
  return new;
end;
$$;
revoke all on function public.notify_new_signup() from public, anon, authenticated;

drop trigger if exists on_profile_created_notify on public.profiles;
create trigger on_profile_created_notify
  after insert on public.profiles
  for each row execute function public.notify_new_signup();
