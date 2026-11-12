-- ==========================================================================
-- 구인글 저장 (2026-11-17)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261104_safety.sql (team_posts) 를 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- 내가 저장한 구인글. 본인 것만 보고 넣고 지울 수 있다.
-- 글이 삭제되면 저장 기록도 함께 지워진다.
create table if not exists public.saved_team_posts (
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.team_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_saved_team_posts_post on public.saved_team_posts(post_id);

alter table public.saved_team_posts enable row level security;
drop policy if exists "saved_team_posts: read own"   on public.saved_team_posts;
drop policy if exists "saved_team_posts: insert own" on public.saved_team_posts;
drop policy if exists "saved_team_posts: delete own" on public.saved_team_posts;
create policy "saved_team_posts: read own"   on public.saved_team_posts for select to authenticated using (user_id = auth.uid());
create policy "saved_team_posts: insert own" on public.saved_team_posts for insert to authenticated with check (user_id = auth.uid());
create policy "saved_team_posts: delete own" on public.saved_team_posts for delete to authenticated using (user_id = auth.uid());

revoke all on public.saved_team_posts from anon;
grant select, insert, delete on public.saved_team_posts to authenticated;
