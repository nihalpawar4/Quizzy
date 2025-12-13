/**
 * Real-Time Chat Services
 * Firestore operations for WhatsApp-like chat functionality
 * By Nihal Pawar
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot,
    writeBatch,
    arrayUnion,
    arrayRemove,
    increment,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';
import type {
    Chat,
    Message,
    MessageStatus,
    UserPresence,
    ChatNotification
} from '@/types';

// ==================== PRESENCE OPERATIONS ====================

/**
 * Update user's online status
 */
export async function updatePresence(
    userId: string,
    isOnline: boolean
): Promise<void> {
    const presenceRef = doc(db, COLLECTIONS.PRESENCE, userId);
    await setDoc(presenceRef, {
        userId,
        isOnline,
        lastSeen: Timestamp.now(),
        updatedAt: Timestamp.now()
    }, { merge: true });
}

/**
 * Set user as online
 */
export async function setUserOnline(userId: string): Promise<void> {
    await updatePresence(userId, true);
}

/**
 * Set user as offline with last seen timestamp
 */
export async function setUserOffline(userId: string): Promise<void> {
    await updatePresence(userId, false);
}

/**
 * Update typing status
 */
export async function updateTypingStatus(
    userId: string,
    chatId: string | null
): Promise<void> {
    const presenceRef = doc(db, COLLECTIONS.PRESENCE, userId);
    await updateDoc(presenceRef, {
        typing: chatId ? {
            chatId,
            timestamp: Timestamp.now()
        } : null
    });
}

/**
 * Subscribe to user presence changes
 */
export function subscribeToPresence(
    userId: string,
    callback: (presence: UserPresence | null) => void
): Unsubscribe {
    const presenceRef = doc(db, COLLECTIONS.PRESENCE, userId);

    return onSnapshot(presenceRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            callback({
                userId: doc.id,
                isOnline: data.isOnline || false,
                lastSeen: data.lastSeen?.toDate() || new Date(),
                typing: data.typing ? {
                    chatId: data.typing.chatId,
                    timestamp: data.typing.timestamp?.toDate() || new Date()
                } : undefined,
                deviceId: data.deviceId,
                platform: data.platform
            });
        } else {
            callback(null);
        }
    });
}

/**
 * Subscribe to multiple users' presence
 */
export function subscribeToMultiplePresence(
    userIds: string[],
    callback: (presenceMap: { [userId: string]: UserPresence }) => void
): Unsubscribe[] {
    const unsubscribes: Unsubscribe[] = [];
    const presenceMap: { [userId: string]: UserPresence } = {};

    userIds.forEach(userId => {
        const unsub = subscribeToPresence(userId, (presence) => {
            if (presence) {
                presenceMap[userId] = presence;
            }
            callback({ ...presenceMap });
        });
        unsubscribes.push(unsub);
    });

    return unsubscribes;
}

// Cache for user photo URLs to avoid repeated fetches
const userPhotoCache: { [userId: string]: { url: string | null; fetchedAt: number } } = {};
const PHOTO_CACHE_TTL = 5000; // 5 seconds cache for faster real-time updates

/**
 * Clear photo cache for a user (call when profile picture is updated)
 */
export function clearUserPhotoCache(userId?: string): void {
    if (userId) {
        delete userPhotoCache[userId];
    } else {
        Object.keys(userPhotoCache).forEach(key => delete userPhotoCache[key]);
    }
}

/**
 * Get user's photo URL
 */
export async function getUserPhotoURL(userId: string): Promise<string | null> {
    // Check cache first
    const cached = userPhotoCache[userId];
    if (cached && Date.now() - cached.fetchedAt < PHOTO_CACHE_TTL) {
        return cached.url;
    }

    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (userDoc.exists()) {
            const photoURL = userDoc.data()?.photoURL || null;
            userPhotoCache[userId] = { url: photoURL, fetchedAt: Date.now() };
            return photoURL;
        }
    } catch (error) {
        console.error('Error fetching user photo:', error);
    }
    return null;
}

/**
 * Get photo URLs for multiple users
 */
export async function getUserPhotoURLs(userIds: string[]): Promise<{ [userId: string]: string }> {
    const result: { [userId: string]: string } = {};

    await Promise.all(userIds.map(async (userId) => {
        const photoURL = await getUserPhotoURL(userId);
        if (photoURL) {
            result[userId] = photoURL;
        }
    }));

    return result;
}

