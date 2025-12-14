'use client';

/**
 * Chat Context for Real-Time Chat State Management
 * Handles presence, messages, notifications in real-time
 * By Nihal Pawar
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
    subscribeToUserChats,
    subscribeToPresence,
    subscribeToChatMessages,
    subscribeToChatNotifications,
    subscribeToTotalUnreadCount,
    setUserOnline,
    setUserOffline,
    updateTypingStatus,
    sendMessage as sendMessageService,
    markChatMessagesAsSeen,
    markAllChatNotificationsAsRead,
    getOrCreateChat,
    deleteChatForUser,
    deleteAllChatMessages,
    getAllTeachers,
    getAllStudentsForChat
} from '@/lib/chatServices';
import type { Chat, Message, UserPresence, ChatNotification } from '@/types';
import { CHAT_CONSTANTS } from '@/types';

interface ChatContextType {
    // State
    chats: Chat[];
    currentChat: Chat | null;
    messages: Message[];
    notifications: ChatNotification[];
    totalUnreadCount: number;
    presenceMap: { [userId: string]: UserPresence };
    isLoading: boolean;
    isSending: boolean;

    // Actions
    setCurrentChat: (chat: Chat | null) => void;
    sendMessage: (text: string) => Promise<void>;
    startTyping: () => void;
    stopTyping: () => void;
    markAsRead: () => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    clearChatHistory: (chatId: string) => Promise<void>;
    startNewChat: (participantId: string, participantName: string, participantClass?: number) => Promise<Chat>;

    // Helpers
    getParticipantPresence: (userId: string) => UserPresence | null;
    isUserTyping: (userId: string, chatId: string) => boolean;

    // Available users for new chats
    availableTeachers: { uid: string; name: string; email: string }[];
    availableStudents: { uid: string; name: string; email: string; studentClass: number }[];
    loadAvailableUsers: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // State
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChat, setCurrentChatState] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [presenceMap, setPresenceMap] = useState<{ [userId: string]: UserPresence }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Available users for starting new chats
    const [availableTeachers, setAvailableTeachers] = useState<{ uid: string; name: string; email: string }[]>([]);
    const [availableStudents, setAvailableStudents] = useState<{ uid: string; name: string; email: string; studentClass: number }[]>([]);

    // Refs for cleanup
    const unsubscribesRef = useRef<(() => void)[]>([]);
    const messageUnsubRef = useRef<(() => void) | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup function
    const cleanup = useCallback(() => {
        unsubscribesRef.current.forEach(unsub => unsub());
        unsubscribesRef.current = [];

        if (messageUnsubRef.current) {
            messageUnsubRef.current();
            messageUnsubRef.current = null;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
        }
    }, []);

    // Set current chat with proper state reset
    const setCurrentChat = useCallback((chat: Chat | null) => {
        // Clear messages immediately when changing chat
        setMessages([]);
        setCurrentChatState(chat);
    }, []);

    // Initialize presence and subscriptions when user logs in
    useEffect(() => {
        if (!user) {
            cleanup();
            setChats([]);
            setMessages([]);
            setNotifications([]);
            setTotalUnreadCount(0);
            setPresenceMap({});
            setIsLoading(false);
            setCurrentChatState(null);
            return;
        }

        setIsLoading(true);

        // Set user online and start heartbeat
        setUserOnline(user.uid).catch(console.error);

        presenceIntervalRef.current = setInterval(() => {
            setUserOnline(user.uid).catch(console.error);
        }, CHAT_CONSTANTS.PRESENCE_HEARTBEAT_MS);

        // Subscribe to user's chats
        const chatUnsub = subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
            setIsLoading(false);

            // Subscribe to presence of all chat participants
            const participantIds = updatedChats.flatMap(chat =>
                chat.participants.filter(id => id !== user.uid)
            );
            const uniqueParticipantIds = [...new Set(participantIds)];

            uniqueParticipantIds.forEach(participantId => {
                if (!presenceMap[participantId]) {
                    const presenceUnsub = subscribeToPresence(participantId, (presence) => {
                        if (presence) {
                            setPresenceMap(prev => ({ ...prev, [participantId]: presence }));
                        }
                    });
                    unsubscribesRef.current.push(presenceUnsub);
                }
            });
        });
        unsubscribesRef.current.push(chatUnsub);

        // Subscribe to notifications
        const notifUnsub = subscribeToChatNotifications(user.uid, (updatedNotifications) => {
            setNotifications(updatedNotifications);
        });
        unsubscribesRef.current.push(notifUnsub);

        // Subscribe to total unread count
        const unreadUnsub = subscribeToTotalUnreadCount(user.uid, (count) => {
            setTotalUnreadCount(count);
        });
        unsubscribesRef.current.push(unreadUnsub);

        // Cleanup on unmount or user change
        // Note: setUserOffline is now handled by AuthContext.signOut to avoid permission errors
        return () => {
            cleanup();
        };
    }, [user?.uid]);

    // Subscribe to messages when current chat changes
    useEffect(() => {
        // Cleanup previous message subscription
        if (messageUnsubRef.current) {
            messageUnsubRef.current();
            messageUnsubRef.current = null;
        }

        if (!currentChat || !user) {
            setMessages([]);
            return;
        }

        console.log('Subscribing to messages for chat:', currentChat.id);

        const messageUnsub = subscribeToChatMessages(currentChat.id, user.uid, (updatedMessages) => {
            console.log('Received messages:', updatedMessages.length);
            setMessages(updatedMessages);

            // Automatically mark messages as seen when they arrive
            const otherUserId = currentChat.participants.find(id => id !== user.uid);
            if (otherUserId && updatedMessages.length > 0) {
                markChatMessagesAsSeen(currentChat.id, user.uid, otherUserId).catch(console.error);
                markAllChatNotificationsAsRead(user.uid, currentChat.id).catch(console.error);
            }
        });

        messageUnsubRef.current = messageUnsub;

        return () => {
            if (messageUnsubRef.current) {
                messageUnsubRef.current();
                messageUnsubRef.current = null;
            }
        };
    }, [currentChat?.id, user?.uid]);

    // Handle visibility change (user switches tabs) and page unload
    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setUserOffline(user.uid).catch(console.error);
            } else {
                setUserOnline(user.uid).catch(console.error);
            }
        };

        const handleBeforeUnload = () => {
            // Try to set offline synchronously using sendBeacon if available
            // This is more reliable than async calls during page unload
            setUserOffline(user.uid).catch(console.error);
        };

        // pagehide is more reliable than beforeunload on mobile browsers
        const handlePageHide = () => {
            setUserOffline(user.uid).catch(console.error);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            // Set user offline when component unmounts (e.g., logout, navigation)
            setUserOffline(user.uid).catch(console.error);
        };
    }, [user?.uid]);

    // Send message
    const sendMessage = useCallback(async (text: string) => {
        if (!user || !currentChat || !text.trim() || isSending) return;

        setIsSending(true);
        try {
            const recipientId = currentChat.participants.find(id => id !== user.uid);
            if (!recipientId) throw new Error('Recipient not found');

            await sendMessageService(
                currentChat.id,
                user.uid,
                user.name,
                user.role,
                text,
                recipientId
            );

            // Stop typing after sending
            await updateTypingStatus(user.uid, null);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        } finally {
            setIsSending(false);
        }
    }, [user, currentChat, isSending]);

    // Start typing indicator
    const startTyping = useCallback(() => {
        if (!user || !currentChat) return;

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set typing status
        updateTypingStatus(user.uid, currentChat.id).catch(console.error);

        // Auto-clear after timeout
        typingTimeoutRef.current = setTimeout(() => {
            updateTypingStatus(user.uid, null).catch(console.error);
        }, CHAT_CONSTANTS.TYPING_TIMEOUT_MS);
    }, [user, currentChat]);

    // Stop typing indicator
    const stopTyping = useCallback(() => {
        if (!user) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        updateTypingStatus(user.uid, null).catch(console.error);
    }, [user]);

    // Mark current chat as read
    const markAsRead = useCallback(async () => {
        if (!user || !currentChat) return;

        const otherUserId = currentChat.participants.find(id => id !== user.uid);
        if (!otherUserId) return;

        await markChatMessagesAsSeen(currentChat.id, user.uid, otherUserId);
        await markAllChatNotificationsAsRead(user.uid, currentChat.id);
    }, [user, currentChat]);

    // Delete chat
    const deleteChat = useCallback(async (chatId: string) => {
        if (!user) return;
        await deleteChatForUser(chatId, user.uid);

        if (currentChat?.id === chatId) {
            setCurrentChat(null);
        }
    }, [user, currentChat, setCurrentChat]);

    // Clear chat history
    const clearChatHistory = useCallback(async (chatId: string) => {
        if (!user) return;
        await deleteAllChatMessages(chatId, user.uid);
    }, [user]);

    // Start new chat
    const startNewChat = useCallback(async (
        participantId: string,
        participantName: string,
        participantClass?: number
    ): Promise<Chat> => {
        if (!user) throw new Error('User not authenticated');

        let chat: Chat;

        if (user.role === 'student') {
            // Student starting chat with teacher
            chat = await getOrCreateChat(
                user.uid,
                user.name,
                user.studentClass || 5,
                participantId,
                participantName
            );
        } else {
            // Teacher starting chat with student
            chat = await getOrCreateChat(
                participantId,
                participantName,
                participantClass || 5,
                user.uid,
                user.name
            );
        }

        setCurrentChat(chat);
        return chat;
    }, [user, setCurrentChat]);

    // Get participant presence
    const getParticipantPresence = useCallback((userId: string): UserPresence | null => {
        return presenceMap[userId] || null;
    }, [presenceMap]);

    // Check if user is typing
    const isUserTyping = useCallback((userId: string, chatId: string): boolean => {
        const presence = presenceMap[userId];
        if (!presence?.typing) return false;

        // Check if typing in this chat and not stale (within timeout)
        const typingAge = Date.now() - new Date(presence.typing.timestamp).getTime();
        return presence.typing.chatId === chatId && typingAge < CHAT_CONSTANTS.TYPING_TIMEOUT_MS;
    }, [presenceMap]);

    // Load available users for new chats
    const loadAvailableUsers = useCallback(async () => {
        if (!user) return;

        try {
            if (user.role === 'student') {
                // Students can chat with teachers
                const teachers = await getAllTeachers();
                setAvailableTeachers(teachers);
            } else {
                // Teachers can chat with students
                const students = await getAllStudentsForChat();
                setAvailableStudents(students);
            }
        } catch (error) {
            console.error('Error loading available users:', error);
        }
    }, [user]);

    const value: ChatContextType = {
        chats,
        currentChat,
        messages,
        notifications,
        totalUnreadCount,
        presenceMap,
        isLoading,
        isSending,
        setCurrentChat,
        sendMessage,
        startTyping,
        stopTyping,
        markAsRead,
        deleteChat,
        clearChatHistory,
        startNewChat,
        getParticipantPresence,
        isUserTyping,
        availableTeachers,
        availableStudents,
        loadAvailableUsers
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
