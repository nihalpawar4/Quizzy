'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, BookOpen, Home, Bell, BellRing
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import HomeworkList from '@/components/homework/HomeworkList';
import { subscribeToHomework } from '@/services/homeworkService';
import { requestAndStoreFCMToken } from '@/lib/messaging';
import type { Homework } from '@/types/homework';

export default function StudentHomeworkPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifPermission, setNotifPermission] = useState<string>('default');
    const [enablingNotif, setEnablingNotif] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!authLoading && !user) { router.push('/auth/login'); return; }
        if (!authLoading && user?.role !== 'student') { router.push('/dashboard/teacher'); }
    }, [user, authLoading, router]);

    // Check notification permission on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
        }
    }, []);

    // Subscribe to homework for student's class
    useEffect(() => {
        if (!user?.studentClass) return;
        const unsub = subscribeToHomework(user.studentClass, (data) => {
            setHomeworks(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.studentClass]);

    const handleEnableNotifications = async () => {
        if (!user?.uid) return;
        setEnablingNotif(true);
        try {
            const token = await requestAndStoreFCMToken(user.uid);
            if (token) {
                setNotifPermission('granted');
            } else {
                // Check if permission was denied
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    setNotifPermission(Notification.permission);
                }
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
        } finally {
            setEnablingNotif(false);
        }
    };

    if (authLoading || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading homework...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Link href="/dashboard/student" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">My Homework</h1>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Class {user.studentClass}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {notifPermission !== 'granted' && (
                            <button
                                onClick={handleEnableNotifications}
                                disabled={enablingNotif}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors relative"
                                title="Enable push notifications"
                            >
                                {enablingNotif ? (
                                    <Loader2 className="w-5 h-5 text-[#1650EB] animate-spin" />
                                ) : (
                                    <>
                                        <BellRing className="w-5 h-5 text-[#1650EB]" />
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    </>
                                )}
                            </button>
                        )}
                        <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" title="Home">
                            <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                {/* Notification Banner - only show if not granted */}
                <AnimatePresence>
                    {notifPermission !== 'granted' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 sm:mb-6 flex items-center gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl"
                        >
                            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">Enable Notifications</p>
                                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-0.5 leading-tight">
                                    Get instant alerts when new homework is uploaded.
                                </p>
                            </div>
                            <button
                                onClick={handleEnableNotifications}
                                disabled={enablingNotif}
                                className="text-xs font-medium text-white bg-[#1650EB] hover:bg-[#1243c7] px-3 py-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {enablingNotif ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                )}
                                Enable
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{homeworks.length}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {homeworks.filter(h => { const t = new Date(); t.setHours(0,0,0,0); return new Date(h.createdAt) >= t; }).length}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">New Today</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 text-center">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {new Set(homeworks.map(h => h.subject)).size}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Subjects</p>
                    </div>
                </div>

                {/* Homework List */}
                <HomeworkList homeworks={homeworks} loading={loading} />
            </main>
        </div>
    );
}
