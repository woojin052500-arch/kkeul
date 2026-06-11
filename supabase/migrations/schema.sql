-- 1. 프로필 테이블 (Profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  location text,
  grade text,
  school text,
  interests text[] default '{}',
  xp integer default 0,
  badges text[] default '{}',
  role text default 'student',
  contact text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.profiles enable row level security;

-- 프로필 RLS 정책
create policy "사용자는 본인의 프로필을 조회할 수 있습니다."
  on public.profiles for select
  using (auth.uid() = id);

create policy "사용자는 본인의 프로필을 수정할 수 있습니다."
  on public.profiles for update
  using (auth.uid() = id);

create policy "사용자는 본인의 프로필을 삽입할 수 있습니다."
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "사용자는 본인의 프로필을 삭제할 수 있습니다."
  on public.profiles for delete
  using (auth.uid() = id);


-- 2. 공고 테이블 (Announcements)
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  host text not null,
  category text not null,
  deadline timestamp with time zone not null,
  location text not null,
  details text not null,
  image_url text,
  apply_url text not null,
  bid_amount integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.announcements enable row level security;

-- 공고 RLS 정책 (누구나 조회 가능)
create policy "누구나 공고를 조회할 수 있습니다."
  on public.announcements for select
  using (true);

create policy "누구나 공고를 삽입할 수 있습니다."
  on public.announcements for insert
  with check (true);


-- 3. 찜 목록 테이블 (Bookmarks)
create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  announcement_id uuid references public.announcements(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, announcement_id)
);

-- RLS 활성화
alter table public.bookmarks enable row level security;

-- 찜 목록 RLS 정책
create policy "사용자는 본인의 찜 목록을 조회할 수 있습니다."
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "사용자는 본인의 찜 목록에 추가할 수 있습니다."
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "사용자는 본인의 찜 목록에서 삭제할 수 있습니다."
  on public.bookmarks for delete
  using (auth.uid() = user_id);


-- 4. 신규 유저 생성 시 프로필 자동 생성을 위한 트리거 및 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, xp, badges)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 0, '{}');
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 생성 (기존 트리거가 있으면 삭제 후 생성)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 5. Supabase Free 플랜 자동 일시정지 방지 (Heartbeat)

-- A. RPC 방식 (가벼운 호출용)
create or replace function public.heartbeat_rpc()
returns int
language sql
stable
as $$
  select 1;
$$;

-- B. 테이블 방식
create table if not exists public.heartbeat (
  id int primary key
);

-- 초기 행 삽입
insert into public.heartbeat(id) values (1) on conflict do nothing;

-- RLS 활성화 및 익명(anon) 읽기 허용 정책
alter table public.heartbeat enable row level security;

drop policy if exists heartbeat_read on public.heartbeat;
create policy heartbeat_read on public.heartbeat for select using (true);


