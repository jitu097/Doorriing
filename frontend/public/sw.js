// Stage 5: Enhanced Service Worker with Caching Strategy

const CACHE_VERSION = 'bazarse-v5';
const RUNTIME_CACHE = 'bazarse-runtime-v5';
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event: Precache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v5');
  
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
        // Don't fail install if some assets can't be cached
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v5');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName !== CACHE_VERSION && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Simple network-first strategy to avoid stale cache issues
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first: Always try network first, fallback to cache only if offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone).catch((err) => {
              console.warn('[SW] Cache write failed:', err);
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', request.url);
            return cachedResponse;
          }
          // No cache available, return offline response
          return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Message event: Handle updates from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
