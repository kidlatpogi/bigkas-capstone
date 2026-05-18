import { StrictMode } from 'react';
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

function clearNativeWebCaches() {
  if (!isNativePlatform || typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      })
      .catch(() => {});
  }

  if ('caches' in window) {
    caches.keys()
      .then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).catch(() => {});
        });
      })
      .catch(() => {});
  }
}

clearNativeWebCaches();

/**
 * Bigkas Web Application
 * A pronunciation practice app
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Register Service Worker for asset caching
if (!isNativePlatform && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
      registration.update().catch(() => {});
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
