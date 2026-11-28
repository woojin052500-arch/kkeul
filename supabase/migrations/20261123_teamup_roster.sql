-- ==========================================================================
-- "함께 나갈 사람" 명단 + "같이 나갈래요" 요청 (2026-11-23)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql, 20261118_contest_interests.sql, 20261121_team_activity_questions.sql 을 먼저 실행해 두어야 합니다.
--
-- 명단에는 "나도 나갈래요"를 누른 사람 중 한 줄 소개를 직접 써서 올린 사람만 나옵니다.
-- 소개를 쓰지 않으면 인원수에만 잡히고 이름은 보이지 않습니다.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. "나도 나갈래요"에 한 줄 소개와 명단 공개 여부
-- --------------------------------------------------------------------------
alter table public.contest_interests
  add column if not exists id     uuid not null default gen_random_uuid(),
  add column if not exists intro  text,
  add column if not exists listed boolean not null default false;
create unique index if not exists idx_contest_interests_id on public.contest_interests(id);
alter table public.contest_interests drop constraint if exists contest_interests_intro_len;
alter table public.contest_interests
  add constraint contest_interests_intro_len check (intro is null or char_length(intro) between 1 and 60);
alter table public.contest_interests drop constraint if exists contest_interests_listed_needs_intro;
alter table public.contest_interests
  add constraint contest_interests_listed_needs_intro check (not listed or intro is not null);

-- 소개에는 연락처·링크를 넣지 못한다 (has_contact_info 는 20261121 에서 만든 함수)
create or replace function public.contest_interest_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.intro is distinct from old.intro or tg_op = 'INSERT' then
    if new.intro is not null and public.has_contact_info(new.intro) then
      raise exception '연락처나 링크는 소개에 넣을 수 없어요. 팀이 되면 공유돼요.' using errcode = 'P0001';
    end if;
  end if;
  -- 이용 정지된 사람은 명단에 올릴 수 없다
  if new.listed and public.is_suspended(new.user_id) then
    new.listed := false;
  end if;
  return new;
end;
$$;
drop trigger if exists contest_interest_guard_ins on public.contest_interests;
drop trigger if exists contest_interest_guard_upd on public.contest_interests;
create trigger contest_interest_guard_ins before insert on public.contest_interests
  for each row execute function public.contest_interest_guard();
create trigger contest_interest_guard_upd before update on public.contest_interests
  for each row execute function public.contest_interest_guard();

