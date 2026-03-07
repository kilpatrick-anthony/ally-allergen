// lib/serviceWorkerRegistration.ts
// Service Worker registration for offline support

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New content available, reload to update');
                  // Optionally show a notification to the user
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Handle controller change (when a new service worker takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed');
      });
    });
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('✅ Service Worker unregistered');
      })
      .catch((error) => {
        console.error('❌ Service Worker unregistration failed:', error);
      });
  }
}

// Request background sync permission (for periodic updates)
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-menu-data');
      console.log('✅ Background sync registered');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }
}

// Request periodic background sync (if supported)
export async function requestPeriodicSync() {
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const status = await (navigator as any).permissions.query({
        name: 'periodic-background-sync',
      });

      if (status.state === 'granted') {
        await (registration as any).periodicSync.register('update-menu-data', {
          minInterval: 5 * 60 * 1000, // 5 minutes
        });
        console.log('✅ Periodic background sync registered');
      }
    } catch (error) {
      console.error('❌ Periodic background sync failed:', error);
    }
  }
}
