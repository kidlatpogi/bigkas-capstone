const CACHE_NAME = 'bigkas-assets-v3';
const CACHE_PREFIX = 'bigkas-assets-';
const ASSET_DOMAIN = 'assets.bigkas.site';

// Assets to cache immediately if needed (optional)
const PRECACHE_ASSETS = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Cache API only supports GET requests — skip everything else immediately.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache the SPA shell. It contains hashed JS/CSS filenames that must
  // refresh on deploy so OAuth redirects cannot revive missing old chunks.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    return;
  }

  // Do not intercept hashed app chunks. A stale JS chunk can reference a CSS
  // file that no longer exists after deploy, which causes a blank SPA.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    return;
  }

  // Strategy: Cache First for assets from assets.bigkas.site
  if (url.hostname === ASSET_DOMAIN || url.pathname.match(/\.(webp|mp3|webm|mp4|png|jpg|svg|json)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          // Only cache valid same-origin or CORS responses.
          const contentType = response?.headers?.get('content-type') || '';
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors') || contentType.includes('text/html')) {
            return response;
          }

          // Clone before consuming — the cache and browser each need their own stream.
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // Default: let all other requests (API calls, auth, etc.) pass through to the network.
});