// ==================== CHAT OPERATIONS ====================

/**
 * Get or create a chat between student and teacher
 */
export async function getOrCreateChat(
    studentId: string,
    studentName: string,
    studentClass: number,
    teacherId: string,
    teacherName: string
): Promise<Chat> {
    const chatsRef = collection(db, COLLECTIONS.CHATS);

    // Check if chat already exists
    const q = query(
        chatsRef,
        where('studentId', '==', studentId),
        where('teacherId', '==', teacherId)
    );

    const existingChats = await getDocs(q);

    if (!existingChats.empty) {
        const chatDoc = existingChats.docs[0];
        const data = chatDoc.data();
        return {
            id: chatDoc.id,
            participants: data.participants,
            studentId: data.studentId,
            teacherId: data.teacherId,
            studentName: data.studentName,
            teacherName: data.teacherName,
            studentClass: data.studentClass,
            lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined,
            unreadCount: data.unreadCount || {},
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            deletedFor: data.deletedFor,
            deletedAt: data.deletedAt
        };
    }

    // Create new chat
    const newChat = {
        participants: [studentId, teacherId],
        studentId,
        teacherId,
        studentName,
        teacherName,
        studentClass,
        unreadCount: {
            [studentId]: 0,
            [teacherId]: 0
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(chatsRef, newChat);

    return {
        id: docRef.id,
        ...newChat,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

/**
 * Get chat by ID
 */
export async function getChatById(chatId: string): Promise<Chat | null> {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        const data = chatSnap.data();
        return {
            id: chatSnap.id,
            participants: data.participants,
            studentId: data.studentId,
            teacherId: data.teacherId,
            studentName: data.studentName,
            teacherName: data.teacherName,
            studentClass: data.studentClass,
            lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined,
            unreadCount: data.unreadCount || {},
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            deletedFor: data.deletedFor,
            deletedAt: data.deletedAt
        };
    }

    return null;
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                participants: data.participants,
                studentId: data.studentId,
                teacherId: data.teacherId,
                studentName: data.studentName,
                teacherName: data.teacherName,
                studentClass: data.studentClass,
                lastMessage: data.lastMessage ? {
                    ...data.lastMessage,
                    timestamp: data.lastMessage.timestamp?.toDate() || new Date()
                } : undefined,
                unreadCount: data.unreadCount || {},
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                deletedFor: data.deletedFor,
                deletedAt: data.deletedAt
            };
        })
        // Filter out deleted chats for this user
        .filter(chat => !chat.deletedFor?.includes(userId));
}

/**
 * Subscribe to user's chats (real-time)
 */
export function subscribeToUserChats(
    userId: string,
    callback: (chats: Chat[]) => void
): Unsubscribe {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
        const chats = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    participants: data.participants,
                    studentId: data.studentId,
                    teacherId: data.teacherId,
                    studentName: data.studentName,
                    teacherName: data.teacherName,
                    studentClass: data.studentClass,
                    lastMessage: data.lastMessage ? {
                        ...data.lastMessage,
                        timestamp: data.lastMessage.timestamp?.toDate() || new Date()
                    } : undefined,
                    unreadCount: data.unreadCount || {},
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    deletedFor: data.deletedFor,
                    deletedAt: data.deletedAt,
                    participantPhotoURLs: data.participantPhotoURLs || {}
                } as Chat;
            })
            // Filter out deleted chats for this user
            .filter(chat => !chat.deletedFor?.includes(userId));

        // Fetch photo URLs for all participants
        const allParticipantIds = chats.flatMap(chat => chat.participants);
        const uniqueParticipantIds = [...new Set(allParticipantIds)];

        try {
            const photoURLs = await getUserPhotoURLs(uniqueParticipantIds);

            // Enrich chats with photo URLs
            const enrichedChats = chats.map(chat => ({
                ...chat,
                participantPhotoURLs: {
                    ...chat.participantPhotoURLs,
                    ...Object.fromEntries(
                        chat.participants
                            .filter(id => photoURLs[id])
                            .map(id => [id, photoURLs[id]])
                    )
                }
            }));

            callback(enrichedChats);
        } catch (error) {
            console.error('Error fetching participant photos:', error);
            callback(chats);
        }
    });
}

