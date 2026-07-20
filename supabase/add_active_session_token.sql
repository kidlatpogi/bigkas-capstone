-- Ensure public.profiles table has active_session_token column for Clash of Clans real-time session ejection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;
