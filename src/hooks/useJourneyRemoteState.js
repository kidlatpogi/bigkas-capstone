import { useCallback, useEffect, useState } from 'react';
import { fetchUserJourneyProgress } from '../services/journeyProgressService';
import { GLOBAL_ACTIVITY_SCOPE, mergeCompletedActivityIdsFromRemote } from '../utils/activityProgress';

/**
 * Loads journey progress from Supabase (completions + journey_started_at) and merges
 * completions into local activity metrics. Exposes a sync generation for UI refresh.
 */
export function useJourneyRemoteState(user) {
  const [journeyStartedAt, setJourneyStartedAt] = useState(null);
  const [metricsSyncKey, setMetricsSyncKey] = useState(0);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const refreshJourney = useCallback(async () => {
    if (!user?.id) {
      setJourneyStartedAt(null);
      setRemoteLoaded(true);
      return;
    }
    setRemoteLoaded(false);
    try {
      const remote = await fetchUserJourneyProgress(user.id);
      mergeCompletedActivityIdsFromRemote(scopeKey, remote.completedActivityIds);
      setJourneyStartedAt(remote.journeyStartedAt);
      setMetricsSyncKey((k) => k + 1);
    } catch {
      setJourneyStartedAt(null);
    } finally {
      setRemoteLoaded(true);
    }
  }, [user?.id, scopeKey]);

  useEffect(() => {
    refreshJourney();
  }, [refreshJourney]);

  return { journeyStartedAt, metricsSyncKey, remoteLoaded, refreshJourney };
}
