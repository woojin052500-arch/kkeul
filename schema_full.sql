-- ==========================================
-- Kkeul Database Full Schema (안전 초기화 버전)
-- ==========================================

-- 이전에 잘못 생성된 테이블이 있다면 안전하게 삭제하고 다시 만듭니다.
DROP TABLE IF EXISTS public.user_friends;
DROP TABLE IF EXISTS public.user_actions;
DROP TABLE IF EXISTS public.bookmarks;
DROP TABLE IF EXISTS public.announcements;

-- 1. PROFILES 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    grade TEXT,
    school TEXT,
    major TEXT,
    interests JSONB DEFAULT '[]'::jsonb,
    xp INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    role TEXT DEFAULT 'student',
    contact TEXT,
    bio TEXT DEFAULT '안녕하세요! 제 진로 로드맵에 오신 것을 환영합니다.',
    custom_theme TEXT DEFAULT 'default',
    phone_number TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    awards JSONB DEFAULT '[]'::jsonb,
    portfolio_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ANNOUNCEMENTS 테이블 (공고 목록)
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    host TEXT NOT NULL,
    category TEXT NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    details TEXT,
    image_url TEXT,
    apply_url TEXT,
    bid_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. BOOKMARKS 테이블 (찜/보관함)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    announcement_id TEXT NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, announcement_id)
);

-- 4. USER_ACTIONS 테이블 (스와이프 행동 기록 - Like/Pass)
CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    announcement_id TEXT NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'like' 또는 'pass'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. USER_FRIENDS 테이블 (친구/명함 교환)
CREATE TABLE IF NOT EXISTS public.user_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, friend_id)
);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user ON public.user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_user ON public.user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend ON public.user_friends(friend_id);

-- ==========================================
-- RLS (Row Level Security) 설정 (권한 부여)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Bookmarks" ON public.bookmarks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public User Actions" ON public.user_actions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public User Friends" ON public.user_friends FOR ALL USING (true) WITH CHECK (true);
