const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

const read = (value) => String(value ?? '').trim();
const toBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const normalizeBaseUrl = (url) => read(url).replace(/\/+$/, '');

const pythonServiceUrl =
  normalizeBaseUrl(procEnv.EXPO_PUBLIC_API_BASE_URL) ||
  normalizeBaseUrl(procEnv.EXPO_PUBLIC_PYTHON_SERVICE_URL) ||
  normalizeBaseUrl(procEnv.VITE_PYTHON_SERVICE_URL) ||
  normalizeBaseUrl(procEnv.VITE_API_BASE_URL) ||
  normalizeBaseUrl(procEnv.API_BASE_URL);

export const ENV = {
  SUPABASE_URL:
    read(procEnv.EXPO_PUBLIC_SUPABASE_URL) ||
    read(procEnv.VITE_SUPABASE_URL) ||
    read(procEnv.SUPABASE_URL),
  SUPABASE_ANON_KEY:
    read(procEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
    read(procEnv.SUPABASE_ANON_PUBLIC) ||
    read(procEnv.SUPABASE_PUBLISHABLE_KEY) ||
    read(procEnv.VITE_SUPABASE_ANON_KEY) ||
    read(procEnv.SUPABASE_ANON_KEY),
  API_BASE_URL: pythonServiceUrl,
  PYTHON_SERVICE_URL: pythonServiceUrl,
  ENABLE_SESSION_PERSISTENCE:
    !read(procEnv.VITE_ENABLE_SESSION_PERSISTENCE) || read(procEnv.VITE_ENABLE_SESSION_PERSISTENCE) !== 'false',
  ENABLE_DAILY_QUOTE_FETCH:
    toBool(procEnv.VITE_ENABLE_DAILY_QUOTE_FETCH, false) ||
    toBool(procEnv.EXPO_PUBLIC_ENABLE_DAILY_QUOTE_FETCH, false),
  GOOGLE_WEB_CLIENT_ID: read(procEnv.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  GOOGLE_ANDROID_CLIENT_ID: read(procEnv.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
};

export const SUPABASE_URL = ENV.SUPABASE_URL;
export const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;
export const API_BASE_URL = ENV.API_BASE_URL;
export const GOOGLE_WEB_CLIENT_ID = ENV.GOOGLE_WEB_CLIENT_ID;
export const GOOGLE_ANDROID_CLIENT_ID = ENV.GOOGLE_ANDROID_CLIENT_ID;

export default ENV;
