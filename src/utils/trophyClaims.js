const TROPHY_CLAIMS_KEY = 'bigkas_claimed_trophy_levels_v1';

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
  return claims[uid];
}
