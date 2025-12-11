// Firebase Messaging Service Worker for Quizy PWA
// By Nihal Pawar
// Handles background push notifications

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
messaging.onBackgroundMessage((payload) => {
    console.log('[Quizy SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Quizy Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: payload.data,
        actions: [
            { action: 'open', title: 'Open Quizy' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        tag: payload.data?.tag || 'quizy-notification',
        renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Quizy SW] Notification clicked:', event);
    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    if (action === 'dismiss') {
        return;
    }

    // Open the app when notification is clicked
    let targetUrl = '/dashboard';

    // Custom URL based on notification type
    if (data?.type === 'test') {
        targetUrl = `/test/${data.testId}`;
    } else if (data?.type === 'report') {
        targetUrl = '/dashboard/student';
    } else if (data?.type === 'note') {
        targetUrl = '/dashboard/student';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (const client of clientList) {
                if (client.url.includes('quizy') && 'focus' in client) {
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
