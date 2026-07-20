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

  if (activeInstanceToken) return activeInstanceToken;

  let storedToken = window.sessionStorage.getItem(INSTANCE_TOKEN_KEY);

  // Initialize ping channel to detect if another open tab already has this exact token (e.g. Chrome Duplicate Tab)
  if (!pingChannel && typeof BroadcastChannel !== 'undefined') {
    try {
      pingChannel = new BroadcastChannel(INSTANCE_PING_CHANNEL);
      pingChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        // If another tab asks who has this token, and we are active with it, reply that we own it
        if (data.type === 'PING_TOKEN' && data.token === activeInstanceToken && data.tabId !== window.__bigkasTabId) {
          pingChannel.postMessage({ type: 'TOKEN_OWNED', token: activeInstanceToken, tabId: window.__bigkasTabId });
        }
        // If we just asked and another existing tab already owns our token, generate a brand new token!
        else if (data.type === 'TOKEN_OWNED' && data.token === storedToken && data.tabId !== window.__bigkasTabId) {
          console.warn('[SessionIntegrity] Duplicate tab collision detected! Generating fresh instance token.');
          storedToken = crypto.randomUUID();
          window.sessionStorage.setItem(INSTANCE_TOKEN_KEY, storedToken);
          activeInstanceToken = storedToken;
        }
      };
    } catch (e) {
      console.warn('[SessionIntegrity] BroadcastChannel not supported:', e);
    }
  }

  if (!window.__bigkasTabId) {
    window.__bigkasTabId = crypto.randomUUID();
  }

  if (!storedToken) {
    storedToken = crypto.randomUUID();
    window.sessionStorage.setItem(INSTANCE_TOKEN_KEY, storedToken);
  } else if (pingChannel) {
    // Ping all tabs to verify no one else is currently using this storedToken (e.g., duplicated tab)
    pingChannel.postMessage({ type: 'PING_TOKEN', token: storedToken, tabId: window.__bigkasTabId });
  }

  activeInstanceToken = storedToken;
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
