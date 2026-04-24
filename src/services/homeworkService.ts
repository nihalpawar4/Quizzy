/**
 * Homework Service
 * Firestore operations for homework management
 * By Nihal Pawar
 */

import {
    collection,
    doc,
    addDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Homework, HomeworkFormData } from '@/types/homework';

const HOMEWORK_COLLECTION = 'homeworks';

/**
 * Create a new homework entry
 */
export async function createHomework(
    data: HomeworkFormData,
    teacherId: string,
    teacherName: string
): Promise<string> {
    const homeworksRef = collection(db, HOMEWORK_COLLECTION);
    const docRef = await addDoc(homeworksRef, {
        title: data.title,
        description: data.description,
        classLevel: `Class ${data.classNumber}`,
        classNumber: data.classNumber,
        subject: data.subject,
        createdBy: teacherId,
        createdByName: teacherName,
        createdAt: Timestamp.now(),
        isActive: true,
        ...(data.dueDate ? { dueDate: Timestamp.fromDate(new Date(data.dueDate)) } : {})
    });
    return docRef.id;
}

/**
 * Get all homework for a specific class (for students)
 */
export async function getHomeworkByClass(classNumber: number): Promise<Homework[]> {
    const homeworksRef = collection(db, HOMEWORK_COLLECTION);
    const q = query(
        homeworksRef,
        where('classNumber', '==', classNumber),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || undefined
        } as Homework;
    });
}

/**
 * Get all homework (for teachers)
 */
export async function getAllHomework(): Promise<Homework[]> {
    const homeworksRef = collection(db, HOMEWORK_COLLECTION);
    const q = query(homeworksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || undefined
        } as Homework;
    });
}

/**
 * Subscribe to real-time homework updates for a class
 */
export function subscribeToHomework(
    classNumber: number,
    callback: (homeworks: Homework[]) => void
): Unsubscribe {
    const homeworksRef = collection(db, HOMEWORK_COLLECTION);
    const q = query(
        homeworksRef,
        where('classNumber', '==', classNumber),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const homeworks: Homework[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            homeworks.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                dueDate: data.dueDate?.toDate() || undefined
            } as Homework);
        });
        callback(homeworks);
    });
}

/**
 * Subscribe to all homework (for teacher dashboard)
 */
export function subscribeToAllHomework(
    callback: (homeworks: Homework[]) => void
): Unsubscribe {
    const homeworksRef = collection(db, HOMEWORK_COLLECTION);
    const q = query(homeworksRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const homeworks: Homework[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            homeworks.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                dueDate: data.dueDate?.toDate() || undefined
            } as Homework);
        });
        callback(homeworks);
    });
}

/**
 * Delete a homework entry
 */
export async function deleteHomework(homeworkId: string): Promise<void> {
    const homeworkRef = doc(db, HOMEWORK_COLLECTION, homeworkId);
    await deleteDoc(homeworkRef);
}
