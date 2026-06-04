/**
 * Evaluation Service
 * Handles all evaluation-related Firestore operations for the Manual Evaluation system.
 * By Nihal Pawar
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    onSnapshot,
    type Unsubscribe,
    limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { TestResult, QuestionEvaluation, EvaluationStatus } from '@/types';

// ==================== EVALUATION QUERIES ====================

/**
 * Get submissions pending evaluation (with optional filters)
 */
export async function getPendingEvaluations(filters?: {
    classNumber?: number;
    subject?: string;
    testId?: string;
    studentName?: string;
    status?: EvaluationStatus;
}): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    // Base query: get results that need evaluation
    let q = query(
        resultsRef,
        where('evaluationStatus', 'in', ['pending', 'under_review']),
        orderBy('timestamp', 'desc')
    );

    // Apply additional filters if provided
    if (filters?.status && filters.status !== 'pending') {
        q = query(
            resultsRef,
            where('evaluationStatus', '==', filters.status),
            orderBy('timestamp', 'desc')
        );
    }

    const snapshot = await getDocs(q);

    let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate?.() || undefined,
            endTime: data.endTime?.toDate?.() || undefined,
            reviewedAt: data.reviewedAt?.toDate?.() || undefined,
            publishedAt: data.publishedAt?.toDate?.() || undefined,
            scheduledReleaseDate: data.scheduledReleaseDate?.toDate?.() || undefined,
        } as TestResult;
    });

    // Client-side filtering for fields not in the Firestore query
    if (filters?.classNumber) {
        results = results.filter(r => r.studentClass === filters.classNumber);
    }
    if (filters?.subject) {
        results = results.filter(r => r.subject === filters.subject);
    }
    if (filters?.testId) {
        results = results.filter(r => r.testId === filters.testId);
    }
    if (filters?.studentName) {
        const searchLower = filters.studentName.toLowerCase();
        results = results.filter(r =>
            r.studentName.toLowerCase().includes(searchLower)
        );
    }

    return results;
}

/**
 * Get all evaluations with any status (for the evaluation dashboard)
 */
export async function getAllEvaluations(statusFilter?: EvaluationStatus | 'all'): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    let q;
    if (statusFilter && statusFilter !== 'all') {
        q = query(
            resultsRef,
            where('evaluationStatus', '==', statusFilter),
            orderBy('timestamp', 'desc')
        );
    } else {
        // Get all results that have an evaluationStatus field (non-auto tests)
        q = query(
            resultsRef,
            where('evaluationStatus', 'in', ['pending', 'under_review', 'evaluated', 'published']),
            orderBy('timestamp', 'desc')
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate?.() || undefined,
            endTime: data.endTime?.toDate?.() || undefined,
            reviewedAt: data.reviewedAt?.toDate?.() || undefined,
            publishedAt: data.publishedAt?.toDate?.() || undefined,
            scheduledReleaseDate: data.scheduledReleaseDate?.toDate?.() || undefined,
        } as TestResult;
    });
}

/**
 * Subscribe to evaluations in real-time
 */
export function subscribeToEvaluations(
    callback: (results: TestResult[]) => void,
    statusFilter?: EvaluationStatus | 'all'
): Unsubscribe {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    let q;
    if (statusFilter && statusFilter !== 'all') {
        q = query(
            resultsRef,
            where('evaluationStatus', '==', statusFilter),
            orderBy('timestamp', 'desc')
        );
    } else {
        q = query(
            resultsRef,
            where('evaluationStatus', 'in', ['pending', 'under_review', 'evaluated', 'published']),
            orderBy('timestamp', 'desc')
        );
    }

    return onSnapshot(q, (snapshot) => {
        const results: TestResult[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
                startTime: data.startTime?.toDate?.() || undefined,
                endTime: data.endTime?.toDate?.() || undefined,
                reviewedAt: data.reviewedAt?.toDate?.() || undefined,
                publishedAt: data.publishedAt?.toDate?.() || undefined,
                scheduledReleaseDate: data.scheduledReleaseDate?.toDate?.() || undefined,
            } as TestResult;
        });
        callback(results);
    });
}

// ==================== EVALUATION ACTIONS ====================

/**
 * Start evaluating a submission (sets status to under_review)
 */
