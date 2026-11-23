-- ==========================================================================
-- 대회 카드의 팀 모집 활동 (2026-11-22)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql, 20261118_contest_interests.sql 을 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- 대회별 팀 모집 글 수, 가장 최근 글이 올라온 시각, "나갈래요" 수.
-- 숨김 처리된 글과 이용 정지된 사람은 세지 않고, 이름 등 개인 정보는 돌려주지 않는다.
-- 활동이 전혀 없는 대회는 행을 돌려주지 않는다.
create or replace function public.contest_activity(p_ids text[])
returns table (announcement_id text, post_count int, latest_post_at timestamptz, interest_total int)
language sql stable security definer set search_path = public as $$
  with ids as (
    select distinct i as id from unnest(p_ids[1:300]) as i
  ),
  posts as (
    select p.announcement_id as id, count(*)::int as n, max(p.created_at) as latest
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
  select ids.id, coalesce(posts.n, 0), posts.latest, coalesce(ints.n, 0)
  from ids
  left join posts on posts.id = ids.id
  left join ints  on ints.id  = ids.id
  where posts.n is not null or ints.n is not null;
$$;
revoke all on function public.contest_activity(text[]) from public;
grant execute on function public.contest_activity(text[]) to anon, authenticated;
