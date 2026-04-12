import { supabase } from './supabaseClient.js';

const ADMIN_DASHBOARD_TTL_MS = 15000;
const dashboardCache = new Map();
const inFlightDashboardRequests = new Map();

function makeDashboardCacheKey({ period, search, sortBy, sortDir, page, perPage }) {
  return JSON.stringify({ period, search, sortBy, sortDir, page, perPage });
}

function getCachedDashboard(cacheKey) {
  const cached = dashboardCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardCache.delete(cacheKey);
    return null;
  }
  return cached.payload;
}

function setCachedDashboard(cacheKey, payload) {
  dashboardCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + ADMIN_DASHBOARD_TTL_MS,
  });
}

function clearAdminDashboardCache() {
  dashboardCache.clear();
  inFlightDashboardRequests.clear();
}

export const adminApi = {
  async getDashboard({ period = 'month', search = '', sortBy = 'created_at', sortDir = 'desc', page = 1, perPage = 10 } = {}) {
    const cacheKey = makeDashboardCacheKey({ period, search, sortBy, sortDir, page, perPage });
    const cachedPayload = getCachedDashboard(cacheKey);
    if (cachedPayload) {
      return cachedPayload;
    }

    const pendingRequest = inFlightDashboardRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestPromise = (async () => {
      const offset = (page - 1) * perPage;
      let query = supabase
        .from('practice_sessions')
        .select('*,auth.users(id,email,user_metadata)', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(offset, offset + perPage - 1);

      if (search) {
        query = query.ilike('script_title', `%${search}%`);
      }

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const payload = { sessions: data, total: count };
      setCachedDashboard(cacheKey, payload);
      return payload;
    })();

    inFlightDashboardRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inFlightDashboardRequests.delete(cacheKey);
    }
  },

  async updateUser(userId, updates) {
    // Update user metadata via Supabase Admin API would require service key on backend
    // For now, return mock success—implement via Edge Function for production
    clearAdminDashboardCache();
    return { id: userId, ...updates };
  },

  async deleteUser(userId) {
    // Delete user would require Supabase Admin API (server-side only)
    // For now, return mock success—implement via Edge Function for production
    clearAdminDashboardCache();
    return { id: userId, deleted: true };
  },

  async getTechnicalHealth() {
    // Mock technical health data for now
    // In production, implement via Edge Function that queries Postgres stats
    return {
      status: 'healthy',
      database: { status: 'connected' },
      timestamp: new Date().toISOString(),
    };
  },
};

export default adminApi;
