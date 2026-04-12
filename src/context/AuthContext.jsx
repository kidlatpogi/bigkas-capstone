import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ENV } from '../config/env';
import { normalizeSpeakerPointsHistory } from '../utils/speakerPointsHistory';

/**
 * Authentication Context — backed by Supabase Auth
 */
const AuthContext = createContext(null);
const SIGNUP_COOLDOWN_KEY = 'bigkas_signup_cooldown_until';
const ADMIN_SESSION_KEY = 'bigkas_admin_session';
const LOGIN_GUARD_NOT_CONFIGURED_CODES = ['42883', 'PGRST202', '42P01'];
const LOGIN_GUARD_PREFIX = 'bigkas_login_guard_v1';
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_COOLDOWN_SCHEDULE_SECONDS = [60, 300, 900, 1800, 3600];
const LOGIN_GUARD_RESET_WINDOW_MS = 24 * 60 * 60 * 1000;
let loginGuardRpcDisabled = false;

function buildLockoutMessage(waitSeconds) {
  const seconds = Math.max(1, Number(waitSeconds) || 1);
  if (seconds < 60) return `Too many failed attempts. Try again in ${seconds}s.`;
  const minutes = Math.ceil(seconds / 60);
  return `Too many failed attempts. Try again in ${minutes}m.`;
}

function isLoginGuardNotConfigured(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();
  const errorText = String(error || '').toLowerCase();
  const status = Number(error?.status || 0);

  return (
    LOGIN_GUARD_NOT_CONFIGURED_CODES.includes(code) ||
    code === '404' ||
    status === 404 ||
    name.includes('not found') ||
    message.includes('not found') ||
    message.includes('could not find the function') ||
    message.includes('relation') && message.includes('login_attempt_guards') && message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('login_guard_') ||
    details.includes('schema cache') ||
    details.includes('login_guard_') ||
    hint.includes('login_guard_') ||
    errorText.includes('login_guard_') ||
    errorText.includes('/rpc/login_guard_')
  );
}

function getLoginGuardKey(scope, email) {
  return `${LOGIN_GUARD_PREFIX}:${scope}:${email}`;
}

function readLocalLoginGuardState(scope, email) {
  if (typeof window === 'undefined' || !email) return null;
  try {
    const raw = window.localStorage.getItem(getLoginGuardKey(scope, email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      failedAttempts: Number(parsed.failedAttempts || 0),
      cooldownStep: Number(parsed.cooldownStep || 0),
      lockUntil: Number(parsed.lockUntil || 0),
      lastFailedAt: Number(parsed.lastFailedAt || 0),
    };
  } catch {
    return null;
  }
}

function writeLocalLoginGuardState(scope, email, state) {
  if (typeof window === 'undefined' || !email) return;
  window.localStorage.setItem(getLoginGuardKey(scope, email), JSON.stringify(state));
}

function clearLocalLoginGuardState(scope, email) {
  if (typeof window === 'undefined' || !email) return;
  window.localStorage.removeItem(getLoginGuardKey(scope, email));
}

function getLocalLoginLockStatus(scope, email) {
  const state = readLocalLoginGuardState(scope, email);
  if (!state) return { isLocked: false, remainingSeconds: 0, error: null };

  const now = Date.now();
  if (state.lockUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.max(1, Math.ceil((state.lockUntil - now) / 1000)),
      error: null,
    };
  }

  return { isLocked: false, remainingSeconds: 0, error: null };
}

function registerLocalLoginFailure(scope, email) {
  const now = Date.now();
  const current = readLocalLoginGuardState(scope, email) || {
    failedAttempts: 0,
    cooldownStep: 0,
    lockUntil: 0,
    lastFailedAt: 0,
  };

  const outsideResetWindow = !current.lastFailedAt || (now - current.lastFailedAt) > LOGIN_GUARD_RESET_WINDOW_MS;
  const baseState = outsideResetWindow
    ? { failedAttempts: 0, cooldownStep: 0, lockUntil: 0, lastFailedAt: 0 }
    : current;

  const failedAttempts = baseState.failedAttempts + 1;
  if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    const cooldownStep = Math.min(baseState.cooldownStep + 1, LOGIN_COOLDOWN_SCHEDULE_SECONDS.length);
    const lockSeconds = LOGIN_COOLDOWN_SCHEDULE_SECONDS[cooldownStep - 1];
    writeLocalLoginGuardState(scope, email, {
      failedAttempts: 0,
      cooldownStep,
      lockUntil: now + (lockSeconds * 1000),
      lastFailedAt: now,
    });
    return { locked: true, lockoutSeconds: lockSeconds, error: null };
  }

  writeLocalLoginGuardState(scope, email, {
    ...baseState,
    failedAttempts,
    lastFailedAt: now,
  });

  return { locked: false, lockoutSeconds: 0, error: null };
}

