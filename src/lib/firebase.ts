// Firebase Configuration for Quizy App
// By Nihal Pawar
// ROBUST SESSION PERSISTENCE FIX - Initialize auth WITH persistence

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
    GoogleAuthProvider,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserPopupRedirectResolver,
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

// ============================================
// CRITICAL: Initialize Auth WITH persistence
// ============================================
// On client side, use initializeAuth with persistence settings
// On server side or if already initialized, use getAuth
let auth: Auth;

if (typeof window !== 'undefined') {
    try {
        // Initialize with IndexedDB persistence (survives browser close)
        // Falls back to localStorage if IndexedDB is not available
        // NOTE: popupRedirectResolver is REQUIRED for signInWithPopup to work
        auth = initializeAuth(app, {
            persistence: [indexedDBLocalPersistence, browserLocalPersistence],
            popupRedirectResolver: browserPopupRedirectResolver
        });
        console.log('[Quizy Auth] ✅ Auth initialized with IndexedDB + localStorage persistence');
    } catch (error) {
        // If already initialized (hot reload), just get the existing instance
        auth = getAuth(app);
        console.log('[Quizy Auth] Using existing auth instance');
    }
} else {
    auth = getAuth(app);
}


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

// Initialize persistence on client side - NOW HANDLED BY initializeAuth
// This is kept for backwards compatibility with code that calls ensurePersistence
let persistenceReady = false;

/**
 * Ensure persistence is ready.
 * Since we now use initializeAuth with persistence, this just confirms it's done.
 */
const ensurePersistence = (): Promise<void> => {
    // Persistence is already set via initializeAuth, so just resolve immediately
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }

    // Mark as ready and resolve
    persistenceReady = true;
    console.log('[Quizy Auth] Persistence confirmed ready');
    return Promise.resolve();
};

// Legacy function for backwards compatibility
const initializePersistence = ensurePersistence;


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




