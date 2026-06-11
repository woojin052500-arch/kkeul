-- ==========================================
-- Kkeul Database Schema Update (포트폴리오 & 연락처 기반 친구 추가)
-- ==========================================

-- 1. profiles 테이블 확장 (전자명함 및 포트폴리오 정보 추가)
-- 기존에 존재하는 profiles 테이블에 전자명함용 자기소개, 커스텀 테마, 소셜 링크, 수상 실적, 포트폴리오 링크 컬럼을 추가합니다.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '안녕하세요! 제 진로 로드맵에 오신 것을 환영합니다.',
ADD COLUMN IF NOT EXISTS custom_theme VARCHAR(50) DEFAULT 'default',
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) DEFAULT NULL, -- 연락처 동기화 매칭용
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb, -- 수상 및 대외활동 실적 [{"title": "NYPC", "date": "2026"}]
ADD COLUMN IF NOT EXISTS portfolio_urls JSONB DEFAULT '[]'::jsonb; -- 첨부 포트폴리오 링크 배열 ["https://github.com/..."]


-- 2. user_friends (안드로이드 연락처 연동 기반 친구 관리 테이블)
-- 연락처를 동기화하여 매칭된 친구들 간의 '명함 교환' 및 친구 상태를 관리합니다.
CREATE TABLE IF NOT EXISTS public.user_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' (요청 중), 'accepted' (명함 교환 완료)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, friend_id) -- 중복 친구 추가 방지
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_friends_user ON public.user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend ON public.user_friends(friend_id);


-- ==========================================
-- RLS (Row Level Security) 설정 (Supabase 권장)
-- ==========================================

-- user_friends RLS
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own friends" 
ON public.user_friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friend requests" 
ON public.user_friends FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend status" 
ON public.user_friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can remove friends" 
ON public.user_friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
