const CLAIMABLE_ACHIEVEMENTS_KEY = 'bigkas_claimable_achievements_v1';
const ACHIEVEMENTS_UPDATED_EVENT = 'bigkas:achievements-updated';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRawList() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CLAIMABLE_ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRawList(list) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLAIMABLE_ACHIEVEMENTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_UPDATED_EVENT, { detail: { count: list.length } }));
}

export function getClaimableAchievements() {
  return readRawList();
}

export function getClaimableAchievementsCount() {
  return getClaimableAchievements().length;
}

/**
 * Adds a claimable achievement notification.
 * Called when an achievement meets requirements but hasn't been claimed.
 */
export function addClaimableAchievement(item) {
  if (!item?.id) return;
  const current = readRawList();
  const id = String(item.id);
  if (current.some((entry) => String(entry?.id) === id)) return;
  const next = [
    ...current,
    {
      id,
      title: String(item.title || item.name || 'Achievement Unlocked'),
      description: String(item.description || ''),
      badgeUrl: item.badgeUrl ?? null,
      source: 'achievement',
      createdAt: Number(item.createdAt || Date.now()),
    },
  ];
  writeRawList(next);
}

/**
 * Sync claimable achievements from a fetched list.
 * Adds any new claimable badges that aren't already in the notification tray.
 */
export function syncClaimableAchievements(achievements) {
  const current = readRawList();
  const existingIds = new Set(current.map((e) => String(e.id)));
  let changed = false;

  for (const a of achievements) {
    if (a.claimable && !existingIds.has(String(a.id))) {
      current.push({
        id: String(a.id),
        title: a.name || 'Achievement Unlocked',
        description: a.description || '',
        badgeUrl: a.badgeUrl ?? null,
        source: 'achievement',
        createdAt: Date.now(),
      });
      changed = true;
    }
  }

  if (changed) writeRawList(current);
}

export function claimAchievement(id) {
  const current = readRawList();
  const next = current.filter((entry) => String(entry?.id) !== String(id));
  writeRawList(next);
}

export function claimAllAchievements() {
  writeRawList([]);
}

export { ACHIEVEMENTS_UPDATED_EVENT };
