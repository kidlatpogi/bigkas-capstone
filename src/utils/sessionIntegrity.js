const INSTANCE_TOKEN_KEY = 'bigkas_instance_token_v2';
const SESSION_BROADCAST_KEY = 'bigkas_session_channel_v2';
const DEVICE_FINGERPRINT_KEY = 'bigkas_device_fingerprint_v1';

let activeInstanceToken = null;
let broadcastChannel = null;
let isEjectionModalTriggered = false;

/**
 * Returns a unique instance token for the current browser tab window.
 * Uses sessionStorage so each tab gets its own unique token.
 * Duplicated tabs get a FRESH token because sessionStorage is cloned but
 * the in-memory variable is reset.
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallback below */
    }
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
      );
    } catch {
      /* fallback below */
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a unique instance token for the current browser tab window.
 * Uses sessionStorage so each tab gets its own unique token.
 * Duplicated tabs get a FRESH token because sessionStorage is cloned but
 * the in-memory variable is reset.
 */
export function getOrGenerateInstanceToken() {
  if (typeof window === 'undefined') return 'server-instance';

  if (activeInstanceToken && window.__bigkasInstanceToken === activeInstanceToken) {
    return activeInstanceToken;
  }

  if (!window.__bigkasInstanceToken) {
    let stored = null;
    try {
      stored = window.sessionStorage.getItem(INSTANCE_TOKEN_KEY);
    } catch (e) { /* ignore */ }
    window.__bigkasInstanceToken = stored || generateUUID();
  }

  activeInstanceToken = window.__bigkasInstanceToken;
  try {
    window.sessionStorage.setItem(INSTANCE_TOKEN_KEY, activeInstanceToken);
  } catch (e) { /* ignore */ }
  return activeInstanceToken;
}

/**
 * Broadcasts across all tabs in the same browser that this tab/token has claimed the active session for the user.
 */
export function broadcastSessionClaimed(userId, token) {
  if (typeof window === 'undefined') return;

  if (!broadcastChannel && typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(SESSION_BROADCAST_KEY);
    } catch (e) {
      console.warn('[SessionIntegrity] BroadcastChannel creation failed:', e);
    }
  }

  const payload = { type: 'SESSION_CLAIMED', userId, token, timestamp: Date.now() };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }

  // Fallback via localStorage for browsers without BroadcastChannel support or cross-origin frames
  try {
    window.localStorage.setItem('bigkas_last_claimed_session_event', JSON.stringify(payload));
  } catch (e) { /* ignore storage quota errors */ }
}

/**
 * Triggers session ejection modal dialog.
 * Dispatches event to abort active media streams and open the ConfirmationModal overlay.
 */
export async function handleSessionEjection(reasonMessage, _supabase) {
  if (typeof window === 'undefined') return;
  if (isEjectionModalTriggered) return;
  isEjectionModalTriggered = true;

  console.warn('[SessionIntegrity] Triggering session ejection dialogue:', reasonMessage);

  // 1. Dispatch global event so active training/recording views immediately stop media devices
  window.dispatchEvent(new Event('bigkas_session_ejected'));

  // 2. Trigger global modal dialogue overlay in AuthContext
  const messageText = reasonMessage || 'Another device or browser tab has logged into this account. Only one active account session is allowed at a time.';
  window.dispatchEvent(
    new CustomEvent('bigkas_trigger_ejection_modal', {
      detail: { reason: messageText },
    })
  );
}

export function resetSessionEjectionFlag() {
  isEjectionModalTriggered = false;
}

/**
 * Clears all local session tokens, sessionStorage claim keys, and resets ejection flags.
 * Used during logout, login attempts, and session ejection cleanup.
 */
export function clearInstanceClaimKeys() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && (key.startsWith('bigkas_instance_claimed_') || key === INSTANCE_TOKEN_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    window.localStorage.removeItem('bigkas_session_token');
  } catch (e) { /* ignore */ }
  activeInstanceToken = null;
  if (typeof window !== 'undefined') window.__bigkasInstanceToken = null;
  isEjectionModalTriggered = false;
}

/**
 * Called when the user clicks "OKay" on the Session Ejected dialog overlay.
 * Clears local session tokens, signs out locally, and redirects to /login.
 */
export async function finalizeSessionEjection(supabaseClient) {
  if (typeof window === 'undefined') return;

  clearInstanceClaimKeys();

  if (supabaseClient && typeof supabaseClient.auth?.signOut === 'function') {
    try {
      await supabaseClient.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[SessionIntegrity] SignOut error:', e);
    }
  }

  window.location.href = '/login';
}

/**
 * Returns a stable, deterministic device fingerprint for the current client device.
 * Persisted in localStorage so the same browser profile always returns the same value.
 * Different browser profiles (e.g. normal vs incognito) produce different fingerprints
 * because they have separate localStorage scopes.
 */
