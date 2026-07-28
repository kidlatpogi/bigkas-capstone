import { acknowledgeBadgeId, acknowledgeAllPublishedUnlockedBadges } from './achievementNavBadge';

const CLAIMABLE_ACHIEVEMENTS_KEY = 'bigkas_claimable_achievements_v1';
const ACHIEVEMENTS_UPDATED_EVENT = 'bigkas:achievements-updated';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRawList() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CLAIMABLE_ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry?.source === 'achievement' && UUID_RE.test(String(entry?.id || '')))
      : [];
  } catch {
    return [];
  }
}

function writeRawList(list, detail = {}) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLAIMABLE_ACHIEVEMENTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_UPDATED_EVENT, { detail: { count: list.length, ...detail } }));
}

export function getClaimableAchievements(userId) {
  if (!userId) return [];
  const uid = String(userId);
  return readRawList().filter((entry) => String(entry?.userId || '') === uid);
}

export function getClaimableAchievementsCount(userId) {
  return getClaimableAchievements(userId).length;
}

/**
 * Adds a claimable achievement notification.
 * Called when an achievement meets requirements but hasn't been claimed.
 */
export function addClaimableAchievement(item, userId) {
  if (!item?.id || !userId) return;
  const current = readRawList();
  const id = String(item.id);
  const uid = String(userId);
  if (current.some((entry) => String(entry?.id) === id && String(entry?.userId || '') === uid)) return;
  const next = [
    ...current,
    {
      id,
      userId: uid,
      title: String(item.title || item.name || 'Achievement Unlocked'),
      description: String(item.description || ''),
      badgeUrl: item.badgeUrl ?? null,
      source: 'achievement',
      createdAt: Number(item.createdAt || Date.now()),
    },
  ];
  writeRawList(next, { action: 'sync', userId: uid });
}

/**
 * Sync claimable achievements from a fetched list.
 * Replaces this user's tray entries with the current claimable badge list.
 */
export function syncClaimableAchievements(achievements, userId) {
  if (!userId) return;
  const uid = String(userId);
  const current = readRawList();
  const currentById = new Map(
    current
      .filter((entry) => String(entry?.userId || '') === uid)
      .map((entry) => [String(entry.id), entry])
  );

  const syncedForUser = achievements
    .filter((a) => a.claimable)
    .map((a) => {
      const id = String(a.id);
      const existing = currentById.get(id);
      return {
        id: String(a.id),
        userId: uid,
        title: a.name || 'Achievement Unlocked',
        description: a.description || '',
        badgeUrl: a.badgeUrl ?? null,
        source: 'achievement',
        createdAt: Number(existing?.createdAt || Date.now()),
      };
    });

  const next = [
    ...current.filter((entry) => String(entry?.userId || '') !== uid),
    ...syncedForUser,
  ];

  writeRawList(next, { action: 'sync', userId: uid });
}

export function claimAchievement(id, userId, detail = {}) {
  if (!userId) return;
  const current = readRawList();
  const uid = String(userId);
  const achievementId = String(id);
  const next = current.filter((entry) => (
    String(entry?.id) !== achievementId || String(entry?.userId || '') !== uid
  ));
  acknowledgeBadgeId(achievementId);
  writeRawList(next, { action: 'claimed', id: achievementId, userId: uid, ...detail });
}

export function claimAllAchievements(userId, detail = {}) {
  if (!userId) return;
  const uid = String(userId);
  const next = readRawList().filter((entry) => String(entry?.userId || '') !== uid);
  acknowledgeAllPublishedUnlockedBadges();
  writeRawList(next, { action: 'claimed-all', userId: uid, ...detail });
}

export { ACHIEVEMENTS_UPDATED_EVENT };
