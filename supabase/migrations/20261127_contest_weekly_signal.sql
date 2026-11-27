-- ==========================================================================
-- 홈 '이번 주 많이 본 공고·팀' (2026-11-27)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql (team_posts, join_requests, is_suspended), 20261118_contest_interests.sql 이 먼저 있어야 합니다.
-- 20261126_contest_team_signal.sql 은 없어도 됩니다.
-- 이 스크립트를 실행하지 않아도 홈은 깨지지 않습니다. 그때 앱은 contest_team_signal 로 넘어가
-- 누적 활동 순으로 보여 주고, 화면 제목도 '이번 주'를 빼고 표시합니다.
-- ==========================================================================

-- 구인글 정원(slots). 20261120_team_post_slots.sql 이 아직 안 돌아간 DB에서도 이 스크립트가 그대로 돌도록 한 줄만 먼저 맞춘다.
alter table public.team_posts add column if not exists slots integer not null default 1;

-- 대회별 이번 주(기본 최근 7일) 활동과, 하루 전 같은 시각 기준 활동.
-- 앱은 이 둘로 오늘 순위와 어제 순위를 각각 매겨 '▲2 / ▼1 / NEW' 를 만든다.
--   week_interest      최근 N일 동안 새로 눌린 '나도 나갈래요' 수
--   week_posts         최근 N일 동안 올라온 팀원 모집 글 수
--   open_post_count    지금 자리가 남아 있는 모집 글 수 (동점일 때 앞세운다)
--   interest_total     지금까지 누적 '나도 나갈래요' 수
--   latest_post_at     가장 최근 모집 글 시각
--   prev_week_interest 어제 이 시각 기준 최근 N일 '나도 나갈래요' 수
--   prev_week_posts    어제 이 시각 기준 최근 N일 모집 글 수
-- 숨김 처리된 글과 이용 정지된 사람은 세지 않고, 이름·연락처 같은 개인 정보는 돌려주지 않는다.
-- 이번 주에도 어제에도 활동이 없던 대회는 행을 돌려주지 않는다.
create or replace function public.contest_weekly_signal(p_ids text[], p_days int default 7)
returns table (
  announcement_id    text,
  week_interest      int,
  week_posts         int,
  open_post_count    int,
  interest_total     int,
  latest_post_at     timestamptz,
  prev_week_interest int,
  prev_week_posts    int
)
language sql stable security definer set search_path = public as $$
  with cur_win as (
    select now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30)) as since
  ),
  prev_win as (
    select now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30) + 1) as since,
           now() - interval '1 day' as until
  ),
  ids as (
    select distinct i as id from unnest(p_ids[1:300]) as i
  ),
  cur_interests as (
    select c.announcement_id as id, count(*)::int as n
    from public.contest_interests c
    where c.announcement_id = any (p_ids[1:300])
      and c.created_at >= (select since from cur_win)
      and not public.is_suspended(c.user_id)
    group by c.announcement_id
  ),
  all_interests as (
    select c.announcement_id as id, count(*)::int as n
    from public.contest_interests c
    where c.announcement_id = any (p_ids[1:300])
      and not public.is_suspended(c.user_id)
    group by c.announcement_id
  ),
  cur_posts as (
    select p.announcement_id as id, count(*)::int as n, max(p.created_at) as latest
    from public.team_posts p
    where p.announcement_id = any (p_ids[1:300])
      and not p.is_hidden
      and not public.is_suspended(p.user_id)
      and p.created_at >= (select since from cur_win)
    group by p.announcement_id
  ),
  accepted as (
    select r.post_id as id, count(*)::int as n
    from public.join_requests r
    where r.status = 'accepted'
      and r.post_id in (
        select p.id from public.team_posts p where p.announcement_id = any (p_ids[1:300])
      )
    group by r.post_id
  ),
  open_posts as (
    select p.announcement_id as id,
           (count(*) filter (where coalesce(p.slots, 1) > coalesce(accepted.n, 0)))::int as n
    from public.team_posts p
    left join accepted on accepted.id = p.id
    where p.announcement_id = any (p_ids[1:300])
      and not p.is_hidden
      and not public.is_suspended(p.user_id)
    group by p.announcement_id
  ),
  prev_interests as (
    select c.announcement_id as id, count(*)::int as n
    from public.contest_interests c
    where c.announcement_id = any (p_ids[1:300])
      and c.created_at >= (select since from prev_win)
      and c.created_at < (select until from prev_win)
      and not public.is_suspended(c.user_id)
    group by c.announcement_id
  ),
  prev_posts as (
    select p.announcement_id as id, count(*)::int as n
    from public.team_posts p
    where p.announcement_id = any (p_ids[1:300])
      and not p.is_hidden
      and not public.is_suspended(p.user_id)
      and p.created_at >= (select since from prev_win)
      and p.created_at < (select until from prev_win)
    group by p.announcement_id
  )
  select ids.id,
         coalesce(cur_interests.n, 0),
         coalesce(cur_posts.n, 0),
         coalesce(open_posts.n, 0),
         coalesce(all_interests.n, 0),
         cur_posts.latest,
         coalesce(prev_interests.n, 0),
         coalesce(prev_posts.n, 0)
  from ids
  left join cur_interests  on cur_interests.id  = ids.id
  left join all_interests  on all_interests.id  = ids.id
  left join cur_posts      on cur_posts.id      = ids.id
  left join open_posts     on open_posts.id     = ids.id
  left join prev_interests on prev_interests.id = ids.id
  left join prev_posts     on prev_posts.id     = ids.id
  where coalesce(cur_interests.n, 0) > 0
     or coalesce(cur_posts.n, 0) > 0
     or coalesce(prev_interests.n, 0) > 0
     or coalesce(prev_posts.n, 0) > 0;
$$;
revoke all on function public.contest_weekly_signal(text[], int) from public;
grant execute on function public.contest_weekly_signal(text[], int) to anon, authenticated;
