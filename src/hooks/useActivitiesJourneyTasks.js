import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchActivities, buildJourneyTasksFromActivities } from '../services/activitiesService';
import { useAuthContext } from '../context/useAuthContext';

/**
 * Loads curriculum activities from Supabase for Skyward Journey / dashboard.
 */
export function useActivitiesJourneyTasks() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // Fetch current_level from profiles
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('current_level')
          .eq('id', user.id)
          .limit(1);

        if (profileError) {
          throw new Error(profileError.message);
        }

        const parsedCurrentLevel = Number(profileRows?.[0]?.current_level);
        const currentLevel = Number.isFinite(parsedCurrentLevel) && parsedCurrentLevel > 0
          ? parsedCurrentLevel
          : 1;

        const data = await fetchActivities(currentLevel);
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
  }, [user?.id]);

  const tasks = useMemo(() => buildJourneyTasksFromActivities(rows), [rows]);

  return { tasks, loading, error, rawRows: rows };
}
