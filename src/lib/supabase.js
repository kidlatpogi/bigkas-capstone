import { createClient } from '@supabase/supabase-js';

let supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

// Robust URL normalization to handle malformed environment variables (e.g., project ID only)
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  if (!supabaseUrl.includes('.')) {
    supabaseUrl = `https://${supabaseUrl}.supabase.co`;
  } else {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[Bigkas] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy apps/web/.env.example to apps/web/.env, add your Supabase project URL and anon key, then restart the dev server.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-optimized', // Override default telemetry to avoid ad-blocker filters
    },
  },
});

/** Seconds before access-token expiry when we proactively refresh (clock skew / idle tabs). */
const SESSION_REFRESH_BUFFER_SEC = 90;

/**
 * PostgREST / gateway errors when the JWT access token is stale or invalid.
 */
export function isJwtExpiredError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST303' || msg.includes('jwt expired');
}

export function isAuthSessionError(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();
  const text = `${message} ${details} ${hint}`;

  return (
    status === 401 ||
    status === 403 ||
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    isJwtExpiredError(error) ||
    text.includes('jwt') ||
    text.includes('invalid token') ||
    text.includes('invalid session') ||
    text.includes('refresh token')
  );
}

/**
 * Refresh the access token when it is missing, expired, or near expiry.
 * Use after idle periods or before REST calls that fail with JWT errors.
 *
 * @param {import('@supabase/supabase-js').Session | null | undefined} existingSession — optional session from getSession() to avoid an extra read
 */
export async function ensureFreshAccessToken(existingSession, options = {}) {
  let session = existingSession ?? null;
  if (!session) {
    const { data: { session: s }, error } = await supabase.auth.getSession();
    if (error) return { session: null, error };
    session = s;
  }
  if (!session) return { session: null, error: null };

  const exp = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = Boolean(options.force) || !exp || exp <= now + SESSION_REFRESH_BUFFER_SEC;

  if (!needsRefresh) {
    return { session, refreshed: false };
  }

  const { data, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return { session: null, error: refreshError };
  }
  return { session: data?.session ?? null, refreshed: true };
}

export default supabase;
