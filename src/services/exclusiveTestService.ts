/**
 * Exclusive Test Service
 * Handles exclusive premium test access, ticket management, and results.
 * Teachers create exclusive tests; premium students spend tickets to attempt them.
 */

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    doc,
    updateDoc,
    increment,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, EXCLUSIVE_TICKETS_PER_TEST, EXCLUSIVE_TEST_XP_REWARD } from '@/lib/constants';
import type { Test, Question, ExclusiveTestResult } from '@/types';

// ── Fetch exclusive tests for a student's class ────────────────────────

/**
 * Get all active exclusive tests for a given class, optionally filtered by subject.
 */
export async function getExclusiveTests(
    studentClass: number,
    subject?: string
): Promise<Test[]> {
    const testsRef = collection(db, COLLECTIONS.TESTS);

    const constraints = [
        where('isExclusiveTest', '==', true),
        where('targetClass', '==', studentClass),
        where('isActive', '==', true),
    ];

    if (subject && subject !== 'All') {
        constraints.push(where('subject', '==', subject));
    }

    const q = query(testsRef, ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Test;
    });
}

// ── Fetch questions for a test ─────────────────────────────────────────

export async function getTestQuestions(testId: string): Promise<Question[]> {
    const qRef = collection(db, COLLECTIONS.QUESTIONS);
    const q = query(qRef, where('testId', '==', testId));
    const snap = await getDocs(q);

    const questions = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
    })) as Question[];

    // Sort by order if available
    questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return questions;
}

// ── Ticket management ──────────────────────────────────────────────────

/**
 * Get the current exclusive ticket count for a user.
 * Auto-grants 5 free starter tickets on first access.
 */
export async function getExclusiveTicketCount(userId: string): Promise<number> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return 0;

    const data = snap.data();

    // First-time: grant 5 free starter tickets
    if (data.exclusiveTickets === undefined || data.exclusiveTickets === null) {
        const STARTER_TICKETS = 5;
        await updateDoc(userRef, { exclusiveTickets: STARTER_TICKETS });
        return STARTER_TICKETS;
    }

    return (data.exclusiveTickets as number) || 0;
}

/**
 * Spend tickets to attempt an exclusive test.
 * Returns success/error — will reject if insufficient tickets.
 */
export async function spendTickets(
    userId: string,
    count: number = EXCLUSIVE_TICKETS_PER_TEST
): Promise<{ success: boolean; error?: string }> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        return { success: false, error: 'User not found.' };
    }

    const currentTickets = (snap.data().exclusiveTickets as number) || 0;
    if (currentTickets < count) {
        return {
            success: false,
            error: `Not enough tickets. You need ${count} but have ${currentTickets}.`,
        };
    }

    await updateDoc(userRef, {
        exclusiveTickets: increment(-count),
    });

    return { success: true };
}

/**
 * Award tickets to a user (called from daily reward service).
 */
export async function awardTickets(userId: string, count: number = 1): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        exclusiveTickets: increment(count),
    });
}

// ── Completion tracking ────────────────────────────────────────────────

/**
 * Check if a student has already completed a specific exclusive test.
 */
export async function hasCompletedExclusiveTest(
    userId: string,
    testId: string
): Promise<boolean> {
    const ref = collection(db, COLLECTIONS.EXCLUSIVE_TEST_RESULTS);
    const q = query(
        ref,
        where('studentId', '==', userId),
        where('testId', '==', testId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

// ── Submit exclusive test ──────────────────────────────────────────────

/**
 * Submit an exclusive test result and award XP.
 */
export async function submitExclusiveTest(params: {
    userId: string;
    userName: string;
    studentClass: number;
    testId: string;
    testTitle: string;
    subject: string;
    score: number;
    totalQuestions: number;
    timeTakenSeconds: number;
    detailedAnswers?: ExclusiveTestResult['detailedAnswers'];
}): Promise<void> {
    const {
        userId,
        userName,
        studentClass,
        testId,
        testTitle,
        subject,
        score,
        totalQuestions,
        timeTakenSeconds,
        detailedAnswers,
    } = params;

    // Save result
    const ref = collection(db, COLLECTIONS.EXCLUSIVE_TEST_RESULTS);
    await addDoc(ref, {
        studentId: userId,
        studentName: userName,
        studentClass,
        testId,
        testTitle,
        subject,
        score,
        totalQuestions,
        timeTakenSeconds,
        xpAwarded: EXCLUSIVE_TEST_XP_REWARD,
        detailedAnswers: detailedAnswers || [],
        completedAt: Timestamp.now(),
    });

    // Award XP
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        xp: increment(EXCLUSIVE_TEST_XP_REWARD),
    });
}

// ── History ────────────────────────────────────────────────────────────

/**
 * Get all exclusive test results for a student.
 */
export async function getExclusiveTestHistory(
    userId: string
): Promise<ExclusiveTestResult[]> {
    const ref = collection(db, COLLECTIONS.EXCLUSIVE_TEST_RESULTS);
    const q = query(ref, where('studentId', '==', userId));
    const snap = await getDocs(q);

    const results = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            completedAt: data.completedAt?.toDate?.() || new Date(),
        } as ExclusiveTestResult;
    });

    results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    return results;
}
