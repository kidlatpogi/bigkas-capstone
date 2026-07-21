-- Ensure public.profiles table has active_session_token and active_device_fingerprint columns for strict device lock
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;
