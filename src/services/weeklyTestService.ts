/**
 * Weekly Test Service
 * Generates weekly tests every Sunday from completed test concepts.
 * Uses Gemini API with fallback to shuffled existing questions.
 * 30 questions, 45-minute timer, numbered sequentially (Weekly Test 1, 2, 3…).
 */

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Question, User, WeeklyTestResult } from '@/types';
import { awardActivityXp } from '@/services/coinService';

// ── Constants ────────────────────────────────────────────────────────

/** First Sunday from which we start counting weekly tests. */
const EPOCH_SUNDAY = '2026-06-15'; // Week 1

/** Number of questions in a weekly test. */
export const WEEKLY_TEST_QUESTION_COUNT = 30;

/** Timer duration in seconds (45 minutes). */
export const WEEKLY_TEST_TIMER_SECONDS = 45 * 60;

// ── Helpers ──────────────────────────────────────────────────────────

/** Get today's date in YYYY-MM-DD (IST). Resets at 12:00 AM IST. */
function getTodayIST(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

/** Get current Date adjusted to IST. */
function getNowIST(): Date {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
}

/** Check if today is Sunday (IST). */
export function isSunday(): boolean {
    return getNowIST().getUTCDay() === 0;
}

/**
 * Get the sequential weekly test number for the current Sunday.
 * Week 1 = EPOCH_SUNDAY. Increments by 1 each subsequent Sunday.
 */
export function getWeeklyTestNumber(date?: string): number {
    const today = date || getTodayIST();
    const epochMs = new Date(EPOCH_SUNDAY).getTime();
    const todayMs = new Date(today).getTime();
    const diffDays = Math.floor((todayMs - epochMs) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return Math.max(1, weekNumber);
}

/** Get the Sunday date string for a given week number. */
export function getSundayDateForWeek(weekNumber: number): string {
    const epochMs = new Date(EPOCH_SUNDAY).getTime();
    const sundayMs = epochMs + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
    return new Date(sundayMs).toISOString().split('T')[0];
}

/** Build a deterministic weekly test ID key. */
export function getWeeklyTestId(studentClass: number, weekNumber: number): string {
    return `weekly_W${weekNumber}_class${studentClass}`;
}

// ── Fetch completed test questions ───────────────────────────────────

/**
 * Fetch all questions from tests the student has completed.
 * Returns questions grouped with their subject context.
 */
export async function getCompletedTestQuestions(
    studentId: string,
    studentClass: number
): Promise<{ questions: (Question & { subject: string; testTitle: string })[] }> {
    // 1) Get all results for this student (completed tests)
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const resultsQuery = query(
        resultsRef,
        where('studentId', '==', studentId)
    );
    const resultsSnap = await getDocs(resultsQuery);

    // Extract unique testIds from completed tests (not PDF, not daily challenge)
    const completedTestIds = new Set<string>();
    const testMeta: Record<string, { subject: string; testTitle: string }> = {};

    resultsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!data.isPdfTest && !data.isDailyChallenge && data.testId) {
            completedTestIds.add(data.testId);
            testMeta[data.testId] = {
                subject: data.subject || 'General',
                testTitle: data.testTitle || 'Test',
            };
        }
    });

    if (completedTestIds.size === 0) {
        return { questions: [] };
    }

    // 2) Fetch questions for those tests
    const testIdArray = Array.from(completedTestIds);
    const allQuestions: (Question & { subject: string; testTitle: string })[] = [];

    for (let i = 0; i < testIdArray.length; i += 30) {
        const chunk = testIdArray.slice(i, i + 30);
        const qRef = collection(db, COLLECTIONS.QUESTIONS);
        const qQuery = query(qRef, where('testId', 'in', chunk));
        const qSnap = await getDocs(qQuery);

        qSnap.docs.forEach(doc => {
            const data = doc.data();
            const type = data.type || 'mcq';
            // Only include MCQ and true/false (suitable for weekly test format)
            if (type === 'mcq' || type === 'true_false') {
                const meta = testMeta[data.testId] || { subject: 'General', testTitle: 'Test' };
                allQuestions.push({
                    id: doc.id,
                    ...data,
                    subject: meta.subject,
                    testTitle: meta.testTitle,
                } as Question & { subject: string; testTitle: string });
            }
        });
    }

    return { questions: allQuestions };
}

