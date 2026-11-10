-- ==========================================================================
-- 가입 알림 메일에 학교·학년·지역·관심 분야 넣기 (2026-11-14)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261112_signup_notify.sql 을 먼저 실행해 둔 상태여야 합니다. (app_config 설정값은 그대로 씁니다)
--
-- 바뀌는 점: 가입하면 이름만 있는 프로필이 먼저 만들어지고 학교·관심 분야는 그 직후에 저장됩니다.
-- 그래서 알림을 "프로필이 처음 만들어질 때"가 아니라 "가입 정보(학년)가 처음 채워질 때" 한 번 보냅니다.
-- ==========================================================================

create or replace function public.notify_new_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hook_url    text;
  hook_secret text;
  now_filled  boolean := coalesce(to_jsonb(new) ->> 'grade', '') <> '';
  was_filled  boolean := false;
begin
  if tg_op = 'UPDATE' then
    was_filled := coalesce(to_jsonb(old) ->> 'grade', '') <> '';
  end if;
  -- 가입 정보가 처음 채워지는 순간에만 보낸다 (이후 프로필 수정에는 보내지 않음)
  if not now_filled or was_filled then
    return new;
  end if;

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
  after insert or update on public.profiles
  for each row execute function public.notify_new_signup();
