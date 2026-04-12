// Stage 5: Enhanced Service Worker with Caching Strategy

const CACHE_VERSION = 'bazarse-v5';
const RUNTIME_CACHE = 'bazarse-runtime-v5';
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

try {
  importScripts('/firebase-messaging-sw.js');
} catch (error) {
  console.warn('[SW] Firebase messaging worker not loaded:', error);
}

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

// Fetch event: Network-first strategy with cache fallback
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
  
  const url = new URL(request.url);
  
  // Strategy 1: Cache-first for static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          // Cache successful responses (must clone before consuming)
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            }).catch((err) => {
              console.warn('[SW] Cache write failed:', err);
            });
          }
          return response;
        }).catch(() => {
          // Fallback for offline
          return caches.match(request) || new Response('Offline', { status: 503 });
        });
      })
    );
  } 
  // Strategy 2: Network-first for API calls and HTML
  else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses (must clone before consuming)
          if (response.status === 200 && 
              (request.destination === 'document' || request.url.includes('/api/'))) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            }).catch((err) => {
              console.warn('[SW] Cache write failed:', err);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response or offline page
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/index.html');
            });
        })
    );
  }
});

// Message event: Handle updates from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