// ── Generate Weekly Test Questions (via API) ─────────────────────────

/**
 * Generate weekly test questions using the Gemini API.
 * Calls the /api/generate-weekly-test server endpoint.
 * Falls back to shuffled existing questions if generation fails.
 */
export async function generateWeeklyTestQuestions(
    studentId: string,
    studentClass: number,
    weekNumber: number
): Promise<{ questions: Question[]; error?: string }> {
    // 1) Fetch completed test questions for context
    const { questions: completedQuestions } = await getCompletedTestQuestions(
        studentId,
        studentClass
    );

    if (completedQuestions.length === 0) {
        return {
            questions: [],
            error: 'No completed tests found. Complete some tests first to unlock Weekly Test!',
        };
    }

    // 2) Prepare question summaries for the AI prompt (limit to avoid token overflow)
    const questionSummaries = completedQuestions.slice(0, 100).map(q => ({
        text: q.text,
        type: q.type,
        subject: q.subject,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation || '',
    }));

    // 3) Call the API route
    try {
        const response = await fetch('/api/generate-weekly-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentClass,
                weekNumber,
                completedQuestions: questionSummaries,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                questions: [],
                error: errorData.error || `Failed to generate questions (HTTP ${response.status})`,
            };
        }

        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
            return {
                questions: [],
                error: 'AI could not generate questions. Please try again.',
            };
        }

        return { questions: data.questions };
    } catch (err) {
        console.error('[WeeklyTest] API call failed:', err);
        return {
            questions: [],
            error: 'Network error. Please check your connection and try again.',
        };
    }
}

// ── Completion check ─────────────────────────────────────────────────

/**
 * Check if a student has completed this week's weekly test.
 */
export async function hasCompletedWeeklyTest(
    studentId: string,
    weekNumber: number
): Promise<boolean> {
    const ref = collection(db, COLLECTIONS.WEEKLY_TEST_RESULTS);
    const q = query(
        ref,
        where('studentId', '==', studentId),
        where('weekNumber', '==', weekNumber)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

// ── Submit Weekly Test ───────────────────────────────────────────────

/**
 * Submit a weekly test result.
 */
export async function submitWeeklyTest(
    user: User,
    score: number,
    totalQuestions: number,
    weekNumber: number,
    timeTakenSeconds: number,
    detailedAnswers?: WeeklyTestResult['detailedAnswers']
): Promise<void> {
    const weekDate = getSundayDateForWeek(weekNumber);

    const ref = collection(db, COLLECTIONS.WEEKLY_TEST_RESULTS);
    await addDoc(ref, {
        studentId: user.uid,
        studentName: user.name,
        studentClass: user.studentClass || 0,
        weekNumber,
        weekDate,
        score,
        totalQuestions,
        timeTakenSeconds,
        detailedAnswers: detailedAnswers || [],
        completedAt: Timestamp.now(),
    });

    // Award XP: 30 XP for weekly challenge + 15 bonus if >80%
    try {
        await awardActivityXp(user.uid, 'weekly_challenge', score, totalQuestions);
    } catch (xpErr) {
        console.error('[Quizy] Weekly test XP award failed (non-blocking):', xpErr);
    }
}

// ── Weekly Test History ──────────────────────────────────────────────

/**
 * Get all weekly test results for a student (history).
 */
export async function getWeeklyTestHistory(
    studentId: string
): Promise<WeeklyTestResult[]> {
    const ref = collection(db, COLLECTIONS.WEEKLY_TEST_RESULTS);
    const q = query(
        ref,
        where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            completedAt: data.completedAt?.toDate?.() || new Date(),
        } as WeeklyTestResult;
    });
    // Sort by weekNumber descending
    results.sort((a, b) => b.weekNumber - a.weekNumber);
    return results;
}

/**
 * Check if teacher has uploaded a manual weekly test for this week.
 * Returns the test ID if found, null otherwise.
 */
export async function getTeacherWeeklyTest(
    studentClass: number,
    weekNumber: number
): Promise<string | null> {
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const q = query(
        testsRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true),
        where('isWeeklyTest', '==', true),
        where('weeklyTestNumber', '==', weekNumber)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
}
