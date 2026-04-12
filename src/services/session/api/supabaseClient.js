/**
 * Single Supabase client for the web app — re-exported from the app's own lib so
 * `import.meta.env.VITE_*` is always resolved by Vite.
 */
export { supabase } from '../../../lib/supabase.js';
export { supabase as default } from '../../../lib/supabase.js';