export function getDeviceFingerprint() {
  if (typeof window === 'undefined') return 'server-device';
  try {
    // Check localStorage for a previously persisted fingerprint
    const cached = window.localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (cached) return cached;

    const nav = window.navigator || {};
    const screen = window.screen || {};
    const components = [
      nav.platform || 'unknown-platform',
      `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}`,
      Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown-tz',
      nav.hardwareConcurrency || 2,
      nav.deviceMemory || 4,
      nav.maxTouchPoints || 0,
      // Add userAgent to differentiate Brave vs Edge vs Chrome
      (nav.userAgent || '').substring(0, 80),
    ];
    // Simple fast hash
    const rawString = components.join('|');
    let hash = 0;
    for (let i = 0; i < rawString.length; i += 1) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const fingerprint = `dev_${Math.abs(hash).toString(36)}`;
    window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  } catch (e) {
    return 'dev_default';
  }
}

/**
 * CORE SESSION CLAIMING FUNCTION
 * Writes this tab's session token + device fingerprint directly to the profiles table.
 * This is a standalone function that doesn't depend on loadSessionProfile or any cached data.
 * If the column doesn't exist yet (migration not applied), it logs a warning but doesn't crash.
 *
 * @returns {{ success: boolean, error?: string }}
 */
export async function forceClaimSession(supabaseClient, userId) {
  if (!supabaseClient || !userId) return { success: false, error: 'Missing client or userId' };
  if (typeof window === 'undefined') return { success: false, error: 'SSR context' };

  const myToken = getOrGenerateInstanceToken();
  const myFingerprint = getDeviceFingerprint();
  const claimedKey = `bigkas_instance_claimed_${userId}`;

  try {
    let updateSuccess = false;

    // Try direct update first
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({ active_session_token: myToken, active_device_fingerprint: myFingerprint })
        .eq('id', userId)
        .select('id');

      if (!error && Array.isArray(data) && data.length > 0) {
        updateSuccess = true;
      } else if (error) {
        console.warn('[SessionIntegrity] forceClaimSession direct DB error:', error.message, '(code:', error.code, ')');
      }
    } catch (e) {
      console.warn('[SessionIntegrity] Direct update failed, trying Edge Function fallback...', e);
    }

    // Fallback to Edge Function if direct update did not succeed
    if (!updateSuccess) {
      console.log('[SessionIntegrity] Direct profile update was filtered by RLS or failed. Falling back to sync-user-profile edge function.');
      
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data: edgeData, error: edgeError } = await supabaseClient.functions.invoke('sync-user-profile', {
        body: {
          profile_updates: {
            active_session_token: myToken,
            active_device_fingerprint: myFingerprint,
          }
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (edgeError || edgeData?.error) {
        const errMsg = edgeError?.message || edgeData?.error || 'Edge function sync failed';
        console.warn('[SessionIntegrity] forceClaimSession edge function fallback error:', errMsg);
        return { success: false, error: errMsg };
      }
    }

    // Mark as claimed in sessionStorage
    window.sessionStorage.setItem(claimedKey, '1');
    window.__bigkasClaimTimestamp = Date.now();

    // Broadcast to same-browser tabs
    broadcastSessionClaimed(userId, myToken);

    console.log('[SessionIntegrity] Session claimed successfully for user:', userId, 'token:', myToken.substring(0, 8) + '...');
    return { success: true };
  } catch (e) {
    console.warn('[SessionIntegrity] forceClaimSession exception:', e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
}

/**
 * Checks if the system setting allowing parallel multi-account sessions on the same device is enabled.
 * Defaults to true if setting is not set or cannot be read.
 */
export async function checkSystemParallelAccountPolicy(supabaseClient) {
  if (!supabaseClient) return true;
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'multi_account_parallel_sessions')
      .maybeSingle();
    if (error || !data) return true;
    return data.value?.enabled !== false;
  } catch (e) {
    return true;
  }
}

/**
 * Updates the global system setting allowing or disallowing parallel multi-account sessions on the same device.
 */
export async function setSystemParallelAccountPolicy(supabaseClient, enabled) {
  if (!supabaseClient) return { success: false, error: 'No Supabase client' };
  try {
    const { error } = await supabaseClient
      .from('system_settings')
      .upsert({
        key: 'multi_account_parallel_sessions',
        value: { enabled: Boolean(enabled) },
        updated_at: new Date().toISOString(),
      });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Update failed' };
  }
}

/**
 * Checks if Maintenance Mode is enabled (`key = 'maintenance_mode'`).
 * Defaults to false if setting is not set or cannot be read.
 */
export async function checkSystemMaintenanceMode(supabaseClient) {
  if (!supabaseClient) return false;
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    if (error || !data) return false;
    return data.value?.enabled === true;
  } catch (e) {
    return false;
  }
}

/**
 * Updates the global system setting for Maintenance Mode (`key = 'maintenance_mode'`).
 */
export async function setSystemMaintenanceMode(supabaseClient, enabled) {
  if (!supabaseClient) return { success: false, error: 'No Supabase client' };
  try {
    const { error } = await supabaseClient
      .from('system_settings')
      .upsert({
        key: 'maintenance_mode',
        value: { enabled: Boolean(enabled) },
        updated_at: new Date().toISOString(),
      });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Update failed' };
  }
}
