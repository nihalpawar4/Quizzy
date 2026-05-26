/**
 * Daily Quiz Service — Daily Challenge
 * Generates a 5-question daily quiz from existing test questions.
 * Zero cost: no AI, reuses teacher-created questions.
 * Deterministic: same quiz for all students in a class on a given day.
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
import { claimDailyStreak } from '@/lib/services';
import type { Question, User } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Get today's date in YYYY-MM-DD (IST). */
function getTodayIST(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

/** Deterministic seeded shuffle — same seed always produces same order. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        hash = Math.abs((hash * 16807) % 2147483647);
        const j = hash % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ── In-memory cache (per session) ────────────────────────────────────
// Avoids re-fetching all questions on every render.
let cachedDate = '';
let cachedClass = 0;
let cachedQuestions: Question[] = [];

// ── Public API ───────────────────────────────────────────────────────

/**
 * Get 5 daily quiz questions for a given class.
 * Uses a deterministic seed so all students in the same class
 * get the same 5 questions on the same day.
 */
export async function getDailyQuizQuestions(
    studentClass: number,
    date?: string
): Promise<Question[]> {
    const today = date || getTodayIST();

    // Return cache if valid
    if (cachedDate === today && cachedClass === studentClass && cachedQuestions.length > 0) {
        return cachedQuestions;
    }

    // 1) Get all test IDs for this class (active, non-PDF tests only)
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const testsQuery = query(
        testsRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true)
    );
    const testsSnap = await getDocs(testsQuery);
    const testIds = testsSnap.docs
        .filter(d => !d.data().isPdfTest)
        .map(d => d.id);

    if (testIds.length === 0) return [];

    // 2) Fetch questions for those tests (Firestore `in` supports up to 30)
    const allQuestions: Question[] = [];
    // Process in chunks of 30 (Firestore 'in' limit)
    for (let i = 0; i < testIds.length; i += 30) {
        const chunk = testIds.slice(i, i + 30);
        const qRef = collection(db, COLLECTIONS.QUESTIONS);
        const qQuery = query(qRef, where('testId', 'in', chunk));
        const qSnap = await getDocs(qQuery);
        qSnap.docs.forEach(doc => {
            const data = doc.data();
            // Only include MCQ and true/false (not text-input since they need exact typing)
            const type = data.type || 'mcq';
            if (type === 'mcq' || type === 'true_false') {
                allQuestions.push({ id: doc.id, ...data } as Question);
            }
        });
    }

    if (allQuestions.length === 0) return [];

    // 3) Deterministic shuffle and pick 5
    const seed = `${today}-class${studentClass}`;
    const shuffled = seededShuffle(allQuestions, seed);
    const picked = shuffled.slice(0, Math.min(5, shuffled.length));

    // Cache
    cachedDate = today;
    cachedClass = studentClass;
    cachedQuestions = picked;

    return picked;
}

/**
 * Check if a student has completed today's daily quiz.
 */
export async function hasCompletedDailyQuiz(
    studentId: string,
    date?: string
): Promise<boolean> {
    const today = date || getTodayIST();
    const ref = collection(db, COLLECTIONS.DAILY_QUIZ_RESULTS);
    const q = query(
        ref,
        where('studentId', '==', studentId),
        where('date', '==', today)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

/**
 * Submit a daily quiz result and update the student's streak.
 */
export async function submitDailyQuiz(
    user: User,
    score: number,
    totalQuestions: number
): Promise<{
    currentStreak: number;
    longestStreak: number;
    message: string;
}> {
    const today = getTodayIST();

    // 1) Save the result
    const ref = collection(db, COLLECTIONS.DAILY_QUIZ_RESULTS);
    await addDoc(ref, {
        studentId: user.uid,
        studentName: user.name,
        studentClass: user.studentClass || 0,
        date: today,
        score,
        totalQuestions,
        completedAt: Timestamp.now(),
    });

    // 2) Claim the streak (uses existing infrastructure)
    const streakResult = await claimDailyStreak(user.uid, user);

    if (streakResult) {
        return {
            currentStreak: streakResult.currentStreak,
            longestStreak: streakResult.longestStreak,
            message: streakResult.message,
        };
    }

    // Already claimed today (shouldn't happen, but handle gracefully)
    return {
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        message: 'Streak already counted!',
    };
}
