/**
 * One-time script: Restore Praveena Mishra's streak
 * POST /api/admin/restore-single-streak
 */

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

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
            console.error('[RestoreSingleStreak] Failed to parse service account:', e);
        }
    }
    return admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

function getYesterdayIST(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset - 24 * 60 * 60 * 1000);
    return istDate.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const adminSecret = process.env.ADMIN_SECRET || 'quizy-admin-restore-2026';
        if (body.secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, streak } = body;
        if (!email || !streak) {
            return NextResponse.json({ error: 'email and streak are required' }, { status: 400 });
        }

        const app = getAdmin();
        const db = admin.firestore(app);
        const yesterday = getYesterdayIST();

        // Find user by email
        const usersSnap = await db
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnap.empty) {
            return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
        }

        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();

        const oldData = {
            name: userData.name,
            email: userData.email,
            currentStreak: userData.currentStreak || 0,
            longestStreak: userData.longestStreak || 0,
            lastStreakDate: userData.lastStreakDate || '',
        };

        // Restore streak
        await userDoc.ref.update({
            currentStreak: streak,
            longestStreak: Math.max(streak, userData.longestStreak || 0),
            lastStreakDate: yesterday,
        });

        return NextResponse.json({
            success: true,
            message: `Streak restored for ${userData.name}`,
            before: oldData,
            after: {
                currentStreak: streak,
                longestStreak: Math.max(streak, userData.longestStreak || 0),
                lastStreakDate: yesterday,
            },
        });
    } catch (err) {
        console.error('[RestoreSingleStreak] Error:', err);
        return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
    }
}
