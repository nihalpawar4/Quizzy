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

/**
 * Restrict a student account (they won't be able to login)
 */
export async function restrictStudent(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { isRestricted: true });
}

/**
 * Enable a restricted student account (they can login again)
 */
export async function enableStudent(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { isRestricted: false });
}

/**
 * Permanently delete a student account and all their data
 */
export async function deleteStudent(uid: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete user profile
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    batch.delete(userRef);

    // Delete all their results
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const resultsQuery = query(resultsRef, where('studentId', '==', uid));
    const resultsSnapshot = await getDocs(resultsQuery);
    resultsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}

/**
 * Get today's date in YYYY-MM-DD format (IST timezone)
 */
function getTodayDateString(): string {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format (IST timezone)
 */
function getYesterdayDateString(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset - 24 * 60 * 60 * 1000);
    return istDate.toISOString().split('T')[0];
}

/**
 * Check if user can claim streak today
 */
export function canClaimStreakToday(user: User): boolean {
    const today = getTodayDateString();
    return user.lastStreakDate !== today;
}

/**
 * Claim daily streak for user
 * Returns updated streak info or null if already claimed today
 */
export async function claimDailyStreak(uid: string, user: User): Promise<{
    success: boolean;
    currentStreak: number;
    longestStreak: number;
    message: string;
} | null> {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // Check if already claimed today
    if (user.lastStreakDate === today) {
        return {
            success: false,
            currentStreak: user.currentStreak || 0,
            longestStreak: user.longestStreak || 0,
            message: 'Already claimed today! Come back tomorrow.'
        };
    }

    let newStreak = 1;
    let newLongestStreak = user.longestStreak || 0;

    // Check if last claim was yesterday (continue streak) or older (reset)
    if (user.lastStreakDate === yesterday) {
        // Continue streak
        newStreak = (user.currentStreak || 0) + 1;
    } else {
        // Streak broken, start fresh
        newStreak = 1;
    }

    // Update longest streak if needed
    if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
    }

    // Update user in Firestore
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: today
    });

    return {
        success: true,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        message: newStreak === 1 ? 'Streak started! 🔥' : `${newStreak} day streak! 🔥`
    };
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
            type: q.type || 'mcq', // Default to MCQ if not specified
            correctAnswer: q.correctAnswer || '', // For text-based questions
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
 * Delete a result (for teachers)
 */
export async function deleteResult(resultId: string): Promise<void> {
    const resultRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await deleteDoc(resultRef);
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

