const INSTANCE_TOKEN_KEY = 'bigkas_instance_token_v2';
const SESSION_BROADCAST_KEY = 'bigkas_session_channel_v2';
const INSTANCE_PING_CHANNEL = 'bigkas_instance_ping_v2';

let activeInstanceToken = null;
let broadcastChannel = null;
let pingChannel = null;

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
 * Executes immediate session ejection (Clash of Clans style).
 * Dispatches event to abort active media streams, clears local state, and signs out.
 */
export async function handleSessionEjection(reasonMessage, supabase) {
  if (typeof window === 'undefined') return;

  console.warn('[SessionIntegrity] Ejecting session:', reasonMessage);

  // 1. Dispatch global event so active training/recording views immediately stop media devices
  window.dispatchEvent(new Event('bigkas_session_ejected'));

  // 2. Clear tokens
  try {
    window.sessionStorage.removeItem(INSTANCE_TOKEN_KEY);
    window.localStorage.removeItem('bigkas_session_token');
  } catch (e) {
    // ignore
  }

  activeInstanceToken = null;

  // 3. Show prompt to the user
  const alertText = reasonMessage || 'Logged Out: Another device or browser tab has logged into this account. Disconnecting...';
  alert(alertText);

  // 4. Sign out locally without destroying remote token of the new active session
  if (supabase && typeof supabase.auth?.signOut === 'function') {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[SessionIntegrity] SignOut error:', e);
    }
  }

  // 5. Redirect to login
  window.location.href = '/login';
}
