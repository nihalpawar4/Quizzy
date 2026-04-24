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

// Also handle raw push events (fallback for when FCM doesn't trigger onBackgroundMessage)
self.addEventListener('push', (event) => {
    console.log('[Quizy SW] Push event received:', event);
    
    // If the push event has data, try to parse and show notification
    if (event.data) {
        let data;
        try {
            data = event.data.json();
        } catch (e) {
            // If it's not JSON, treat as text
            data = { notification: { title: 'Quizy', body: event.data.text() } };
        }

        // Only show notification if onBackgroundMessage didn't handle it
        // Check if this is a data-only message that FCM SDK didn't process
        if (data.data && !data.notification) {
            const notifData = data.data;
            const notificationTitle = notifData.title || '📚 Quizy';
            const notificationBody = notifData.body || 'New notification';

            event.waitUntil(
                self.registration.showNotification(notificationTitle, {
                    body: notificationBody,
                    icon: notifData.icon || '/icons/icon-192x192.png',
                    badge: notifData.badge || '/icons/icon-72x72.png',
                    vibrate: [200, 100, 200, 100, 200],
                    data: {
                        type: notifData.type || 'general',
                        url: notifData.url || '/dashboard',
                        tag: notifData.tag || 'quizy-notification',
                    },
                    tag: notifData.tag || 'quizy-notification',
                    renotify: true,
                    requireInteraction: true,
                })
            );
        }
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

    if (data?.type === 'test') {
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
