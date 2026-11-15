-- ==========================================================================
-- 추천인 코드 (2026-11-19)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 내 추천인 코드 = 내 계정 ID 앞 8자리 (대문자로 보여 줌). 명함 QR 주소(/p/...)와 같은 값이다.
-- 누가 누구 코드로 가입했는지 본 기록 (관리자용, SQL Editor 에서 실행):
--   select r.created_at, inviter.name as 초대한_사람, invitee.name as 가입한_사람
--   from public.referrals r
--   left join public.profiles inviter on inviter.id = r.inviter_id
--   left join public.profiles invitee on invitee.id = r.invitee_id
--   order by r.created_at desc;
-- ==========================================================================

-- 한 사람은 추천인 코드를 한 번만 넣을 수 있다 (invitee_id 가 기본 키)
create table if not exists public.referrals (
  invitee_id uuid primary key references auth.users(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (invitee_id <> inviter_id)
);
create index if not exists idx_referrals_inviter on public.referrals(inviter_id);

-- 앱에서는 표를 직접 읽거나 쓰지 못한다. 아래 함수로만 다룬다.
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

-- 추천인 코드 입력. 코드 주인과 입력한 사람 모두 100 XP 를 받는다.
-- 돌려주는 값: { ok, reason?, inviter_name?, xp? }
create or replace function public.apply_referral(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me      uuid := auth.uid();
  code    text := lower(regexp_replace(coalesce(p_code, ''), '[^0-9a-fA-F]', '', 'g'));
  inviter uuid;
  matches int;
  my_xp   int;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  if length(code) <> 8 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if exists (select 1 from public.referrals where invitee_id = me) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  select count(*), (array_agg(p.id))[1] into matches, inviter
  from public.profiles p
  where p.id::text like code || '-%';
  if matches <> 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if inviter = me then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  -- 서로 추천하는 것은 막는다
  if exists (select 1 from public.referrals where invitee_id = inviter and inviter_id = me) then
    return jsonb_build_object('ok', false, 'reason', 'mutual');
  end if;

  begin
    insert into public.referrals (invitee_id, inviter_id) values (me, inviter);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end;

  update public.profiles set xp = coalesce(xp, 0) + 100 where id = inviter;
  update public.profiles set xp = coalesce(xp, 0) + 100 where id = me returning xp into my_xp;

  return jsonb_build_object(
    'ok', true,
    'inviter_name', (select name from public.profiles where id = inviter),
    'xp', my_xp
  );
end;
$$;

-- 내 코드, 내 코드로 가입한 사람 수, 내가 코드를 이미 넣었는지
create or replace function public.my_referral_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', upper(left(auth.uid()::text, 8)),
    'invited_count', (select count(*) from public.referrals where inviter_id = auth.uid()),
    'used_code', exists (select 1 from public.referrals where invitee_id = auth.uid()),
    'invited', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name, 'created_at', r.created_at) order by r.created_at desc)
      from public.referrals r left join public.profiles p on p.id = r.invitee_id
      where r.inviter_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.apply_referral(text) from public, anon;
revoke all on function public.my_referral_stats() from public, anon;
grant execute on function public.apply_referral(text) to authenticated;
grant execute on function public.my_referral_stats() to authenticated;
