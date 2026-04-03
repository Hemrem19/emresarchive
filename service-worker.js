const CACHE_NAME = 'citavers-v1.2';
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

// Fetch event - Network-First for dynamic, Cache-First for static
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests and API requests
    if (!event.request.url.startsWith(self.location.origin) || event.request.url.includes('/api/')) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const isStaticAsset = ASSETS_TO_CACHE.some(asset => {
        const normalizedAsset = asset.replace('./', '/');
        if (normalizedAsset === '/') return url.pathname === '/';
        return url.pathname === normalizedAsset || url.pathname.endsWith(normalizedAsset);
    });

    if (isStaticAsset) {
        // Cache-First strategy for static assets
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                    }
                    return networkResponse;
                });
            })
        );
    } else {
        // Network-First strategy for dynamic requests (e.g. templates, plugins)
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => {
                // If offline, fallback to the cache
                return caches.match(event.request);
            })
        );
    }
});
