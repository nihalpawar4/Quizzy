/**
 * ONE-TIME Admin API: Grant 500 XP to all active student users.
 * 
 * Usage: POST /api/admin/grant-xp
 * 
 * DELETE THIS FILE AFTER USE.
 * By Nihal Pawar
 */

import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize admin if not already
function getAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
        } catch (error) {
            console.error('[Grant XP] Failed to parse service account key:', error);
        }
    }

    return admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

export async function POST() {
    try {
        const app = getAdmin();
        const firestore = admin.firestore(app);

        // Get all student users
        const usersSnapshot = await firestore
            .collection('users')
            .where('role', '==', 'student')
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json({ 
                success: false, 
                message: 'No students found' 
            });
        }

        const XP_TO_GRANT = 500;
        let updatedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Process in batches of 500 (Firestore batch limit)
        const BATCH_SIZE = 500;
        const docs = usersSnapshot.docs;

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = firestore.batch();
            const chunk = docs.slice(i, i + BATCH_SIZE);

            for (const userDoc of chunk) {
                try {
                    const userData = userDoc.data();
                    // Skip restricted users
                    if (userData.isRestricted === true) {
                        continue;
                    }

                    batch.update(userDoc.ref, {
                        xp: admin.firestore.FieldValue.increment(XP_TO_GRANT),
                    });
                    updatedCount++;
                } catch (err) {
                    errorCount++;
                    errors.push(`Failed for user ${userDoc.id}: ${err}`);
                }
            }

            await batch.commit();
        }

        console.log(`[Grant XP] ✅ Granted ${XP_TO_GRANT} XP to ${updatedCount} students.`);

        return NextResponse.json({
            success: true,
            message: `Granted ${XP_TO_GRANT} XP to ${updatedCount} active students.`,
            totalStudents: docs.length,
            updatedCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('[Grant XP] Error:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
