const INSTANCE_TOKEN_KEY = 'bigkas_instance_token_v2';
const SESSION_BROADCAST_KEY = 'bigkas_session_channel_v2';
const INSTANCE_PING_CHANNEL = 'bigkas_instance_ping_v2';

let activeInstanceToken = null;
let broadcastChannel = null;
let pingChannel = null;
let isEjectionModalTriggered = false;

/**
 * Returns a unique instance token for the current browser tab window.
 * Uses sessionStorage so each tab gets its own unique token.
 * Also includes duplicate-tab collision detection via BroadcastChannel.
 */
export function getOrGenerateInstanceToken() {
  if (typeof window === 'undefined') return 'server-instance';

  if (activeInstanceToken && window.__bigkasInstanceToken === activeInstanceToken) {
    return activeInstanceToken;
  }

  if (!window.__bigkasInstanceToken) {
    window.__bigkasInstanceToken = crypto.randomUUID();
  }

  activeInstanceToken = window.__bigkasInstanceToken;
  try {
    window.sessionStorage.setItem(INSTANCE_TOKEN_KEY, activeInstanceToken);
  } catch (e) {
    // ignore
  }
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
  } catch (e) {
    // ignore storage quota errors
  }
}

/**
 * Triggers session ejection modal dialog (Clash of Clans style).
 * Dispatches event to abort active media streams and open the ConfirmationModal overlay.
 */
export async function handleSessionEjection(reasonMessage, supabase) {
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
  } catch (e) {
    // ignore
  }
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
 * Used when strict single-device multi-account lock is enabled.
 */
export function getDeviceFingerprint() {
  if (typeof window === 'undefined') return 'server-device';
  try {
    const nav = window.navigator || {};
    const screen = window.screen || {};
    const components = [
      nav.platform || 'unknown-platform',
      `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}`,
      Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown-tz',
      nav.hardwareConcurrency || 2,
      nav.deviceMemory || 4,
      nav.maxTouchPoints || 0,
    ];
    // Hash string using simple fast hashing
    const rawString = components.join('|');
    let hash = 0;
    for (let i = 0; i < rawString.length; i += 1) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `dev_${Math.abs(hash).toString(36)}`;
  } catch (e) {
    return 'dev_default';
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


