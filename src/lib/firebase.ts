// Firebase Configuration for Quizy App
// By Nihal Pawar
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    setPersistence,
    type Auth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyBlCfylXmtdVgloa8eECVLINdsDecQxWoc",
    authDomain: "quizzy-1fde2.firebaseapp.com",
    projectId: "quizzy-1fde2",
    storageBucket: "quizzy-1fde2.firebasestorage.app",
    messagingSenderId: "964585344236",
    appId: "1:964585344236:web:6374ab94c720cde4d569c9"
};

// Initialize Firebase (prevent multiple instances in development)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth: Auth = getAuth(app);

// Set persistence to IndexedDB for PWA (better than localStorage)
// This runs on client side only and ensures session persists across app restarts
if (typeof window !== 'undefined') {
    // Try IndexedDB first, fallback to localStorage
    setPersistence(auth, indexedDBLocalPersistence)
        .catch(() => {
            // Fallback to localStorage if IndexedDB fails
            return setPersistence(auth, browserLocalPersistence);
        })
        .catch((error) => {
            console.error('[Quizy Auth] Failed to set persistence:', error);
        });
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account' // Always show account selector
});

// Firebase Cloud Messaging for Push Notifications
let messaging: Messaging | null = null;

// Initialize FCM only in browser and if supported
const initializeMessaging = async (): Promise<Messaging | null> => {
    if (typeof window === 'undefined') return null;

    try {
        const supported = await isSupported();
        if (supported) {
            messaging = getMessaging(app);
            console.log('[Quizy FCM] Messaging initialized');
            return messaging;
        }
    } catch (error) {
        console.warn('[Quizy FCM] Messaging not supported:', error);
    }
    return null;
};

// Request notification permission and get FCM token
const requestNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Quizy FCM] Notification permission denied');
            return null;
        }

        const fcm = await initializeMessaging();
        if (!fcm) return null;

        // Get FCM token - you'll need to add your VAPID key from Firebase Console
        const token = await getToken(fcm, {
            vapidKey: 'YOUR_VAPID_KEY_HERE' // TODO: Replace with actual VAPID key from Firebase Console
        });

        console.log('[Quizy FCM] Token obtained:', token?.substring(0, 20) + '...');
        return token;
    } catch (error) {
        console.error('[Quizy FCM] Error getting token:', error);
        return null;
    }
};

// Listen for foreground messages
const onForegroundMessage = (callback: (payload: unknown) => void) => {
    if (!messaging) {
        initializeMessaging().then((fcm) => {
            if (fcm) {
                onMessage(fcm, callback);
            }
        });
    } else {
        onMessage(messaging, callback);
    }
};

export {
    app,
    auth,
    db,
    googleProvider,
    initializeMessaging,
    requestNotificationPermission,
    onForegroundMessage
};


