// Quizy Service Worker - By Nihal Pawar
const CACHE_NAME = 'quizy-pwa-v3';
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/auth/login',
    '/auth/register',
    '/offline',
    '/manifest.json',
];

// Install event - cache static assets
// NOTE: We do NOT call self.skipWaiting() here so the new SW
// waits until the user taps "Update Now" in the app UI.
self.addEventListener('install', (event) => {
    console.log('[Quizy SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Quizy SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Quizy SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[Quizy SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;

    // Skip Firebase and external API requests from caching
    if (
        event.request.url.includes('firebaseapp.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firebase.google.com') ||
        event.request.url.includes('firestore.googleapis.com')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseClone = response.clone();

                // Only cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // If network fails, try to serve from cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // If the request is for a page, show offline page
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }

                    return new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable',
                    });
                });
            })
    );
});

// Push notifications are handled by firebase-messaging-sw.js
// Do NOT add push/notificationclick listeners here to avoid conflicts

// Listen for SKIP_WAITING message from the client (sent when user taps "Update Now")
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Quizy SW] Received SKIP_WAITING, activating new version...');
        self.skipWaiting();
    }
});

console.log('[Quizy SW] Service Worker loaded - By Nihal Pawar');