/**
 * Delete chat for a user (soft delete - only hides for that user)
 */
export async function deleteChatForUser(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);

    await updateDoc(chatRef, {
        deletedFor: arrayUnion(userId),
        [`deletedAt.${userId}`]: Timestamp.now()
    });
}

/**
 * Restore deleted chat for a user
 */
export async function restoreChatForUser(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);

    await updateDoc(chatRef, {
        deletedFor: arrayRemove(userId)
    });
}

// ==================== MESSAGE OPERATIONS ====================

/**
 * Send a message
 */
export async function sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'teacher',
    text: string,
    recipientId: string
): Promise<Message> {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);

    const messageData = {
        chatId,
        senderId,
        senderName,
        senderRole,
        text: text.trim(),
        timestamp: Timestamp.now(),
        status: 'sent' as MessageStatus
    };

    const docRef = await addDoc(messagesRef, messageData);

    // Update chat's last message
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
        lastMessage: {
            text: text.trim().substring(0, 100), // Preview text
            senderId,
            timestamp: Timestamp.now(),
            status: 'sent'
        },
        updatedAt: Timestamp.now(),
        [`unreadCount.${recipientId}`]: increment(1),
        // Restore chat for both users if it was deleted
        deletedFor: arrayRemove(senderId, recipientId)
    });

    // Create chat notification for recipient
    await createChatNotification(chatId, senderId, senderName, text.trim(), recipientId);

    return {
        id: docRef.id,
        ...messageData,
        timestamp: new Date()
    };
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(
    chatId: string,
    userId: string,
    messageLimit: number = 50
): Promise<Message[]> {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        limit(messageLimit)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                chatId: data.chatId,
                senderId: data.senderId,
                senderName: data.senderName,
                senderRole: data.senderRole,
                text: data.text,
                timestamp: data.timestamp?.toDate() || new Date(),
                status: data.status,
                deliveredAt: data.deliveredAt?.toDate(),
                seenAt: data.seenAt?.toDate(),
                deletedFor: data.deletedFor
            } as Message;
        })
        // Filter out deleted messages for this user
        .filter(msg => !msg.deletedFor?.includes(userId))
        .reverse(); // Chronological order
}

/**
 * Subscribe to chat messages (real-time)
 */
export function subscribeToChatMessages(
    chatId: string,
    userId: string,
    callback: (messages: Message[]) => void
): Unsubscribe {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    chatId: data.chatId,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    senderRole: data.senderRole,
                    text: data.text,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    status: data.status,
                    deliveredAt: data.deliveredAt?.toDate(),
                    seenAt: data.seenAt?.toDate(),
                    deletedFor: data.deletedFor
                } as Message;
            })
            // Filter out deleted messages for this user
            .filter(msg => !msg.deletedFor?.includes(userId));

        callback(messages);
    });
}

/**
 * Update message status to delivered
 */
export async function markMessageDelivered(messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
        status: 'delivered',
        deliveredAt: Timestamp.now()
    });
}

/**
 * Update message status to seen
 */
export async function markMessageSeen(messageId: string): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
        status: 'seen',
        seenAt: Timestamp.now()
    });
}

/**
 * Mark all unread messages in a chat as seen
 */
export async function markChatMessagesAsSeen(
    chatId: string,
    userId: string,
    senderId: string
): Promise<void> {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        where('senderId', '==', senderId),
        where('status', 'in', ['sent', 'delivered'])
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            status: 'seen',
            seenAt: Timestamp.now()
        });
    });

    // Reset unread count for this user
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    batch.update(chatRef, {
        [`unreadCount.${userId}`]: 0
    });

    await batch.commit();
}

/**
 * Delete message for a user
 */
export async function deleteMessageForUser(
    messageId: string,
    userId: string
): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
        deletedFor: arrayUnion(userId)
    });
}

/**
 * Delete all messages in a chat for a user
 */
export async function deleteAllChatMessages(
    chatId: string,
    userId: string
): Promise<void> {
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(messagesRef, where('chatId', '==', chatId));

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            deletedFor: arrayUnion(userId)
        });
    });

    await batch.commit();
}

