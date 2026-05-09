-- Clean up existing functions to prevent return type mismatch errors
DROP FUNCTION IF EXISTS public.login_guard_check(text, text);
DROP FUNCTION IF EXISTS public.login_guard_register_failure(text, text);
DROP FUNCTION IF EXISTS public.login_guard_register_success(text, text);

-- Table to track login attempts and enforce brute-force protection
-- This table tracks failed attempts per email to prevent automated attacks.
CREATE TABLE IF NOT EXISTS public.login_attempt_guards (
  email text PRIMARY KEY,
  failed_attempts integer DEFAULT 0,
  lockout_until timestamp with time zone,
  last_attempt_at timestamp with time zone DEFAULT now()
);

-- Index for faster cleanup of old records
CREATE INDEX IF NOT EXISTS idx_login_attempt_guards_last_attempt ON public.login_attempt_guards(last_attempt_at);

-- Function to check if an account is currently locked
-- Used by the frontend before attempting a login to show the countdown timer.
CREATE OR REPLACE FUNCTION public.login_guard_check(p_email text, p_scope text DEFAULT 'user')
RETURNS jsonb AS $$
DECLARE
  v_row record;
  v_remaining_seconds integer;
BEGIN
  -- Normalize email to lowercase
  SELECT * INTO v_row FROM public.login_attempt_guards WHERE email = LOWER(TRIM(p_email));
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_locked', false, 'remaining_seconds', 0);
  END IF;
  
  -- Check if the lockout period is still active
  IF v_row.lockout_until IS NOT NULL AND v_row.lockout_until > now() THEN
    v_remaining_seconds := EXTRACT(EPOCH FROM (v_row.lockout_until - now()))::integer;
    RETURN jsonb_build_object('is_locked', true, 'remaining_seconds', v_remaining_seconds);
  END IF;
  
  -- Lockout expired or no lockout
  RETURN jsonb_build_object('is_locked', false, 'remaining_seconds', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a login failure and determine the next lockout period
-- Follows company standard exponential backoff lockout scale:
-- 3rd attempt: 30s delay
-- 4th attempt: 120s (2m) delay
-- 5th attempt+: 900s (15m) lockout + Notify User
CREATE OR REPLACE FUNCTION public.login_guard_register_failure(p_email text, p_scope text DEFAULT 'user')
RETURNS jsonb AS $$
DECLARE
  v_failed_attempts integer;
  v_lockout_seconds integer := 0;
  v_lockout_until timestamp with time zone := NULL;
  v_user_id uuid;
  v_normalized_email text;
BEGIN
  v_normalized_email := LOWER(TRIM(p_email));
  
  -- Attempt to find the user in auth.users for audit logging
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_normalized_email;

  -- Upsert the failure record
  INSERT INTO public.login_attempt_guards (email, failed_attempts, last_attempt_at)
  VALUES (v_normalized_email, 1, now())
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = login_attempt_guards.failed_attempts + 1,
    last_attempt_at = now()
  RETURNING failed_attempts INTO v_failed_attempts;
  
  -- Apply Exponential Backoff Scale
  IF v_failed_attempts = 3 THEN
    v_lockout_seconds := 30; -- 3rd Attempt: 30s delay
  ELSIF v_failed_attempts = 4 THEN
    v_lockout_seconds := 120; -- 4th Attempt: 2m delay
  ELSIF v_failed_attempts >= 5 THEN
    v_lockout_seconds := 900; -- 5th Attempt+: 15m lockout
    
    -- Log the major lockout event to audit_logs if user profile exists
    -- The 'notify_user' flag in new_values can trigger an Edge Function or background job to send the email.
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (
        actor_id, 
        action, 
        entity_type, 
        entity_id, 
        new_values, 
        created_at
      )
      VALUES (
        v_user_id, 
        'SECURITY_LOCKOUT_NOTIFICATION_REQUIRED', 
        'auth_guard', 
        v_user_id, 
        jsonb_build_object(
          'attempts', v_failed_attempts, 
          'lockout_duration', '15m',
          'email', v_normalized_email,
          'notify_user', true
        ),
        now()
      );
    END IF;
  END IF;
  
  -- Update lockout timestamp if applicable
  IF v_lockout_seconds > 0 THEN
    v_lockout_until := now() + (v_lockout_seconds || ' seconds')::interval;
    UPDATE public.login_attempt_guards 
    SET lockout_until = v_lockout_until 
    WHERE email = v_normalized_email;
  END IF;
  
  RETURN jsonb_build_object(
    'locked', v_lockout_seconds > 0,
    'lockout_seconds', v_lockout_seconds,
    'failed_attempts', v_failed_attempts,
    'unlock_time', v_lockout_until
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset attempts on successful login
CREATE OR REPLACE FUNCTION public.login_guard_register_success(p_email text, p_scope text DEFAULT 'user')
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_attempt_guards WHERE email = LOWER(TRIM(p_email));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
