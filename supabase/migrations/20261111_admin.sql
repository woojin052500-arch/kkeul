-- ==========================================================================
-- 끌 앱 관리자 기능 (2026-11-11)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 관리자 지정 (이 파일 실행 후, 이메일만 바꿔서 따로 실행):
--   insert into public.admins (user_id, note)
--   select id, '운영자' from auth.users where email = '관리자로_만들_계정@이메일'
--   on conflict (user_id) do nothing;
-- 관리자 해제:
--   delete from public.admins where user_id = (select id from auth.users where email = '...');
-- ==========================================================================

-- 1. 관리자 목록. 앱에서는 읽기(본인 행)만 가능하고, 추가·삭제는 대시보드에서만 할 수 있다.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins: read own" on public.admins;
create policy "admins: read own" on public.admins for select to authenticated using (user_id = auth.uid());
revoke all on public.admins from anon;
revoke insert, update, delete on public.admins from authenticated;
grant select on public.admins to authenticated;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (select 1 from public.admins where user_id = uid);
$$;

-- 관리 작업 공통 확인
create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception '관리자만 할 수 있는 작업이에요.' using errcode = '42501';
  end if;
end;
$$;

-- 2. 신고 처리 기록
alter table public.reports
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid,
  add column if not exists resolution  text;  -- 'restored' | 'deleted'

-- 3. 신고 목록 (대상별로 묶어서)
create or replace function public.admin_list_reports(include_resolved boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.last_reported_at desc), '[]'::jsonb) into result
  from (
    select
      g.target_type,
      g.target_id,
      g.report_count,
      g.last_reported_at,
      g.reasons,
      g.resolved,
      g.resolution,
      coalesce(tp.user_id, jr.user_id)       as author_id,
      coalesce(tp.user_name, jr.user_name)   as author_name,
      coalesce(tp.comment, jr.message)       as content,
      coalesce(tp.is_hidden, jr.is_hidden)   as is_hidden,
      (tp.id is not null or jr.id is not null) as target_exists,
      coalesce(tp.announcement_id, (select p2.announcement_id from public.team_posts p2 where p2.id = jr.post_id)) as announcement_id,
      public.is_suspended(coalesce(tp.user_id, jr.user_id)) as author_suspended
    from (
      select r.target_type,
             r.target_id,
             count(*)::int                                   as report_count,
             max(r.created_at)                               as last_reported_at,
             coalesce(array_agg(distinct r.reason) filter (where r.reason is not null and r.reason <> ''), '{}') as reasons,
             bool_and(r.resolved_at is not null)             as resolved,
             max(r.resolution)                               as resolution
      from public.reports r
      group by r.target_type, r.target_id
    ) g
    left join public.team_posts    tp on g.target_type = 'team_post'    and tp.id = g.target_id
    left join public.join_requests jr on g.target_type = 'join_request' and jr.id = g.target_id
    where include_resolved or not g.resolved
  ) x;
  return result;
end;
$$;

-- 4. 신고 처리: 'restore' = 문제없음, 다시 공개 / 'delete' = 삭제
create or replace function public.admin_resolve_report(p_target_type text, p_target_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_action not in ('restore', 'delete') then
    raise exception '알 수 없는 처리: %', p_action;
  end if;

  if p_target_type = 'team_post' then
    if p_action = 'restore' then
      update public.team_posts set is_hidden = false where id = p_target_id;
    else
      delete from public.team_posts where id = p_target_id;
    end if;
  elsif p_target_type = 'join_request' then
    if p_action = 'restore' then
      update public.join_requests set is_hidden = false where id = p_target_id;
    else
      delete from public.join_requests where id = p_target_id;
    end if;
  else
    raise exception '알 수 없는 대상: %', p_target_type;
  end if;

  update public.reports
     set resolved_at = now(),
         resolved_by = auth.uid(),
         resolution  = case when p_action = 'restore' then 'restored' else 'deleted' end
   where target_type = p_target_type and target_id = p_target_id and resolved_at is null;
end;
$$;

-- 5. 이용 정지 / 해제
create or replace function public.admin_set_suspension(p_user_id uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_user_id = auth.uid() then
    raise exception '자기 자신은 정지할 수 없어요.';
  end if;
  if p_suspend and public.is_admin(p_user_id) then
    raise exception '관리자 계정은 정지할 수 없어요.';
  end if;

  if p_suspend then
    insert into public.suspended_users (user_id, reason)
    values (p_user_id, nullif(trim(coalesce(p_reason, '')), ''))
    on conflict (user_id) do update set reason = excluded.reason;
  else
    delete from public.suspended_users where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.admin_list_suspended()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', s.user_id,
           'name', p.name,
           'reason', s.reason,
           'created_at', s.created_at
         ) order by s.created_at desc), '[]'::jsonb)
    into result
  from public.suspended_users s
  left join public.profiles p on p.id = s.user_id;
  return result;
end;
$$;

-- 6. 대회 공고 삭제 (찜·스와이프 기록, 그 대회의 구인글도 함께)
create or replace function public.admin_delete_announcement(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if to_regclass('public.bookmarks') is not null then
    delete from public.bookmarks where announcement_id::text = p_id;
  end if;
  if to_regclass('public.user_actions') is not null then
    delete from public.user_actions where announcement_id::text = p_id;
  end if;
  delete from public.team_posts where announcement_id = p_id;
  delete from public.announcements where id::text = p_id;
end;
$$;

-- 7. 동아리 모집 공고 삭제 (지원서도 함께 삭제됨)
create or replace function public.admin_delete_club_announcement(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.club_announcements where id = p_id;
end;
$$;

-- 권한: 로그인한 사용자만 호출할 수 있고, 함수 안에서 관리자인지 다시 확인한다
-- is_admin / require_admin 은 다른 함수 안에서만 쓰므로 직접 호출을 막는다
revoke all on function public.is_admin(uuid) from public, anon, authenticated;
revoke all on function public.require_admin() from public, anon, authenticated;
revoke all on function public.admin_list_reports(boolean) from public, anon;
revoke all on function public.admin_resolve_report(text, uuid, text) from public, anon;
revoke all on function public.admin_set_suspension(uuid, boolean, text) from public, anon;
revoke all on function public.admin_list_suspended() from public, anon;
revoke all on function public.admin_delete_announcement(text) from public, anon;
revoke all on function public.admin_delete_club_announcement(text) from public, anon;
grant execute on function public.admin_list_reports(boolean) to authenticated;
grant execute on function public.admin_resolve_report(text, uuid, text) to authenticated;
grant execute on function public.admin_set_suspension(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_suspended() to authenticated;
grant execute on function public.admin_delete_announcement(text) to authenticated;
grant execute on function public.admin_delete_club_announcement(text) to authenticated;
