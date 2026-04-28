import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchActivities, buildJourneyTasksFromActivities } from '../services/activitiesService';
import { useAuthContext } from '../context/useAuthContext';

const activitiesTasksCache = new Map();
const inFlightActivitiesRequests = new Map();

/**
 * Loads curriculum activities from Supabase for Skyward Journey / dashboard.
 * Uses the same Bigkas rank (1–5) as the dashboard (`getBigkasLevelFromUser`) to match
 * `public.activities.target_level`, not `profiles.current_level`.
 */
export function useActivitiesJourneyTasks(level = 1) {
  const { user } = useAuthContext();
  const [rows, setRows] = useState(() => {
    const cacheKey = `${String(user?.id || '')}:${String(level || 1)}`;
    const cachedRows = activitiesTasksCache.get(cacheKey);
    return Array.isArray(cachedRows) ? cachedRows : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const journeyTargetLevel = useMemo(() => {
    const parsed = Number(level);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [level]);

  const runFetch = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cacheKey = `${String(user.id)}:${String(journeyTargetLevel)}`;
    if (!forceRefresh && activitiesTasksCache.has(cacheKey)) {
      const cachedRows = activitiesTasksCache.get(cacheKey);
      setRows(Array.isArray(cachedRows) ? cachedRows : []);
      setError(null);
      setLoading(false);
      return;
    }

    const existingRequest = inFlightActivitiesRequests.get(cacheKey);
    if (existingRequest) {
      setLoading(true);
      const requestRows = await existingRequest;
      setRows(Array.isArray(requestRows) ? requestRows : []);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const request = (async () => {
      const data = await fetchActivities(journeyTargetLevel);
      const normalizedRows = Array.isArray(data) ? data : [];
      activitiesTasksCache.set(cacheKey, normalizedRows);
      return normalizedRows;
    })();

    inFlightActivitiesRequests.set(cacheKey, request);
    try {
      const latestRows = await request;
      setRows(latestRows);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load activities');
      setRows([]);
    } finally {
      inFlightActivitiesRequests.delete(cacheKey);
      setLoading(false);
    }
  }, [journeyTargetLevel, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await runFetch(false);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load activities');
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runFetch]);

  const tasks = useMemo(() => buildJourneyTasksFromActivities(rows), [rows]);
  const refresh = useCallback(async () => {
    await runFetch(true);
  }, [runFetch]);

  return { tasks, loading, error, rawRows: rows, journeyTargetLevel, refresh };
}
