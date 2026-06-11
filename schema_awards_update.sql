-- profiles 테이블에 수상 실적과 포트폴리오 링크 컬럼만 추가하는 쿼리
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS portfolio_urls JSONB DEFAULT '[]'::jsonb;
