import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import {
  acknowledgeAllPublishedUnlockedBadges,
  getPendingAchievementBadgeCount,
  subscribeAchievementBadgeUpdates,
} from '../utils/achievementNavBadge';

function isAchievementsPath(pathname) {
  const norm = (pathname || '/').replace(/\/+$/, '') || '/';
  const base = ROUTES.ACHIEVEMENTS.replace(/\/+$/, '') || '/achievements';
  return norm === base || norm.startsWith(`${base}/`);
}

/**
 * Pending achievement/reward notifications for the bottom nav (Achievement tab).
 * Clears when the user navigates to Achievements.
 */
function readInitialPending() {
  if (typeof window === 'undefined') return 0;
  const norm = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const base = ROUTES.ACHIEVEMENTS.replace(/\/+$/, '') || '/achievements';
  if (norm === base || norm.startsWith(`${base}/`)) return 0;
  return getPendingAchievementBadgeCount();
}

export function useAchievementNavBadge() {
  const location = useLocation();
  const [pending, setPending] = useState(readInitialPending);

  useEffect(() => {
    return subscribeAchievementBadgeUpdates(() => {
      const nextPending = getPendingAchievementBadgeCount();
      if (isAchievementsPath(location.pathname)) {
        if (nextPending > 0) acknowledgeAllPublishedUnlockedBadges();
        setPending(0);
        return;
      }
      setPending(nextPending);
    });
  }, [location.pathname]);

  useEffect(() => {
    if (isAchievementsPath(location.pathname)) {
      const nextPending = getPendingAchievementBadgeCount();
      if (nextPending > 0) acknowledgeAllPublishedUnlockedBadges();
    }
  }, [location.pathname]);

  return isAchievementsPath(location.pathname) ? 0 : pending;
}
