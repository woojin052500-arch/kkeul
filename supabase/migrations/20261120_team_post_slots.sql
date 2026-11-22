-- ==========================================================================
-- 팀원 모집 "남은 자리" (2026-11-20)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql (team_posts, join_requests) 를 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- 1. 구인글마다 "몇 명을 구하는지". 예전 글은 1명으로 본다.
alter table public.team_posts
  add column if not exists slots integer not null default 1;
alter table public.team_posts drop constraint if exists team_posts_slots_range;
alter table public.team_posts
  add constraint team_posts_slots_range check (slots between 1 and 10);

-- 2. 구인글별 채워진 자리 (수락된 합류 요청 수). 다른 사람의 요청 내용은 노출하지 않고 숫자만 돌려준다.
create or replace function public.team_post_slot_counts(p_post_ids uuid[])
returns table (post_id uuid, filled int)
language sql stable security definer set search_path = public as $$
  select r.post_id, count(*)::int
  from public.join_requests r
  where r.post_id = any (p_post_ids[1:200])
    and r.status = 'accepted'
  group by r.post_id;
$$;
revoke all on function public.team_post_slot_counts(uuid[]) from public;
grant execute on function public.team_post_slot_counts(uuid[]) to anon, authenticated;

-- 3. 자리가 다 찬 글에는 새 합류 요청을 받지 않는다.
create or replace function public.join_request_check_slots()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total  int;
  filled int;
begin
  select p.slots into total from public.team_posts p where p.id = new.post_id;
  if total is null then
    return new;
  end if;
  select count(*) into filled from public.join_requests r where r.post_id = new.post_id and r.status = 'accepted';
  if filled >= total then
    raise exception '모집 인원이 다 찼어요.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists join_requests_slots_on_insert on public.join_requests;
create trigger join_requests_slots_on_insert
  before insert on public.join_requests
  for each row execute function public.join_request_check_slots();

-- 4. 정원을 넘겨 수락할 수 없다.
create or replace function public.join_request_check_accept()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total  int;
  filled int;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select p.slots into total from public.team_posts p where p.id = new.post_id;
    select count(*) into filled from public.join_requests r
      where r.post_id = new.post_id and r.status = 'accepted' and r.id <> new.id;
    if total is not null and filled >= total then
      raise exception '모집 인원이 다 찼어요. 더 수락할 수 없어요.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists join_requests_slots_on_accept on public.join_requests;
create trigger join_requests_slots_on_accept
  before update on public.join_requests
  for each row execute function public.join_request_check_accept();

-- 5. 관리자 구인글 목록에 모집 인원과 채운 자리도 보이게 (20261116_admin_team_posts.sql 의 함수를 덮어씀)
create or replace function public.admin_list_team_posts(p_query text default '', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  q      text := nullif(trim(coalesce(p_query, '')), '');
  lim    int  := least(greatest(coalesce(p_limit, 50), 1), 200);
  off    int  := greatest(coalesce(p_offset, 0), 0);
  total  int;
  posts  jsonb;
begin
  perform public.require_admin();

  select count(*)::int into total
  from public.team_posts p
  where q is null
     or p.user_name ilike '%' || q || '%'
     or p.comment   ilike '%' || q || '%'
     or coalesce(p.my_role, '')     ilike '%' || q || '%'
     or coalesce(p.role_wanted, '') ilike '%' || q || '%'
     or p.announcement_id = q;

  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]'::jsonb) into posts
  from (
    select jsonb_build_object(
      'id', p.id,
      'announcement_id', p.announcement_id,
      'user_id', p.user_id,
      'user_name', p.user_name,
      'my_role', p.my_role,
      'role_wanted', p.role_wanted,
      'comment', p.comment,
      'is_hidden', coalesce(p.is_hidden, false),
      'created_at', p.created_at,
      'slots', p.slots,
      'filled', (select count(*) from public.join_requests jr where jr.post_id = p.id and jr.status = 'accepted'),
      'request_count', (select count(*) from public.join_requests jr where jr.post_id = p.id),
      'report_count', (select count(*) from public.reports r where r.target_type = 'team_post' and r.target_id = p.id),
      'author_suspended', public.is_suspended(p.user_id)
    ) as x
    from public.team_posts p
    where q is null
       or p.user_name ilike '%' || q || '%'
       or p.comment   ilike '%' || q || '%'
       or coalesce(p.my_role, '')     ilike '%' || q || '%'
       or coalesce(p.role_wanted, '') ilike '%' || q || '%'
       or p.announcement_id = q
    order by p.created_at desc
    limit lim offset off
  ) s;

  return jsonb_build_object('total', total, 'posts', posts);
end;
$$;
