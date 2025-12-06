/**
 * Firebase Database Services
 * All Firestore operations for the application
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';
import type { User, Test, Question, TestResult } from '@/types';
import type { ParsedQuestion } from './utils/parseQuestions';

// ==================== USER OPERATIONS ====================

/**
 * Create or update user profile in Firestore
 */
export async function createUserProfile(user: Omit<User, 'createdAt'>) {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    await setDoc(userRef, {
        ...user,
        createdAt: Timestamp.now()
    });
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<User | null> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            ...data,
            uid: userSnap.id,
            createdAt: data.createdAt?.toDate() || new Date()
        } as User;
    }
    return null;
}

/**
 * Update user's class selection
 */
export async function updateUserClass(uid: string, studentClass: number) {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { studentClass });
}

/**
 * Get all students (for teacher dashboard)
 */
export async function getAllStudents(): Promise<User[]> {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as User[];
}

// ==================== TEST OPERATIONS ====================

/**
 * Create a new test
 */
export async function createTest(test: Omit<Test, 'id' | 'createdAt'>): Promise<string> {
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const docRef = await addDoc(testsRef, {
        ...test,
        createdAt: Timestamp.now(),
        isActive: true
    });
    return docRef.id;
}

/**
 * Get all tests (for teachers)
 */
export async function getAllTests(): Promise<Test[]> {
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const q = query(testsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Test[];
}

/**
 * Get tests filtered by class (for students)
 */
export async function getTestsByClass(studentClass: number): Promise<Test[]> {
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const q = query(
        testsRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Test[];
}

/**
 * Get a single test by ID
 */
export async function getTestById(testId: string): Promise<Test | null> {
    const testRef = doc(db, COLLECTIONS.TESTS, testId);
    const testSnap = await getDoc(testRef);

    if (testSnap.exists()) {
        const data = testSnap.data();
        return {
            id: testSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
        } as Test;
    }
    return null;
}

/**
 * Update test status
 */
export async function updateTestStatus(testId: string, isActive: boolean) {
    const testRef = doc(db, COLLECTIONS.TESTS, testId);
    await updateDoc(testRef, { isActive });
}

/**
 * Delete a test and its questions
 */
export async function deleteTest(testId: string) {
    const batch = writeBatch(db);

    // Delete test document
    batch.delete(doc(db, COLLECTIONS.TESTS, testId));

    // Get and delete all questions for this test
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const q = query(questionsRef, where('testId', '==', testId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

// ==================== QUESTION OPERATIONS ====================

/**
 * Bulk upload questions to a test
 */
export async function uploadQuestions(
    testId: string,
    questions: ParsedQuestion[]
): Promise<void> {
    const batch = writeBatch(db);
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);

    questions.forEach((q, index) => {
        const docRef = doc(questionsRef);
        batch.set(docRef, {
            testId,
            text: q.text,
            options: q.options,
            correctOption: q.correctOption,
            order: index
        });
    });

    // Update question count on the test
    const testRef = doc(db, COLLECTIONS.TESTS, testId);
    batch.update(testRef, { questionCount: questions.length });

    await batch.commit();
}

/**
 * Get all questions for a test
 */
export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const q = query(
        questionsRef,
        where('testId', '==', testId),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Question[];
}

/**
 * Add a single question to a test
 */
export async function addQuestion(
    testId: string,
    question: Omit<Question, 'id' | 'testId'>
): Promise<string> {
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const docRef = await addDoc(questionsRef, {
        ...question,
        testId
    });
    return docRef.id;
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string) {
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    await deleteDoc(questionRef);
}

// ==================== RESULT OPERATIONS ====================

/**
 * Submit test result
 */
export async function submitTestResult(result: Omit<TestResult, 'id' | 'timestamp'>): Promise<string> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const docRef = await addDoc(resultsRef, {
        ...result,
        timestamp: Timestamp.now()
    });
    return docRef.id;
}

/**
 * Get all results (for teachers)
 */
export async function getAllResults(): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const q = query(resultsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as TestResult[];
}

/**
 * Get results for a specific student
 */
export async function getResultsByStudent(studentId: string): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const q = query(
        resultsRef,
        where('studentId', '==', studentId),
        orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as TestResult[];
}

/**
 * Check if student has already taken a test
 */
export async function hasStudentTakenTest(studentId: string, testId: string): Promise<boolean> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const q = query(
        resultsRef,
        where('studentId', '==', studentId),
        where('testId', '==', testId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

/**
 * Get results for a specific test (for teacher analytics)
 */
export async function getResultsByTest(testId: string): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const q = query(
        resultsRef,
        where('testId', '==', testId),
        orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as TestResult[];
}

// ==================== LEADERBOARD OPERATIONS ====================

interface LeaderboardEntry {
    rank: number;
    studentId: string;
    studentName: string;
    studentClass: number;
    totalTests: number;
    averageScore: number;
    totalScore: number;
}

/**
 * Get top performers for leaderboard
 */
export async function getTopPerformers(limit: number = 10, studentClass?: number): Promise<LeaderboardEntry[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    // Get all results (we'll aggregate in memory)
    let q;
    if (studentClass) {
        q = query(resultsRef, where('studentClass', '==', studentClass));
    } else {
        q = query(resultsRef);
    }

    const snapshot = await getDocs(q);

    // Aggregate scores by student
    const studentScores: {
        [key: string]: {
            studentName: string;
            studentClass: number;
            totalScore: number;
            totalQuestions: number;
            testCount: number
        }
    } = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const studentId = data.studentId;

        if (!studentScores[studentId]) {
            studentScores[studentId] = {
                studentName: data.studentName,
                studentClass: data.studentClass,
                totalScore: 0,
                totalQuestions: 0,
                testCount: 0
            };
        }

        studentScores[studentId].totalScore += data.score;
        studentScores[studentId].totalQuestions += data.totalQuestions;
        studentScores[studentId].testCount += 1;
    });

    // Calculate average and sort
    const leaderboard: LeaderboardEntry[] = Object.entries(studentScores)
        .map(([studentId, data]) => ({
            rank: 0,
            studentId,
            studentName: data.studentName,
            studentClass: data.studentClass,
            totalTests: data.testCount,
            averageScore: data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0,
            totalScore: data.totalScore
        }))
        .sort((a, b) => b.averageScore - a.averageScore || b.totalTests - a.totalTests)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return leaderboard;
}

export type { LeaderboardEntry };

