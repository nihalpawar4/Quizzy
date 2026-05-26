/**
 * Daily Quiz Service — Daily Challenge
 * Generates a 5-10 question daily quiz from existing test questions.
 * Zero cost: no AI, reuses teacher-created questions.
 * Deterministic: same quiz for all students in a class on a given day.
 * Multi-subject: ensures a mix of subjects, not just one.
 * Auto-refreshes daily after 12 AM IST.
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

/** Get today's date in YYYY-MM-DD (IST). Resets at 12:00 AM IST. */
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
let cachedDate = '';
let cachedClass = 0;
let cachedQuestions: Question[] = [];

// ── Public API ───────────────────────────────────────────────────────

/** How many questions to include in the daily quiz (5-10). */
const DAILY_QUIZ_MIN = 5;
const DAILY_QUIZ_MAX = 10;

/**
 * Get 5-10 daily quiz questions for a given class.
 * Uses a deterministic seed so all students in the same class
 * get the same questions on the same day.
 * Ensures a MIX of all subjects — not just one subject.
 * Refreshes automatically after 12 AM IST (new date = new seed = new questions).
 */
export async function getDailyQuizQuestions(
    studentClass: number,
    date?: string
): Promise<Question[]> {
    const today = date || getTodayIST();

    // Return cache if valid (same day, same class)
    if (cachedDate === today && cachedClass === studentClass && cachedQuestions.length > 0) {
        return cachedQuestions;
    }

    // 1) Get all tests for this class (active, non-PDF only)
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const testsQuery = query(
        testsRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true)
    );
    const testsSnap = await getDocs(testsQuery);

    // Build testId → subject map and filter out PDF tests
    const testSubjectMap: Record<string, string> = {};
    const testIds: string[] = [];
    testsSnap.docs.forEach(d => {
        const data = d.data();
        if (!data.isPdfTest) {
            testIds.push(d.id);
            testSubjectMap[d.id] = data.subject || 'General';
        }
    });

    if (testIds.length === 0) return [];

    // 2) Fetch questions for those tests (Firestore `in` supports up to 30)
    const allQuestions: (Question & { _subject: string })[] = [];
    for (let i = 0; i < testIds.length; i += 30) {
        const chunk = testIds.slice(i, i + 30);
        const qRef = collection(db, COLLECTIONS.QUESTIONS);
        const qQuery = query(qRef, where('testId', 'in', chunk));
        const qSnap = await getDocs(qQuery);
        qSnap.docs.forEach(doc => {
            const data = doc.data();
            // Only include MCQ and true/false (not fill_blank, short_answer etc.)
            const type = data.type || 'mcq';
            if (type === 'mcq' || type === 'true_false') {
                allQuestions.push({
                    id: doc.id,
                    ...data,
                    _subject: testSubjectMap[data.testId] || 'General',
                } as Question & { _subject: string });
            }
        });
    }

    if (allQuestions.length === 0) return [];

    // 3) Multi-subject mixing: round-robin from each subject, then fill remaining
    // Group questions by subject
    const bySubject: Record<string, (Question & { _subject: string })[]> = {};
    for (const q of allQuestions) {
        const subj = q._subject;
        if (!bySubject[subj]) bySubject[subj] = [];
        bySubject[subj].push(q);
    }

    // Shuffle each subject's questions deterministically
    const seed = `${today}-class${studentClass}`;
    const subjects = Object.keys(bySubject);
    for (const subj of subjects) {
        bySubject[subj] = seededShuffle(bySubject[subj], seed + subj);
    }

    // Round-robin pick: 1 from each subject, repeat until we have enough
    const shuffledSubjects = seededShuffle(subjects, seed);
    const picked: Question[] = [];
    const usedIds = new Set<string>();
    let targetCount = Math.min(DAILY_QUIZ_MAX, allQuestions.length);
    targetCount = Math.max(DAILY_QUIZ_MIN, targetCount);

    let round = 0;
    while (picked.length < targetCount) {
        let addedThisRound = false;
        for (const subj of shuffledSubjects) {
            if (picked.length >= targetCount) break;
            const pool = bySubject[subj];
            if (round < pool.length && !usedIds.has(pool[round].id)) {
                usedIds.add(pool[round].id);
                // Strip the internal _subject field before returning
                const { _subject, ...question } = pool[round];
                picked.push(question as Question);
                addedThisRound = true;
            }
        }
        if (!addedThisRound) break; // All subjects exhausted
        round++;
    }

    // Cache results for this session
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
 * Also saves to the `results` collection so it appears in My Reports.
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

    // 1) Save to dailyQuizResults collection
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

    // 2) Also save to results collection (so it shows in My Reports)
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    await addDoc(resultsRef, {
        studentId: user.uid,
        studentName: user.name,
        studentEmail: user.email || '',
        studentClass: user.studentClass || 0,
        testId: `daily-challenge-${today}`,
        testTitle: `Daily Challenge — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        subject: 'Daily Challenge',
        score,
        totalQuestions,
        answers: [],
        timestamp: Timestamp.now(),
        isDailyChallenge: true,
        dailyChallengeDate: today,
    });

    // 3) Claim the streak (uses existing infrastructure)
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

/**
 * Get all daily quiz results for a student (history).
 */
export async function getDailyQuizHistory(
    studentId: string
): Promise<{ date: string; score: number; totalQuestions: number; completedAt: Date }[]> {
    const ref = collection(db, COLLECTIONS.DAILY_QUIZ_RESULTS);
    const q = query(
        ref,
        where('studentId', '==', studentId),
    );
    const snap = await getDocs(q);
    const history = snap.docs.map(doc => {
        const data = doc.data();
        return {
            date: data.date,
            score: data.score,
            totalQuestions: data.totalQuestions,
            completedAt: data.completedAt?.toDate?.() || new Date(),
        };
    });
    // Sort by date descending
    history.sort((a, b) => b.date.localeCompare(a.date));
    return history;
}
