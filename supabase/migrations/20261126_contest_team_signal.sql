-- ==========================================================================
-- 대회 카드의 팀원 모집 신호 (2026-11-26)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql (team_posts, join_requests, is_suspended), 20261118_contest_interests.sql 을 먼저 실행해 두어야 합니다.
-- 20261122_contest_activity.sql 은 필요하지 않습니다. 이 함수가 그 자리를 대신합니다.
-- ==========================================================================

-- 구인글 정원(slots). 20261120_team_post_slots.sql 이 아직 안 돌아간 DB에서도 이 스크립트가 그대로 돌도록 한 줄만 먼저 맞춘다.
alter table public.team_posts add column if not exists slots integer not null default 1;

-- 대회별로 "지금 팀원을 구하고 있는 글" 수, 전체 글 수, 가장 최근 글 시각, "나갈래요" 수.
-- 모집 중 = 숨김 처리되지 않았고, 쓴 사람이 정지 상태가 아니고, 수락된 인원이 정원보다 적은 글.
-- 정원이 찬 글은 모집 중으로 세지 않는다. 글쓴이 이름·연락처 같은 개인 정보는 돌려주지 않는다.
-- 활동이 전혀 없는 대회는 행을 돌려주지 않는다.
create or replace function public.contest_team_signal(p_ids text[])
returns table (
  announcement_id text,
  post_count      int,
  open_post_count int,
  latest_post_at  timestamptz,
  interest_total  int
)
language sql stable security definer set search_path = public as $$
  with ids as (
    select distinct i as id from unnest(p_ids[1:300]) as i
  ),
  posts as (
    select
      p.announcement_id as id,
      count(*)::int as n,
      (count(*) filter (
        where coalesce(p.slots, 1) > (
          select count(*) from public.join_requests r
          where r.post_id = p.id and r.status = 'accepted'
        )
      ))::int as open_n,
      max(p.created_at) as latest
    from public.team_posts p
    where p.announcement_id = any (p_ids[1:300])
      and not p.is_hidden
      and not public.is_suspended(p.user_id)
    group by p.announcement_id
  ),
  ints as (
    select c.announcement_id as id, count(*)::int as n
    from public.contest_interests c
    where c.announcement_id = any (p_ids[1:300])
      and not public.is_suspended(c.user_id)
    group by c.announcement_id
  )
  select ids.id, coalesce(posts.n, 0), coalesce(posts.open_n, 0), posts.latest, coalesce(ints.n, 0)
  from ids
  left join posts on posts.id = ids.id
  left join ints  on ints.id  = ids.id
  where posts.n is not null or ints.n is not null;
$$;
revoke all on function public.contest_team_signal(text[]) from public;
grant execute on function public.contest_team_signal(text[]) to anon, authenticated;
