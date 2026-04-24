/**
 * Firebase Admin SDK initialization (server-side only)
 * Used for sending FCM push notifications
 * By Nihal Pawar
 */

import * as admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Check for service account key in environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            // Parse the service account JSON from env var
            const serviceAccount = JSON.parse(serviceAccountKey);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'quizzy-1fde2',
            });
        } catch (error) {
            console.error('[Quizy Admin] Failed to parse service account key:', error);
        }
    }

    // Fallback: Initialize with project ID only (works on Google Cloud/Vercel with auto-credentials)
    // For local dev, you need to set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY
    try {
        return admin.initializeApp({
            projectId: 'quizzy-1fde2',
        });
    } catch (error) {
        console.error('[Quizy Admin] Failed to initialize Firebase Admin:', error);
        throw error;
    }
}

const adminApp = getFirebaseAdmin();
const adminMessaging = admin.messaging(adminApp);

export { adminApp, adminMessaging };
