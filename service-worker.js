const CACHE_NAME = 'citavers-v1.3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './assets/logos/favicon.png',
    './assets/logos/icon-192.png',
    './assets/logos/icon-512.png',
    './assets/logos/site.webmanifest'
];

// Install event - cache assets and force waiting SW to become active
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('Service Worker installation failed:', error);
                throw error;
            })
    );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Automatically take control of all clients
    );
});

// Fetch event - Network-First, cache as offline fallback
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (the backend lives on api.citavers.com).
    // Same-origin /api/*.js are the frontend's own API client modules and must
    // stay cacheable for offline use; anything else under /api/ is a server call.
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/') && !url.pathname.endsWith('.js')) return;

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Network-first for everything: a cache-first app shell would keep serving
    // the previous deploy's code. The cache is only an offline fallback.
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
        }).catch(() => caches.match(event.request))
    );
});
