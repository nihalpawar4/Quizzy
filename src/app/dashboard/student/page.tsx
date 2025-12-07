'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    GraduationCap,
    BookOpen,
    Clock,
    ArrowRight,
    User,
    LogOut,
    Trophy,
    Loader2,
    Award,
    Target,
    Calendar,
    MessageSquare,
    HelpCircle,
    X,
    Sparkles,
    Bell,
    Crown,
    Medal,
    RefreshCw,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Flame,
    Timer,
    BookMarked,
    ExternalLink,
    Trash2,
    Megaphone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsByStudent, hasStudentTakenTest, getTopPerformers, canClaimStreakToday, claimDailyStreak, markNotificationAsViewed, deleteNotification } from '@/lib/services';
import type { Test, TestResult, SubjectNote, Notification } from '@/types';
import type { LeaderboardEntry } from '@/lib/services';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export default function StudentDashboard() {
    const { user, loading: authLoading, signOut, refreshUser } = useAuth();
    const router = useRouter();

    const [tests, setTests] = useState<Test[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [takenTests, setTakenTests] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [comingSoonFeature, setComingSoonFeature] = useState('');

    // Leaderboard state
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

    // New test notification
    const [newTestNotification, setNewTestNotification] = useState<Test | null>(null);

    // My Reports state
    const [activeTab, setActiveTab] = useState<'tests' | 'reports' | 'notes'>('tests');
    const [selectedReport, setSelectedReport] = useState<TestResult | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // New reports notification state
    const [newReportsCount, setNewReportsCount] = useState(0);
    const [lastSeenReportsCount, setLastSeenReportsCount] = useState(0);
    const [newReportNotification, setNewReportNotification] = useState<TestResult | null>(null);

    // Notes state
    const [notes, setNotes] = useState<SubjectNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<SubjectNote | null>(null);

    // Streak state
    const [streakLoading, setStreakLoading] = useState(false);
    const [streakMessage, setStreakMessage] = useState<string | null>(null);

    // Notification state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [viewedNotificationIds, setViewedNotificationIds] = useState<Set<string>>(new Set());
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    // Read notes tracking (persisted in localStorage)
    const [readNoteIds, setReadNoteIds] = useState<Set<string>>(new Set());

    // Countdown timers for scheduled tests
    const [countdowns, setCountdowns] = useState<{ [testId: string]: string }>({});

    // Update current time every minute for report availability check
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Load read notes from localStorage
    useEffect(() => {
        if (user?.uid) {
            const stored = localStorage.getItem(`readNotes_${user.uid}`);
            if (stored) {
                try {
                    setReadNoteIds(new Set(JSON.parse(stored)));
                } catch (e) {
                    console.error('Error parsing read notes:', e);
                }
            }
        }
    }, [user?.uid]);

    // Countdown timer for scheduled tests - update every second
    useEffect(() => {
        const updateCountdowns = () => {
            const now = new Date();
            const newCountdowns: { [testId: string]: string } = {};

            tests.forEach(test => {
                if (test.scheduledStartTime) {
                    const startTime = new Date(test.scheduledStartTime);
                    const diff = startTime.getTime() - now.getTime();

                    if (diff > 0) {
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                        if (hours > 0) {
                            newCountdowns[test.id] = `${hours}h ${minutes}m ${seconds}s`;
                        } else if (minutes > 0) {
                            newCountdowns[test.id] = `${minutes}m ${seconds}s`;
                        } else {
                            newCountdowns[test.id] = `${seconds}s`;
                        }
                    }
                }
            });

            setCountdowns(newCountdowns);
        };

        updateCountdowns();
        const interval = setInterval(updateCountdowns, 1000);
        return () => clearInterval(interval);
    }, [tests]);

    // Check if report is available (instantly available up to 24 hours after submission)
    const isReportAvailable = (result: TestResult): boolean => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        return currentTime < twentyFourHoursLater;
    };

    // Check if report has expired (after 24 hours)
    const isReportExpired = (result: TestResult): boolean => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);
        return currentTime >= twentyFourHoursLater;
    };

    // Get time remaining until report expires (reports are now instantly available)
    const getTimeRemaining = (result: TestResult): string => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);

        if (currentTime < twentyFourHoursLater) {
            // Available, show expiry time
            const diff = twentyFourHoursLater.getTime() - currentTime.getTime();
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.ceil((diff % 3600000) / 60000);
            if (hours > 0) {
                return `Expires in ${hours}h ${minutes}m`;
            }
            return `Expires in ${minutes} min`;
        }
        return 'Expired';
    };

    // Download report as text file
    const downloadReport = (result: TestResult) => {
        if (!result.detailedAnswers) return;

        const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
        let content = `QUIZY TEST REPORT\n${'='.repeat(50)}\n\n`;
        content += `Test: ${result.testTitle}\n`;
        content += `Subject: ${result.subject}\n`;
        content += `Date: ${new Date(result.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
        content += `Score: ${result.score}/${result.totalQuestions} (${scorePercent}%)\n\n`;
        content += `${'='.repeat(50)}\nDETAILED ANSWERS\n${'='.repeat(50)}\n\n`;

        result.detailedAnswers.forEach((answer, index) => {
            content += `Q${index + 1}: ${answer.questionText}\n`;
            content += `Your Answer: ${answer.userAnswer || 'Not answered'}\n`;
            content += `Correct Answer: ${answer.correctAnswer}\n`;
            content += `Result: ${answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}\n`;
            content += `${'-'.repeat(40)}\n`;
        });

        content += `\n${'='.repeat(50)}\nSUMMARY\n${'='.repeat(50)}\n`;
        content += `Correct: ${result.score}\n`;
        content += `Incorrect: ${result.totalQuestions - result.score}\n`;
        content += `Percentage: ${scorePercent}%\n`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Quizy_Report_${result.testTitle.replace(/\s+/g, '_')}_${new Date(result.timestamp).toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Handle streak claim - no page refresh needed
    const handleClaimStreak = async () => {
        if (!user || streakLoading) return;

        if (!canClaimStreakToday(user)) {
            setStreakMessage('Already claimed today! Come back tomorrow. 🌟');
            setTimeout(() => setStreakMessage(null), 3000);
            return;
        }

        setStreakLoading(true);
        try {
            const result = await claimDailyStreak(user.uid, user);
            if (result) {
                setStreakMessage(result.message);
                // Refresh user data without page reload
                await refreshUser();
                setTimeout(() => setStreakMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error claiming streak:', error);
            setStreakMessage('Failed to claim streak. Try again!');
            setTimeout(() => setStreakMessage(null), 3000);
        } finally {
            setStreakLoading(false);
        }
    };


    const loadLeaderboard = useCallback(async () => {
        if (!user?.studentClass) return;
        setLeaderboardLoading(true);
        try {
            const data = await getTopPerformers(10, user.studentClass);
            setLeaderboard(data);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLeaderboardLoading(false);
        }
    }, [user?.studentClass]);

    const loadData = useCallback(async (testsData?: Test[]) => {
        if (!user?.studentClass || !user?.uid) return;

        try {
            setLoading(true);
            // If testsData is provided (from real-time update), use it directly
            if (testsData) {
                setTests(testsData);
            }
            const resultsData = await getResultsByStudent(user.uid);
            setResults(resultsData);
            const currentTests = testsData || tests;
            const taken = new Set<string>();
            for (const test of currentTests) {
                const hasTaken = await hasStudentTakenTest(user.uid, test.id);
                if (hasTaken) taken.add(test.id);
            }
            setTakenTests(taken);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.studentClass, user?.uid, tests]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (!authLoading && user?.role !== 'student') {
            router.push('/dashboard/teacher');
            return;
        }
        if (user?.studentClass) {
            loadData();
            loadLeaderboard();
        }
    }, [user, authLoading, router, loadData, loadLeaderboard]);

    // Real-time listener for ALL test changes (new tests, status changes, etc.)
    useEffect(() => {
        if (!user?.studentClass) return;

        const testsRef = collection(db, COLLECTIONS.TESTS);
        const q = query(
            testsRef,
            where('targetClass', '==', user.studentClass),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Build the complete list of active tests from the snapshot
            const allTests: Test[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.isActive) {
                    allTests.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        scheduledStartTime: data.scheduledStartTime?.toDate() || undefined
                    } as Test);
                }
            });

            // Update tests state immediately for real-time sync
            setTests(allTests);

            // Check for new tests to show notification
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.toDate() || new Date();
                    const now = new Date();
                    const timeDiff = now.getTime() - createdAt.getTime();

                    // Show notification only for tests created in the last 30 seconds
                    if (timeDiff < 30000 && data.isActive) {
                        const newTest: Test = {
                            id: change.doc.id,
                            ...data,
                            createdAt,
                            scheduledStartTime: data.scheduledStartTime?.toDate() || undefined
                        } as Test;
                        setNewTestNotification(newTest);

                        // Auto-hide notification after 10 seconds
                        setTimeout(() => setNewTestNotification(null), 10000);
                    }
                }
            });

            // Reload taken tests status
            loadData(allTests);
        });

        return () => unsubscribe();
    }, [user?.studentClass, user?.uid]);

    // Real-time listener for new results (reports)
    useEffect(() => {
        if (!user?.uid) return;

        const resultsRef = collection(db, COLLECTIONS.RESULTS);
        const q = query(
            resultsRef,
            where('studentId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allResults: TestResult[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allResults.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                } as TestResult);
            });

            // Update results state
            setResults(allResults);

            // Check for new results (only after initial load)
            if (!isInitialLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const timestamp = data.timestamp?.toDate() || new Date();
                        const now = new Date();
                        const timeDiff = now.getTime() - timestamp.getTime();

                        // Show notification only for results added in the last 30 seconds
                        if (timeDiff < 30000) {
                            const newResult: TestResult = {
                                id: change.doc.id,
                                ...data,
                                timestamp
                            } as TestResult;

                            // Increment new reports count
                            setNewReportsCount(prev => prev + 1);

                            // Show popup notification
                            setNewReportNotification(newResult);

                            // Auto-hide notification after 10 seconds
                            setTimeout(() => setNewReportNotification(null), 10000);
                        }
                    }
                });
            }

            isInitialLoad = false;
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Real-time listener for notes (filtered by student's class)
    useEffect(() => {
        if (!user?.studentClass) return;

        const notesRef = collection(db, COLLECTIONS.NOTES);
        const q = query(
            notesRef,
            where('targetClass', '==', user.studentClass),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allNotes: SubjectNote[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allNotes.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                } as SubjectNote);
            });
            setNotes(allNotes);
        });

        return () => unsubscribe();
    }, [user?.studentClass]);

    // Real-time listener for notifications (filtered by student's class)
    useEffect(() => {
        if (!user?.studentClass || !user?.uid) return;

        const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
        const q = query(
            notificationsRef,
            where('targetClass', '==', user.studentClass),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allNotifications: Notification[] = [];
            const now = new Date();

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || new Date();
                const viewedAt = data.viewedBy?.[user.uid]?.toDate ? data.viewedBy[user.uid].toDate() : null;

                // Check if notification should be hidden (viewed more than 5 minutes ago)
                if (viewedAt) {
                    const timeSinceViewed = (now.getTime() - viewedAt.getTime()) / 1000 / 60; // minutes
                    if (timeSinceViewed > 5) {
                        return; // Skip this notification
                    }
                }

                // Only show notifications from last 24 hours
                const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / 1000 / 60 / 60;
                if (hoursSinceCreated > 24) {
                    return;
                }

                allNotifications.push({
                    id: doc.id,
                    ...data,
                    createdAt
                } as Notification);
            });

            setNotifications(allNotifications);
        });

        return () => unsubscribe();
    }, [user?.studentClass, user?.uid]);

    // Handle marking notification as viewed
    const handleViewNotification = async (notificationId: string) => {
        if (!user?.uid || viewedNotificationIds.has(notificationId)) return;

        try {
            await markNotificationAsViewed(notificationId, user.uid);
            setViewedNotificationIds(prev => new Set([...prev, notificationId]));
        } catch (error) {
            console.error('Error marking notification as viewed:', error);
        }
    };

    // Handle deleting notification (for student - just marks as viewed for immediate removal)
    const handleDismissNotification = async (notificationId: string) => {
        if (!user?.uid) return;

        try {
            await markNotificationAsViewed(notificationId, user.uid);
            // Remove from local state immediately
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    };

    // Open notification in detail modal
    const handleOpenNotification = async (notification: Notification) => {
        setSelectedNotification(notification);
        setShowNotificationPanel(false);
        // Mark as viewed when opened
        if (user?.uid && !notification.viewedBy?.[user.uid]) {
            await handleViewNotification(notification.id);
        }
    };

    // Mark note as read
    const handleMarkNoteAsRead = (noteId: string) => {
        if (!user?.uid) return;

        const newReadIds = new Set([...readNoteIds, noteId]);
        setReadNoteIds(newReadIds);
        localStorage.setItem(`readNotes_${user.uid}`, JSON.stringify([...newReadIds]));
    };

    // Get unread notes count
    const unreadNotesCount = notes.filter(n => !readNoteIds.has(n.id)).length;

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleComingSoon = (feature: string) => {
        setComingSoonFeature(feature);
        setShowComingSoon(true);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin" />
            </div>
        );
    }

    const totalTests = results.length;
    const averageScore = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length)
        : 0;

    // Quick actions - Leaderboard is now functional, others coming soon
    const quickActions = [
        { icon: Target, label: 'Practice Mode', color: 'bg-green-100 dark:bg-green-900/50', iconColor: 'text-green-600 dark:text-green-400', comingSoon: true },
        { icon: Calendar, label: 'Study Planner', color: 'bg-blue-100 dark:bg-blue-900/50', iconColor: 'text-blue-600 dark:text-blue-400', comingSoon: true },
        { icon: MessageSquare, label: 'Ask Doubts', color: 'bg-pink-100 dark:bg-pink-900/50', iconColor: 'text-pink-600 dark:text-pink-400', comingSoon: true },
        { icon: HelpCircle, label: 'Help Center', color: 'bg-orange-100 dark:bg-orange-900/50', iconColor: 'text-orange-600 dark:text-orange-400', comingSoon: true },
    ];

    // Get rank badge
    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{rank}</span>;
    };

    // Find current user's rank
    const userRank = leaderboard.find(e => e.studentId === user.uid);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* New Test Notification */}
            <AnimatePresence>
                {newTestNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        onClick={() => setNewTestNotification(null)}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-[#1650EB] to-[#1650EB] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-white animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold">New Test Available! 🎉</p>
                            <p className="text-sm text-white/90">{newTestNotification.title} - {newTestNotification.subject}</p>
                            <p className="text-xs text-white/70 mt-1">Click to dismiss</p>
                        </div>
                        <div className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Report Notification */}
            <AnimatePresence>
                {newReportNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        onClick={() => {
                            setNewReportNotification(null);
                            setActiveTab('reports');
                            setNewReportsCount(0);
                        }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold">New Report Available! 📊</p>
                            <p className="text-sm text-white/90">
                                {newReportNotification.testTitle} - Score: {newReportNotification.score}/{newReportNotification.totalQuestions} ({Math.round((newReportNotification.score / newReportNotification.totalQuestions) * 100)}%)
                            </p>
                            <p className="text-xs text-white/70 mt-1">Click to view</p>
                        </div>
                        <div className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#1650EB] rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white">Quizy</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Student Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                {notifications.filter(n => !n.viewedBy?.[user.uid]).length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {notifications.filter(n => !n.viewedBy?.[user.uid]).length}
                                    </span>
                                )}
                            </button>

                            {/* Notification Panel Dropdown */}
                            <AnimatePresence>
                                {showNotificationPanel && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Bell className="w-4 h-4" /> Notifications
                                            </h3>
                                            <button
                                                onClick={() => setShowNotificationPanel(false)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                            >
                                                <X className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center">
                                                    <Bell className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => {
                                                    const isNew = !notification.viewedBy?.[user.uid];
                                                    return (
                                                        <div
                                                            key={notification.id}
                                                            className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isNew ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                                            onClick={() => handleOpenNotification(notification)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notification.type === 'test' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                                                    notification.type === 'note' ? 'bg-green-100 dark:bg-green-900/30' :
                                                                        'bg-amber-100 dark:bg-amber-900/30'
                                                                    }`}>
                                                                    {notification.type === 'test' ? (
                                                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                    ) : notification.type === 'note' ? (
                                                                        <BookMarked className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                                    ) : (
                                                                        <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{notification.title}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{notification.message}</p>
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                        {new Date(notification.createdAt).toLocaleString('en-IN', {
                                                                            hour: '2-digit', minute: '2-digit',
                                                                            day: '2-digit', month: 'short'
                                                                        })}
                                                                        {notification.createdByName && ` • ${notification.createdByName}`}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDismissNotification(notification.id);
                                                                    }}
                                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                    title="Dismiss"
                                                                >
                                                                    <X className="w-3 h-3 text-gray-400" />
                                                                </button>
                                                            </div>
                                                            {isNew && (
                                                                <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">New</span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {notifications.length > 0 && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Notifications auto-dismiss 5 min after viewing
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Daily Streak in Navbar */}
                        <div className="relative">
                            <button
                                onClick={handleClaimStreak}
                                disabled={!canClaimStreakToday(user) || streakLoading}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${canClaimStreakToday(user)
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg animate-pulse'
                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                    }`}
                                title={canClaimStreakToday(user) ? 'Click to claim today\'s streak!' : `${user.currentStreak || 0} day streak`}
                            >
                                {streakLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Flame className="w-4 h-4" />
                                )}
                                <span className="font-bold text-sm">{user.currentStreak || 0}</span>
                                {canClaimStreakToday(user) && <span className="text-xs">Claim!</span>}
                            </button>
                            {/* Streak Message Toast */}
                            <AnimatePresence>
                                {streakMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg whitespace-nowrap z-50"
                                    >
                                        <p className="font-bold text-sm">{streakMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" title="Profile Settings">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Class {user.studentClass}</p>
                            </div>
                            <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-[#1650EB] transition-all">
                                <User className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                            </div>
                        </Link>
                        <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Sign Out">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section - Redesigned */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 relative overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            {/* Time-based greeting with first-time/returning user detection */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">
                                    {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
                                </span>
                                <p className="text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">
                                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
                                </p>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {/* First-time user: no lastStreakDate or no results */}
                                {!user.lastStreakDate && results.length === 0 ? (
                                    <>Welcome, <span className="bg-gradient-to-r from-[#1650EB] to-[#6095DB] bg-clip-text text-transparent">{user.name}</span>! 🎉</>
                                ) : (
                                    <>Welcome back, <span className="bg-gradient-to-r from-[#1650EB] to-[#6095DB] bg-clip-text text-transparent">{user.name}</span>! 👋</>
                                )}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {!user.lastStreakDate && results.length === 0 ? (
                                    "Let's get started with your first test! Pick one below."
                                ) : results.length === 0 ? (
                                    "Ready to challenge yourself? Pick a test below."
                                ) : (
                                    `You've completed ${results.length} test${results.length > 1 ? 's' : ''}. Keep up the great work!`
                                )}
                            </p>
                        </div>
                        {/* Quick motivation badge */}
                        {user.currentStreak && user.currentStreak >= 3 && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl border border-orange-200 dark:border-orange-800"
                            >
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{user.currentStreak} Day Streak!</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400">You're on fire!</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tests.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Available Tests</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTests}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tests Completed</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageScore}%</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tab Navigation */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-6">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('tests')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'tests' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <BookOpen className="w-4 h-4" /> Available Tests
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('reports');
                                // Clear the new reports badge when clicked
                                setNewReportsCount(0);
                                setLastSeenReportsCount(results.length);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <FileText className="w-4 h-4" /> My Reports
                            {newReportsCount > 0 && (
                                <span className="bg-[#1650EB] text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                    {newReportsCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'notes' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <BookMarked className="w-4 h-4" /> Study Notes
                            {unreadNotesCount > 0 && (
                                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                    {unreadNotesCount}
                                </span>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Available Tests Tab */}
                {activeTab === 'tests' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            📚 Available Tests for Class {user.studentClass}
                        </h3>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No tests available for your class yet. Check back later!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tests.map((test, index) => {
                                    const hasTaken = takenTests.has(test.id);
                                    const result = results.find(r => r.testId === test.id);
                                    const isScheduled = test.scheduledStartTime && new Date(test.scheduledStartTime) > new Date();
                                    const countdown = countdowns[test.id];

                                    return (
                                        <motion.div
                                            key={test.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${hasTaken ? 'border-green-200 dark:border-green-800' : isScheduled ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800'} hover:shadow-lg transition-shadow`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-block px-3 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full">{test.subject}</span>
                                                        {isScheduled && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                                                                <Timer className="w-3 h-3" />
                                                                Scheduled
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{test.title}</h4>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                <span>{test.questionCount || '?'} Questions</span>
                                                {test.duration && <span>{test.duration} min</span>}
                                            </div>

                                            {/* Countdown Timer for Scheduled Tests */}
                                            {isScheduled && countdown && (
                                                <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" />
                                                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Starts in:</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400 font-mono">
                                                            {countdown}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                                                        Scheduled: {new Date(test.scheduledStartTime!).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            )}

                                            {hasTaken && result ? (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <Trophy className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Score: {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)</span>
                                                </div>
                                            ) : isScheduled ? (
                                                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-medium cursor-not-allowed">
                                                    <Timer className="w-4 h-4" />
                                                    Waiting for test to start
                                                </div>
                                            ) : (
                                                <Link href={`/test/${test.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                                    Start Test <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* My Reports Tab */}
                {activeTab === 'reports' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                📊 My Test Reports
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reports available instantly for 24 hours</p>
                        </div>
                        {results.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No test reports yet. Complete a test to see your detailed analysis!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {results.map((result, index) => {
                                    const reportAvailable = isReportAvailable(result);
                                    const reportExpired = isReportExpired(result);
                                    const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
                                    return (
                                        <motion.div
                                            key={result.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${reportExpired ? 'border-gray-300 dark:border-gray-700 opacity-60' : 'border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-block px-3 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">{result.subject}</span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${scorePercent >= 70 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : scorePercent >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                                                            {scorePercent >= 70 ? <CheckCircle className="w-3 h-3" /> : scorePercent >= 40 ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                            {scorePercent}%
                                                        </span>
                                                        {reportExpired && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                                Expired
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{result.testTitle}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Score: {result.score}/{result.totalQuestions} • {new Date(result.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {reportExpired ? (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl">
                                                            <Clock className="w-4 h-4" />
                                                            <span className="text-sm">Report Expired</span>
                                                        </div>
                                                    ) : reportAvailable ? (
                                                        <>
                                                            <button
                                                                onClick={() => downloadReport(result)}
                                                                className="flex items-center gap-2 px-3 py-2 border border-[#1650EB] text-[#1650EB] dark:text-[#6095DB] dark:border-[#6095DB] rounded-xl font-medium hover:bg-[#1650EB]/10 transition-colors"
                                                                title="Download Report"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedReport(result)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                                            >
                                                                <FileText className="w-4 h-4" /> View Report
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                                                            <Clock className="w-4 h-4" />
                                                            <span className="text-sm">{getTimeRemaining(result)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Study Notes Tab */}
                {activeTab === 'notes' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            📚 Study Notes for Class {user.studentClass}
                        </h3>
                        {notes.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No study notes available for your class yet.</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Check back later for new materials from your teachers!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {notes.map((note, index) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow ${!readNoteIds.has(note.id) ? 'ring-2 ring-green-500' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">
                                                        {note.subject}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${note.contentType === 'json' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                                        {note.contentType.toUpperCase()}
                                                    </span>
                                                    {!readNoteIds.has(note.id) && (
                                                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full animate-pulse">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{note.title}</h4>
                                                {note.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{note.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            Added: {note.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleMarkNoteAsRead(note.id);
                                                setSelectedNote(note);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            {readNoteIds.has(note.id) ? 'View Notes' : 'Read Notes'}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Two Column Layout: Leaderboard + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Leaderboard - Takes 2 columns */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-xl flex items-center justify-center">
                                        <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">🏆 Class {user.studentClass} Leaderboard</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Top performers in your class</p>
                                    </div>
                                </div>
                                <button onClick={loadLeaderboard} className="p-2 text-gray-500 hover:text-[#1650EB] dark:hover:text-[#6095DB] transition-colors" title="Refresh">
                                    <RefreshCw className={`w-5 h-5 ${leaderboardLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {leaderboardLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="text-center py-12">
                                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">No rankings yet. Be the first to complete a test!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 5)).map((entry) => (
                                        <div key={entry.studentId} className={`flex items-center gap-4 p-4 ${entry.studentId === user.uid ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                {getRankBadge(entry.rank)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {entry.studentName} {entry.studentId === user.uid && <span className="text-xs text-[#1650EB] dark:text-[#6095DB]">(You)</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{entry.totalTests} tests completed</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-gray-900 dark:text-white">{entry.averageScore}%</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">avg score</p>
                                            </div>
                                        </div>
                                    ))}

                                    {leaderboard.length > 5 && (
                                        <button onClick={() => setShowAllLeaderboard(!showAllLeaderboard)} className="w-full py-3 text-sm font-medium text-[#1650EB] dark:text-[#6095DB] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            {showAllLeaderboard ? 'Show Less' : `Show All (${leaderboard.length})`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Your Rank Highlight */}
                            {userRank && !leaderboard.slice(0, showAllLeaderboard ? leaderboard.length : 5).find(e => e.studentId === user.uid) && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <span className="text-sm font-bold text-[#1650EB] dark:text-[#6095DB]">#{userRank.rank}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">Your Rank</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{userRank.totalTests} tests completed</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-[#1650EB] dark:text-[#6095DB]">{userRank.averageScore}%</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Actions - Takes 1 column */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚡ Quick Actions</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                            {quickActions.map((action, index) => (
                                <motion.button
                                    key={action.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                    onClick={() => handleComingSoon(action.label)}
                                    className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#6095DB]/50 dark:hover:border-[#1243c7] transition-all group flex items-center gap-3"
                                >
                                    <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</p>
                                        {action.comingSoon && <p className="text-xs text-gray-400">Coming Soon</p>}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Recent Results */}
                {results.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Your Recent Results</h3>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {results.slice(0, 5).map((result) => (
                                            <tr key={result.id}>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{result.testTitle}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{result.subject}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(result.score / result.totalQuestions) >= 0.7
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : (result.score / result.totalQuestions) >= 0.4
                                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                        }`}>
                                                        {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {result.timestamp.toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Coming Soon Modal */}
            <AnimatePresence>
                {showComingSoon && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowComingSoon(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-gradient-to-br from-[#1650EB] to-[#1650EB] rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Coming Soon!</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                <span className="font-semibold text-[#1650EB] dark:text-[#6095DB]">{comingSoonFeature}</span> is under development and will be available soon. Stay tuned!
                            </p>
                            <button onClick={() => setShowComingSoon(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                <X className="w-4 h-4" /> Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Report Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedReport.testTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedReport.subject} • Score: {selectedReport.score}/{selectedReport.totalQuestions} ({Math.round((selectedReport.score / selectedReport.totalQuestions) * 100)}%)
                                    </p>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                                {selectedReport.detailedAnswers && selectedReport.detailedAnswers.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedReport.detailedAnswers.map((answer, index) => (
                                            <div
                                                key={answer.questionId || index}
                                                className={`p-4 rounded-xl border ${answer.isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${answer.isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                                                        {answer.isCorrect ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 dark:text-white mb-2">
                                                            Q{index + 1}: {answer.questionText}
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                            <div className={`p-2 rounded-lg ${answer.isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                                                                <span className="text-gray-500 dark:text-gray-400">Your Answer: </span>
                                                                <span className={`font-medium ${answer.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                                    {answer.userAnswer || 'Not answered'}
                                                                </span>
                                                            </div>
                                                            {!answer.isCorrect && (
                                                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                                                                    <span className="text-gray-500 dark:text-gray-400">Correct Answer: </span>
                                                                    <span className="font-medium text-green-700 dark:text-green-300">
                                                                        {answer.correctAnswer}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400">Detailed answer breakdown is not available for this test.</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                            Your score: {selectedReport.score}/{selectedReport.totalQuestions} ({Math.round((selectedReport.score / selectedReport.totalQuestions) * 100)}%)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedReport.score} Correct</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedReport.totalQuestions - selectedReport.score} Incorrect</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                    Close Report
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Note Detail Modal */}
            <AnimatePresence>
                {selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedNote(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">
                                            {selectedNote.subject}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedNote.contentType === 'json' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                            {selectedNote.contentType.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h3>
                                    {selectedNote.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedNote.description}</p>
                                    )}
                                </div>
                                <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                                {selectedNote.contentType === 'json' ? (
                                    (() => {
                                        try {
                                            const jsonContent = JSON.parse(selectedNote.content);
                                            return (
                                                <div className="space-y-6">
                                                    {/* Title if present */}
                                                    {jsonContent.title && (
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{jsonContent.title}</h4>
                                                    )}

                                                    {/* Topics */}
                                                    {jsonContent.topics && Array.isArray(jsonContent.topics) && (
                                                        <div className="space-y-4">
                                                            {jsonContent.topics.map((topic: { name?: string; content?: string; keyPoints?: string[]; formulas?: string[] }, idx: number) => (
                                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                                    {topic.name && <h5 className="font-semibold text-gray-900 dark:text-white mb-2">{topic.name}</h5>}
                                                                    {topic.content && <p className="text-gray-700 dark:text-gray-300 mb-3">{topic.content}</p>}
                                                                    {topic.keyPoints && topic.keyPoints.length > 0 && (
                                                                        <div className="mb-3">
                                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Key Points:</p>
                                                                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                                                                {topic.keyPoints.map((point: string, i: number) => <li key={i}>{point}</li>)}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                    {topic.formulas && topic.formulas.length > 0 && (
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Formulas:</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {topic.formulas.map((formula: string, i: number) => (
                                                                                    <code key={i} className="px-2 py-1 bg-white dark:bg-gray-900 rounded text-sm font-mono text-purple-600 dark:text-purple-400">{formula}</code>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Summary */}
                                                    {jsonContent.summary && (
                                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Summary</p>
                                                            <p className="text-gray-700 dark:text-gray-300">{jsonContent.summary}</p>
                                                        </div>
                                                    )}

                                                    {/* Important Terms */}
                                                    {jsonContent.importantTerms && Object.keys(jsonContent.importantTerms).length > 0 && (
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Important Terms</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {Object.entries(jsonContent.importantTerms).map(([term, def]) => (
                                                                    <div key={term} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                                        <span className="font-medium text-gray-900 dark:text-white">{term}: </span>
                                                                        <span className="text-gray-600 dark:text-gray-400">{String(def)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Raw JSON fallback for unrecognized structure */}
                                                    {!jsonContent.topics && !jsonContent.summary && !jsonContent.importantTerms && (
                                                        <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-x-auto text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                            {JSON.stringify(jsonContent, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            );
                                        } catch {
                                            return (
                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                    <p className="text-red-700 dark:text-red-400">Error parsing JSON content. Raw content:</p>
                                                    <pre className="mt-2 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{selectedNote.content}</pre>
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none">
                                        {/* Check if content is a URL */}
                                        {selectedNote.content.startsWith('http://') || selectedNote.content.startsWith('https://') ? (
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                                                <p className="text-blue-700 dark:text-blue-400 mb-4">This is a link to external content:</p>
                                                <a
                                                    href={selectedNote.content}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                    Open Link
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                                {selectedNote.content}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                                <button onClick={() => setSelectedNote(null)} className="px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Detail Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedNotification(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with type-specific color */}
                            <div className={`p-6 ${selectedNotification.type === 'test' ? 'bg-blue-500' :
                                    selectedNotification.type === 'note' ? 'bg-green-500' :
                                        'bg-amber-500'
                                } text-white`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        {selectedNotification.type === 'test' ? (
                                            <FileText className="w-6 h-6" />
                                        ) : selectedNotification.type === 'note' ? (
                                            <BookMarked className="w-6 h-6" />
                                        ) : (
                                            <Megaphone className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-80">
                                            {selectedNotification.type === 'test' ? 'New Test' :
                                                selectedNotification.type === 'note' ? 'Study Material' :
                                                    'Announcement'}
                                        </p>
                                        <h3 className="text-lg font-bold">{selectedNotification.title}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4">
                                    {selectedNotification.message}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    {selectedNotification.subject && (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            {selectedNotification.subject}
                                        </span>
                                    )}
                                    <span>
                                        {new Date(selectedNotification.createdAt).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                {selectedNotification.createdByName && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                                        From: <span className="font-medium">{selectedNotification.createdByName}</span>
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                                <button
                                    onClick={() => {
                                        handleDismissNotification(selectedNotification.id);
                                        setSelectedNotification(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