-- --------------------------------------------------------------------------
-- 2. 명단 조회 (회원만). 나, 정지된 사람, 서로 차단한 사람은 빠진다.
-- --------------------------------------------------------------------------
create or replace function public.contest_roster(p_announcement_id text)
returns table (id uuid, user_id uuid, user_name text, role text, intro text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, coalesce(p.name, '이름 없음'), c.role, c.intro, c.created_at
  from public.contest_interests c
  left join public.profiles p on p.id = c.user_id
  where auth.uid() is not null
    and c.announcement_id = p_announcement_id
    and c.listed
    and c.user_id <> auth.uid()
    and not public.is_suspended(c.user_id)
    and not public.has_blocked(auth.uid(), c.user_id)
    and not public.has_blocked(c.user_id, auth.uid())
  order by c.created_at desc
  limit 50;
$$;

-- --------------------------------------------------------------------------
-- 3. "같이 나갈래요" 요청
-- --------------------------------------------------------------------------
create table if not exists public.teamup_requests (
  id              uuid primary key default gen_random_uuid(),
  announcement_id text not null,
  from_user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_name       text not null,
  to_user_id      uuid not null references auth.users(id) on delete cascade,
  message         text check (message is null or char_length(message) between 1 and 60),
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (from_user_id <> to_user_id),
  unique (announcement_id, from_user_id, to_user_id)
);
create index if not exists idx_teamup_to   on public.teamup_requests(to_user_id);
create index if not exists idx_teamup_from on public.teamup_requests(from_user_id);
alter table public.teamup_requests enable row level security;

drop policy if exists "teamup: read"     on public.teamup_requests;
drop policy if exists "teamup: insert"   on public.teamup_requests;
drop policy if exists "teamup: respond"  on public.teamup_requests;
drop policy if exists "teamup: cancel"   on public.teamup_requests;
-- 보낸 사람은 자기 요청을 항상 봄. 받은 사람은 숨김 아니고 차단하지 않은 사람의 요청만 봄.
create policy "teamup: read" on public.teamup_requests for select to authenticated using (
  from_user_id = auth.uid()
  or (to_user_id = auth.uid() and not is_hidden and not public.has_blocked(auth.uid(), from_user_id))
);
-- 명단에 올라 있는 사람에게만 보낼 수 있다 (남의 행은 볼 수 없으므로 확인 전용 함수를 쓴다)
create or replace function public.is_listed_for(uid uuid, ann text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contest_interests c
    where c.user_id = uid and c.announcement_id = ann and c.listed and c.intro is not null
  ) and not public.is_suspended(uid);
$$;
revoke all on function public.is_listed_for(uuid, text) from public, anon;
grant execute on function public.is_listed_for(uuid, text) to authenticated;

create policy "teamup: insert" on public.teamup_requests for insert to authenticated with check (
  from_user_id = auth.uid()
  and status = 'pending' and not is_hidden
  and not public.is_suspended(auth.uid())
  and not public.has_blocked(to_user_id, auth.uid())
  and not public.has_blocked(auth.uid(), to_user_id)
  and public.is_listed_for(to_user_id, announcement_id)
);
-- 받은 사람만 수락·거절 (컬럼 권한으로 status 외에는 못 바꿈)
create policy "teamup: respond" on public.teamup_requests for update to authenticated
  using (to_user_id = auth.uid() and not is_hidden)
  with check (to_user_id = auth.uid());
-- 보낸 사람은 답을 받기 전 요청을 취소할 수 있다
create policy "teamup: cancel" on public.teamup_requests for delete to authenticated
  using (from_user_id = auth.uid() and status = 'pending');
revoke all on public.teamup_requests from anon;
revoke update on public.teamup_requests from authenticated;
grant select, insert, delete on public.teamup_requests to authenticated;
grant update (status, updated_at) on public.teamup_requests to authenticated;

create or replace function public.teamup_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  day_count int;
begin
  if tg_op = 'INSERT' then
    if new.message is not null and public.has_contact_info(new.message) then
      raise exception '연락처나 링크는 메시지에 넣을 수 없어요. 수락되면 연락처가 공유돼요.' using errcode = 'P0001';
    end if;
    select count(*) into day_count from public.teamup_requests r
      where r.from_user_id = new.from_user_id and r.created_at > now() - interval '1 day';
    if day_count >= 10 then
      raise exception '하루에 보낼 수 있는 같이 나갈래요 요청은 10개까지예요.' using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists teamup_guard_ins on public.teamup_requests;
drop trigger if exists teamup_guard_upd on public.teamup_requests;
create trigger teamup_guard_ins before insert on public.teamup_requests
  for each row execute function public.teamup_guard();
create trigger teamup_guard_upd before update on public.teamup_requests
  for each row execute function public.teamup_guard();

-- --------------------------------------------------------------------------
-- 4. 수락된 사이에는 연락처를 볼 수 있다 (20261104_safety.sql 의 함수를 덮어씀:
--    구인글 합류 요청이 수락된 사이 + 같이 나갈래요가 수락된 사이)
-- --------------------------------------------------------------------------
create or replace function public.can_view_contact(viewer uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer is not null and (
    viewer = target
    or (
      not public.has_blocked(target, viewer)
      and (
        exists (
          select 1
          from public.join_requests r
          join public.team_posts p on p.id = r.post_id
          where r.status = 'accepted'
            and (
              (r.user_id = viewer and p.user_id = target)
              or (r.user_id = target and p.user_id = viewer)
            )
        )
        or exists (
          select 1 from public.teamup_requests t
          where t.status = 'accepted'
            and ((t.from_user_id = viewer and t.to_user_id = target)
              or (t.from_user_id = target and t.to_user_id = viewer))
        )
      )
    )
  );
$$;

-- --------------------------------------------------------------------------
-- 5. 신고: 명단 소개(contest_interest), 요청 메시지(teamup_request)
-- --------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check check (
    target_type in ('team_post', 'join_request', 'post_question', 'contest_interest', 'teamup_request')
  );

create or replace function public.hide_reported_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'team_post' then
    update public.team_posts set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'join_request' then
    update public.join_requests set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'post_question' then
    update public.post_questions set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'contest_interest' then
    -- 신고된 소개는 명단에서 내린다 (인원수에는 그대로 잡힘)
    update public.contest_interests set listed = false where id = new.target_id;
  elsif new.target_type = 'teamup_request' then
    update public.teamup_requests set is_hidden = true where id = new.target_id;
  end if;
  return new;
end;
$$;

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
      coalesce(tp.user_id, jr.user_id, pq.asker_id, ci.user_id, tu.from_user_id)       as author_id,
      coalesce(tp.user_name, jr.user_name, pq.asker_name, cip.name, tu.from_name)      as author_name,
      coalesce(tp.comment, jr.message, pq.question, ci.intro, tu.message)              as content,
      case when ci.id is not null then not ci.listed
           else coalesce(tp.is_hidden, jr.is_hidden, pq.is_hidden, tu.is_hidden) end   as is_hidden,
      (tp.id is not null or jr.id is not null or pq.id is not null or ci.id is not null or tu.id is not null) as target_exists,
      coalesce(
        tp.announcement_id,
        (select p2.announcement_id from public.team_posts p2 where p2.id = jr.post_id),
        (select p3.announcement_id from public.team_posts p3 where p3.id = pq.post_id),
        ci.announcement_id,
        tu.announcement_id
      ) as announcement_id,
      public.is_suspended(coalesce(tp.user_id, jr.user_id, pq.asker_id, ci.user_id, tu.from_user_id)) as author_suspended
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
    left join public.team_posts        tp  on g.target_type = 'team_post'        and tp.id = g.target_id
    left join public.join_requests     jr  on g.target_type = 'join_request'     and jr.id = g.target_id
    left join public.post_questions    pq  on g.target_type = 'post_question'    and pq.id = g.target_id
    left join public.contest_interests ci  on g.target_type = 'contest_interest' and ci.id = g.target_id
    left join public.profiles          cip on cip.id = ci.user_id
    left join public.teamup_requests   tu  on g.target_type = 'teamup_request'   and tu.id = g.target_id
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
  elsif p_target_type = 'contest_interest' then
    if p_action = 'restore' then
      update public.contest_interests set listed = true where id = p_target_id and intro is not null;
    else
      update public.contest_interests set listed = false, intro = null where id = p_target_id;
    end if;
  elsif p_target_type = 'teamup_request' then
    if p_action = 'restore' then
      update public.teamup_requests set is_hidden = false where id = p_target_id;
    else
      delete from public.teamup_requests where id = p_target_id;
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
-- 6. 권한
-- --------------------------------------------------------------------------
revoke all on function public.contest_roster(text) from public, anon;
revoke all on function public.admin_list_reports(boolean) from public, anon;
revoke all on function public.admin_resolve_report(text, uuid, text) from public, anon;
grant execute on function public.contest_roster(text) to authenticated;
grant execute on function public.admin_list_reports(boolean) to authenticated;
grant execute on function public.admin_resolve_report(text, uuid, text) to authenticated;
