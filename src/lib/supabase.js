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
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-optimized', // Override default telemetry to avoid ad-blocker filters
    },
  },
});

export default supabase;
