/**
 * Caches profile avatar bytes for ProfileModal so reopening the sheet does not
 * re-hit the network. Uses an in-memory object URL map plus the Cache API when available.
 */

const BLOB_OBJECT_URL_BY_AVATAR_URL = new Map();
const CACHE_NAME = 'bigkas-profile-modal-avatar-v1';

async function fetchAvatarBlob(avatarUrl) {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      let res = await cache.match(avatarUrl);
      if (!res || !res.ok) {
        res = await fetch(avatarUrl, { mode: 'cors', credentials: 'omit' });
        if (res && res.ok) {
          try {
            await cache.put(avatarUrl, res.clone());
          } catch {
            /* Some CDNs return bodies Cache API cannot store; memory map still helps */
          }
        }
      }
      if (res && res.ok) return res.blob();
    }
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch(avatarUrl, { mode: 'cors', credentials: 'omit' });
    if (res.ok) return res.blob();
  } catch {
    return null;
  }
  return null;
}

/**
 * Returns a blob: object URL for the given avatar URL, reusing a prior resolution when possible.
 * @param {string | null | undefined} avatarUrl
 * @returns {Promise<string | null>} blob URL or null if the image could not be loaded
 */
export async function ensureProfileModalAvatarSrc(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  const existing = BLOB_OBJECT_URL_BY_AVATAR_URL.get(avatarUrl);
  if (existing) return existing;

  const blob = await fetchAvatarBlob(avatarUrl);
  if (!blob) return null;

  const objectUrl = URL.createObjectURL(blob);
  BLOB_OBJECT_URL_BY_AVATAR_URL.set(avatarUrl, objectUrl);
  return objectUrl;
}

export function invalidateProfileModalAvatarCache(avatarUrl) {
  if (!avatarUrl) return;
  const objectUrl = BLOB_OBJECT_URL_BY_AVATAR_URL.get(avatarUrl);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    BLOB_OBJECT_URL_BY_AVATAR_URL.delete(avatarUrl);
  }
  if (typeof caches !== 'undefined') {
    caches.open(CACHE_NAME).then((c) => c.delete(avatarUrl)).catch(() => {});
  }
}
