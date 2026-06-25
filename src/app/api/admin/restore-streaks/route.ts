/**
 * Admin API: Restore Student Streaks
 * POST /api/admin/restore-streaks
 * 
 * One-time fix: Restores streaks for all students that were broken
 * because there was no daily challenge or weekly test on Sunday June 21, 2026.
 * 
 * Sets lastStreakDate to yesterday so that when students complete today's quiz,
 * their streak continues seamlessly.
 * 
 * Protected by a simple admin secret in the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Lazy-init Firebase Admin
function getAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
        } catch (e) {
            console.error('[RestoreStreaks] Failed to parse service account:', e);
        }
    }

    return admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

/**
 * Get yesterday's date in YYYY-MM-DD (IST).
 */
function getYesterdayIST(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset - 24 * 60 * 60 * 1000);
    return istDate.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Simple admin protection — require the admin secret
        const adminSecret = process.env.ADMIN_SECRET || 'quizy-admin-restore-2026';
        if (body.secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const app = getAdmin();
        const db = admin.firestore(app);
        const yesterday = getYesterdayIST();

        // Query all students
        const usersSnap = await db
            .collection('users')
            .where('role', '==', 'student')
            .get();

        let restoredCount = 0;
        let skippedCount = 0;
        let alreadyActiveCount = 0;
        const restored: { name: string; oldStreak: number; restoredStreak: number; oldDate: string }[] = [];

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const currentStreak = (data.currentStreak as number) || 0;
            const longestStreak = (data.longestStreak as number) || 0;
            const lastStreakDate = (data.lastStreakDate as string) || '';
            const name = (data.name as string) || 'Unknown';

            // Skip students with no streak history at all
            if (!lastStreakDate && currentStreak === 0) {
                skippedCount++;
                continue;
            }

            // Skip students whose streak is already active (lastStreakDate is yesterday or today)
            const today = new Date().toISOString().split('T')[0];
            if (lastStreakDate === yesterday || lastStreakDate === today) {
                alreadyActiveCount++;
                continue;
            }

            // This student's streak was broken — restore it
            // Use longestStreak as the restored value (best estimate of their streak before it broke)
            const restoredStreak = Math.max(currentStreak, longestStreak, 1);

            batch.update(doc.ref, {
                currentStreak: restoredStreak,
                lastStreakDate: yesterday,
            });

            restored.push({
                name,
                oldStreak: currentStreak,
                restoredStreak,
                oldDate: lastStreakDate,
            });

            restoredCount++;
            batchCount++;

            // Firestore batch limit is 500
            if (batchCount >= 450) {
                await batch.commit();
                batchCount = 0;
            }
        }

        // Commit remaining
        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalStudents: usersSnap.size,
                restored: restoredCount,
                skipped: skippedCount,
                alreadyActive: alreadyActiveCount,
                yesterdayDate: yesterday,
            },
            restoredStudents: restored,
        });
    } catch (err) {
        console.error('[RestoreStreaks] Error:', err);
        return NextResponse.json(
            { error: 'Internal server error', details: String(err) },
            { status: 500 }
        );
    }
}
