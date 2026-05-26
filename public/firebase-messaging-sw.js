// Firebase Messaging Service Worker for Quizy PWA
// By Nihal Pawar
// Handles BACKGROUND push notifications (even when app is closed)
// Works like Swiggy/Zomato push notifications on mobile

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBlCfylXmtdVgloa8eECVLINdsDecQxWoc",
    authDomain: "quizzy-1fde2.firebaseapp.com",
    projectId: "quizzy-1fde2",
    storageBucket: "quizzy-1fde2.firebasestorage.app",
    messagingSenderId: "964585344236",
    appId: "1:964585344236:web:6374ab94c720cde4d569c9"
};

// Initialize Firebase in Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
// This fires for DATA-ONLY messages sent from our server
messaging.onBackgroundMessage((payload) => {
    console.log('[Quizy SW] Background message received:', payload);

    // Extract data from payload (we use data-only messages for full control)
    const data = payload.data || {};
    const notificationTitle = data.title || payload.notification?.title || '📚 Quizy Notification';
    const notificationBody = data.body || payload.notification?.body || 'You have a new notification';

    const notificationOptions = {
        body: notificationBody,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        vibrate: [200, 100, 200, 100, 200], // Strong vibration pattern
        data: {
            type: data.type || 'general',
            url: data.url || '/dashboard',
            tag: data.tag || 'quizy-notification',
            timestamp: data.timestamp || Date.now().toString(),
        },
        actions: [
            { action: 'open', title: '📖 Open' },
            { action: 'dismiss', title: '✕ Dismiss' }
        ],
        tag: data.tag || 'quizy-notification',
        renotify: true,
        requireInteraction: true, // Keep notification visible until user interacts
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Also handle raw push events (fallback for edge cases)
self.addEventListener('push', (event) => {
    console.log('[Quizy SW] Push event received');
    
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        // If not JSON, show as plain text
        event.waitUntil(
            self.registration.showNotification('📚 Quizy', {
                body: event.data.text(),
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
            })
        );
        return;
    }

    // If the message has a `notification` key, the browser will auto-display it.
    // We only need to manually show for data-only messages (no notification key).
    if (payload.notification) {
        // Browser handles this natively — do nothing
        return;
    }

    // Data-only message — manually show notification
    if (payload.data) {
        const d = payload.data;
        event.waitUntil(
            self.registration.showNotification(d.title || '📚 Quizy', {
                body: d.body || 'New notification',
                icon: d.icon || '/icons/icon-192x192.png',
                badge: d.badge || '/icons/icon-72x72.png',
                vibrate: [200, 100, 200],
                data: {
                    type: d.type || 'general',
                    url: d.url || '/dashboard',
                    tag: d.tag || 'quizy-notification',
                },
                tag: d.tag || 'quizy-notification',
                renotify: true,
            })
        );
    }
});

// Handle notification click - open the app to the right page
self.addEventListener('notificationclick', (event) => {
    console.log('[Quizy SW] Notification clicked:', event);
    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    // If user clicked dismiss, do nothing
    if (action === 'dismiss') {
        return;
    }

    // Determine target URL based on notification type
    let targetUrl = '/dashboard';

    if (data?.type === 'chat_message') {
        targetUrl = '/chat';
    } else if (data?.type === 'test') {
        targetUrl = `/test/${data.testId}`;
    } else if (data?.type === 'report') {
        targetUrl = '/dashboard/student';
    } else if (data?.type === 'note') {
        targetUrl = '/dashboard/student';
    } else if (data?.type === 'homework') {
        targetUrl = '/dashboard/student/homework';
    } else if (data?.url) {
        targetUrl = data.url;
    }

    // Try to focus existing window, or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Open new window if app is not open
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

console.log('[Quizy SW] Firebase Messaging Service Worker loaded - By Nihal Pawar');
