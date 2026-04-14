/**
 * sessionApi.js — Supabase-based session data access.
 */
import { supabase } from './supabaseClient.js';
import { ENV } from './env.js';

function emptyResult() {
  return { data: [], error: null, count: 0 };
}

export const sessionApi = {
  async getSessions(userId, { page = 1, limit = 10 } = {}) {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) return emptyResult();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    return { data: data || [], error, count: count || 0 };
  },

  async getSession(sessionId) {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) return { data: null, error: null };
    return supabase.from('sessions').select('*').eq('id', sessionId).single();
  },

  async deleteSession(sessionId) {
    if (!ENV.ENABLE_SESSION_PERSISTENCE) return { data: null, error: null };
    return supabase.from('sessions').delete().eq('id', sessionId);
  },
};

export default sessionApi;
