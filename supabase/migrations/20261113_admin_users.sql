-- ==========================================================================
-- 관리자: 전체 회원 보기 (2026-11-13)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 20261111_admin.sql 을 먼저 실행해 둔 상태여야 합니다.
-- ==========================================================================

-- 회원 목록. 이름·학교로 찾을 수 있고, 최근 가입 순으로 보여 준다.
-- 이메일·연락처는 돌려주지 않는다 (필요하면 대시보드의 Authentication → Users 에서 확인).
create or replace function public.admin_list_users(
  p_query          text    default '',
  p_only_suspended boolean default false,
  p_limit          int     default 50,
  p_offset         int     default 0
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  q      text := '%' || replace(replace(trim(coalesce(p_query, '')), '%', '\%'), '_', '\_') || '%';
  result jsonb;
begin
  perform public.require_admin();

  with matched as (
    select
      p.id,
      p.name,
      to_jsonb(p) ->> 'role'       as role,
      to_jsonb(p) ->> 'school'     as school,
      to_jsonb(p) ->> 'grade'      as grade,
      to_jsonb(p) ->> 'location'   as location,
      to_jsonb(p) ->> 'created_at' as created_at,
      s.user_id is not null        as suspended,
      s.reason                     as suspend_reason,
      a.user_id is not null        as is_admin
    from public.profiles p
    left join public.suspended_users s on s.user_id = p.id
    left join public.admins a          on a.user_id = p.id
    where (coalesce(p.name, '') ilike q or coalesce(to_jsonb(p) ->> 'school', '') ilike q)
      and (not p_only_suspended or s.user_id is not null)
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'users', coalesce((
      select jsonb_agg(row_to_json(m) order by m.created_at desc nulls last, m.id)
      from (
        select * from matched
        order by created_at desc nulls last, id
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) m
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_list_users(text, boolean, int, int) from public, anon;
grant execute on function public.admin_list_users(text, boolean, int, int) to authenticated;