function isJwtVerificationError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  return (
    message.includes('jwt failed verification') ||
    message.includes('invalid jwt') ||
    details.includes('jwt failed verification') ||
    hint.includes('jwt')
  );
}

async function callLoginGuardRpc(fnName, args) {
  let result = await supabase.schema('public').rpc(fnName, args);

  if (!result?.error || !isJwtVerificationError(result.error)) {
    return result;
  }

  // Recover from stale local session tokens by clearing local auth and retrying once.
  await supabase.auth.signOut({ scope: 'local' });
  result = await supabase.schema('public').rpc(fnName, args);
  return result;
}

async function getLoginLockStatus(scope, email) {
  if (!email) return { isLocked: false, remainingSeconds: 0, error: null };

  if (loginGuardRpcDisabled) {
    return getLocalLoginLockStatus(scope, email);
  }

  const { data, error } = await callLoginGuardRpc('login_guard_check', {
    p_email: email,
    p_scope: scope,
  });

  if (error) {
    if (isLoginGuardNotConfigured(error)) {
      loginGuardRpcDisabled = true;
      return getLocalLoginLockStatus(scope, email);
    }
    return { isLocked: false, remainingSeconds: 0, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    isLocked: !!row?.is_locked,
    remainingSeconds: Math.max(0, Number(row?.remaining_seconds || 0)),
    error: null,
    guardNotConfigured: false,
  };
}

function shouldTrackCredentialFailure(code) {
  return [
    'invalid_credentials',
    'account_not_found',
    'unknown_auth_error',
  ].includes(String(code || '').toLowerCase());
}

async function registerLoginFailure(scope, email) {
  if (!email) return { locked: false, lockoutSeconds: 0, error: null };

  if (loginGuardRpcDisabled) {
    return registerLocalLoginFailure(scope, email);
  }

  const { data, error } = await callLoginGuardRpc('login_guard_register_failure', {
    p_email: email,
    p_scope: scope,
  });

  if (error) {
    if (isLoginGuardNotConfigured(error)) {
      loginGuardRpcDisabled = true;
      return registerLocalLoginFailure(scope, email);
    }
    return { locked: false, lockoutSeconds: 0, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    locked: !!row?.locked,
    lockoutSeconds: Math.max(0, Number(row?.lockout_seconds || 0)),
    error: null,
    guardNotConfigured: false,
  };
}

async function registerLoginSuccess(scope, email) {
  if (!email) return { error: null };

  if (loginGuardRpcDisabled) {
    clearLocalLoginGuardState(scope, email);
    return { error: null, guardNotConfigured: true };
  }

  const { error } = await callLoginGuardRpc('login_guard_register_success', {
    p_email: email,
    p_scope: scope,
  });

  if (error && isLoginGuardNotConfigured(error)) {
    loginGuardRpcDisabled = true;
    clearLocalLoginGuardState(scope, email);
    return { error: null, guardNotConfigured: true };
  }

  return { error: error || null, guardNotConfigured: false };
}

function getWebRedirectPath(path = '/') {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${path}`;
}

function getSignupCooldownUntil() {
  if (typeof window === 'undefined') return 0;
  const stored = Number(window.localStorage.getItem(SIGNUP_COOLDOWN_KEY) || 0);
  return Number.isFinite(stored) ? stored : 0;
}

function setSignupCooldownUntil(untilTs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIGNUP_COOLDOWN_KEY, String(untilTs));
}

function getStoredAdminSession() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

function setStoredAdminSession(isEnabled) {
  if (typeof window === 'undefined') return;
  if (isEnabled) {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

function normalizeLoginError(err, email) {
  const rawMessage = (err?.message || '').trim();
  const msg = rawMessage.toLowerCase();
  const code = (err?.code || '').toLowerCase();

  if (err?.status === 423 || code.includes('locked')) {
    const remainingSeconds = Number(err?.remainingSeconds || 0);
    const unlockTimeMs = err?.unlockTime ? Date.parse(err.unlockTime) : NaN;
    const fallbackSeconds = Number.isFinite(unlockTimeMs)
      ? Math.max(1, Math.ceil((unlockTimeMs - Date.now()) / 1000))
      : 60;
    const waitSeconds = Number.isFinite(remainingSeconds) && remainingSeconds > 0
      ? Math.max(1, Math.ceil(remainingSeconds))
      : fallbackSeconds;
    return {
      code: 'account_locked',
      message: `Too many failed attempts. Try again in ${waitSeconds}s.`,
      requiresEmailConfirmation: false,
      lockoutSeconds: waitSeconds,
    };
  }

  if (
    msg.includes('email not confirmed') ||
    msg.includes('not confirmed') ||
    code.includes('email_not_confirmed')
  ) {
    return {
      code: 'email_not_confirmed',
      message: 'Verify your email address first. Then click resend email below if you need a new link.',
      requiresEmailConfirmation: true,
      pendingEmail: email,
    };
  }

  if (
    msg.includes('account has been deactivated') ||
    msg.includes('account has been permanently deleted') ||
    msg.includes('account cannot be used to sign in') ||
    code.includes('account_deactivated') ||
    code.includes('account_deleted')
  ) {
    return {
      code: code.includes('account_deleted') || msg.includes('permanently deleted')
        ? 'account_deleted'
        : 'account_deactivated',
      message: msg.includes('permanently deleted') || code.includes('account_deleted')
        ? 'Account deleted. Contact admin for assistance.'
        : 'Account deactivated. Contact admin for assistance.',
      requiresEmailConfirmation: false,
    };
  }

  if (
    msg.includes('user not found') ||
    msg.includes('no user') ||
    msg.includes('email not found')
  ) {
    return {
      code: 'account_not_found',
      message: 'No account found for this email address.',
      requiresEmailConfirmation: false,
    };
  }

  if (
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid email or password') ||
    code.includes('invalid_credentials')
  ) {
    return {
      code: 'invalid_credentials',
      message: 'Wrong email or password.',
      requiresEmailConfirmation: false,
    };
  }

  if (msg.includes('too many') || msg.includes('rate limit') || err?.status === 429) {
    return {
      code: 'rate_limited',
      message: 'Too many login attempts. Please wait a moment and try again.',
      requiresEmailConfirmation: false,
    };
  }

  return {
    code: 'unknown_auth_error',
    message: rawMessage || 'Unable to log in right now. Please try again.',
    requiresEmailConfirmation: false,
  };
}

function parseMetadataBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
  }
  return false;
}

function hasSpeakerProfileData(value) {
  return !!(value && typeof value === 'object' && Object.keys(value).length > 0);
}

function getAccountBlockedMessage(meta = {}) {
  if (parseMetadataBoolean(meta.account_deleted)) {
    return {
      code: 'account_deleted',
      message: 'Account deleted. Contact admin for assistance.',
    };
  }

  if (parseMetadataBoolean(meta.account_deactivated)) {
    return {
      code: 'account_deactivated',
      message: 'Account deactivated. Contact admin for assistance.',
    };
  }

  return null;
}

function deriveOnboardingStage(meta = {}) {
  const explicitStage = ['profiling', 'pretest', 'analyzing', 'completed'].includes(meta.onboarding_stage)
    ? meta.onboarding_stage
    : null;
  const profilingCompleted = parseMetadataBoolean(meta.profiling_completed) || hasSpeakerProfileData(meta.speaker_profile);
  const pretestCompleted = parseMetadataBoolean(meta.pretest_completed);
  const pretestFreeCompleted = parseMetadataBoolean(meta.pretest_free_completed);
  const onboardingCompleted = parseMetadataBoolean(meta.onboarding_completed);

  if (pretestCompleted && pretestFreeCompleted) {
    if (explicitStage === 'analyzing') {
      return 'analyzing';
    }
    if (explicitStage === 'completed' || onboardingCompleted) {
      return 'completed';
    }
    return 'completed';
  }

  if (pretestCompleted && !pretestFreeCompleted) {
    return 'pretest';
  }

  if (profilingCompleted) {
    return explicitStage === 'profiling' ? 'profiling' : 'pretest';
  }

  if (explicitStage) return explicitStage;
  return 'profiling';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => getStoredAdminSession());
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const signupCooldownUntilRef = useRef(0);
  const signupInProgressRef = useRef(false);

  const resolveAvatarUrl = useCallback((avatarValue) => {
    if (!avatarValue) return null;

    if (/^https?:\/\//i.test(avatarValue)) {
      return avatarValue;
    }

    const normalizedPath = avatarValue
      .replace(/^\/+/, '')
      .replace(/^avatars\//, '');

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(normalizedPath);

    return publicUrl || null;
  }, []);

  const clearAdminSession = useCallback(() => {
    setIsAdminAuthenticated(false);
    setStoredAdminSession(false);
  }, []);

  const persistAdminSession = useCallback(() => {
    setIsAdminAuthenticated(true);
    setStoredAdminSession(true);
  }, []);

  /* ── Build user object from Supabase session ── */
  const buildUser = useCallback((supaSession) => {
    if (!supaSession) return null;
    const u = supaSession.user || supaSession;
    const meta = u?.user_metadata || {};
    const onboardingStage = deriveOnboardingStage(meta);
    const fullName = meta.full_name || meta.name || u.email?.split('@')[0] || 'User';
    const fallbackFirst = fullName.split(' ')[0] || '';
    const fallbackLast = fullName.split(' ').slice(1).join(' ');

    return {
      id: u.id,
      email: u.email,
      name: fullName,
      firstName: meta.first_name || fallbackFirst,
      lastName: meta.last_name || fallbackLast,
      nickname: meta.nickname || null,
      avatar_url: resolveAvatarUrl(meta.avatar_url),
      onboardingStage,
      profilingCompleted: parseMetadataBoolean(meta.profiling_completed) || hasSpeakerProfileData(meta.speaker_profile),
      pretestCompleted: parseMetadataBoolean(meta.pretest_completed),
      pretestScriptedCompleted: parseMetadataBoolean(meta.pretest_scripted_completed) || parseMetadataBoolean(meta.pretest_completed),
      pretestFreeCompleted: parseMetadataBoolean(meta.pretest_free_completed),
      pretestScriptedSessionId: meta.pretest_scripted_session_id || null,
      pretestFreeSessionId: meta.pretest_free_session_id || meta.pretest_session_id || null,
      pretestScriptedScore: Number(meta.pretest_scripted_score ?? 0) || 0,
      pretestFreeScore: Number(meta.pretest_free_score ?? 0) || 0,
      speakerProfile: meta.speaker_profile || null,
      speakerPoints: Number(meta.speaker_points ?? 0) || 0,
      speakerLevel: String(meta.speaker_level || 'Novice'),
      speakerLevelNumber: Number(meta.speaker_level_number ?? 1) || 1,
      speakerPointsHistory: normalizeSpeakerPointsHistory(meta.speaker_points_history),
      onboardingLevelAnalysis: meta.onboarding_level_analysis || null,
      createdAt: u.created_at,
    };
  }, [resolveAvatarUrl]);

  useEffect(() => {
    if (!user?.id || !user?.onboardingStage) return;

    let isCancelled = false;

    const syncDerivedOnboardingMetadata = async () => {
      const { data, error: getUserError } = await supabase.auth.getUser();
      if (isCancelled || getUserError || !data?.user) return;

      const meta = data.user.user_metadata || {};
      const normalizedStage = deriveOnboardingStage(meta);
      const normalizedProfiling = parseMetadataBoolean(meta.profiling_completed) || hasSpeakerProfileData(meta.speaker_profile);
      const normalizedPretest = parseMetadataBoolean(meta.pretest_completed);
      const normalizedPretestScripted = parseMetadataBoolean(meta.pretest_scripted_completed);

      if (
        normalizedStage === user.onboardingStage &&
        normalizedProfiling === user.profilingCompleted &&
        normalizedPretest === user.pretestCompleted &&
        normalizedPretestScripted === user.pretestScriptedCompleted
      ) {
        return;
      }

      await supabase.auth.updateUser({
        data: {
          ...meta,
          onboarding_stage: user.onboardingStage,
          profiling_completed: user.profilingCompleted,
          pretest_completed: user.pretestCompleted,
          pretest_scripted_completed: user.pretestScriptedCompleted,
        },
      });
    };

    syncDerivedOnboardingMetadata();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.onboardingStage, user?.profilingCompleted, user?.pretestCompleted, user?.pretestScriptedCompleted]);

  /* ── Restore session on mount ── */
  useEffect(() => {
    let isMounted = true;
    let isBootstrapped = false;

    const bootstrapTimeout = setTimeout(() => {
      if (!isMounted || isBootstrapped) return;
      isBootstrapped = true;
      setIsLoading(false);
      setIsInitializing(false);
    }, 8000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted || isBootstrapped) return;

      const blockedAccount = getAccountBlockedMessage(session?.user?.user_metadata || {});
      if (blockedAccount) {
        setError(blockedAccount.message);
        setUser(null);
        clearAdminSession();
        await supabase.auth.signOut();
        isBootstrapped = true;
        clearTimeout(bootstrapTimeout);
        setIsLoading(false);
        setIsInitializing(false);
        return;
      }

      const nextUser = buildUser(session);
      setUser(nextUser);
      if (!nextUser) {
        clearAdminSession();
      }
      isBootstrapped = true;
      clearTimeout(bootstrapTimeout);
      setIsLoading(false);
      setIsInitializing(false);
    }).catch(() => {
      if (!isMounted || isBootstrapped) return;
      clearAdminSession();
      isBootstrapped = true;
      clearTimeout(bootstrapTimeout);
      setIsLoading(false);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip auth state changes while signup is in progress to prevent race conditions
      // that would reset pendingEmailVerification or cause unwanted navigation
      if (signupInProgressRef.current) return;

      const blockedAccount = getAccountBlockedMessage(session?.user?.user_metadata || {});
      if (blockedAccount) {
        setError(blockedAccount.message);
        setPendingEmailVerification(false);
        setPendingEmail(null);
        setUser(null);
        clearAdminSession();
        void supabase.auth.signOut();
        return;
      }

      const nextUser = buildUser(session);
      const emailConfirmed = !!session?.user?.email_confirmed_at;

      if (session?.user && !emailConfirmed) {
        setPendingEmailVerification(true);
        setPendingEmail(session.user.email || null);
        setUser(null);
        clearAdminSession();
        void supabase.auth.signOut();
        return;
      }

      setPendingEmailVerification(false);
      setPendingEmail(null);
      setUser(nextUser);
      if (!nextUser) {
        clearAdminSession();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, [buildUser, clearAdminSession]);

  /* ── Login ── */
  const login = useCallback(async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const lockStatus = await getLoginLockStatus('user', normalizedEmail);
    if (lockStatus.error) {
      const details = String(lockStatus.error?.message || '').trim();
      const message = isJwtVerificationError(lockStatus.error)
        ? 'Session token is invalid. Please refresh the page and sign in again.'
        : (details
          ? `Unable to verify login policy right now. ${details}`
          : 'Unable to verify login policy right now. Please try again.');
      setError(message);
      return {
        success: false,
        code: 'login_policy_unavailable',
        error: message,
        requiresEmailConfirmation: false,
      };
    }

    if (lockStatus.isLocked) {
      const message = buildLockoutMessage(lockStatus.remainingSeconds);
      setIsLoading(false);
      setError(message);
      return {
        success: false,
        code: 'account_locked',
        error: message,
        requiresEmailConfirmation: false,
        lockoutSeconds: lockStatus.remainingSeconds,
      };
    }

    setIsLoading(true);
    setError(null);
    clearAdminSession();

    try {
      // Direct Supabase login (no gateway)
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

      setIsLoading(false);

      if (err) {
        const normalizedError = normalizeLoginError(err, email);

        if (shouldTrackCredentialFailure(normalizedError.code)) {
          const failureResult = await registerLoginFailure('user', normalizedEmail);
          if (failureResult.error) {
            setError('Unable to update login attempts right now. Please try again.');
            return {
              success: false,
              code: 'login_policy_unavailable',
              error: 'Unable to update login attempts right now. Please try again.',
              requiresEmailConfirmation: false,
            };
          }

          if (failureResult.locked) {
            const message = buildLockoutMessage(failureResult.lockoutSeconds);
            setError(message);
            return {
              success: false,
              code: 'account_locked',
              error: message,
              requiresEmailConfirmation: false,
              lockoutSeconds: failureResult.lockoutSeconds,
            };
          }
        }

        setError(normalizedError.message);
        return {
          success: false,
          code: normalizedError.code,
          error: normalizedError.message,
          requiresEmailConfirmation: false,
          lockoutSeconds: normalizedError.lockoutSeconds,
        };
      }

      const emailConfirmed = !!data.user?.email_confirmed_at;
      if (!emailConfirmed) {
        setPendingEmailVerification(true);
        setPendingEmail(email);
        const message = 'Verify your email address first. Then click resend email below if you need a new link.';
        setError(message);
        await supabase.auth.signOut();
        return {
          success: false,
          code: 'email_not_confirmed',
          error: message,
          requiresEmailConfirmation: true,
        };
      }

      // Block deactivated / deleted accounts
      const meta = data.user?.user_metadata || {};
      if (parseMetadataBoolean(meta.account_deactivated) || parseMetadataBoolean(meta.account_deleted)) {
        await supabase.auth.signOut();
        const blockedMessage = parseMetadataBoolean(meta.account_deleted)
          ? 'Account deleted. Contact admin for assistance.'
          : 'Account deactivated. Contact admin for assistance.';
        setError(blockedMessage);
        return {
          success: false,
          code: parseMetadataBoolean(meta.account_deleted) ? 'account_deleted' : 'account_deactivated',
          error: blockedMessage,
        };
      }

      setPendingEmailVerification(false);
      setPendingEmail(null);
  await registerLoginSuccess('user', normalizedEmail);
      return { success: true, user: buildUser(data.session) };
    } catch (networkError) {
      setIsLoading(false);
      const message = networkError?.message || 'An unexpected error occurred during login. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  }, [buildUser, clearAdminSession]);

  /* ── Admin Login ── */
  const adminLogin = useCallback(async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const lockStatus = await getLoginLockStatus('admin', normalizedEmail);
    if (lockStatus.error) {
      const details = String(lockStatus.error?.message || '').trim();
      const message = isJwtVerificationError(lockStatus.error)
        ? 'Session token is invalid. Please refresh the page and sign in again.'
        : (details
          ? `Unable to verify login policy right now. ${details}`
          : 'Unable to verify login policy right now. Please try again.');
      setError(message);
      return {
        success: false,
        code: 'login_policy_unavailable',
        error: message,
      };
    }

    if (lockStatus.isLocked) {
      const message = buildLockoutMessage(lockStatus.remainingSeconds);
      setIsLoading(false);
      setError(message);
      return {
        success: false,
        code: 'account_locked',
        error: message,
        lockoutSeconds: lockStatus.remainingSeconds,
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      // First login with Supabase
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

      setIsLoading(false);

      if (err) {
        const normalizedError = normalizeLoginError(err, email);

        if (shouldTrackCredentialFailure(normalizedError.code)) {
          const failureResult = await registerLoginFailure('admin', normalizedEmail);
          if (failureResult.error) {
            setError('Unable to update login attempts right now. Please try again.');
            return {
              success: false,
              code: 'login_policy_unavailable',
              error: 'Unable to update login attempts right now. Please try again.',
            };
          }

          if (failureResult.locked) {
            const message = buildLockoutMessage(failureResult.lockoutSeconds);
            setError(message);
            return {
              success: false,
              code: 'account_locked',
              error: message,
              lockoutSeconds: failureResult.lockoutSeconds,
            };
          }
        }

        setError(normalizedError.message);
        return {
          success: false,
          code: normalizedError.code,
          error: normalizedError.message,
          lockoutSeconds: normalizedError.lockoutSeconds,
        };
      }

      const emailConfirmed = !!data.user?.email_confirmed_at;
      if (!emailConfirmed) {
        setPendingEmailVerification(true);
        setPendingEmail(email);
        const message = 'Verify your email address first. Then click resend email below if you need a new link.';
        setError(message);
        await supabase.auth.signOut();
        return {
          success: false,
          code: 'email_not_confirmed',
          error: message,
          requiresEmailConfirmation: true,
        };
      }

      // Check if user is admin (in metadata or allowed emails list)
      const meta = data.user?.user_metadata || {};
      const isAdmin = parseMetadataBoolean(meta.is_admin);
      const allowedEmails = ['dzeref4000@gmail.com', 'test@gmail.com', 'test1@gmail.com'];
      const emailIsAllowed = allowedEmails.includes(data.user?.email);

      if (!isAdmin && !emailIsAllowed) {
        clearAdminSession();
        await supabase.auth.signOut();
        const message = 'You do not have admin access.';
        setError(message);
        return {
          success: false,
          code: 'insufficient_permissions',
          error: message,
        };
      }

      setPendingEmailVerification(false);
      setPendingEmail(null);
  await registerLoginSuccess('admin', normalizedEmail);
      persistAdminSession();
      return { success: true, user: buildUser(data.session) };
    } catch (err) {
      setIsLoading(false);
      const message = 'Admin login failed. Please try again.';
      setError(message);
      return {
        success: false,
        code: 'admin_login_error',
        error: message,
      };
    }
  }, [buildUser, clearAdminSession, persistAdminSession]);

  /* ── Register ── */
  const register = useCallback(async ({ name, firstName, lastName, email, password }) => {
    const cooldownUntil = Math.max(signupCooldownUntilRef.current, getSignupCooldownUntil());
    const remainingMs = cooldownUntil - Date.now();
    if (remainingMs > 0) {
      const waitSeconds = Math.ceil(remainingMs / 1000);
      const message = `Too many signup attempts. Please wait ${waitSeconds}s and try again.`;
      setError(message);
      return { success: false, error: message };
    }

    setIsLoading(true);
    setError(null);
    signupInProgressRef.current = true;
    const normalizedEmail = (email || '').trim();
    const resolvedFirstName = (firstName || '').trim();
    const resolvedLastName = (lastName || '').trim();
    const resolvedFullName =
      (name || '').trim() ||
      `${resolvedFirstName} ${resolvedLastName}`.trim();

    const emailRedirectTo = getWebRedirectPath('/verify-email');

    try {
      // Race the signup against a 15-second timeout.
      // When Supabase's SMTP hangs (trying to send confirmation email),
      // the signUp() promise never resolves — this prevents infinite loading.
      const signupPromise = supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: resolvedFullName,
            first_name: resolvedFirstName || undefined,
            last_name: resolvedLastName || undefined,
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SIGNUP_TIMEOUT')), 15000)
      );

      const { data, error: err } = await Promise.race([signupPromise, timeoutPromise]);
      setIsLoading(false);

      if (err) {
        const errMsg = err.message || '';
        const errStatus = err.status || 0;

        // Rate-limited
        if (errStatus === 429 || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many')) {
          const cooldownUntilTs = Date.now() + 60_000;
          signupCooldownUntilRef.current = cooldownUntilTs;
          setSignupCooldownUntil(cooldownUntilTs);
          const message = 'Too many signup attempts. Please wait 60 seconds and try again.';
          setError(message);
          return { success: false, error: message };
        }

        // Already registered
        if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('already been registered')) {
          const message = 'This email is already registered. Try logging in instead.';
          setError(message);
          return { success: false, error: message };
        }

        // SMTP / email sending failure (500)
        // The user may have been created but the confirmation email failed.
        // Try to recover by resending the confirmation email separately.
        if (errStatus === 500 || errMsg.toLowerCase().includes('internal server') || errMsg.toLowerCase().includes('sending confirmation')) {
          try {
            const { error: resendErr } = await supabase.auth.resend({
              type: 'signup',
              email: normalizedEmail,
              options: { emailRedirectTo },
            });

            if (!resendErr) {
              // Recovery succeeded — the confirmation email was sent
              setPendingEmailVerification(true);
              setPendingEmail(normalizedEmail);
              return { success: true, requiresEmailConfirmation: true };
            }
          } catch {
            // Resend also failed, fall through to error
          }

          const message = 'Account may have been created but the verification email could not be sent. Please try logging in, or try again in a few minutes.';
          setError(message);
          return { success: false, error: message };
        }

        // Password too weak
        if (errMsg.toLowerCase().includes('password')) {
          const message = 'Password does not meet the requirements. Please choose a stronger password (at least 8 characters).';
          setError(message);
          return { success: false, error: message };
        }

        // Generic fallback
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      if (!data.session) {
        // Email confirmation required — Supabase sends via configured SMTP
        setPendingEmailVerification(true);
        setPendingEmail(normalizedEmail);
        return { success: true, requiresEmailConfirmation: true };
      }
      return { success: true, user: buildUser(data.session) };
    } catch (networkError) {
      setIsLoading(false);
      const message = networkError?.message || '';

      // Signup request timed out — SMTP is likely hanging
      if (message === 'SIGNUP_TIMEOUT') {
        const errorMsg = 'Account creation is taking too long (email service may be slow). Your account may have been created — try logging in. If not, please try again.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network') || message.toLowerCase().includes('failed')) {
        const errorMsg = 'Network error. Please check your internet connection and try again.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const errorMsg = 'An unexpected error occurred during sign-up. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      // Reset flag after a short delay to let any pending auth events settle
      setTimeout(() => { signupInProgressRef.current = false; }, 3000);
    }
  }, [buildUser]);

  /* ── Google OAuth Login ── */
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    clearAdminSession();

    const redirectTo = getWebRedirectPath('/dashboard');

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (err) {
      setIsLoading(false);
      setError(err.message);
      return { success: false, error: err.message };
    }

    return { success: true };
  }, [clearAdminSession]);

  /* ── Resend verification email ── */
  const resendVerificationEmail = useCallback(async (email) => {
    const normalizedEmail = (email || '').trim();
    if (!normalizedEmail) {
      return { success: false, error: 'Enter your email to resend verification.' };
    }

    const emailRedirectTo = getWebRedirectPath('/verify-email');

    // Resend via Supabase (sends through Brevo SMTP)
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { emailRedirectTo },
    });

    if (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many') || err.status === 429) {
        return { success: false, error: 'Please wait before requesting another verification email.' };
      }
      return { success: false, error: err.message };
    }

    return { success: true };
  }, []);

  /* ── Logout ── */
  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    clearAdminSession();
    setIsLoading(false);
  }, [clearAdminSession]);

  /* ── Update nickname ── */
  const updateNickname = useCallback(async (nickname) => {
    const trimmed = nickname.trim();
    if (!trimmed) return { success: false, error: 'Nickname is required' };
    const metadataUpdates = {
      nickname: trimmed,
      onboarding_stage: user?.onboardingStage || 'profiling',
      profiling_completed: !!user?.profilingCompleted,
      pretest_completed: !!user?.pretestCompleted,
    };
    const { data, error: err } = await supabase.auth.updateUser({ data: metadataUpdates });
    if (err) return { success: false, error: err.message };
    setUser((prev) => ({ ...prev, nickname: trimmed, ...buildUser({ user: data.user }) }));
    return { success: true };
  }, [buildUser, user?.onboardingStage, user?.pretestCompleted, user?.profilingCompleted]);

  /* ── Update arbitrary user metadata ── */
  const updateUserMetadata = useCallback(async (updates = {}) => {
    if (!updates || typeof updates !== 'object') {
      return { success: false, error: 'Invalid metadata updates.' };
    }

    const { data, error: err } = await supabase.auth.updateUser({ data: updates });
    if (err) return { success: false, error: err.message };
    setUser(buildUser({ user: data.user }));
    return { success: true, user: buildUser({ user: data.user }) };
  }, [buildUser]);

  /* ── Update profile ── */
  const updateProfile = useCallback(async ({ name, full_name, first_name, last_name, nickname, avatarUrl, avatar_url }) => {
    const updates = {};
    const resolvedName = (name ?? full_name)?.trim();
    const resolvedFirstName = first_name?.trim();
    const resolvedLastName = last_name?.trim();

    if (resolvedFirstName !== undefined) updates.first_name = resolvedFirstName;
    if (resolvedLastName !== undefined) updates.last_name = resolvedLastName;

    if (!resolvedName && (resolvedFirstName !== undefined || resolvedLastName !== undefined)) {
      const fallbackFullName = `${resolvedFirstName || ''} ${resolvedLastName || ''}`.trim();
      updates.full_name = fallbackFullName;
    }

    if (resolvedName) updates.full_name = resolvedName;
    if (nickname !== undefined) updates.nickname = nickname || null;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error: err } = await supabase.auth.updateUser({ data: updates });
    if (err) return { success: false, error: err.message };
    setUser(buildUser({ user: data.user }));
    return { success: true };
  }, [buildUser]);

  /* ── Change password ── */
  const changePassword = useCallback(async (payload) => {
    const nextPassword = typeof payload === 'string' ? payload : payload?.newPassword;
    const currentPassword = typeof payload === 'string' ? null : payload?.currentPassword;

    if (!nextPassword || nextPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters.' };
    }

    if (currentPassword) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return { success: false, error: 'Not authenticated' };

      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (reAuthErr) return { success: false, error: 'Current password is incorrect.' };
    }

    const { error: err } = await supabase.auth.updateUser({ password: nextPassword });
    if (err) return { success: false, error: err.message };
    return { success: true };
  }, []);

  /* ── Upload avatar ── */
  const uploadAvatar = useCallback(async (file) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true });
    if (upErr) return { success: false, error: upErr.message };
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return { success: true, url: publicUrl };
  }, []);

  /* ── Deactivate account ── */
  const deactivateAccount = useCallback(async ({ password }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    // Verify password
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: session.user.email, password,
    });
    if (reAuthErr) return { success: false, error: 'Incorrect password.' };

    // Set deactivation flag in user metadata
    const { error: updateErr } = await supabase.auth.updateUser({
      data: {
        account_deactivated: true,
        account_deactivated_at: new Date().toISOString(),
      },
    });
    if (updateErr) return { success: false, error: updateErr.message };

    // Sign the user out
    await supabase.auth.signOut();
    setUser(null);
    clearAdminSession();
    return { success: true };
  }, [clearAdminSession]);

  /* ── Delete account ── */
  const deleteAccount = useCallback(async ({ password }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };
    const userId = session.user.id;

    // Verify password
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: session.user.email, password,
    });
    if (reAuthErr) return { success: false, error: 'Incorrect password.' };

    // Delete user data from database
    if (ENV.ENABLE_SESSION_PERSISTENCE) {
      const { error: sessionDeleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', userId);

      const missingSessionsTable = sessionDeleteError?.code === '42P01' ||
        sessionDeleteError?.status === 404 ||
        sessionDeleteError?.message?.toLowerCase().includes('relation') ||
        sessionDeleteError?.message?.toLowerCase().includes('does not exist');

      if (sessionDeleteError && !missingSessionsTable) {
        return { success: false, error: sessionDeleteError.message };
      }
    }

    // Delete avatar from storage
    try {
      const { data: avatarFiles } = await supabase.storage
        .from('avatars')
        .list(userId);
      if (avatarFiles?.length) {
        await supabase.storage
          .from('avatars')
          .remove(avatarFiles.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // Avatar cleanup is best-effort
    }

    // Mark account as deleted in user metadata so login is blocked
    const { error: markDeletedError } = await supabase.auth.updateUser({
      data: {
        account_deleted: true,
        account_deleted_at: new Date().toISOString(),
        account_deactivated: true,
      },
    });
    if (markDeletedError) return { success: false, error: markDeletedError.message };

    // Sign the user out
    await supabase.auth.signOut();
    setUser(null);
    clearAdminSession();
    return { success: true };
  }, [clearAdminSession]);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user, isInitializing, isLoading, isAuthenticated: !!user, isAdminAuthenticated, error,
    pendingEmailVerification, pendingEmail,
    login, logout, register, updateNickname, updateProfile,
    updateUserMetadata,
    changePassword, uploadAvatar, deactivateAccount, deleteAccount, clearError,
    adminLogin, loginWithGoogle, resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
