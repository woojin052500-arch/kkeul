-- Add play_style column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS play_style JSONB DEFAULT '{}'::jsonb;
