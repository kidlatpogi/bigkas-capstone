/**
 * scriptsApi.js — Supabase-based scripts data access.
 */
import { supabase } from './supabaseClient.js';

export const scriptsApi = {
  async getScripts(userId, type = null) {
    let query = supabase.from('scripts').select('*').eq('user_id', userId);
    if (type) {
      query = query.eq('type', type);
    }
    return query;
  },

  async getScript(scriptId) {
    return supabase.from('scripts').select('*').eq('id', scriptId).single();
  },

  async createScript({ userId, title, content, type = 'self-authored' }) {
    return supabase
      .from('scripts')
      .insert([
        {
          user_id: userId,
          title,
          content,
          type,
        },
      ])
      .select('*')
      .single();
  },

  async updateScript(scriptId, { title, content }) {
    return supabase
      .from('scripts')
      .update({ title, content })
      .eq('id', scriptId);
  },

  async deleteScript(scriptId) {
    return supabase.from('scripts').delete().eq('id', scriptId);
  },
};

export default scriptsApi;

export const getScripts = (userId, type) => scriptsApi.getScripts(userId, type);
export const getScript = (scriptId) => scriptsApi.getScript(scriptId);
export const createScript = (payload) => scriptsApi.createScript(payload);
export const updateScript = (scriptId, payload) => scriptsApi.updateScript(scriptId, payload);
export const deleteScript = (scriptId) => scriptsApi.deleteScript(scriptId);

export const duplicateSystemScript = (userId, script) =>
  scriptsApi.createScript({
    userId,
    title: `${script.title} (Copy)`,
    content: script.content || script.body || '',
    type: 'self-authored',
  });
