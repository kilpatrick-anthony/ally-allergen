// Service Worker for AllyJen Kiosk
// Enables offline functionality with cache-first strategy

const CACHE_NAME = 'ally-allergen-v1';
const DATA_CACHE_NAME = 'ally-allergen-data-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/kiosk',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      // Cache each asset individually to handle failures gracefully
      return Promise.all(
        STATIC_ASSETS.map((asset) => {
          return cache.add(asset).catch((error) => {
            console.warn(`[Service Worker] Failed to cache ${asset}:`, error);
            // Continue caching other assets even if one fails
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement cache-first strategy for data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy (with offline fallback)
  if (url.pathname.includes('/api/') || url.pathname.includes('/kiosk-data/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          caches.open(DATA_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // If network fails, try to return cached version
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Returning cached data for:', request.url);
              return cachedResponse;
            }
            
            // If no cache, return offline page
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      });
    })
  );
});

// Background sync for periodic data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-menu-data') {
    event.waitUntil(syncMenuData());
  }
});

async function syncMenuData() {
  console.log('[Service Worker] Background sync: Updating menu data');
  try {
    // This would fetch fresh data from your API
    const response = await fetch('/api/kiosk-data');
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put('/api/kiosk-data', response);
      console.log('[Service Worker] Menu data updated successfully');
    }
  } catch (error) {
    console.error('[Service Worker] Failed to sync menu data:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-menu-data') {
    event.waitUntil(syncMenuData());
  }
});
