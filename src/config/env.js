/**
 * Environment configuration
 * Reads from Vite environment variables
 */

const normalizedAdminLoginSlug = (import.meta.env.VITE_ADMIN_LOGIN_SLUG || '')
  .trim()
  .replace(/^\/+|\/+$/g, '');

const PROD_PYTHON_SERVICE_FALLBACK = 'https://kidlatpogi17-capstone-bigkas-backend.hf.space';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function resolveBackendBaseUrl() {
  const configured =
    normalizeBaseUrl(import.meta.env.VITE_PYTHON_SERVICE_URL) ||
    normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (configured) return configured;

  if (import.meta.env.PROD) {
    return PROD_PYTHON_SERVICE_FALLBACK;
  }

  return 'http://localhost:8000';
}

export const ENV = {
  toBoolean(value, defaultValue = false) {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === true;
  },
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  PYTHON_SERVICE_URL: resolveBackendBaseUrl(),
  API_BASE_URL: resolveBackendBaseUrl(),
  ENABLE_SESSION_PERSISTENCE: import.meta.env.VITE_ENABLE_SESSION_PERSISTENCE !== 'false',
  ENABLE_DAILY_QUOTE_FETCH:
    (import.meta.env.PROD && import.meta.env.VITE_ENABLE_DAILY_QUOTE_FETCH !== 'false') ||
    import.meta.env.VITE_ENABLE_DAILY_QUOTE_FETCH === 'true',
  ADMIN_LOGIN_SLUG: normalizedAdminLoginSlug,
  ADMIN_LOGIN_PATH: normalizedAdminLoginSlug ? `/admin-login/${normalizedAdminLoginSlug}` : null,
  APP_NAME: 'Bigkas',
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};

export default ENV;
