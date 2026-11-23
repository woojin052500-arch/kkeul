-- ==========================================================================
-- 팀원 모집: 글쓴이 활동 배지 + 한 줄 질문 (2026-11-21)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql, 20261111_admin.sql 을 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. 최근 활동 시각 (본인 외에는 읽을 수 없고, 아래 함수로 대략적인 구간만 공개)
-- --------------------------------------------------------------------------
create table if not exists public.user_activity (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default now()
);
alter table public.user_activity enable row level security;
revoke all on public.user_activity from anon, authenticated;

-- 앱을 열 때 부른다. 30분 안에 다시 불러도 쓰지 않는다.
create or replace function public.touch_activity()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.user_activity (user_id, last_active_at) values (auth.uid(), now())
  on conflict (user_id) do update set last_active_at = now()
  where public.user_activity.last_active_at < now() - interval '30 minutes';
end;
$$;

-- --------------------------------------------------------------------------
-- 2. 한 줄 질문 (합류 요청 전에 가볍게 물어보기. 질문한 사람과 글쓴이만 볼 수 있음)
-- --------------------------------------------------------------------------
create table if not exists public.post_questions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.team_posts(id) on delete cascade,
  asker_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asker_name  text not null,
  question    text not null check (char_length(question) between 1 and 100),
  answer      text check (answer is null or char_length(answer) between 1 and 200),
  answered_at timestamptz,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_post_questions_post  on public.post_questions(post_id);
create index if not exists idx_post_questions_asker on public.post_questions(asker_id);
alter table public.post_questions enable row level security;

drop policy if exists "post_questions: read"         on public.post_questions;
drop policy if exists "post_questions: insert own"   on public.post_questions;
drop policy if exists "post_questions: owner answer" on public.post_questions;
drop policy if exists "post_questions: delete"       on public.post_questions;
-- 질문한 사람은 자기 질문을 항상 봄. 글쓴이는 숨김 아니고 차단하지 않은 사람의 질문만 봄.
create policy "post_questions: read" on public.post_questions for select to authenticated using (
  asker_id = auth.uid()
  or (
    public.team_post_owner(post_id) = auth.uid()
    and not is_hidden
    and not public.has_blocked(auth.uid(), asker_id)
  )
);
create policy "post_questions: insert own" on public.post_questions for insert to authenticated with check (
  asker_id = auth.uid()
  and answer is null and answered_at is null
  and not is_hidden
  and not public.is_suspended(auth.uid())
  and public.team_post_owner(post_id) is distinct from auth.uid()
  and not public.has_blocked(public.team_post_owner(post_id), auth.uid())
  and exists (select 1 from public.team_posts p where p.id = post_id and not p.is_hidden)
);
-- 글쓴이만 답변을 쓸 수 있다 (컬럼 권한으로 answer, answered_at 외에는 못 바꿈)
create policy "post_questions: owner answer" on public.post_questions for update to authenticated
  using (public.team_post_owner(post_id) = auth.uid() and not is_hidden)
  with check (public.team_post_owner(post_id) = auth.uid());
create policy "post_questions: delete" on public.post_questions for delete to authenticated
  using (asker_id = auth.uid() or public.team_post_owner(post_id) = auth.uid());
revoke all on public.post_questions from anon;
revoke update on public.post_questions from authenticated;
grant select, insert, delete on public.post_questions to authenticated;
grant update (answer, answered_at) on public.post_questions to authenticated;

