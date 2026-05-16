ALTER TABLE public.login_attempt_guards
  ADD COLUMN IF NOT EXISTS cooldown_step integer NOT NULL DEFAULT 0;

UPDATE public.login_attempt_guards
SET
  failed_attempts = 0,
  cooldown_step = CASE
    WHEN lockout_until IS NOT NULL AND lockout_until > now() THEN 1
    ELSE 0
  END
WHERE failed_attempts >= 3;

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
      jsonb_build_object(
        'remaining_seconds', v_remaining_seconds,
        'cooldown_step', v_row.cooldown_step
      )
    );

    RETURN jsonb_build_object(
      'is_locked', true,
      'remaining_seconds', v_remaining_seconds,
      'failed_attempts', v_row.failed_attempts,
      'cooldown_step', v_row.cooldown_step,
      'unlock_time', v_row.lockout_until
    );
  END IF;

  RETURN jsonb_build_object(
    'is_locked', false,
    'remaining_seconds', 0,
    'failed_attempts', v_row.failed_attempts,
    'cooldown_step', v_row.cooldown_step
  );
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
  v_cooldown_step integer;
  v_lockout_seconds integer := 0;
  v_lockout_until timestamp with time zone := NULL;
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));

  INSERT INTO public.login_attempt_guards (email, failed_attempts, cooldown_step, lockout_until, last_attempt_at)
  VALUES (v_normalized_email, 1, 0, NULL, now())
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = CASE
      WHEN login_attempt_guards.lockout_until IS NOT NULL
        AND login_attempt_guards.lockout_until <= now()
      THEN 1
      ELSE login_attempt_guards.failed_attempts + 1
    END,
    lockout_until = CASE
      WHEN login_attempt_guards.lockout_until IS NOT NULL
        AND login_attempt_guards.lockout_until <= now()
      THEN NULL
      ELSE login_attempt_guards.lockout_until
    END,
    last_attempt_at = now()
  RETURNING failed_attempts, cooldown_step INTO v_failed_attempts, v_cooldown_step;

  IF v_failed_attempts >= 3 THEN
    v_cooldown_step := least(v_cooldown_step + 1, 3);
    v_lockout_seconds := CASE v_cooldown_step
      WHEN 1 THEN 30
      WHEN 2 THEN 120
      ELSE 900
    END;
    v_lockout_until := now() + (v_lockout_seconds || ' seconds')::interval;

    UPDATE public.login_attempt_guards
    SET
      failed_attempts = 0,
      cooldown_step = v_cooldown_step,
      lockout_until = v_lockout_until,
      last_attempt_at = now()
    WHERE email = v_normalized_email;
  END IF;

  PERFORM public.auth_security_log_event(
    'login_failed',
    p_scope,
    v_normalized_email,
    'invalid_credentials',
    jsonb_build_object(
      'failed_attempts', v_failed_attempts,
      'cooldown_step', v_cooldown_step,
      'locked', v_lockout_seconds > 0,
      'lockout_seconds', v_lockout_seconds,
      'unlock_time', v_lockout_until
    )
  );

  RETURN jsonb_build_object(
    'locked', v_lockout_seconds > 0,
    'lockout_seconds', v_lockout_seconds,
    'failed_attempts', v_failed_attempts,
    'cooldown_step', v_cooldown_step,
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
