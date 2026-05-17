UPDATE public.login_attempt_guards
SET
  lockout_until = now() + interval '30 seconds',
  cooldown_step = 1,
  last_attempt_at = now()
WHERE lockout_until IS NOT NULL
  AND lockout_until > now() + interval '30 seconds';

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
    v_remaining_seconds := least(30, greatest(1, ceil(extract(epoch FROM (v_row.lockout_until - now())))::integer));

    IF v_row.lockout_until > now() + interval '30 seconds' THEN
      UPDATE public.login_attempt_guards
      SET
        lockout_until = now() + interval '30 seconds',
        cooldown_step = 1,
        last_attempt_at = now()
      WHERE email = v_normalized_email;
    END IF;

    PERFORM public.auth_security_log_event(
      'login_blocked',
      p_scope,
      v_normalized_email,
      'account_locked',
      jsonb_build_object(
        'remaining_seconds', v_remaining_seconds,
        'cooldown_step', 1
      )
    );

    RETURN jsonb_build_object(
      'is_locked', true,
      'remaining_seconds', v_remaining_seconds,
      'failed_attempts', v_row.failed_attempts,
      'cooldown_step', 1,
      'unlock_time', now() + (v_remaining_seconds || ' seconds')::interval
    );
  END IF;

  IF v_row.lockout_until IS NOT NULL THEN
    UPDATE public.login_attempt_guards
    SET
      failed_attempts = 0,
      cooldown_step = 0,
      lockout_until = NULL,
      last_attempt_at = now()
    WHERE email = v_normalized_email;

    RETURN jsonb_build_object(
      'is_locked', false,
      'remaining_seconds', 0,
      'failed_attempts', 0,
      'cooldown_step', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'is_locked', false,
    'remaining_seconds', 0,
    'failed_attempts', v_row.failed_attempts,
    'cooldown_step', 0
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
  v_row record;
  v_failed_attempts integer;
  v_lockout_seconds integer := 0;
  v_lockout_until timestamp with time zone := NULL;
  v_remaining_seconds integer;
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));

  SELECT * INTO v_row
  FROM public.login_attempt_guards
  WHERE email = v_normalized_email;

  IF FOUND AND v_row.lockout_until IS NOT NULL AND v_row.lockout_until > now() THEN
    v_remaining_seconds := least(30, greatest(1, ceil(extract(epoch FROM (v_row.lockout_until - now())))::integer));

    IF v_row.lockout_until > now() + interval '30 seconds' THEN
      UPDATE public.login_attempt_guards
      SET
        lockout_until = now() + interval '30 seconds',
        cooldown_step = 1,
        last_attempt_at = now()
      WHERE email = v_normalized_email;
    END IF;

    RETURN jsonb_build_object(
      'locked', true,
      'lockout_seconds', v_remaining_seconds,
      'failed_attempts', v_row.failed_attempts,
      'cooldown_step', 1,
      'unlock_time', now() + (v_remaining_seconds || ' seconds')::interval
    );
  END IF;

  INSERT INTO public.login_attempt_guards (email, failed_attempts, cooldown_step, lockout_until, last_attempt_at)
  VALUES (v_normalized_email, 1, 0, NULL, now())
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = CASE
      WHEN login_attempt_guards.lockout_until IS NOT NULL
        AND login_attempt_guards.lockout_until <= now()
      THEN 1
      ELSE login_attempt_guards.failed_attempts + 1
    END,
    cooldown_step = CASE
      WHEN login_attempt_guards.lockout_until IS NOT NULL
        AND login_attempt_guards.lockout_until <= now()
      THEN 0
      ELSE login_attempt_guards.cooldown_step
    END,
    lockout_until = CASE
      WHEN login_attempt_guards.lockout_until IS NOT NULL
        AND login_attempt_guards.lockout_until <= now()
      THEN NULL
      ELSE login_attempt_guards.lockout_until
    END,
    last_attempt_at = now()
  RETURNING failed_attempts INTO v_failed_attempts;

  IF v_failed_attempts >= 3 THEN
    v_lockout_seconds := 30;
    v_lockout_until := now() + interval '30 seconds';

    UPDATE public.login_attempt_guards
    SET
      failed_attempts = 0,
      cooldown_step = 1,
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
      'cooldown_step', CASE WHEN v_lockout_seconds > 0 THEN 1 ELSE 0 END,
      'locked', v_lockout_seconds > 0,
      'lockout_seconds', v_lockout_seconds,
      'unlock_time', v_lockout_until
    )
  );

  RETURN jsonb_build_object(
    'locked', v_lockout_seconds > 0,
    'lockout_seconds', v_lockout_seconds,
    'failed_attempts', v_failed_attempts,
    'cooldown_step', CASE WHEN v_lockout_seconds > 0 THEN 1 ELSE 0 END,
    'unlock_time', v_lockout_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_guard_check(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_guard_register_failure(text, text) TO anon, authenticated;
