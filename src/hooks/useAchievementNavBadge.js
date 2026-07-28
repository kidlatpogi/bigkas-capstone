import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/useAuthContext';
import { ROUTES } from '../utils/constants';
import { getClaimableAchievementsCount } from '../utils/achievementClaims';
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
function readCurrentPending(userId) {
  if (typeof window === 'undefined') return 0;
  return Math.max(
    getPendingAchievementBadgeCount(),
    getClaimableAchievementsCount(userId),
  );
}

function readInitialPending() {
  if (typeof window === 'undefined') return 0;
  if (isAchievementsPath(window.location.pathname)) return 0;
  return readCurrentPending();
}

export function useAchievementNavBadge() {
  const location = useLocation();
  const { user } = useAuthContext();
  const [pending, setPending] = useState(readInitialPending);

  useEffect(() => {
    const updateHandler = () => {
      const nextPending = readCurrentPending(user?.id);
      if (isAchievementsPath(location.pathname)) {
        const unseenBadgeCount = getPendingAchievementBadgeCount();
        if (unseenBadgeCount > 0) acknowledgeAllPublishedUnlockedBadges();
        setPending(0);
        return;
      }
      setPending(nextPending);
    };

    const unsubscribe = subscribeAchievementBadgeUpdates(updateHandler);
    window.addEventListener('bigkas:achievements-updated', updateHandler);
    updateHandler();
    return () => {
      unsubscribe();
      window.removeEventListener('bigkas:achievements-updated', updateHandler);
    };
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (isAchievementsPath(location.pathname)) {
      const nextPending = getPendingAchievementBadgeCount();
      if (nextPending > 0) acknowledgeAllPublishedUnlockedBadges();
    }
  }, [location.pathname]);

  return isAchievementsPath(location.pathname) ? 0 : pending;
}