-- 연락처·링크는 합류가 수락된 뒤에 나누도록, 질문과 답변에는 넣지 못하게 한다.
create or replace function public.has_contact_info(t text)
returns boolean language sql immutable as $$
  select length(regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g')) >= 7
      or coalesce(t, '') ~* '(https?://|www\.|@|\.com|\.kr|\.net|\.me/)';
$$;

create or replace function public.post_question_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  open_count int;
  day_count  int;
begin
  if tg_op = 'INSERT' then
    if public.has_contact_info(new.question) then
      raise exception '연락처나 링크는 합류가 수락된 뒤에 공유돼요. 질문에는 넣지 말아 주세요.' using errcode = 'P0001';
    end if;
    select count(*) into open_count from public.post_questions q
      where q.post_id = new.post_id and q.asker_id = new.asker_id and q.answer is null;
    if open_count >= 3 then
      raise exception '아직 답을 받지 못한 질문이 3개예요. 답을 기다려 주세요.' using errcode = 'P0001';
    end if;
    select count(*) into day_count from public.post_questions q
      where q.asker_id = new.asker_id and q.created_at > now() - interval '1 day';
    if day_count >= 20 then
      raise exception '하루에 보낼 수 있는 질문은 20개까지예요.' using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.answer is distinct from old.answer then
      if public.has_contact_info(new.answer) then
        raise exception '연락처나 링크는 합류를 수락한 뒤에 공유해 주세요. 답변에는 넣지 말아 주세요.' using errcode = 'P0001';
      end if;
      new.answered_at := case when new.answer is null then null else coalesce(old.answered_at, now()) end;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists post_question_guard_ins on public.post_questions;
drop trigger if exists post_question_guard_upd on public.post_questions;
create trigger post_question_guard_ins before insert on public.post_questions
  for each row execute function public.post_question_guard();
create trigger post_question_guard_upd before update on public.post_questions
  for each row execute function public.post_question_guard();

-- --------------------------------------------------------------------------
-- 2-1. 글쓴이 활동 구간 (한 줄 질문에 답한 기록도 답장 속도에 포함)
-- --------------------------------------------------------------------------
-- 구인글 글쓴이의 활동 구간과 답장 속도. 정확한 시각은 주지 않고 구간만 돌려준다.
--   active: 'today'(24시간 안) / 'week'(7일 안) / null
--   reply : 'day'(보통 하루 안에 답함) / 'three'(보통 3일 안) / null  (답한 기록이 2건 이상일 때만)
-- 이용 정지된 사람은 아무 구간도 돌려주지 않는다.
create or replace function public.team_author_stats(p_user_ids uuid[])
returns table (user_id uuid, active text, reply text)
language sql stable security definer set search_path = public as $$
  with ids as (
    select distinct u as uid from unnest(p_user_ids[1:200]) as u
    where not public.is_suspended(u)
  ),
  answers as (
    select p.user_id as uid, extract(epoch from (r.updated_at - r.created_at)) as secs
    from public.join_requests r join public.team_posts p on p.id = r.post_id
    where r.status in ('accepted', 'rejected') and p.user_id in (select uid from ids)
    union all
    select p.user_id, extract(epoch from (q.answered_at - q.created_at))
    from public.post_questions q join public.team_posts p on p.id = q.post_id
    where q.answered_at is not null and p.user_id in (select uid from ids)
  ),
  reply as (
    select uid, count(*) as n, percentile_cont(0.5) within group (order by secs) as median_secs
    from answers group by uid
  )
  select ids.uid,
         case
           when a.last_active_at >= now() - interval '1 day'  then 'today'
           when a.last_active_at >= now() - interval '7 days' then 'week'
         end,
         case
           when r.n >= 2 and r.median_secs <= 86400  then 'day'
           when r.n >= 2 and r.median_secs <= 259200 then 'three'
         end
  from ids
  left join public.user_activity a on a.user_id = ids.uid
  left join reply r on r.uid = ids.uid;
$$;

-- --------------------------------------------------------------------------
-- 3. 질문도 신고할 수 있게 (신고하면 바로 숨김, 운영자가 확인)
-- --------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check check (target_type in ('team_post', 'join_request', 'post_question'));

create or replace function public.hide_reported_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'team_post' then
    update public.team_posts set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'join_request' then
    update public.join_requests set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'post_question' then
    update public.post_questions set is_hidden = true where id = new.target_id;
  end if;
  return new;
end;
$$;

-- 관리자 신고 목록·처리에 질문 포함 (20261111_admin.sql 의 함수를 덮어씀)
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
      coalesce(tp.user_id, jr.user_id, pq.asker_id)       as author_id,
      coalesce(tp.user_name, jr.user_name, pq.asker_name) as author_name,
      coalesce(tp.comment, jr.message, pq.question)       as content,
      coalesce(tp.is_hidden, jr.is_hidden, pq.is_hidden)  as is_hidden,
      (tp.id is not null or jr.id is not null or pq.id is not null) as target_exists,
      coalesce(
        tp.announcement_id,
        (select p2.announcement_id from public.team_posts p2 where p2.id = jr.post_id),
        (select p3.announcement_id from public.team_posts p3 where p3.id = pq.post_id)
      ) as announcement_id,
      public.is_suspended(coalesce(tp.user_id, jr.user_id, pq.asker_id)) as author_suspended
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
    left join public.team_posts     tp on g.target_type = 'team_post'     and tp.id = g.target_id
    left join public.join_requests  jr on g.target_type = 'join_request'  and jr.id = g.target_id
    left join public.post_questions pq on g.target_type = 'post_question' and pq.id = g.target_id
    where include_resolved or not g.resolved
  ) x;
  return result;
end;
$$;

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
  elsif p_target_type = 'post_question' then
    if p_action = 'restore' then
      update public.post_questions set is_hidden = false where id = p_target_id;
    else
      delete from public.post_questions where id = p_target_id;
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

-- --------------------------------------------------------------------------
-- 4. 권한
-- --------------------------------------------------------------------------
revoke all on function public.touch_activity() from public, anon;
revoke all on function public.team_author_stats(uuid[]) from public;
revoke all on function public.has_contact_info(text) from public, anon;
revoke all on function public.admin_list_reports(boolean) from public, anon;
revoke all on function public.admin_resolve_report(text, uuid, text) from public, anon;
grant execute on function public.touch_activity() to authenticated;
grant execute on function public.team_author_stats(uuid[]) to anon, authenticated;
grant execute on function public.has_contact_info(text) to authenticated;
grant execute on function public.admin_list_reports(boolean) to authenticated;
grant execute on function public.admin_resolve_report(text, uuid, text) to authenticated;
