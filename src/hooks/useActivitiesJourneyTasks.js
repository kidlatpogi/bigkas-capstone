import { useEffect, useMemo, useState } from 'react';
import { fetchActivities, buildJourneyTasksFromActivities } from '../services/activitiesService';
import { useAuthContext } from '../context/useAuthContext';
import { getBigkasLevelFromUser } from '../utils/activityProgress';

/**
 * Loads curriculum activities from Supabase for Skyward Journey / dashboard.
 * Uses the same Bigkas rank (1–5) as the dashboard (`getBigkasLevelFromUser`) to match
 * `public.activities.target_level`, not `profiles.current_level`.
 */
export function useActivitiesJourneyTasks() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const journeyTargetLevel = useMemo(() => {
    if (!user) return 1;
    const { levelNumber } = getBigkasLevelFromUser(user);
    return Number.isFinite(levelNumber) && levelNumber > 0 ? levelNumber : 1;
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActivities(journeyTargetLevel);
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load activities');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, journeyTargetLevel]);

  const tasks = useMemo(() => buildJourneyTasksFromActivities(rows), [rows]);

  return { tasks, loading, error, rawRows: rows, journeyTargetLevel };
}
