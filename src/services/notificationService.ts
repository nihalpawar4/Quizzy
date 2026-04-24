/**
 * Notification Service
 * Handles sending push notifications for homework and other features
 * By Nihal Pawar
 */

import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

/**
 * Get FCM tokens for all students of a specific class
 */
export async function getStudentFCMTokensByClass(classNumber: number): Promise<string[]> {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(
        usersRef,
        where('role', '==', 'student'),
        where('studentClass', '==', classNumber)
    );
    
    const snapshot = await getDocs(q);
    const tokens: string[] = [];
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken && data.fcmToken.trim() !== '') {
            tokens.push(data.fcmToken);
        }
    });
    
    return tokens;
}

/**
 * Send homework notification to students via the API route
 */
export async function sendHomeworkNotification(
    homeworkTitle: string,
    subject: string,
    classNumber: number
): Promise<boolean> {
    try {
        const tokens = await getStudentFCMTokensByClass(classNumber);
        
        if (tokens.length === 0) {
            console.log('[Quizy Notify] No FCM tokens found for Class', classNumber);
            return false;
        }
        
        console.log(`[Quizy Notify] Sending notification to ${tokens.length} students`);
        
        const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens,
                title: '📚 New Homework Uploaded',
                body: `New homework added: ${homeworkTitle} (${subject})`,
                data: {
                    url: '/dashboard/student/homework',
                    type: 'homework',
                    tag: 'homework-notification'
                }
            })
        });
        
        if (!response.ok) {
            console.error('[Quizy Notify] API error:', await response.text());
            return false;
        }
        
        const result = await response.json();
        console.log('[Quizy Notify] Notification sent:', result);
        return true;
    } catch (error) {
        console.error('[Quizy Notify] Error sending notification:', error);
        return false;
    }
}
