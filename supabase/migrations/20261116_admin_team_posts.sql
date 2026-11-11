-- ==========================================================================
-- 끌 앱 관리자: 구인글(팀원 모집글) 관리 (2026-11-16)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261111_admin.sql 을 먼저 실행해 두어야 합니다.
-- ==========================================================================

-- 1. 구인글 목록 (검색 + 페이지). 숨김 처리된 글도 모두 보인다.
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

-- 2. 숨기기 / 다시 공개
create or replace function public.admin_set_team_post_hidden(p_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  update public.team_posts set is_hidden = coalesce(p_hidden, false) where id = p_id;
end;
$$;

-- 3. 삭제 (참여 신청도 함께 삭제됨). 걸려 있던 신고는 처리 완료로 남긴다.
create or replace function public.admin_delete_team_post(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.join_requests where post_id = p_id;
  delete from public.team_posts where id = p_id;
  update public.reports
     set resolved_at = now(), resolved_by = auth.uid(), resolution = 'deleted'
   where target_type = 'team_post' and target_id = p_id and resolved_at is null;
end;
$$;

revoke all on function public.admin_list_team_posts(text, int, int) from public, anon;
revoke all on function public.admin_set_team_post_hidden(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_team_post(uuid) from public, anon;
grant execute on function public.admin_list_team_posts(text, int, int) to authenticated;
grant execute on function public.admin_set_team_post_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_team_post(uuid) to authenticated;
