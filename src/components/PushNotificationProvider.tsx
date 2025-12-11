'use client';

/**
 * Push Notification Provider for Quizy PWA
 * By Nihal Pawar
 * 
 * Handles real-time push notifications for:
 * - New tests available
 * - Report cards ready
 * - New study notes
 * - Credit economy updates
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, BookOpen, FileText, Coins } from 'lucide-react';
import { onForegroundMessage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPayload {
    notification?: {
        title?: string;
        body?: string;
    };
    data?: {
        type?: 'test' | 'report' | 'note' | 'credit' | 'general';
        testId?: string;
        tag?: string;
        [key: string]: string | undefined;
    };
}

interface PushNotification {
    id: string;
    title: string;
    body: string;
    type: string;
    timestamp: number;
    read: boolean;
}

interface PushNotificationContextType {
    notifications: PushNotification[];
    unreadCount: number;
    hasPermission: boolean;
    requestPermission: () => Promise<void>;
    markAsRead: (id: string) => void;
    clearAll: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function usePushNotifications() {
    const context = useContext(PushNotificationContext);
    if (!context) {
        throw new Error('usePushNotifications must be used within PushNotificationProvider');
    }
    return context;
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<PushNotification[]>([]);
    const [hasPermission, setHasPermission] = useState(false);
    const [showToast, setShowToast] = useState<PushNotification | null>(null);

    // Check notification permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setHasPermission(Notification.permission === 'granted');
        }
    }, []);

    // Listen for foreground messages
    useEffect(() => {
        if (!user) return;

        onForegroundMessage((payload: unknown) => {
            const typedPayload = payload as NotificationPayload;
            console.log('[Quizy Push] Foreground message received:', typedPayload);

            const newNotification: PushNotification = {
                id: `notif-${Date.now()}`,
                title: typedPayload.notification?.title || 'Quizy',
                body: typedPayload.notification?.body || 'You have a new notification',
                type: typedPayload.data?.type || 'general',
                timestamp: Date.now(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
            setShowToast(newNotification);

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setShowToast(null);
            }, 5000);
        });
    }, [user]);

    const requestPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.log('[Quizy Push] Notifications not supported');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setHasPermission(permission === 'granted');

            if (permission === 'granted') {
                // Register for FCM - dynamic import to avoid SSR issues
                const { requestNotificationPermission } = await import('@/lib/firebase');
                await requestNotificationPermission();
            }
        } catch (error) {
            console.error('[Quizy Push] Error requesting permission:', error);
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'test':
                return <BookOpen className="w-5 h-5 text-blue-500" />;
            case 'report':
                return <FileText className="w-5 h-5 text-green-500" />;
            case 'note':
                return <BookOpen className="w-5 h-5 text-purple-500" />;
            case 'credit':
                return <Coins className="w-5 h-5 text-yellow-500" />;
            default:
                return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <PushNotificationContext.Provider value={{
            notifications,
            unreadCount,
            hasPermission,
            requestPermission,
            markAsRead,
            clearAll
        }}>
            {children}

            {/* Foreground Notification Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: 50 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: -50, x: 50 }}
                        className="fixed top-4 right-4 z-[100] max-w-sm"
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                        {getNotificationIcon(showToast.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                            {showToast.title}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                            {showToast.body}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowToast(null)}
                                        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 5, ease: 'linear' }}
                                className="h-1 bg-primary-500"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PushNotificationContext.Provider>
    );
}

// Bell icon component for navbar to show notification count
export function NotificationBell() {
    const { unreadCount, hasPermission, requestPermission } = usePushNotifications();

    if (!hasPermission) {
        return (
            <button
                onClick={requestPermission}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Enable notifications"
            >
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>
        );
    }

    return (
        <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
