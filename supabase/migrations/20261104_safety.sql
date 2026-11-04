-- ==========================================================================
-- Kkeul 안전 기능 마이그레이션 (2026-11-04)
--   1. 연령 확인 기록 (생년월일은 저장하지 않음)
--   2. 신고 + 신고 즉시 숨김
--   3. 이용 정지 (DB에서 직접 켜고 끔)
--   4. 연락처 분리 + RLS (본인 / 수락된 상대만)
--   5. 차단 (차단한 사용자의 글·요청은 내게 안 보이고, 상대에게 알리지 않음)
--   6. 동아리 지원서 (지원자 본인 / 그 동아리 기장만)
--
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행하세요.
-- 여러 번 실행해도 안전하도록 작성했습니다.
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 예전에 만들어 둔 같은 이름의 테이블이 있으면(앱에서 쓰지 않던 옛 구조)
-- 지우지 않고 <이름>_legacy_20261104 로 이름을 바꿔 보관한 뒤 새로 만듭니다.
-- 필요한 컬럼이 모두 있는 테이블(이 스크립트로 이미 만든 것)은 그대로 둡니다.
-- --------------------------------------------------------------------------
do $$
declare
  spec record;
  missing int;
begin
  for spec in
    select * from (values
      ('suspended_users',    array['user_id','reason','created_at']),
      ('user_blocks',        array['blocker_id','blocked_id','created_at']),
      ('team_posts',         array['id','announcement_id','user_id','user_name','my_role','role_wanted','comment','is_hidden','created_at']),
      ('join_requests',      array['id','post_id','user_id','user_name','user_role','message','status','is_hidden','created_at','updated_at']),
      ('user_contacts',      array['user_id','contact','phone_number','updated_at']),
      ('reports',            array['id','reporter_id','target_type','target_id','reason','created_at']),
      ('club_announcements', array['id','leader_id','school','club_name','title','details','tags','deadline','image_url','created_at']),
      ('club_applications',  array['id','club_id','user_id','user_name','user_school','user_grade','user_contact','user_skills','user_awards','introduction_summary','status','created_at'])
    ) as t(tbl, cols)
  loop
    if to_regclass('public.' || spec.tbl) is not null then
      select count(*) into missing
      from unnest(spec.cols) c
      where not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = spec.tbl and column_name = c
      );
      if missing > 0 then
        execute format('alter table public.%I rename to %I', spec.tbl, spec.tbl || '_legacy_20261104');
        raise notice '옛 구조의 % 테이블을 %_legacy_20261104 로 옮겼습니다.', spec.tbl, spec.tbl;
      end if;
    end if;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 0. 이용 정지
--    정지: insert into public.suspended_users (user_id, reason) values ('<uuid>', '사유');
--    해제: delete from public.suspended_users where user_id = '<uuid>';
--    (Table Editor 에서 행을 추가/삭제해도 됩니다)
-- --------------------------------------------------------------------------
create table if not exists public.suspended_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);
alter table public.suspended_users enable row level security;
drop policy if exists "suspended_users: read own" on public.suspended_users;
create policy "suspended_users: read own" on public.suspended_users
  for select to authenticated using (user_id = auth.uid());
-- insert/update/delete 정책 없음 → 앱에서는 못 바꾸고 대시보드(서비스 키)에서만 가능

create or replace function public.is_suspended(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspended_users where user_id = uid);
$$;

-- --------------------------------------------------------------------------
-- 0-1. 앱이 쓰는 profiles 컬럼 보충 (없을 때만 추가, 있는 컬럼은 건드리지 않음)
--      이 컬럼들이 없어서 지금까지 프로필 저장이 실패하고 기기에만 남던 문제도 함께 해결됩니다.
-- --------------------------------------------------------------------------
alter table public.profiles
  add column if not exists name           text,
  add column if not exists location       text,
  add column if not exists grade          text,
  add column if not exists school         text,
  add column if not exists major          text,
  add column if not exists interests      jsonb not null default '[]'::jsonb,
  add column if not exists xp             integer not null default 0,
  add column if not exists badges         jsonb not null default '[]'::jsonb,
  add column if not exists role           text not null default 'student',
  add column if not exists bio            text,
  add column if not exists custom_theme   text default 'default',
  add column if not exists social_links   jsonb not null default '{}'::jsonb,
  add column if not exists awards         jsonb not null default '[]'::jsonb,
  add column if not exists portfolio_urls jsonb not null default '[]'::jsonb,
  add column if not exists play_style     jsonb not null default '{}'::jsonb,
  add column if not exists created_at     timestamptz not null default now();

