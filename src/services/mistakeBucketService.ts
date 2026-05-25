/**
 * Mistake Bucket Service — Practice Mode
 * Manages wrong answers for spaced repetition practice.
 */

import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { TestResult, MistakeBucketItem } from '@/types';

/**
 * Extract wrong answers from a test result and save them to the Mistake Bucket.
 * Skips questions that are already in the bucket (not yet mastered).
 */
export async function addMistakesFromResult(
    studentId: string,
    studentClass: number,
    result: TestResult
): Promise<number> {
    if (!result.detailedAnswers || result.detailedAnswers.length === 0) return 0;

    // Get wrong answers only
    const wrongAnswers = result.detailedAnswers.filter(a => !a.isCorrect);
    if (wrongAnswers.length === 0) return 0;

    // Check which questions are already in the bucket (not mastered)
    const bucketRef = collection(db, COLLECTIONS.MISTAKE_BUCKET);
    const existingQuery = query(
        bucketRef,
        where('studentId', '==', studentId),
        where('testId', '==', result.testId),
        where('isMastered', '==', false)
    );
    const existingSnapshot = await getDocs(existingQuery);
    const existingQuestionIds = new Set(
        existingSnapshot.docs.map(d => d.data().questionId)
    );

    // Batch write new mistakes
    const batch = writeBatch(db);
    let addedCount = 0;

    for (const answer of wrongAnswers) {
        if (existingQuestionIds.has(answer.questionId)) continue;

        const newDocRef = doc(collection(db, COLLECTIONS.MISTAKE_BUCKET));
        batch.set(newDocRef, {
            studentId,
            studentClass,
            questionId: answer.questionId,
            questionText: answer.questionText,
            questionType: 'mcq', // Default; could be enhanced later
            options: [], // Will be populated if available
            correctAnswer: answer.correctAnswer,
            explanation: answer.explanation || '',
            testId: result.testId,
            testTitle: result.testTitle,
            subject: result.subject,
            userWrongAnswer: answer.userAnswer,
            correctStreak: 0,
            isMastered: false,
            addedAt: Timestamp.now(),
        });
        addedCount++;
    }

    if (addedCount > 0) {
        await batch.commit();
        console.log(`[Quizy] Added ${addedCount} mistakes to bucket for ${studentId}`);
    }

    return addedCount;
}

/**
 * Subscribe to active (unmastered) mistakes for a student.
 * Returns an unsubscribe function.
 */
export function subscribeToMistakes(
    studentId: string,
    callback: (items: MistakeBucketItem[]) => void
): () => void {
    const bucketRef = collection(db, COLLECTIONS.MISTAKE_BUCKET);
    const q = query(
        bucketRef,
        where('studentId', '==', studentId),
        where('isMastered', '==', false),
        orderBy('addedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const items: MistakeBucketItem[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                addedAt: data.addedAt?.toDate() || new Date(),
                lastAttemptedAt: data.lastAttemptedAt?.toDate() || undefined,
                masteredAt: data.masteredAt?.toDate() || undefined,
            } as MistakeBucketItem;
        });
        callback(items);
    });
}

/**
 * Subscribe to mastered mistakes for a student (for stats).
 */
export function subscribeToMasteredMistakes(
    studentId: string,
    callback: (count: number) => void
): () => void {
    const bucketRef = collection(db, COLLECTIONS.MISTAKE_BUCKET);
    const q = query(
        bucketRef,
        where('studentId', '==', studentId),
        where('isMastered', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    });
}

/**
 * Record a practice attempt on a mistake bucket item.
 * - Correct: increment correctStreak. If >= 2, mark as mastered.
 * - Wrong: reset correctStreak to 0.
 */
export async function recordAttempt(
    itemId: string,
    isCorrect: boolean,
    currentStreak: number
): Promise<{ newStreak: number; isMastered: boolean }> {
    const docRef = doc(db, COLLECTIONS.MISTAKE_BUCKET, itemId);

    const newStreak = isCorrect ? currentStreak + 1 : 0;
    const isMastered = newStreak >= 2;

    const updateData: Record<string, unknown> = {
        correctStreak: newStreak,
        isMastered,
        lastAttemptedAt: Timestamp.now(),
    };

    if (isMastered) {
        updateData.masteredAt = Timestamp.now();
    }

    await updateDoc(docRef, updateData);

    return { newStreak, isMastered };
}
