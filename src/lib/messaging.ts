/**
 * Firebase Cloud Messaging Helper
 * Handles FCM token management and storage
 * By Nihal Pawar
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db, requestNotificationPermission } from './firebase';
import { COLLECTIONS } from './constants';

/**
 * Request notification permission and store FCM token in user's Firestore document
 */
export async function requestAndStoreFCMToken(userId: string): Promise<string | null> {
    try {
        const token = await requestNotificationPermission();
        
        if (token) {
            // Store the FCM token in the user's document
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            await updateDoc(userRef, { fcmToken: token });
            console.log('[Quizy Messaging] FCM token stored for user:', userId);
            return token;
        }
        
        return null;
    } catch (error) {
        console.error('[Quizy Messaging] Error requesting/storing FCM token:', error);
        return null;
    }
}

/**
 * Clear FCM token from user's document (on logout)
 */
export async function clearFCMToken(userId: string): Promise<void> {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, { fcmToken: '' });
        console.log('[Quizy Messaging] FCM token cleared for user:', userId);
    } catch (error) {
        console.error('[Quizy Messaging] Error clearing FCM token:', error);
    }
}