// ==================== CHAT NOTIFICATION OPERATIONS ====================

/**
 * Create a chat notification
 */
export async function createChatNotification(
    chatId: string,
    senderId: string,
    senderName: string,
    messageText: string,
    recipientId: string
): Promise<string> {
    const notificationsRef = collection(db, COLLECTIONS.CHAT_NOTIFICATIONS);

    const notification = {
        type: 'new_message',
        chatId,
        senderId,
        senderName,
        messagePreview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
        recipientId,
        createdAt: Timestamp.now(),
        isRead: false
    };

    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
}

/**
 * Get unread chat notifications for a user
 */
export async function getUnreadChatNotifications(
    userId: string
): Promise<ChatNotification[]> {
    const notificationsRef = collection(db, COLLECTIONS.CHAT_NOTIFICATIONS);
    const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type,
            chatId: data.chatId,
            senderId: data.senderId,
            senderName: data.senderName,
            messagePreview: data.messagePreview,
            recipientId: data.recipientId,
            createdAt: data.createdAt?.toDate() || new Date(),
            isRead: data.isRead
        } as ChatNotification;
    });
}

/**
 * Subscribe to chat notifications (real-time)
 */
export function subscribeToChatNotifications(
    userId: string,
    callback: (notifications: ChatNotification[]) => void
): Unsubscribe {
    const notificationsRef = collection(db, COLLECTIONS.CHAT_NOTIFICATIONS);
    const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                chatId: data.chatId,
                senderId: data.senderId,
                senderName: data.senderName,
                messagePreview: data.messagePreview,
                recipientId: data.recipientId,
                createdAt: data.createdAt?.toDate() || new Date(),
                isRead: data.isRead
            } as ChatNotification;
        });

        callback(notifications);
    });
}

/**
 * Mark chat notification as read
 */
export async function markChatNotificationAsRead(
    notificationId: string
): Promise<void> {
    const notificationRef = doc(db, COLLECTIONS.CHAT_NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, {
        isRead: true
    });
}

/**
 * Mark all chat notifications for a chat as read
 */
export async function markAllChatNotificationsAsRead(
    userId: string,
    chatId: string
): Promise<void> {
    const notificationsRef = collection(db, COLLECTIONS.CHAT_NOTIFICATIONS);
    const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        where('chatId', '==', chatId),
        where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
}

// ==================== CLEANUP OPERATIONS ====================

/**
 * Delete old messages (older than 30 days)
 * This should be called periodically (e.g., via a Cloud Function)
 */
export async function cleanupOldMessages(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    const q = query(
        messagesRef,
        where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo)),
        limit(500) // Process in batches
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.docs.length;
}

/**
 * Get total unread message count for a user across all chats
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
    const chats = await getUserChats(userId);
    return chats.reduce((total, chat) => total + (chat.unreadCount[userId] || 0), 0);
}

/**
 * Subscribe to total unread count (real-time)
 */
export function subscribeToTotalUnreadCount(
    userId: string,
    callback: (count: number) => void
): Unsubscribe {
    return subscribeToUserChats(userId, (chats) => {
        const total = chats.reduce((sum, chat) => sum + (chat.unreadCount[userId] || 0), 0);
        callback(total);
    });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format last seen time
 */
export function formatLastSeen(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
}

/**
 * Format message time
 */
export function formatMessageTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
    const groups: { [key: string]: Message[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    messages.forEach(message => {
        const msgDate = new Date(message.timestamp);
        let dateKey: string;

        if (msgDate.toDateString() === today.toDateString()) {
            dateKey = 'Today';
        } else if (msgDate.toDateString() === yesterday.toDateString()) {
            dateKey = 'Yesterday';
        } else {
            dateKey = msgDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(message);
    });

    return Object.entries(groups).map(([date, msgs]) => ({ date, messages: msgs }));
}

/**
 * Get all teachers for student to start a chat
 */
export async function getAllTeachers(): Promise<{ uid: string; name: string; email: string }[]> {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', 'teacher'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        email: doc.data().email
    }));
}

/**
 * Get all students for teacher to view/start chats
 */
export async function getAllStudentsForChat(): Promise<{ uid: string; name: string; email: string; studentClass: number }[]> {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        studentClass: doc.data().studentClass || 5
    }));
}
