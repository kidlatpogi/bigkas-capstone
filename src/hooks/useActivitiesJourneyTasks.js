import { useEffect, useMemo, useState } from 'react';
import { fetchActivities, buildJourneyTasksFromActivities } from '../services/activitiesService';

/**
 * Loads curriculum activities from Supabase for Skyward Journey / dashboard.
 */
export function useActivitiesJourneyTasks() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActivities();
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
  }, []);

  const tasks = useMemo(() => buildJourneyTasksFromActivities(rows), [rows]);

  return { tasks, loading, error, rawRows: rows };
}