export async function startEvaluation(
    resultId: string,
    teacherId: string,
    teacherName: string
): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await updateDoc(resultRef, {
        evaluationStatus: 'under_review',
        evaluatorId: teacherId,
        evaluatorName: teacherName,
    });
}

/**
 * Submit evaluation for a result
 */
export async function submitEvaluation(
    resultId: string,
    data: {
        questionEvaluations: QuestionEvaluation[];
        teacherFeedback: string;
        marksObtained: number;
        totalMarks: number;
        evaluatorId: string;
        evaluatorName: string;
        strengthAreas?: string[];
        improvementAreas?: string[];
    }
): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await updateDoc(resultRef, {
        evaluationStatus: 'evaluated',
        questionEvaluations: data.questionEvaluations,
        teacherFeedback: data.teacherFeedback,
        marksObtained: data.marksObtained,
        totalMarks: data.totalMarks,
        evaluatorId: data.evaluatorId,
        evaluatorName: data.evaluatorName,
        reviewedAt: Timestamp.now(),
        strengthAreas: data.strengthAreas || [],
        improvementAreas: data.improvementAreas || [],
    });

    // Delete any draft for this result
    try {
        await deleteEvaluationDraft(resultId);
    } catch {
        // Ignore — draft might not exist
    }
}

/**
 * Publish a single result (make it visible to student)
 */
export async function publishResult(resultId: string): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await updateDoc(resultRef, {
        evaluationStatus: 'published',
        publishedAt: Timestamp.now(),
    });
}

/**
 * Publish multiple results in batch
 */
export async function publishResultsBulk(resultIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    resultIds.forEach(id => {
        const ref = doc(db, COLLECTIONS.RESULTS, id);
        batch.update(ref, {
            evaluationStatus: 'published',
            publishedAt: now,
        });
    });

    await batch.commit();
}

/**
 * Schedule result release for a specific date/time
 */
export async function scheduleResultRelease(
    resultId: string,
    releaseDate: Date
): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await updateDoc(resultRef, {
        scheduledReleaseDate: Timestamp.fromDate(releaseDate),
    });
}

/**
 * Submit evaluation and publish immediately
 */
export async function submitAndPublish(
    resultId: string,
    data: {
        questionEvaluations: QuestionEvaluation[];
        teacherFeedback: string;
        marksObtained: number;
        totalMarks: number;
        evaluatorId: string;
        evaluatorName: string;
        strengthAreas?: string[];
        improvementAreas?: string[];
    }
): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await updateDoc(resultRef, {
        evaluationStatus: 'published',
        questionEvaluations: data.questionEvaluations,
        teacherFeedback: data.teacherFeedback,
        marksObtained: data.marksObtained,
        totalMarks: data.totalMarks,
        evaluatorId: data.evaluatorId,
        evaluatorName: data.evaluatorName,
        reviewedAt: Timestamp.now(),
        publishedAt: Timestamp.now(),
        strengthAreas: data.strengthAreas || [],
        improvementAreas: data.improvementAreas || [],
    });

    // Delete any draft
    try {
        await deleteEvaluationDraft(resultId);
    } catch {
        // Ignore
    }
}

// ==================== DRAFT OPERATIONS ====================

/**
 * Save evaluation draft (auto-save)
 */
export async function saveEvaluationDraft(
    resultId: string,
    data: {
        questionEvaluations: QuestionEvaluation[];
        teacherFeedback: string;
        evaluatorId: string;
    }
): Promise<void> {
    const draftRef = doc(db, COLLECTIONS.EVALUATION_DRAFTS, resultId);
    const draftSnap = await getDoc(draftRef);

    const draftData = {
        resultId,
        questionEvaluations: data.questionEvaluations,
        teacherFeedback: data.teacherFeedback,
        evaluatorId: data.evaluatorId,
        updatedAt: Timestamp.now(),
    };

    if (draftSnap.exists()) {
        await updateDoc(draftRef, draftData);
    } else {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(draftRef, {
            ...draftData,
            createdAt: Timestamp.now(),
        });
    }
}

/**
 * Get evaluation draft for a result
 */
