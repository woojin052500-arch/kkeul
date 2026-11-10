-- ==========================================================================
-- 콘테스트코리아 공고 연동 준비 (2026-11-10)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- ==========================================================================

-- 1. 공고 출처 컬럼 (없을 때만 추가)
alter table public.announcements
  add column if not exists source    text,   -- 'contestkorea' 또는 null(끌에서 직접 등록)
  add column if not exists source_id text,   -- 출처 쪽 공고 번호
  add column if not exists target    text;   -- 참가 대상

create unique index if not exists idx_announcements_source
  on public.announcements (source, source_id)
  where source is not null;

create index if not exists idx_announcements_deadline on public.announcements (deadline);

-- 2. 이미 마감된 지난 공고 삭제 (그 공고의 찜·스와이프 기록도 함께 삭제)
do $$
declare
  removed int;
begin
  if to_regclass('public.bookmarks') is not null then
    delete from public.bookmarks
    where announcement_id::text in (select id::text from public.announcements where deadline < now());
  end if;
  if to_regclass('public.user_actions') is not null then
    delete from public.user_actions
    where announcement_id::text in (select id::text from public.announcements where deadline < now());
  end if;
  delete from public.announcements where deadline < now();
  get diagnostics removed = row_count;
  raise notice '마감된 공고 %건을 삭제했습니다.', removed;
end $$;
