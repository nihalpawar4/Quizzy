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
    writeBatch,
    onSnapshot,
    type Unsubscribe
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
    const testData: Record<string, unknown> = {
        ...test,
        createdAt: Timestamp.now(),
        isActive: true
    };

    // Convert scheduledStartTime to Firestore Timestamp if provided
    if (test.scheduledStartTime) {
        testData.scheduledStartTime = Timestamp.fromDate(new Date(test.scheduledStartTime));
    }

    const docRef = await addDoc(testsRef, testData);
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

    // Convert Date objects to Timestamps for proper Firestore storage
    const resultData = {
        ...result,
        timestamp: Timestamp.now(),
        ...(result.startTime && { startTime: Timestamp.fromDate(result.startTime) }),
        ...(result.endTime && { endTime: Timestamp.fromDate(result.endTime) })
    };

    const docRef = await addDoc(resultsRef, resultData);
    return docRef.id;
}

/**
 * Get all results (for teachers)
 */
export async function getAllResults(): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);
    const q = query(resultsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : undefined),
            endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : undefined)
        } as TestResult;
    });
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

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : undefined),
            endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : undefined)
        } as TestResult;
    });
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

// ==================== TEST UPDATE OPERATIONS ====================

/**
 * Update an existing test
 */
export async function updateTest(testId: string, updates: Partial<Omit<Test, 'id' | 'createdAt'>>): Promise<void> {
    const testRef = doc(db, COLLECTIONS.TESTS, testId);
    const updateData: Record<string, unknown> = { ...updates };

    // Convert scheduledStartTime to Timestamp if provided
    if (updates.scheduledStartTime) {
        updateData.scheduledStartTime = Timestamp.fromDate(new Date(updates.scheduledStartTime));
    }

    await updateDoc(testRef, updateData);
}

/**
 * Update questions for a test (delete old ones and add new ones)
 */
export async function updateTestQuestions(
    testId: string,
    questions: ParsedQuestion[]
): Promise<void> {
    const batch = writeBatch(db);

    // Delete existing questions for this test
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const q = query(questionsRef, where('testId', '==', testId));
    const existingQuestions = await getDocs(q);
    existingQuestions.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    // Add new questions
    questions.forEach((q, index) => {
        const docRef = doc(questionsRef);
        batch.set(docRef, {
            testId,
            text: q.text,
            options: q.options,
            correctOption: q.correctOption,
            type: q.type || 'mcq',
            correctAnswer: q.correctAnswer || '',
            order: index
        });
    });

    // Update question count on the test
    const testRef = doc(db, COLLECTIONS.TESTS, testId);
    batch.update(testRef, { questionCount: questions.length });

    await batch.commit();
}

// ==================== NOTE OPERATIONS ====================

import type { SubjectNote } from '@/types';

/**
 * Create a new subject note
 */
export async function createNote(note: Omit<SubjectNote, 'id' | 'createdAt'>): Promise<string> {
    const notesRef = collection(db, COLLECTIONS.NOTES);
    const docRef = await addDoc(notesRef, {
        ...note,
        createdAt: Timestamp.now(),
        isActive: true
    });
    return docRef.id;
}

/**
 * Get all notes (for teachers)
 */
export async function getAllNotes(): Promise<SubjectNote[]> {
    const notesRef = collection(db, COLLECTIONS.NOTES);
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as SubjectNote[];
}

/**
 * Get notes filtered by class (for students)
 */