export async function getEvaluationDraft(resultId: string): Promise<{
    questionEvaluations: QuestionEvaluation[];
    teacherFeedback: string;
    evaluatorId: string;
} | null> {
    const draftRef = doc(db, COLLECTIONS.EVALUATION_DRAFTS, resultId);
    const draftSnap = await getDoc(draftRef);

    if (draftSnap.exists()) {
        const data = draftSnap.data();
        return {
            questionEvaluations: data.questionEvaluations || [],
            teacherFeedback: data.teacherFeedback || '',
            evaluatorId: data.evaluatorId || '',
        };
    }
    return null;
}

/**
 * Delete evaluation draft
 */
export async function deleteEvaluationDraft(resultId: string): Promise<void> {
    const draftRef = doc(db, COLLECTIONS.EVALUATION_DRAFTS, resultId);
    await deleteDoc(draftRef);
}

// ==================== STATISTICS ====================

/**
 * Get evaluation statistics for the dashboard
 */
export async function getEvaluationStats(): Promise<{
    totalPending: number;
    totalUnderReview: number;
    totalEvaluated: number;
    totalPublished: number;
    averageEvalTimeHours: number;
}> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    // Get all results with evaluation status
    const q = query(
        resultsRef,
        where('evaluationStatus', 'in', ['pending', 'under_review', 'evaluated', 'published'])
    );

    const snapshot = await getDocs(q);

    let totalPending = 0;
    let totalUnderReview = 0;
    let totalEvaluated = 0;
    let totalPublished = 0;
    const evalTimes: number[] = [];

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.evaluationStatus;

        if (status === 'pending') totalPending++;
        else if (status === 'under_review') totalUnderReview++;
        else if (status === 'evaluated') totalEvaluated++;
        else if (status === 'published') totalPublished++;

        // Calculate evaluation time for completed evaluations
        if (data.reviewedAt && data.timestamp) {
            const submitted = data.timestamp.toDate();
            const reviewed = data.reviewedAt.toDate();
            const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
            evalTimes.push(hours);
        }
    });

    const averageEvalTimeHours = evalTimes.length > 0
        ? evalTimes.reduce((a, b) => a + b, 0) / evalTimes.length
        : 0;

    return {
        totalPending,
        totalUnderReview,
        totalEvaluated,
        totalPublished,
        averageEvalTimeHours: Math.round(averageEvalTimeHours * 10) / 10,
    };
}

/**
 * Get a single result by ID (for the answer review screen)
 */
export async function getResultById(resultId: string): Promise<TestResult | null> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    const resultSnap = await getDoc(resultRef);

    if (resultSnap.exists()) {
        const data = resultSnap.data();
        return {
            id: resultSnap.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate?.() || undefined,
            endTime: data.endTime?.toDate?.() || undefined,
            reviewedAt: data.reviewedAt?.toDate?.() || undefined,
            publishedAt: data.publishedAt?.toDate?.() || undefined,
            scheduledReleaseDate: data.scheduledReleaseDate?.toDate?.() || undefined,
        } as TestResult;
    }
    return null;
}

/**
 * Get adjacent submissions for the same test (for Next/Previous navigation)
 */
export async function getAdjacentSubmissions(
    testId: string,
    currentResultId: string,
    evaluationStatus?: EvaluationStatus
): Promise<{ previousId: string | null; nextId: string | null; totalCount: number; currentIndex: number }> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    let q;
    if (evaluationStatus) {
        q = query(
            resultsRef,
            where('testId', '==', testId),
            where('evaluationStatus', '==', evaluationStatus),
            orderBy('timestamp', 'asc')
        );
    } else {
        q = query(
            resultsRef,
            where('testId', '==', testId),
            where('evaluationStatus', 'in', ['pending', 'under_review']),
            orderBy('timestamp', 'asc')
        );
    }

    const snapshot = await getDocs(q);
    const ids = snapshot.docs.map(d => d.id);
    const currentIndex = ids.indexOf(currentResultId);

    return {
        previousId: currentIndex > 0 ? ids[currentIndex - 1] : null,
        nextId: currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null,
        totalCount: ids.length,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
    };
}

/**
 * Check for scheduled results that should be published
 */
export async function publishScheduledResults(): Promise<number> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const now = Timestamp.now();

    const q = query(
        resultsRef,
        where('evaluationStatus', '==', 'evaluated'),
        where('scheduledReleaseDate', '<=', now)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            evaluationStatus: 'published',
            publishedAt: now,
        });
    });

    await batch.commit();
    return snapshot.docs.length;
}
