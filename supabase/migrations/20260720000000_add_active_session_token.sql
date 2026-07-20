-- Ensure public.profiles table has active_session_token column for real-time session ejection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;

-- Ensure active_device_fingerprint exists for strict device-lock mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;

-- Enable Supabase Realtime on the profiles table conditionally so postgres_changes subscriptions work
-- This is REQUIRED for cross-browser instant ejection via WebSocket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;


-- Set REPLICA IDENTITY FULL so Realtime sends the full NEW row on UPDATE events
-- Without this, Realtime may only send the primary key columns
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Allow users to update their own active_session_token and active_device_fingerprint columns directly
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own session tokens" ON public.profiles;
CREATE POLICY "Users can update own session tokens" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

