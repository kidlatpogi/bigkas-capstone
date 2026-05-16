CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.login_attempt_guards (
  email text PRIMARY KEY,
  failed_attempts integer DEFAULT 0,
  lockout_until timestamp with time zone,
  last_attempt_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempt_guards_last_attempt
  ON public.login_attempt_guards (last_attempt_at);

ALTER TABLE public.login_attempt_guards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'login_attempt_guards'
      AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access"
    ON public.login_attempt_guards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('login_failed', 'login_blocked', 'login_success')),
  scope text NOT NULL DEFAULT 'user' CHECK (scope IN ('user', 'admin')),
  email_hash text NOT NULL,
  email_domain text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason_code text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_created_at
  ON public.auth_security_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_type_scope_created_at
  ON public.auth_security_events (event_type, scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_email_hash_created_at
  ON public.auth_security_events (email_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_security_events_user_id_created_at
  ON public.auth_security_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_security_events'
      AND policyname = 'Superadmins can view auth security events'
  ) THEN
    CREATE POLICY "Superadmins can view auth security events"
    ON public.auth_security_events
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles admin_profile
        WHERE admin_profile.id = auth.uid()
          AND admin_profile.role = 'superadmin'
          AND admin_profile.archived_at IS NULL
      )
    );
  END IF;
END $$;

GRANT SELECT ON public.auth_security_events TO authenticated;
GRANT ALL ON public.auth_security_events TO service_role;

CREATE OR REPLACE FUNCTION public.auth_security_email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(lower(trim(coalesce(p_email, ''))), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.auth_security_log_event(
  p_event_type text,
  p_scope text,
  p_email text,
  p_reason_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_domain text;
  v_user_id uuid;
  v_headers jsonb := '{}'::jsonb;
  v_ip_text text;
  v_ip inet;
  v_user_agent text;
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  IF p_event_type NOT IN ('login_failed', 'login_blocked', 'login_success') THEN
    RETURN;
  END IF;

  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := '{}'::jsonb;
  END;

  v_domain := nullif(split_part(v_email, '@', 2), '');
  v_user_agent := left(nullif(v_headers->>'user-agent', ''), 500);
  v_ip_text := nullif(trim(split_part(coalesce(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    v_headers->>'x-forwarded-for',
    ''
  ), ',', 1)), '');

  BEGIN
    v_ip := v_ip_text::inet;
  EXCEPTION WHEN others THEN
    v_ip := NULL;
  END;

  SELECT p.id INTO v_user_id
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE lower(au.email) = v_email
  LIMIT 1;

  INSERT INTO public.auth_security_events (
    event_type,
    scope,
    email_hash,
    email_domain,
    user_id,
    reason_code,
    ip_address,
    user_agent,
    metadata
  )
  VALUES (
    p_event_type,
    CASE WHEN p_scope = 'admin' THEN 'admin' ELSE 'user' END,
    public.auth_security_email_hash(v_email),
    v_domain,
    v_user_id,
    nullif(trim(coalesce(p_reason_code, '')), ''),
    v_ip,
    v_user_agent,
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auth_security_email_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_security_log_event(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_security_email_hash(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_security_log_event(text, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.login_guard_check(p_email text, p_scope text DEFAULT 'user')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_remaining_seconds integer;
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));

  SELECT * INTO v_row
  FROM public.login_attempt_guards
  WHERE email = v_normalized_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_locked', false, 'remaining_seconds', 0);
  END IF;

  IF v_row.lockout_until IS NOT NULL AND v_row.lockout_until > now() THEN
    v_remaining_seconds := extract(epoch FROM (v_row.lockout_until - now()))::integer;

    PERFORM public.auth_security_log_event(
      'login_blocked',
      p_scope,
      v_normalized_email,
      'account_locked',
      jsonb_build_object('remaining_seconds', v_remaining_seconds)
    );

    RETURN jsonb_build_object(
      'is_locked', true,
      'remaining_seconds', v_remaining_seconds,
      'failed_attempts', v_row.failed_attempts,
      'unlock_time', v_row.lockout_until
    );
  END IF;

  RETURN jsonb_build_object('is_locked', false, 'remaining_seconds', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.login_guard_register_failure(p_email text, p_scope text DEFAULT 'user')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts integer;
  v_lockout_seconds integer := 0;
  v_lockout_until timestamp with time zone := NULL;
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));

  INSERT INTO public.login_attempt_guards (email, failed_attempts, last_attempt_at)
  VALUES (v_normalized_email, 1, now())
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = login_attempt_guards.failed_attempts + 1,
    last_attempt_at = now()
  RETURNING failed_attempts INTO v_failed_attempts;

  IF v_failed_attempts = 3 THEN
    v_lockout_seconds := 30;
  ELSIF v_failed_attempts = 4 THEN
    v_lockout_seconds := 120;
  ELSIF v_failed_attempts >= 5 THEN
    v_lockout_seconds := 900;
  END IF;

  IF v_lockout_seconds > 0 THEN
    v_lockout_until := now() + (v_lockout_seconds || ' seconds')::interval;
    UPDATE public.login_attempt_guards
    SET lockout_until = v_lockout_until
    WHERE email = v_normalized_email;
  END IF;

  PERFORM public.auth_security_log_event(
    'login_failed',
    p_scope,
    v_normalized_email,
    'invalid_credentials',
    jsonb_build_object(
      'failed_attempts', v_failed_attempts,
      'locked', v_lockout_seconds > 0,
      'lockout_seconds', v_lockout_seconds,
      'unlock_time', v_lockout_until
    )
  );

  RETURN jsonb_build_object(
    'locked', v_lockout_seconds > 0,
    'lockout_seconds', v_lockout_seconds,
    'failed_attempts', v_failed_attempts,
    'unlock_time', v_lockout_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.login_guard_register_success(p_email text, p_scope text DEFAULT 'user')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));

  DELETE FROM public.login_attempt_guards
  WHERE email = v_normalized_email;

  PERFORM public.auth_security_log_event(
    'login_success',
    p_scope,
    v_normalized_email,
    'credentials_accepted',
    '{}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_guard_check(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_guard_register_failure(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_guard_register_success(text, text) TO anon, authenticated;
