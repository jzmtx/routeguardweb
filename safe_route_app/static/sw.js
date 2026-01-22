const CACHE_NAME = 'routeguard-v1.0.0';
const urlsToCache = [
  '/',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/js/sos_handler.js',
  '/static/js/live_tracker.js',
  '/static/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('RouteGuard: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('RouteGuard: Cache failed', error);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('RouteGuard: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline route requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-route') {
    event.waitUntil(syncRouteData());
  }
});

async function syncRouteData() {
  // Handle offline route calculation sync
  console.log('RouteGuard: Syncing route data');
}

// Push notifications for safety alerts
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Safety alert from RouteGuard',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Route',
        icon: '/static/icons/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/icons/action-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('RouteGuard Safety Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});