export async function getNotesByClass(studentClass: number): Promise<SubjectNote[]> {
    const notesRef = collection(db, COLLECTIONS.NOTES);
    const q = query(
        notesRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as SubjectNote[];
}

/**
 * Update a note
 */
export async function updateNote(noteId: string, updates: Partial<Omit<SubjectNote, 'id' | 'createdAt'>>): Promise<void> {
    const noteRef = doc(db, COLLECTIONS.NOTES, noteId);
    await updateDoc(noteRef, updates);
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
    const noteRef = doc(db, COLLECTIONS.NOTES, noteId);
    await deleteDoc(noteRef);
}

/**
 * Toggle note active status
 */
export async function updateNoteStatus(noteId: string, isActive: boolean): Promise<void> {
    const noteRef = doc(db, COLLECTIONS.NOTES, noteId);
    await updateDoc(noteRef, { isActive });
}

// ==================== NOTIFICATION OPERATIONS ====================

import type { Notification, NotificationType } from '@/types';

/**
 * Create a new notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'viewedBy'>): Promise<string> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const docRef = await addDoc(notificationsRef, {
        ...notification,
        createdAt: Timestamp.now(),
        viewedBy: {}
    });
    return docRef.id;
}

/**
 * Mark notification as viewed by a student
 */
export async function markNotificationAsViewed(notificationId: string, studentId: string): Promise<void> {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, {
        [`viewedBy.${studentId}`]: Timestamp.now()
    });
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await deleteDoc(notificationRef);
}

/**
 * Create notification when a new test is created
 */
export async function createTestNotification(test: Test, teacherName: string): Promise<string> {
    return createNotification({
        type: 'test',
        title: '📝 New Test Available',
        message: `${test.title} - ${test.subject}`,
        targetClass: test.targetClass,
        createdBy: test.createdBy,
        createdByName: teacherName,
        linkedId: test.id,
        subject: test.subject
    });
}

/**
 * Create notification when a new note is uploaded
 */
export async function createNoteNotification(note: { title: string; subject: string; targetClass: number; createdBy: string; id: string }, teacherName: string): Promise<string> {
    return createNotification({
        type: 'note',
        title: '📚 New Study Material',
        message: `${note.title} - ${note.subject}`,
        targetClass: note.targetClass,
        createdBy: note.createdBy,
        createdByName: teacherName,
        linkedId: note.id,
        subject: note.subject
    });
}

/**
 * Create announcement notification
 */
export async function createAnnouncement(announcement: {
    title: string;
    message: string;
    targetClass: number;
    createdBy: string;
    createdByName: string;
}): Promise<string> {
    return createNotification({
        type: 'announcement',
        title: announcement.title,
        message: announcement.message,
        targetClass: announcement.targetClass,
        createdBy: announcement.createdBy,
        createdByName: announcement.createdByName
    });
}

/**
 * Subscribe to announcements created by a specific teacher (real-time)
 */
export function subscribeToTeacherAnnouncements(
    teacherId: string,
    callback: (announcements: Notification[]) => void
): Unsubscribe {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
        notificationsRef,
        where('createdBy', '==', teacherId),
        where('type', '==', 'announcement'),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const announcements: Notification[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            announcements.push({
                id: doc.id,
                type: data.type as NotificationType,
                title: data.title,
                message: data.message,
                targetClass: data.targetClass,
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                createdAt: data.createdAt?.toDate() || new Date(),
                viewedBy: data.viewedBy
            });
        });
        callback(announcements);
    });
}

/**
 * Get all announcements created by a specific teacher
 */
export async function getAnnouncementsByTeacher(teacherId: string): Promise<Notification[]> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
        notificationsRef,
        where('createdBy', '==', teacherId),
        where('type', '==', 'announcement'),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type as NotificationType,
            title: data.title,
            message: data.message,
            targetClass: data.targetClass,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            createdAt: data.createdAt?.toDate() || new Date(),
            viewedBy: data.viewedBy
        };
    });
}

/**
 * Delete related announcements (same title, message, created at similar time by same teacher)
 * This is useful when teacher sends announcement to "all classes" and wants to delete all of them
 */
export async function deleteRelatedAnnouncements(
    announcement: Notification
): Promise<number> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);

    // Find announcements with same title, message, and createdBy
    const q = query(
        notificationsRef,
        where('createdBy', '==', announcement.createdBy),
        where('type', '==', 'announcement'),
        where('title', '==', announcement.title),
        where('message', '==', announcement.message)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date();
        // Only delete if created within 1 minute of the original announcement
        const timeDiff = Math.abs(createdAt.getTime() - announcement.createdAt.getTime());
        if (timeDiff < 60000) { // 1 minute
            batch.delete(doc.ref);
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        await batch.commit();
    }

    return deletedCount;
}
