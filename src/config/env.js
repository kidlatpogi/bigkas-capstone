/**
 * Environment configuration
 * Reads from Vite environment variables
 */

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const normalizedAdminLoginSlug = (metaEnv.VITE_ADMIN_LOGIN_SLUG || '')
  .trim()
  .replace(/^\/+|\/+$/g, '');

const PROD_PYTHON_SERVICE_FALLBACK = 'https://kidlatpogi17-capstone-bigkas-backend.hf.space';
const PROD_CLOUDFLARE_AI_WORKER_FALLBACK = 'https://b01-ai-worker.kidlat.workers.dev';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function resolveBackendBaseUrl() {
  const configured =
    normalizeBaseUrl(metaEnv.VITE_PYTHON_SERVICE_URL) ||
    normalizeBaseUrl(metaEnv.VITE_API_BASE_URL);
  if (configured) return configured;

  if (metaEnv.PROD) {
    return PROD_PYTHON_SERVICE_FALLBACK;
  }

  return 'http://localhost:8000';
}

export const ENV = {
  toBoolean(value, defaultValue = false) {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === true;
  },
  SUPABASE_URL: metaEnv.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: metaEnv.VITE_SUPABASE_ANON_KEY,
  PYTHON_SERVICE_URL: resolveBackendBaseUrl(),
  API_BASE_URL: resolveBackendBaseUrl(),
  CLOUDFLARE_AI_WORKER_URL:
    normalizeBaseUrl(metaEnv.VITE_CLOUDFLARE_AI_WORKER_URL) ||
    PROD_CLOUDFLARE_AI_WORKER_FALLBACK,
  OPENROUTER_API_KEY: metaEnv.VITE_OPENROUTER_API_KEY || '',
  ENABLE_SESSION_PERSISTENCE: metaEnv.VITE_ENABLE_SESSION_PERSISTENCE !== 'false',
  ENABLE_REMOTE_TROPHIES: metaEnv.VITE_ENABLE_REMOTE_TROPHIES === 'true',
  ENABLE_DAILY_QUOTE_FETCH:
    (metaEnv.PROD && metaEnv.VITE_ENABLE_DAILY_QUOTE_FETCH !== 'false') ||
    metaEnv.VITE_ENABLE_DAILY_QUOTE_FETCH === 'true',
  ADMIN_LOGIN_SLUG: normalizedAdminLoginSlug,
  ADMIN_LOGIN_PATH: normalizedAdminLoginSlug ? `/admin-login/${normalizedAdminLoginSlug}` : null,
  APP_NAME: 'TalkTics',
  IS_DEVELOPMENT: Boolean(metaEnv.DEV),
  IS_PRODUCTION: Boolean(metaEnv.PROD),
};

export default ENV;
