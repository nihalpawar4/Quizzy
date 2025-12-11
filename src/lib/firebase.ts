// Firebase Configuration for Quizy App
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account' // Always show account selector
});

const firebaseConfig = {
    apiKey: "AIzaSyBlCfylXmtdVgloa8eECVLINdsDecQxWoc",
    authDomain: "quizzy-1fde2.firebaseapp.com",
    projectId: "quizzy-1fde2",
    storageBucket: "quizzy-1fde2.firebasestorage.app",
    messagingSenderId: "964585344236",
    appId: "1:964585344236:web:6374ab94c720cde4d569c9"
};

// Initialize Firebase (prevent multiple instances in development)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to LOCAL for PWA - keeps users signed in even after closing app
// This ensures the auth state is saved in localStorage/IndexedDB
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('[Quizy] Failed to set auth persistence:', error);
});

export { app, auth, db, googleProvider };

