-- ==========================================================================
-- "나도 나갈래요" (2026-11-18)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql 을 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- 대회에 나가고 싶다고 표시한 기록. 누가 눌렀는지는 본인만 보고,
-- 다른 사람에게는 대회별·역할별 인원수만 공개한다 (아래 함수).
create table if not exists public.contest_interests (
  user_id         uuid not null references auth.users(id) on delete cascade,
  announcement_id text not null,
  role            text not null check (role in ('기획', '디자인', '개발')),
  created_at      timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
create index if not exists idx_contest_interests_announcement on public.contest_interests(announcement_id);

alter table public.contest_interests enable row level security;
drop policy if exists "contest_interests: read own"   on public.contest_interests;
drop policy if exists "contest_interests: insert own" on public.contest_interests;
drop policy if exists "contest_interests: update own" on public.contest_interests;
drop policy if exists "contest_interests: delete own" on public.contest_interests;
create policy "contest_interests: read own"   on public.contest_interests for select to authenticated using (user_id = auth.uid());
create policy "contest_interests: insert own" on public.contest_interests for insert to authenticated
  with check (user_id = auth.uid() and not public.is_suspended(auth.uid()));
create policy "contest_interests: update own" on public.contest_interests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and not public.is_suspended(auth.uid()));
create policy "contest_interests: delete own" on public.contest_interests for delete to authenticated using (user_id = auth.uid());

revoke all on public.contest_interests from anon;
grant select, insert, update, delete on public.contest_interests to authenticated;

-- 대회별·역할별 인원수 (비회원도 볼 수 있음. 이름 등 개인 정보는 돌려주지 않는다)
-- 이용 정지된 사용자는 세지 않는다.
create or replace function public.contest_interest_counts(p_ids text[])
returns table (announcement_id text, total int, dev int, design int, plan int)
language sql stable security definer set search_path = public as $$
  select c.announcement_id,
         count(*)::int,
         count(*) filter (where c.role = '개발')::int,
         count(*) filter (where c.role = '디자인')::int,
         count(*) filter (where c.role = '기획')::int
  from public.contest_interests c
  where c.announcement_id = any (p_ids[1:200])
    and not public.is_suspended(c.user_id)
  group by c.announcement_id;
$$;
revoke all on function public.contest_interest_counts(text[]) from public;
grant execute on function public.contest_interest_counts(text[]) to anon, authenticated;

-- 대회 공고를 관리자가 지우면 표시도 함께 지운다 (20261111_admin.sql 의 함수를 덮어씀)
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
  delete from public.contest_interests where announcement_id = p_id;
  delete from public.team_posts where announcement_id = p_id;
  delete from public.announcements where id::text = p_id;
end;
$$;