-- --------------------------------------------------------------------------
-- 1. 연령 확인 기록
--    생년월일은 앱에서 나이 계산에만 쓰고 버립니다. 여기에는 체크 여부와 시각만 남깁니다.
-- --------------------------------------------------------------------------
alter table public.profiles
  add column if not exists age_over14_confirmed    boolean not null default false,
  add column if not exists age_over14_confirmed_at timestamptz;

-- --------------------------------------------------------------------------
-- 2. 차단
-- --------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
-- 내가 만든 차단만 보고/추가하고/해제할 수 있음. 차단당한 사람은 아무것도 볼 수 없음.
drop policy if exists "user_blocks: read own"   on public.user_blocks;
drop policy if exists "user_blocks: insert own" on public.user_blocks;
drop policy if exists "user_blocks: delete own" on public.user_blocks;
create policy "user_blocks: read own"   on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "user_blocks: insert own" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "user_blocks: delete own" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.has_blocked(blocker uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks where blocker_id = blocker and blocked_id = target);
$$;

-- --------------------------------------------------------------------------
-- 3. 팀원 구인글
-- --------------------------------------------------------------------------
create table if not exists public.team_posts (
  id              uuid primary key default gen_random_uuid(),
  announcement_id text not null,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  user_name       text not null,
  my_role         text not null,
  role_wanted     text not null,
  comment         text not null,
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_team_posts_announcement on public.team_posts(announcement_id);
alter table public.team_posts enable row level security;

drop policy if exists "team_posts: read"       on public.team_posts;
drop policy if exists "team_posts: insert own" on public.team_posts;
drop policy if exists "team_posts: delete own" on public.team_posts;
-- 내 글은 항상 보임. 남의 글은 숨김(신고) 아니고, 내가 차단한 사람 글이 아닐 때만 보임.
create policy "team_posts: read" on public.team_posts for select to authenticated using (
  user_id = auth.uid()
  or (not is_hidden and not public.has_blocked(auth.uid(), user_id))
);
create policy "team_posts: insert own" on public.team_posts for insert to authenticated with check (
  user_id = auth.uid() and not is_hidden and not public.is_suspended(auth.uid())
);
create policy "team_posts: delete own" on public.team_posts for delete to authenticated using (user_id = auth.uid());
-- update 정책 없음 → 숨김 해제는 대시보드에서만

create or replace function public.team_post_owner(pid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.team_posts where id = pid;
$$;

-- --------------------------------------------------------------------------
-- 4. 팀 합류 요청
-- --------------------------------------------------------------------------
create table if not exists public.join_requests (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.team_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  user_name  text not null,
  user_role  text,
  message    text,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists idx_join_requests_post on public.join_requests(post_id);
alter table public.join_requests enable row level security;

drop policy if exists "join_requests: read"         on public.join_requests;
drop policy if exists "join_requests: insert own"   on public.join_requests;
drop policy if exists "join_requests: owner update" on public.join_requests;
-- 보낸 사람은 자기 요청을 항상 봄(차단·숨김 여부를 알 수 없음).
-- 받은 사람(글 작성자)은 숨김 아니고 차단하지 않은 요청만 봄.
create policy "join_requests: read" on public.join_requests for select to authenticated using (
  user_id = auth.uid()
  or (
    public.team_post_owner(post_id) = auth.uid()
    and not is_hidden
    and not public.has_blocked(auth.uid(), user_id)
  )
);
create policy "join_requests: insert own" on public.join_requests for insert to authenticated with check (
  user_id = auth.uid()
  and status = 'pending'
  and not is_hidden
  and not public.is_suspended(auth.uid())
  and public.team_post_owner(post_id) is distinct from auth.uid()
  and exists (select 1 from public.team_posts p where p.id = post_id and not p.is_hidden)
);
-- 글 작성자만 상태(수락/거절)를 바꿀 수 있음. 컬럼 권한으로 status 외에는 못 바꿈.
create policy "join_requests: owner update" on public.join_requests for update to authenticated
  using (public.team_post_owner(post_id) = auth.uid() and not is_hidden)
  with check (public.team_post_owner(post_id) = auth.uid());
revoke update on public.join_requests from authenticated, anon;
grant update (status, updated_at) on public.join_requests to authenticated;

-- --------------------------------------------------------------------------
-- 5. 연락처 (프로필과 분리)
-- --------------------------------------------------------------------------
create table if not exists public.user_contacts (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  contact      text,
  phone_number text,
  updated_at   timestamptz not null default now()
);
alter table public.user_contacts enable row level security;

-- viewer 가 target 의 연락처를 볼 수 있는가:
--   본인이거나, 둘 사이에 수락된 합류 요청이 있고 target 이 viewer 를 차단하지 않았을 때
create or replace function public.can_view_contact(viewer uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer is not null and (
    viewer = target
    or (
      not public.has_blocked(target, viewer)
      and exists (
        select 1
        from public.join_requests r
        join public.team_posts p on p.id = r.post_id
        where r.status = 'accepted'
          and (
            (r.user_id = viewer and p.user_id = target)
            or (r.user_id = target and p.user_id = viewer)
          )
      )
    )
  );
$$;

drop policy if exists "user_contacts: read"       on public.user_contacts;
drop policy if exists "user_contacts: insert own" on public.user_contacts;
drop policy if exists "user_contacts: update own" on public.user_contacts;
create policy "user_contacts: read" on public.user_contacts for select to authenticated
  using (public.can_view_contact(auth.uid(), user_id));
create policy "user_contacts: insert own" on public.user_contacts for insert to authenticated
  with check (user_id = auth.uid());
create policy "user_contacts: update own" on public.user_contacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 기존 profiles 의 연락처를 옮기고, profiles 에서는 컬럼을 지웁니다.
do $$
declare
  has_contact boolean;
  has_phone   boolean;
begin
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'contact')
    into has_contact;
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone_number')
    into has_phone;

  if has_contact or has_phone then
    execute format(
      'insert into public.user_contacts (user_id, contact, phone_number)
         select p.id, %s, %s from public.profiles p
         join auth.users u on u.id = p.id
         where %s
       on conflict (user_id) do update
         set contact = coalesce(excluded.contact, public.user_contacts.contact),
             phone_number = coalesce(excluded.phone_number, public.user_contacts.phone_number)',
      case when has_contact then 'p.contact' else 'null' end,
      case when has_phone then 'p.phone_number' else 'null' end,
      concat_ws(' or ',
        case when has_contact then 'p.contact is not null' end,
        case when has_phone then 'p.phone_number is not null' end)
    );
  end if;
  if has_contact then execute 'alter table public.profiles drop column contact'; end if;
  if has_phone   then execute 'alter table public.profiles drop column phone_number'; end if;
end $$;

-- --------------------------------------------------------------------------
-- 6. 신고 → 대상 즉시 숨김
-- --------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('team_post', 'join_request')),
  target_id   uuid not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
alter table public.reports enable row level security;
drop policy if exists "reports: insert own" on public.reports;
drop policy if exists "reports: read own"   on public.reports;
create policy "reports: insert own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports: read own"   on public.reports for select to authenticated using (reporter_id = auth.uid());

create or replace function public.hide_reported_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'team_post' then
    update public.team_posts set is_hidden = true where id = new.target_id;
  elsif new.target_type = 'join_request' then
    update public.join_requests set is_hidden = true where id = new.target_id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_report_hide_target on public.reports;
create trigger on_report_hide_target after insert on public.reports
  for each row execute function public.hide_reported_target();

-- --------------------------------------------------------------------------
-- 7. 동아리 공고 / 지원서 (지원자 본인과 그 동아리 기장만 읽기)
-- --------------------------------------------------------------------------
create table if not exists public.club_announcements (
  id         text primary key default gen_random_uuid()::text,
  leader_id  uuid default auth.uid() references auth.users(id) on delete set null,
  school     text not null,
  club_name  text not null,
  title      text not null,
  details    text,
  tags       text[] not null default '{}',
  deadline   timestamptz,
  image_url  text,
  created_at timestamptz not null default now()
);
alter table public.club_announcements enable row level security;
drop policy if exists "club_announcements: read"       on public.club_announcements;
drop policy if exists "club_announcements: insert own" on public.club_announcements;
drop policy if exists "club_announcements: delete own" on public.club_announcements;
create policy "club_announcements: read" on public.club_announcements for select to authenticated
  using (leader_id is null or leader_id = auth.uid() or not public.has_blocked(auth.uid(), leader_id));
create policy "club_announcements: insert own" on public.club_announcements for insert to authenticated
  with check (leader_id = auth.uid() and not public.is_suspended(auth.uid()));
create policy "club_announcements: delete own" on public.club_announcements for delete to authenticated
  using (leader_id = auth.uid());

create or replace function public.club_leader(cid text)
returns uuid language sql stable security definer set search_path = public as $$
  select leader_id from public.club_announcements where id = cid;
$$;

create table if not exists public.club_applications (
  id                   uuid primary key default gen_random_uuid(),
  club_id              text not null references public.club_announcements(id) on delete cascade,
  user_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  user_name            text not null,
  user_school          text,
  user_grade           text,
  user_contact         text,
  user_skills          jsonb not null default '[]'::jsonb,
  user_awards          jsonb not null default '[]'::jsonb,
  introduction_summary text,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at           timestamptz not null default now(),
  unique (club_id, user_id)
);
alter table public.club_applications enable row level security;
drop policy if exists "club_applications: read"          on public.club_applications;
drop policy if exists "club_applications: insert own"    on public.club_applications;
drop policy if exists "club_applications: leader update" on public.club_applications;
create policy "club_applications: read" on public.club_applications for select to authenticated using (
  user_id = auth.uid() or public.club_leader(club_id) = auth.uid()
);
create policy "club_applications: insert own" on public.club_applications for insert to authenticated with check (
  user_id = auth.uid() and status = 'pending' and not public.is_suspended(auth.uid())
);
create policy "club_applications: leader update" on public.club_applications for update to authenticated
  using (public.club_leader(club_id) = auth.uid())
  with check (public.club_leader(club_id) = auth.uid());
revoke update on public.club_applications from authenticated, anon;
grant update (status) on public.club_applications to authenticated;

-- --------------------------------------------------------------------------
-- 권한 (Supabase 기본 설정과 같게 맞춤. anon 은 이 테이블들에 접근 불가)
-- --------------------------------------------------------------------------
revoke all on public.suspended_users, public.user_blocks, public.team_posts, public.join_requests,
              public.user_contacts, public.reports, public.club_announcements, public.club_applications
  from anon;
grant select on public.suspended_users to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert, delete on public.team_posts to authenticated;
grant select, insert on public.join_requests to authenticated;
grant select, insert, update on public.user_contacts to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.club_announcements to authenticated;
grant select, insert on public.club_applications to authenticated;

-- --------------------------------------------------------------------------
-- 8. 약관 동의 기록 (선택 동의 포함)
-- --------------------------------------------------------------------------
alter table public.profiles
  add column if not exists terms_version          text,
  add column if not exists terms_agreed_at        timestamptz,
  add column if not exists competency_consent     boolean not null default false,
  add column if not exists competency_consent_at  timestamptz;

-- --------------------------------------------------------------------------
-- 9. profiles 권한 잠그기
--    예전 정책(누구나 모든 프로필 읽기/수정)을 모두 지우고, 본인 행만 읽고 쓰게 합니다.
--    다른 사람 정보가 필요한 곳은 아래 함수로 필요한 항목만 돌려줍니다.
-- --------------------------------------------------------------------------
alter table public.profiles enable row level security;
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.profiles from anon;

-- 주최 측 "조건에 맞는 학생 수" 계산용. 이름·이메일·ID 없이 매칭에 필요한 항목만.
create or replace function public.matching_profiles()
returns table (role text, location text, grade text, interests jsonb)
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) ->> 'role',
         to_jsonb(p) ->> 'location',
         to_jsonb(p) ->> 'grade',
         case jsonb_typeof(to_jsonb(p) -> 'interests')
           when 'array' then to_jsonb(p) -> 'interests'
           else '[]'::jsonb
         end
  from public.profiles p;
$$;
revoke all on function public.matching_profiles() from public, anon;
grant execute on function public.matching_profiles() to authenticated;

-- 명함 QR(kkeul.vercel.app/p/<ID 앞 8자리>)로 여는 공개 프로필.
-- 학교·지역·이메일·연락처는 내보내지 않습니다.
create or replace function public.public_profile(short_id text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name',           p.name,
    'grade',          to_jsonb(p) ->> 'grade',
    'bio',            to_jsonb(p) ->> 'bio',
    'interests',      coalesce(to_jsonb(p) -> 'interests', '[]'::jsonb),
    'badges',         coalesce(to_jsonb(p) -> 'badges', '[]'::jsonb),
    'awards',         coalesce(to_jsonb(p) -> 'awards', '[]'::jsonb),
    'portfolio_urls', coalesce(to_jsonb(p) -> 'portfolio_urls', '[]'::jsonb),
    'xp',             coalesce((to_jsonb(p) ->> 'xp')::int, 0)
  )
  from public.profiles p
  where short_id ~ '^[0-9a-f]{8}$'
    and p.id::text like short_id || '-%'
    and coalesce(to_jsonb(p) ->> 'role', 'student') <> 'host'
    and not public.is_suspended(p.id)
  limit 1;
$$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
