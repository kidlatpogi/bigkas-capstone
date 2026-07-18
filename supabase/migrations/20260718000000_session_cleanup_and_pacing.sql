-- Add active_session_token column for double-device prevention
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token UUID;

-- Create pg_cron extension if not exists
create extension if not exists pg_cron;

-- Create function to check submission cooldowns and hourly session limits
CREATE OR REPLACE FUNCTION public.check_user_pacing(user_uuid UUID)
RETURNS TABLE (allowed BOOLEAN, reason TEXT) AS $$
DECLARE
  last_submission TIMESTAMP;
  hourly_count INTEGER;
BEGIN
  -- Check A: 1-Minute Cooldown
  SELECT created_at INTO last_submission 
  FROM public.sessions 
  WHERE user_id = user_uuid 
  ORDER BY created_at DESC LIMIT 1;

  IF last_submission IS NOT NULL AND (now() - last_submission) < interval '1 minute' THEN
    RETURN QUERY SELECT FALSE, 'Please wait 1 minute between attempts.';
    RETURN;
  END IF;

  -- Check B: 10 activities max per hour
  SELECT count(*) INTO hourly_count 
  FROM public.sessions 
  WHERE user_id = user_uuid 
    and created_at >= (now() - interval '1 hour');

  IF hourly_count >= 10 THEN
    RETURN QUERY SELECT FALSE, 'Rest Limit: You have completed 10 practices in the last hour.';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Allowed';
END;
$$ LANGUAGE plpgsql;

-- Schedule nightly cleanup task (runs daily at 00:00 UTC)
SELECT cron.schedule(
  'auto-purge-old-recordings',
  '0 0 * * *',
  $$
  BEGIN
    -- 1. Remove physical files in Supabase storage objects
    DELETE FROM storage.objects 
    WHERE bucket_id = 'session-recordings' 
      and created_at < now() - interval '7 days';

    -- 2. Remove session child relations sequentially
    DELETE FROM public.session_recommendations WHERE session_id IN (SELECT id FROM public.sessions WHERE created_at < now() - interval '7 days');
    DELETE FROM public.session_feedback WHERE session_id IN (SELECT id FROM public.sessions WHERE created_at < now() - interval '7 days');
    DELETE FROM public.session_media WHERE session_id IN (SELECT id FROM public.sessions WHERE created_at < now() - interval '7 days');
    DELETE FROM public.session_metrics WHERE session_id IN (SELECT id FROM public.sessions WHERE created_at < now() - interval '7 days');

    -- 3. Delete the parent session metadata
    DELETE FROM public.sessions 
    WHERE created_at < now() - interval '7 days';
  END;
  $$
);
