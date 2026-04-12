/**
 * client.js — Re-exports the Supabase client as the primary data client.
 * Axios is no longer used; all data goes through Supabase.
 */
export { supabase as default } from './supabaseClient.js';
