// Firebase Configuration for Quizy App
// By Nihal Pawar
// HARD SESSION PERSISTENCE FIX

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    setPersistence,
    onAuthStateChanged,
    type Auth,
    type User as FirebaseUser
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

// Your VAPID key for push notifications
const VAPID_KEY = 'BM-cIeTyjU-BeDpKVAMjzkOcYvuuMZ9n0i9ZL6f68JXhBU3mTh9gycXiETzC0IK3_SwkZKAmw5W7-q-2SFuijUM';

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

// ============================================
// HARD SESSION PERSISTENCE - MULTI-LAYER FIX
// ============================================

// Session storage key for backup
const SESSION_KEY = 'quizy-auth-session';

// Store session info in localStorage as backup
const saveSessionBackup = (user: FirebaseUser | null) => {
    if (typeof window === 'undefined') return;

    try {
        if (user) {
            const sessionData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                timestamp: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            // Also store in sessionStorage for extra redundancy
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            console.log('[Quizy Auth] Session backup saved');
        }
    } catch (e) {
        console.warn('[Quizy Auth] Failed to save session backup:', e);
    }
};

// Get stored session info
const getSessionBackup = () => {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Check if session is less than 30 days old
            if (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
                return data;
            }
        }
    } catch (e) {
        console.warn('[Quizy Auth] Failed to get session backup:', e);
    }
    return null;
};

// Clear session backup on logout
const clearSessionBackup = () => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        console.log('[Quizy Auth] Session backup cleared');
    } catch (e) {
        console.warn('[Quizy Auth] Failed to clear session backup:', e);
    }
};

// Initialize persistence on client side - PROMISE-BASED for proper awaiting
let persistencePromise: Promise<void> | null = null;

/**
 * Initialize Firebase Auth persistence.
 * Returns a promise that resolves when persistence is configured.
 * This MUST complete before any auth operations to ensure sessions persist.
 */
const initializePersistence = (): Promise<void> => {
    // Return existing promise if already initializing/initialized
    if (persistencePromise) {
        return persistencePromise;
    }

    // On server-side, resolve immediately
    if (typeof window === 'undefined') {
        persistencePromise = Promise.resolve();
        return persistencePromise;
    }

    persistencePromise = (async () => {
        try {
            // Try IndexedDB first (most persistent, survives browser close)
            await setPersistence(auth, indexedDBLocalPersistence);
            console.log('[Quizy Auth] ✅ IndexedDB persistence enabled');
        } catch (indexedDBError) {
            console.warn('[Quizy Auth] IndexedDB failed, trying localStorage:', indexedDBError);
            try {
                // Fall back to localStorage (also persistent across browser close)
                await setPersistence(auth, browserLocalPersistence);
                console.log('[Quizy Auth] ✅ localStorage persistence enabled');
            } catch (localStorageError) {
                console.error('[Quizy Auth] ❌ All persistence methods failed:', localStorageError);
                // Auth will still work but sessions won't persist
            }
        }
    })();

    return persistencePromise;
};

/**
 * Ensure persistence is initialized before any auth operation.
 * MUST be awaited before signIn, signUp, signInWithPopup, etc.
 */
const ensurePersistence = (): Promise<void> => {
    return initializePersistence();
};

// Auto-initialize persistence on client-side load
if (typeof window !== 'undefined') {
    // Start initialization immediately (but auth operations should still await ensurePersistence)
    initializePersistence();

    // Listen to auth state changes to save backup
    onAuthStateChanged(auth, (user) => {
        saveSessionBackup(user);
    });
}


// Initialize Firestore
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// ============================================
// FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)
// ============================================

let messaging: Messaging | null = null;

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

        // Get FCM token with your VAPID key
        const token = await getToken(fcm, { vapidKey: VAPID_KEY });

        console.log('[Quizy FCM] Token obtained:', token?.substring(0, 20) + '...');
        return token;
    } catch (error) {
        console.error('[Quizy FCM] Error getting token:', error);
        return null;
    }
};

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
    onForegroundMessage,
    // Session management exports
    saveSessionBackup,
    getSessionBackup,
    clearSessionBackup,
    initializePersistence,
    ensurePersistence,
    VAPID_KEY
};




