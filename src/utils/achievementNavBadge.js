/**
 * Bottom-nav badge for newly unlocked achievements.
 *
 * Flow:
 *  1. After fetching from DB, call syncUnlockedBadgeIds(ids) to persist the
 *     current set of unlocked achievement IDs to localStorage.
 *  2. The nav reads getPendingAchievementBadgeCount() — the difference between
 *     synced unlocked IDs and IDs the user has already acknowledged.
 *  3. When the user opens the Achievements screen, acknowledgeAllPublishedUnlockedBadges()
 *     marks everything as seen and clears the badge counter.
 */

const STORAGE_KEY        = 'bigkas_achievement_ack_badge_ids_v1';
const CLAIMED_REWARDS_KEY = 'bigkas_achievement_claimed_reward_ids_v1';
const UNLOCKED_CACHE_KEY  = 'bigkas_unlocked_achievement_ids_v1';
const UPDATE_EVENT        = 'bigkas-achievement-badge-update';

/* ── Internal helpers ── */

function safeParse(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSave(key, values) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...new Set(values)]));
}

/* ── Unlocked IDs cache (written by the page after a DB fetch) ── */

/**
 * Called after fetching achievements from the DB.
 * Persists the unlocked achievement IDs so the nav badge can read them
 * without waiting for another network round-trip.
 *
 * @param {string[]} ids - Array of unlocked achievement UUIDs.
 */
export function syncUnlockedBadgeIds(ids, claimedIds = []) {
  const unclaimed = Array.isArray(ids) ? ids.filter((id) => id && typeof id === 'string') : [];
  safeSave(UNLOCKED_CACHE_KEY, unclaimed);
  if (Array.isArray(claimedIds) && claimedIds.length > 0) {
    const existingClaimed = safeParse(CLAIMED_REWARDS_KEY);
    const existingAck = safeParse(STORAGE_KEY);
    const mergedClaimed = [...new Set([...existingClaimed, ...claimedIds])];
    const mergedAck = [...new Set([...existingAck, ...claimedIds])];
    safeSave(CLAIMED_REWARDS_KEY, mergedClaimed);
    safeSave(STORAGE_KEY, mergedAck);
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

/** Returns the locally cached list of unlocked achievement IDs. */
export function getPublishedUnlockedBadgeIds() {
  return safeParse(UNLOCKED_CACHE_KEY);
}

/* ── Acknowledgement (nav-badge "seen" tracking) ── */

export function getAcknowledgedBadgeIds() {
  return safeParse(STORAGE_KEY);
}

function setAcknowledgedBadgeIds(ids) {
  safeSave(STORAGE_KEY, ids);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: ids.length } }));
}

/** How many unlocked badges the user hasn't opened Achievements to see yet. */
export function getPendingAchievementBadgeCount() {
  const ack = new Set(getAcknowledgedBadgeIds());
  const claimed = new Set(getClaimedRewardIds());
  return getPublishedUnlockedBadgeIds().filter((id) => !ack.has(id) && !claimed.has(id)).length;
}

/** Call when the user visits the Achievements screen — clears the nav counter. */
export function acknowledgeAllPublishedUnlockedBadges() {
  setAcknowledgedBadgeIds(getPublishedUnlockedBadgeIds());
}

export function acknowledgeBadgeId(id) {
  if (!id) return;
  const current = getAcknowledgedBadgeIds();
  setAcknowledgedBadgeIds([...new Set([...current, String(id)])]);
}

export function subscribeAchievementBadgeUpdates(callback) {
  if (typeof window === 'undefined') return () => {};
  const run = () => callback();
  window.addEventListener(UPDATE_EVENT, run);
  window.addEventListener('storage', run);
  return () => {
    window.removeEventListener(UPDATE_EVENT, run);
    window.removeEventListener('storage', run);
  };
}

/* ── Claimable rewards ── */

function getClaimedRewardIds() {
  return safeParse(CLAIMED_REWARDS_KEY);
}

function setClaimedRewardIds(ids) {
  safeSave(CLAIMED_REWARDS_KEY, ids);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { scope: 'claims' } }));
}

/** Number of unlocked achievements whose reward hasn't been collected yet. */
export function getClaimableRewardCount() {
  const claimed = new Set(getClaimedRewardIds());
  return getPublishedUnlockedBadgeIds().filter((id) => !claimed.has(id)).length;
}

/** Mark every currently unlocked badge reward as claimed. */
export function claimAllPublishedRewards() {
  const unlocked = getPublishedUnlockedBadgeIds();
  setClaimedRewardIds([...new Set([...getClaimedRewardIds(), ...unlocked])]);
}
