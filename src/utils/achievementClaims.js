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

export function addClaimableAchievement(item) {
  if (!item?.id) return;
  const current = readRawList();
  const id = String(item.id);
  const alreadyExists = current.some((entry) => String(entry?.id) === id);
  if (alreadyExists) return;
  const next = [
    ...current,
    {
      id,
      title: String(item.title || 'Achievement Unlocked'),
      source: String(item.source || 'activity'),
      createdAt: Number(item.createdAt || Date.now()),
    },
  ];
  writeRawList(next);
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
