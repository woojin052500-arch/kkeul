-- ==========================================================================
-- 비회원 둘러보기 (2026-11-15)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- ==========================================================================

-- 1. 대회 공고는 로그인하지 않아도 읽을 수 있게 한다 (읽기만. 쓰기 권한은 바꾸지 않음)
grant select on public.announcements to anon, authenticated;
drop policy if exists "announcements: public read" on public.announcements;
create policy "announcements: public read" on public.announcements
  for select to anon, authenticated using (true);

-- 2. 대회별 구인글 개수. 비회원에게는 글 내용 대신 개수만 알려 준다.
--    신고로 숨겨진 글은 세지 않는다.
create or replace function public.team_post_count(p_announcement_id text)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.team_posts
  where announcement_id = p_announcement_id and not is_hidden;
$$;
revoke all on function public.team_post_count(text) from public;
grant execute on function public.team_post_count(text) to anon, authenticated;
