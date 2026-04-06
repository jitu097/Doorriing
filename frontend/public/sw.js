// Self-Unregistering Service Worker
// This SW unregisters itself to prevent caching issues
// The app uses VITE_SW_DISABLED=true to prevent registration

console.log('[SW] Service worker loaded - UNREGISTERING for stability');

// Unregister self immediately
self.registration.unregister().then(() => {
  console.log('[SW] Successfully unregistered');
}).catch((err) => {
  console.warn('[SW] Failed to unregister:', err);
});

// Clean up all caches during install to prevent stale cache serving
self.addEventListener('install', (event) => {
  console.log('[SW] Install event - clearing all caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] All caches cleared');
      return self.registration.unregister();
    })
  );
});

// Clean up on activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event - unregistering');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