-- 6. 초기 공고 데이터 삽입 (Seed Data)
insert into public.announcements (title, host, category, deadline, location, details, image_url, apply_url) values
(
  '2026 제6회 청소년 IT경시대회',
  '한국정보기술진흥원',
  'IT/개발',
  now() + interval '3 days',
  '전국',
  '전국 초·중·고등학생 대상 정보기술 경시대회로, 프로그래밍, 알고리즘, AI, 그래픽디자인, 정보기술이론 등을 평가합니다.',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
  'https://kitpa.org/'
),
(
  '제22회 대한민국청소년박람회 청소년 디지털 콘텐츠 경진대회',
  '한국청소년활동진흥원',
  'IT/개발',
  now() + interval '5 days',
  '전국',
  '대한민국 청소년(9~24세) 대상 디지털 콘텐츠 경진대회로, 생성형 AI로 제작한 영상 작품을 공모합니다.',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop',
  'https://www.kywa.or.kr/'
),
(
  '2026 세종 청소년 영화·숏폼 공모전',
  '세종시문화관광재단',
  'UCC/영상',
  now() + interval '7 days',
  '세종',
  '고등학생, 중학생 대상의 영화·숏폼 공모전입니다.',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/33913'
),
(
  '2026년 전국청소년미술공모전',
  '서산시',
  '미술',
  now() + interval '10 days',
  '전국',
  '고등학생, 중학생, 초등학생, 학교밖 청소년이 참여 가능한 미술 공모전입니다.',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/32301'
),
(
  '2026년 전국 학생 모의국회 법률 제·개정안 공모대회',
  '주최기관 확인 필요',
  '정치/법률',
  now() + interval '12 days',
  '전국',
  '중·고등학생 대상 법률 제·개정안 공모대회입니다.',
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/33799'
),
(
  '2026 대한민국청소년기자대상',
  '서울특별시',
  '문학/수기',
  now() + interval '14 days',
  '전국',
  '대학(원)생, 고등학생, 중학생, 초등학생이 참여할 수 있는 청소년 기자 및 영상 공모전입니다.',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/33065'
),
(
  '인구감소지역 청소년 성장지원 사업 별칭(네이밍)공모전',
  '한국청소년활동진흥원',
  '기획/아이디어',
  now() + interval '1 days',
  '전국',
  '대한민국 국민 누구나 참여할 수 있는 사업 별칭 공모전입니다.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop',
  'https://www.kywa.or.kr/pressinfo/notice_view.jsp?no=36085'
),
(
  '만해 한용운 추모 82주기 2026년 전국 청소년 문예공모전',
  '재단법인 선학원',
  '문학/수기',
  now() + interval '9 days',
  '전국',
  '고등학생, 중학생 대상의 전국 청소년 문예공모전입니다.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/32212'
),
(
  '2026 하계 청소년 IT학술대회 및 대학생 IT논문경진대회',
  '한국정보기술진흥원',
  'IT/개발',
  now() + interval '8 days',
  '전국',
  '초등학교 3학년부터 고등학교 3학년 재학생까지 참여 가능한 청소년 IT학술대회입니다.',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
  'https://kitpa.org/research/conference/2026s'
),
(
  '2026년 우수 인증수련활동 공모전',
  '한국청소년활동진흥원',
  '기획/아이디어',
  now() + interval '2 days',
  '전국',
  '인증수련활동 운영기관을 대상으로 우수 운영 사례를 발굴하는 공모전입니다.',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop',
  'https://m.kywa.or.kr/notice/notice_view.do?page=press&no=36224'
),
(
  '2026 제6회 청소년 IT경시대회 일정 사전 공지 및 주요 변경사항 안내',
  '한국정보기술진흥원',
  'IT/개발',
  now() + interval '4 days',
  '전국',
  '청소년 IT경시대회의 일정 및 참가자격 변경 사항을 공지한 행사 안내입니다.',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
  'https://kitpa.org/notice/46'
),
(
  '2026 동계 청소년 IT학술대회',
  '한국정보기술진흥원',
  'IT/개발',
  now() + interval '11 days',
  '전국',
  '청소년 대상 IT학술대회로, 추가접수 기간이 운영된 실존 대회입니다.',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
  'https://kitpa.org/news/839'
),
(
  '2026년 국립청소년생태센터 청소년운영위원회 모집 안내',
  '국립청소년생태센터',
  '서포터즈',
  now() + interval '6 days',
  '전국',
  '대학(원)생, 고등학생, 중학생이 참여 가능한 청소년운영위원회 모집입니다.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop',
  'https://gcontest.co.kr/front/m/comp/view/32901'
)
on conflict do nothing;


-- 7. 매일 정각(00:00) 외부 크롤러 Edge Function 호출을 위한 pg_cron 스케줄러 등록
-- pg_cron 및 pg_net 확장을 활성화하고, 매일 정각에 크롤러 트리거 함수를 실행합니다.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-crawler-cron',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://com.wjedulab.kkeul/functions/v1/cron-crawler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || coalesce(current_setting('request.jwt.claims', true)::json->>'role', 'anon') || '"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);

