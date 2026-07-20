-- Ensure public.profiles table has active_session_token column for real-time session ejection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;

-- Ensure active_device_fingerprint exists for strict device-lock mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;

-- Enable Supabase Realtime on the profiles table so postgres_changes subscriptions work
-- This is REQUIRED for cross-browser instant ejection via WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Set REPLICA IDENTITY FULL so Realtime sends the full NEW row on UPDATE events
-- Without this, Realtime may only send the primary key columns
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
