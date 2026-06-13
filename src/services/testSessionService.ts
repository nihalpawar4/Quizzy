/**
 * Test Session Service — Anti-Cheat Protection
 * 
 * Manages persistent Firestore-backed test sessions that survive
 * page refreshes, app closures, and reconnects.
 * 
 * For Tests: Prevents restart; resumes from exact question on reload.
 * For Daily Challenges: Locks out failed attempts for the day.
 */

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { TestSession, TestSessionType, TestSessionStatus } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Get today's date in YYYY-MM-DD (IST). */
function getTodayIST(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

/** Build a deterministic daily challenge testId key. */
export function getDailyChallengeTestId(studentClass: number, date?: string): string {
    const today = date || getTodayIST();
    return `daily_${today}_class${studentClass}`;
}

// ── Session CRUD ─────────────────────────────────────────────────────

/**
 * Create a new test session when a test or daily challenge starts.
 * Returns the created session with its Firestore ID.
 */
export async function createTestSession(params: {
    userId: string;
    testId: string;
    sessionType: TestSessionType;
    totalQuestions: number;
}): Promise<TestSession> {
    const { userId, testId, sessionType, totalQuestions } = params;

    const sessionData = {
        userId,
        testId,
        sessionType,
        currentQuestion: 0,
        answers: new Array(totalQuestions).fill(null),
        score: 0,
        totalQuestions,
        startedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        completed: false,
        status: 'in_progress' as TestSessionStatus,
    };

    const ref = collection(db, COLLECTIONS.TEST_SESSIONS);
    const docRef = await addDoc(ref, sessionData);

    return {
        id: docRef.id,
        ...sessionData,
        startedAt: sessionData.startedAt.toDate(),
        lastActiveAt: sessionData.lastActiveAt.toDate(),
    };
}

/**
 * Find an active (uncompleted) session for a user + test.
 * Used by the test page to detect if the student should resume.
 * Returns null if no active session exists.
 */
export async function getActiveTestSession(
    userId: string,
    testId: string
): Promise<TestSession | null> {
    const ref = collection(db, COLLECTIONS.TEST_SESSIONS);
    const q = query(
        ref,
        where('userId', '==', userId),
        where('testId', '==', testId),
        where('completed', '==', false)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    // Return the most recent session (should be only one, but just in case)
    const docSnap = snap.docs[0];
    const data = docSnap.data();

    return {
        id: docSnap.id,
        userId: data.userId,
        testId: data.testId,
        sessionType: data.sessionType,
        currentQuestion: data.currentQuestion,
        answers: data.answers,
        score: data.score,
        totalQuestions: data.totalQuestions,
        startedAt: data.startedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        completed: data.completed,
        status: data.status,
    };
}

/**
 * Find today's daily challenge session for a user.
 * Checks for any session (in_progress, failed, or completed).
 * Returns null if no session exists for today.
 */
export async function getActiveDailySession(
    userId: string,
    studentClass: number,
    date?: string
): Promise<TestSession | null> {
    const dailyTestId = getDailyChallengeTestId(studentClass, date);
    const ref = collection(db, COLLECTIONS.TEST_SESSIONS);
    const q = query(
        ref,
        where('userId', '==', userId),
        where('testId', '==', dailyTestId),
        where('sessionType', '==', 'daily_challenge')
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    return {
        id: docSnap.id,
        userId: data.userId,
        testId: data.testId,
        sessionType: data.sessionType,
        currentQuestion: data.currentQuestion,
        answers: data.answers,
        score: data.score,
        totalQuestions: data.totalQuestions,
        startedAt: data.startedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        completed: data.completed,
        status: data.status,
    };
}

/**
 * Update session progress after every answer.
 * Fire-and-forget — non-blocking to avoid UI lag.
 */
export async function updateSessionProgress(
    sessionId: string,
    updates: {
        currentQuestion: number;
        answers: (number | string | null)[];
        score: number;
    }
): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.TEST_SESSIONS, sessionId);
    await updateDoc(sessionRef, {
        ...updates,
        lastActiveAt: Timestamp.now(),
    });
}

/**
 * Mark a session as completed after successful submission.
 */
export async function completeSession(
    sessionId: string,
    finalScore: number
): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.TEST_SESSIONS, sessionId);
    await updateDoc(sessionRef, {
        completed: true,
        status: 'completed' as TestSessionStatus,
        score: finalScore,
        lastActiveAt: Timestamp.now(),
    });
}

/**
 * Mark a daily challenge session as failed.
 * Used when the student abandons a daily challenge (closes mid-quiz).
 * The student cannot retry until the next day.
 */
export async function failSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, COLLECTIONS.TEST_SESSIONS, sessionId);
    await updateDoc(sessionRef, {
        completed: true,
        status: 'failed' as TestSessionStatus,
        lastActiveAt: Timestamp.now(),
    });
}

/**
 * Get all in-progress test session testIds for a user.
 * Returns a Set of testIds that have active (uncompleted) sessions.
 * Used by the dashboard to show "Resume" instead of "Start".
 */
export async function getActiveTestSessionIds(userId: string): Promise<Set<string>> {
    const ref = collection(db, COLLECTIONS.TEST_SESSIONS);
    const q = query(
        ref,
        where('userId', '==', userId),
        where('completed', '==', false),
        where('sessionType', '==', 'test')
    );

    const snap = await getDocs(q);
    const ids = new Set<string>();
    snap.docs.forEach(docSnap => {
        ids.add(docSnap.data().testId);
    });
    return ids;
}

// ── Weekly Test Session Helpers ───────────────────────────────────

/** Build a deterministic weekly test session testId key. */
export function getWeeklyTestSessionId(studentClass: number, weekNumber: number): string {
    return `weekly_W${weekNumber}_class${studentClass}`;
}

/**
 * Find this week's weekly test session for a user.
 * Checks for any session (in_progress, failed, or completed).
 */
export async function getActiveWeeklySession(
    userId: string,
    studentClass: number,
    weekNumber: number
): Promise<TestSession | null> {
    const weeklyTestId = getWeeklyTestSessionId(studentClass, weekNumber);
    const ref = collection(db, COLLECTIONS.TEST_SESSIONS);
    const q = query(
        ref,
        where('userId', '==', userId),
        where('testId', '==', weeklyTestId),
        where('sessionType', '==', 'weekly_test')
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    return {
        id: docSnap.id,
        userId: data.userId,
        testId: data.testId,
        sessionType: data.sessionType,
        currentQuestion: data.currentQuestion,
        answers: data.answers,
        score: data.score,
        totalQuestions: data.totalQuestions,
        startedAt: data.startedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        completed: data.completed,
        status: data.status,
    };
}

