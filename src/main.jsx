import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import AppRouter from './routes/AppRouter';

// Styles
import './styles/globals.css';
import './styles/dashboard-overlay-close-btn.css';
import './styles/mobileViewport.css';
import './index.css';
import './styles/bigkas-bottom-sheet-motion.css';

const isNativePlatform = Capacitor.isNativePlatform();

if (typeof String.prototype.replaceAll !== 'function') {
  String.prototype.replaceAll = function replaceAll(searchValue, replaceValue) {
    const source = String(this);
    if (searchValue instanceof RegExp) {
      if (!searchValue.global) {
        throw new TypeError('String.prototype.replaceAll called with a non-global RegExp argument');
      }
      return source.replace(searchValue, replaceValue);
    }
    return source.split(String(searchValue)).join(String(replaceValue));
  };
}

if (typeof window !== 'undefined') {
  if (!window.crypto) {
    try {
      window.crypto = {};
    } catch {
      /* ignore */
    }
  }
  if (window.crypto && typeof window.crypto.randomUUID !== 'function') {
    try {
      window.crypto.randomUUID = function randomUUID() {
        if (typeof window.crypto.getRandomValues === 'function') {
          try {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
              (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
            );
          } catch {
            /* ignore */
          }
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
    } catch {
      /* ignore */
    }
  }
}

function clearNativeWebCaches() {
  if (!isNativePlatform || typeof window === 'undefined') return;
  clearClientCaches();
}

function clearClientCaches() {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {});
          });
        })
        .catch(() => {});
    }
  } catch {
  }

  try {
    if ('caches' in window && typeof caches.keys === 'function') {
      caches.keys()
        .then((keys) => {
          keys.forEach((key) => {
            caches.delete(key).catch(() => {});
          });
        })
        .catch(() => {});
    }
  } catch {
  }
}

function recoverFromStaleBuildAsset(errorMessage) {
  const message = String(errorMessage || '');
  const isStaleAssetError =
    message.includes('Unable to preload CSS') ||
    message.includes('Failed to fetch dynamically imported module');

  if (!isStaleAssetError || typeof window === 'undefined') return;

  const recoveryKey = 'bigkas_stale_asset_recovery';
  const lastRecovery = Number(window.sessionStorage.getItem(recoveryKey) || 0);
  if (Date.now() - lastRecovery < 10000) return;

  window.sessionStorage.setItem(recoveryKey, String(Date.now()));
  clearClientCaches();
  window.setTimeout(() => window.location.reload(), 300);
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('[TalkTics] App render failed', error);
    recoverFromStaleBuildAsset(error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = String(this.state.error?.message || this.state.error || 'Unknown rendering error');
      return (
        <div className="loading-screen" role="alert">
          <div className="loading-logo">
            <img src="/images/bigkas-logo-72.webp" alt="TalkTics" className="loading-logo-image" />
            <span>TalkTics</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: '44px',
              padding: '0 22px',
              borderRadius: '999px',
              background: '#047857',
              color: '#fff',
              fontWeight: 800,
              boxShadow: '0 5px 0 #065f46',
            }}
          >
            Reload App
          </button>
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              borderRadius: '12px',
              fontSize: '13px',
              maxWidth: '90%',
              textAlign: 'left',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}
          >
            <strong>Error Details:</strong>
            <div style={{ marginTop: '4px' }}>{errorMessage}</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    recoverFromStaleBuildAsset(event.message || event.error?.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    recoverFromStaleBuildAsset(event.reason?.message || event.reason);
  });
}

clearNativeWebCaches();

/**
 * Bigkas Web Application
 * A pronunciation practice app
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SessionProvider>
            <AppRouter />
          </SessionProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);

// Register Service Worker for asset caching (only on production & secure origins)
const isSecureOrigin =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

if (import.meta.env.PROD && !isNativePlatform && isSecureOrigin && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(() => {});
  });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Clear any existing Service Workers in dev mode to avoid stale iPhone caches
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister().catch(() => {}));
  }).catch(() => {});
}
