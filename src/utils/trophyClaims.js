const TROPHY_CLAIMS_KEY = 'bigkas_claimed_trophy_levels_v1';
const FEATURED_TROPHY_KEY = 'bigkas_featured_trophy_level_v1';

export const TROPHY_TITLES = {
  1: 'Foundation Finisher',
  2: 'Vocal Builder',
  3: 'Clear Communicator',
  4: 'Presence Specialist',
  5: 'Bigkas Expert',
};

function readClaims() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TROPHY_CLAIMS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeClaims(claims) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TROPHY_CLAIMS_KEY, JSON.stringify(claims));
}

function normalizeUserId(userId) {
  return String(userId || 'guest').trim() || 'guest';
}

export function getClaimedTrophyLevels(userId) {
  const claims = readClaims();
  const uid = normalizeUserId(userId);
  const levels = Array.isArray(claims[uid]) ? claims[uid] : [];
  return levels
    .map((level) => Number(level))
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 5);
}

export function getTrophyTitle(level) {
  return TROPHY_TITLES[Number(level)] || '';
}

export function getFeaturedTrophyLevel(userId) {
  if (typeof window === 'undefined') return null;
  const uid = normalizeUserId(userId);
  const claimed = getClaimedTrophyLevels(uid);
  if (!claimed.length) return null;

  try {
    const featured = JSON.parse(window.localStorage.getItem(FEATURED_TROPHY_KEY) || '{}');
    const level = Number(featured?.[uid]);
    if (claimed.includes(level)) return level;
  } catch {
    // Fall back to the highest claimed trophy.
  }

  return Math.max(...claimed);
}

export function setFeaturedTrophyLevel(userId, level) {
  if (typeof window === 'undefined') return getFeaturedTrophyLevel(userId);
  const normalizedLevel = Number(level);
  const uid = normalizeUserId(userId);
  const claimed = getClaimedTrophyLevels(uid);
  if (!claimed.includes(normalizedLevel)) return getFeaturedTrophyLevel(uid);

  let featured = {};
  try {
    featured = JSON.parse(window.localStorage.getItem(FEATURED_TROPHY_KEY) || '{}');
    if (!featured || typeof featured !== 'object') featured = {};
  } catch {
    featured = {};
  }

  featured[uid] = normalizedLevel;
  window.localStorage.setItem(FEATURED_TROPHY_KEY, JSON.stringify(featured));
  return normalizedLevel;
}

export function getFeaturedTrophy(userId) {
  const level = getFeaturedTrophyLevel(userId);
  if (!level) return null;
  return {
    level,
    label: `Level ${level} Trophy`,
    title: getTrophyTitle(level),
  };
}

export function claimTrophyLevel(userId, level) {
  const normalizedLevel = Number(level);
  if (!Number.isInteger(normalizedLevel) || normalizedLevel < 1 || normalizedLevel > 5) {
    return getClaimedTrophyLevels(userId);
  }

  const claims = readClaims();
  const uid = normalizeUserId(userId);
  const next = new Set(getClaimedTrophyLevels(uid));
  next.add(normalizedLevel);
  claims[uid] = [...next].sort((a, b) => a - b);
  writeClaims(claims);
  if (!getFeaturedTrophyLevel(uid)) {
    setFeaturedTrophyLevel(uid, normalizedLevel);
  }
  return claims[uid];
}
