'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
    RefreshCw,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Timer,
    BookMarked,
    ExternalLink,
    Trash2,
    Megaphone,
    Coins,
    ShoppingCart,
    Gift,
    History,
    Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsByStudent, hasStudentTakenTest, markNotificationAsViewed, deleteNotification } from '@/lib/services';
import {
    getOrCreateWallet,
    getStudentTransactions,
    getStudentBadges,
    deductCoinsForTest,
    getGlowProgress,
    hasGlowStatus,
    getPremiumTestById,
    incrementPremiumTestAttempts,
    getAppSettings
} from '@/lib/creditServices';
import type { Test, TestResult, SubjectNote, Notification, CreditWallet, CreditTransaction, UserBadge, PremiumTest } from '@/types';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import {
    WalletDisplay,
    GlowProfileFrame,
    BadgesCollection,
    TransactionHistory,
    PremiumTestCard,
    RewardPopup,
    GlowStatusIndicator
} from '@/components/CreditEconomy';
import { useChat } from '@/contexts/ChatContext';

export default function StudentDashboard() {
    const { user, loading: authLoading, signOut, refreshUser } = useAuth();
    const { totalUnreadCount } = useChat();
    const router = useRouter();

    const [tests, setTests] = useState<Test[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [takenTests, setTakenTests] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [comingSoonFeature, setComingSoonFeature] = useState('');

    // New test notification
    const [newTestNotification, setNewTestNotification] = useState<Test | null>(null);

    // My Reports state
    const [activeTab, setActiveTab] = useState<'tests' | 'reports' | 'notes' | 'premium'>('tests');
    const [selectedReport, setSelectedReport] = useState<TestResult | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // New reports notification state
    const [newReportsCount, setNewReportsCount] = useState(0);
    const [lastSeenReportsCount, setLastSeenReportsCount] = useState(0);
    const [newReportNotification, setNewReportNotification] = useState<TestResult | null>(null);

    // Notes state
    const [notes, setNotes] = useState<SubjectNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<SubjectNote | null>(null);



    // Notification state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [viewedNotificationIds, setViewedNotificationIds] = useState<Set<string>>(new Set());
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    // Read notes tracking (persisted in localStorage)
    const [readNoteIds, setReadNoteIds] = useState<Set<string>>(new Set());

    // Countdown timers for scheduled tests
    const [countdowns, setCountdowns] = useState<{ [testId: string]: string }>({});

    // ==================== CREDIT ECONOMY STATES ====================
    const [wallet, setWallet] = useState<CreditWallet | null>(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [premiumTests, setPremiumTests] = useState<PremiumTest[]>([]);
    const [premiumTestsLoading, setPremiumTestsLoading] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showBadgesModal, setShowBadgesModal] = useState(false);
    const [showRewardPopup, setShowRewardPopup] = useState(false);
    const [rewardData, setRewardData] = useState<{ badge?: UserBadge; coinsEarned?: number; message?: string } | null>(null);
    const [attemptingPremiumTest, setAttemptingPremiumTest] = useState<string | null>(null);
    const [glowProgress, setGlowProgress] = useState({ spent: 0, threshold: 40, percentage: 0, hasGlow: false });
    const [hasNewPremiumTests, setHasNewPremiumTests] = useState(false);
    const [lastSeenPremiumTestCount, setLastSeenPremiumTestCount] = useState(0);
    const [showGlowCelebration, setShowGlowCelebration] = useState(false);
    const [previousGlowSpent, setPreviousGlowSpent] = useState(0);
    const [showInitialSparkles, setShowInitialSparkles] = useState(false);
    const [creditEconomyEnabled, setCreditEconomyEnabled] = useState(true);

    // Detect when glow threshold is reached and trigger celebration
    useEffect(() => {
        if (!user?.uid) return;

        // Get current week key for localStorage
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekKey = `glowCelebrated_${user.uid}_${weekStart.toISOString().split('T')[0]}`;

        // Check if we've already celebrated this week
        const alreadyCelebrated = localStorage.getItem(weekKey) === 'true';

        // Trigger celebration if reached 40 and not already celebrated this week
        if (glowProgress.spent >= 40 && !alreadyCelebrated) {
            setShowGlowCelebration(true);
            localStorage.setItem(weekKey, 'true');
            // Auto-hide after 5 seconds
            setTimeout(() => setShowGlowCelebration(false), 5000);
        }

        setPreviousGlowSpent(glowProgress.spent);
    }, [glowProgress.spent, user?.uid]);

    // Show sparkles only once when glow is first detected
    useEffect(() => {
        if (glowProgress.spent >= 40 && user?.uid) {
            const sparkleShown = localStorage.getItem(`sparklesShown_${user.uid}_${new Date().toDateString()}`);
            if (!sparkleShown) {
                setShowInitialSparkles(true);
                localStorage.setItem(`sparklesShown_${user.uid}_${new Date().toDateString()}`, 'true');
                // Hide after 5 seconds
                setTimeout(() => setShowInitialSparkles(false), 5000);
            }
        }
    }, [glowProgress.spent, user?.uid]);

    // Real-time listener for app settings (credit economy toggle)
    useEffect(() => {
        const settingsRef = doc(db, COLLECTIONS.APP_SETTINGS, 'main');
        const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setCreditEconomyEnabled(data.creditEconomyEnabled ?? true);
            }
        });
        return () => unsubscribe();
    }, []);

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

    // Ref to track if credit data has been loaded (prevents duplicate calls)
    const creditDataLoadedRef = useRef(false);

    // Load credit economy data (wallet, transactions, badges, premium tests)
    const loadCreditEconomyData = useCallback(async () => {
        if (!user?.uid || !user?.studentClass) return;

        // Prevent duplicate loading
        if (creditDataLoadedRef.current) return;
        creditDataLoadedRef.current = true;

        setWalletLoading(true);
        try {
            // Load wallet (creates one if doesn't exist)
            const walletData = await getOrCreateWallet(user);
            setWallet(walletData);

            // Load transactions
            const txData = await getStudentTransactions(user.uid);
            setTransactions(txData);

            // Load badges
            const badgesData = await getStudentBadges(user.uid);
            setBadges(badgesData);

            // Load glow progress
            const progressData = await getGlowProgress(user.uid);
            setGlowProgress(progressData);

            // Premium tests are loaded via real-time listener, no need to fetch here
        } catch (error) {
            console.error('Error loading credit economy data:', error);
            // Reset ref on error so it can retry
            creditDataLoadedRef.current = false;
        } finally {
            setWalletLoading(false);
        }
    }, [user]);

    // Handle premium test attempt
    const handlePremiumTestAttempt = async (test: PremiumTest) => {
        if (!user || !wallet) return;

        setAttemptingPremiumTest(test.id);

        try {
            // Check if test is free (mandatory)
            if (!test.isMandatory && test.coinCost > 0) {
                // Deduct coins
                const result = await deductCoinsForTest(
                    user.uid,
                    user.name,
                    test.id,
                    test.title,
                    test.coinCost,
                    true // isPremiumTest = true (doesn't count for rewards)
                );

                if (!result.success) {
                    alert(result.message);
                    setAttemptingPremiumTest(null);
                    return;
                }

                // Update wallet balance locally
                setWallet(prev => prev ? { ...prev, balance: result.newBalance } : null);
            }

            // Increment attempt count
            await incrementPremiumTestAttempts(test.id);

            // Navigate to test - use testId if linked to actual test, otherwise use premium test id
            const targetTestId = test.testId || test.id;
            router.push(`/test/${targetTestId}?premium=true`);

        } catch (error) {
            console.error('Error attempting premium test:', error);
            alert('Failed to start test. Please try again.');
        } finally {
            setAttemptingPremiumTest(null);
        }
    };

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
            // Reset the ref when user changes so data can be loaded
            creditDataLoadedRef.current = false;
            loadData();
            loadCreditEconomyData(); // Load credit economy data
        }
    }, [user, authLoading, router, loadData, loadCreditEconomyData]);

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

    // Real-time listener for premium tests
    useEffect(() => {
        if (!user?.studentClass) return;

        const premiumTestsRef = collection(db, COLLECTIONS.PREMIUM_TESTS);
        const q = query(
            premiumTestsRef,
            where('targetClass', '==', user.studentClass),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tests: PremiumTest[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                tests.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                } as PremiumTest);
            });

            // Check if there are new premium tests
            if (tests.length > lastSeenPremiumTestCount && lastSeenPremiumTestCount > 0) {
                setHasNewPremiumTests(true);
            }

            setPremiumTests(tests);
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.studentClass]); // Only re-subscribe when class changes, not lastSeenPremiumTestCount

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

    // Handle deleting notification completely
    const handleDismissNotification = async (notificationId: string) => {
        if (!user?.uid) return;

        try {
            await deleteNotification(notificationId);
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
        { icon: MessageSquare, label: 'Chat', color: 'bg-pink-100 dark:bg-pink-900/50', iconColor: 'text-pink-600 dark:text-pink-400', comingSoon: false, href: '/chat' },
        { icon: HelpCircle, label: 'Help Center', color: 'bg-orange-100 dark:bg-orange-900/50', iconColor: 'text-orange-600 dark:text-orange-400', comingSoon: true },
    ];

    // Check if user has glow status (completed 40 coins)
    const hasActiveGlow = glowProgress.spent >= 40;

    // Get glow color based on current hour (changes every 3 hours)
    const getGlowColors = () => {
        const hour = new Date().getHours();
        const colorSet = Math.floor(hour / 3) % 4;
        const colors = [
            { from: 'from-amber-50', via: 'via-yellow-50', to: 'to-orange-50', dark: 'dark:via-amber-950/20', border: 'from-amber-400 via-yellow-400 to-orange-400', glow1: 'from-amber-400/20 via-yellow-400/10', glow2: 'from-orange-400/20 via-amber-400/10' },
            { from: 'from-pink-50', via: 'via-rose-50', to: 'to-red-50', dark: 'dark:via-pink-950/20', border: 'from-pink-400 via-rose-400 to-red-400', glow1: 'from-pink-400/20 via-rose-400/10', glow2: 'from-red-400/20 via-pink-400/10' },
            { from: 'from-cyan-50', via: 'via-teal-50', to: 'to-emerald-50', dark: 'dark:via-cyan-950/20', border: 'from-cyan-400 via-teal-400 to-emerald-400', glow1: 'from-cyan-400/20 via-teal-400/10', glow2: 'from-emerald-400/20 via-cyan-400/10' },
            { from: 'from-violet-50', via: 'via-purple-50', to: 'to-fuchsia-50', dark: 'dark:via-violet-950/20', border: 'from-violet-400 via-purple-400 to-fuchsia-400', glow1: 'from-violet-400/20 via-purple-400/10', glow2: 'from-fuchsia-400/20 via-violet-400/10' }
        ];
        return colors[colorSet];
    };

    const glowColors = getGlowColors();

    return (
        <div className={`min-h-screen ${hasActiveGlow ? `bg-gradient-to-br ${glowColors.from} ${glowColors.via} ${glowColors.to} dark:from-gray-950 ${glowColors.dark} dark:to-gray-950` : 'bg-gray-50 dark:bg-gray-950'} relative overflow-hidden`}>
            {/* Glow Effect Overlay for completed users */}
            {hasActiveGlow && (
                <>
                    {/* Animated gradient border at top */}
                    <div className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r ${glowColors.border} animate-pulse z-[999]`} />

                    {/* Floating sparkles - only show for 5 seconds initially */}
                    <AnimatePresence>
                        {showInitialSparkles && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
                            >
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: '100vh', x: `${Math.random() * 100}vw` }}
                                        animate={{
                                            opacity: [0, 1, 1, 0],
                                            y: [-20, window?.innerHeight || 800],
                                            x: `${20 + Math.random() * 60}vw`
                                        }}
                                        transition={{
                                            duration: 3 + Math.random() * 2,
                                            delay: Math.random() * 2,
                                            ease: 'linear'
                                        }}
                                        className="absolute text-2xl"
                                    >
                                        {['✨', '⭐', '🌟', '💫', '🎉'][Math.floor(Math.random() * 5)]}
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Corner glow effects - permanent */}
                    <div className={`fixed top-0 left-0 w-96 h-96 bg-gradient-radial ${glowColors.glow1} to-transparent rounded-full blur-3xl pointer-events-none`} />
                    <div className={`fixed bottom-0 right-0 w-96 h-96 bg-gradient-radial ${glowColors.glow2} to-transparent rounded-full blur-3xl pointer-events-none`} />
                </>
            )}
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
                                        className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-20 sm:top-full sm:mt-2 sm:w-80 max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[60]"
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

                        {/* Coin Balance Display */}
                        {creditEconomyEnabled && (
                            <WalletDisplay
                                wallet={wallet}
                                loading={walletLoading}
                                compact={true}
                                onClick={() => setShowWalletModal(true)}
                            />
                        )}



                        <Link
                            href="/chat"
                            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#1650EB]/10 to-[#6095DB]/10 hover:from-[#1650EB]/20 hover:to-[#6095DB]/20 transition-colors group"
                            title="Chat with Teacher"
                        >
                            <div className="relative">
                                <MessageSquare className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="hidden sm:inline text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">Chat</span>
                        </Link>

                        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" title="Profile Settings">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Class {user.studentClass}</p>
                            </div>
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-[#1650EB] transition-all"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-[#1650EB] transition-all">
                                    <User className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                </div>
                            )}
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
                    className="mb-6 relative overflow-hidden"
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
                                {/* First-time user: no results */}
                                {results.length === 0 ? (
                                    <>Welcome, <span className="bg-gradient-to-r from-[#1650EB] to-[#6095DB] bg-clip-text text-transparent">{user.name}</span>! 🎉</>
                                ) : (
                                    <>Welcome back, <span className="bg-gradient-to-r from-[#1650EB] to-[#6095DB] bg-clip-text text-transparent">{user.name}</span>! 👋</>
                                )}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {results.length === 0 ? (
                                    "Let's get started with your first test! Pick one below."
                                ) : (
                                    `You've completed ${results.length} test${results.length > 1 ? 's' : ''}. Keep up the great work!`
                                )}
                            </p>
                        </div>

                    </div>
                </motion.div>

                {/* Tab Navigation - Moved below greeting */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
                    <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <button
                            onClick={() => setActiveTab('tests')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'tests' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
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
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
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
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'notes' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <BookMarked className="w-4 h-4" /> Study Notes
                            {unreadNotesCount > 0 && (
                                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                    {unreadNotesCount}
                                </span>
                            )}
                        </button>
                        {creditEconomyEnabled && (
                            <button
                                onClick={() => {
                                    setActiveTab('premium');
                                    setHasNewPremiumTests(false);
                                    setLastSeenPremiumTestCount(premiumTests.length);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'premium' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                            >
                                <Star className="w-4 h-4" /> Premium Tests
                                {hasNewPremiumTests && activeTab !== 'premium' && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                        New
                                    </span>
                                )}
                            </button>
                        )}

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
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className="inline-block px-3 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full">{test.subject}</span>
                                                        {test.isPremium && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-medium rounded-full">
                                                                <Star className="w-3 h-3" /> Premium
                                                            </span>
                                                        )}
                                                        {test.coinCost && test.coinCost > 0 && !test.isMandatory && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                                                <Coins className="w-3 h-3" /> {test.coinCost}
                                                            </span>
                                                        )}
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

                {/* Premium Tests Tab */}
                {activeTab === 'premium' && creditEconomyEnabled && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    ⭐ Premium Tests
                                    <GlowStatusIndicator hasGlow={glowProgress.hasGlow} />
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Use your coins to attempt special tests. These don&apos;t count toward glow rewards.
                                </p>
                            </div>
                        </div>

                        {/* Available Premium Tests - FIRST */}
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Available Premium Tests
                        </h4>
                        {premiumTests.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mb-8">
                                <Star className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No premium tests available for your class yet.</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Check back later for special tests from your teachers!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {premiumTests.map((test) => (
                                    <PremiumTestCard
                                        key={test.id}
                                        test={test}
                                        canAfford={wallet ? wallet.balance >= test.coinCost : false}
                                        onAttempt={handlePremiumTestAttempt}
                                        loading={attemptingPremiumTest === test.id}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Wallet & Glow Progress Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Wallet Card */}
                            <WalletDisplay wallet={wallet} loading={walletLoading} />

                            {/* Badges & History Quick Access */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                                            <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Your Badges</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{badges.length} earned</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowBadgesModal(true)}
                                        className="text-sm text-[#1650EB] dark:text-[#6095DB] hover:underline"
                                    >
                                        View All
                                    </button>
                                </div>
                                <BadgesCollection badges={badges} maxDisplay={4} onViewAll={() => setShowBadgesModal(true)} />
                            </div>
                        </div>

                        {/* Transaction History - LAST */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <History className="w-4 h-4" /> Recent Transactions
                                </h4>
                                <button
                                    onClick={() => setShowWalletModal(true)}
                                    className="text-sm text-[#1650EB] dark:text-[#6095DB] hover:underline"
                                >
                                    View All
                                </button>
                            </div>
                            <TransactionHistory transactions={transactions} maxDisplay={5} />
                        </div>
                    </motion.div>
                )}

                {/* Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚡ Quick Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {quickActions.map((action, index) => (
                            <motion.div
                                key={action.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                            >
                                {action.href ? (
                                    <Link
                                        href={action.href}
                                        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#6095DB]/50 dark:hover:border-[#1243c7] transition-all group flex items-center gap-3"
                                    >
                                        <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</p>
                                        </div>
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleComingSoon(action.label)}
                                        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-[#6095DB]/50 dark:hover:border-[#1243c7] transition-all group flex items-center gap-3"
                                    >
                                        <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</p>
                                            {action.comingSoon && <p className="text-xs text-gray-400">Coming Soon</p>}
                                        </div>
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

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

            {/* Wallet Detail Modal */}
            <AnimatePresence>
                {showWalletModal && wallet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowWalletModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 bg-gradient-to-r from-amber-400 to-yellow-500 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Coins className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-white/80 text-sm">Your Balance</p>
                                            <p className="text-3xl font-bold">{wallet.balance} Coins</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowWalletModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Glow Progress */}
                                <div className="mt-4 p-3 bg-white/20 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm">
                                            {glowProgress.spent >= 40 ? '🎉 Glow Status Unlocked!' : 'Progress to Glow Status'}
                                        </span>
                                        <span className="font-bold">{glowProgress.spent}/{glowProgress.threshold}</span>
                                    </div>
                                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full transition-all ${glowProgress.spent >= 40 ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400' : 'bg-white'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(glowProgress.percentage, 100)}%` }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                        />
                                    </div>
                                    {glowProgress.spent >= 40 ? (
                                        <motion.p
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs mt-2 flex items-center gap-1 text-amber-200"
                                        >
                                            <Sparkles className="w-3 h-3" /> Hurray! You completed the task! Enjoy your perks! ✨
                                        </motion.p>
                                    ) : glowProgress.hasGlow ? (
                                        <p className="text-xs mt-2 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> Colors change every 3 hours!
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 max-h-[400px] overflow-y-auto">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <History className="w-4 h-4" /> Transaction History
                                </h4>
                                <TransactionHistory transactions={transactions} maxDisplay={20} />
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                    <span>Total Earned: {wallet.totalEarned} coins</span>
                                    <span>Total Spent: {wallet.totalSpent} coins</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Badges Modal */}
            <AnimatePresence>
                {showBadgesModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBadgesModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Badges</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{badges.length} badges earned</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBadgesModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 max-h-[500px] overflow-y-auto">
                                {badges.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Award className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">No badges earned yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Complete tests and spend coins to earn badges!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {badges.map((badge) => (
                                            <div
                                                key={badge.id}
                                                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-12 h-12 bg-gradient-to-br ${badge.badgeColor} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                                        <span className="text-2xl">{badge.badgeIcon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-semibold text-gray-900 dark:text-white">{badge.badgeName}</p>
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.badgeRarity === 'legendary' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                                badge.badgeRarity === 'epic' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                                    badge.badgeRarity === 'rare' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                                }`}>
                                                                {badge.badgeRarity}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{badge.awardReason}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                            {new Date(badge.earnedAt).toLocaleDateString('en-IN', {
                                                                day: 'numeric', month: 'short', year: 'numeric'
                                                            })}
                                                            {badge.awardedByName && ` • Awarded by ${badge.awardedByName}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reward Popup */}
            <RewardPopup
                isOpen={showRewardPopup}
                onClose={() => {
                    setShowRewardPopup(false);
                    setRewardData(null);
                }}
                badge={rewardData?.badge}
                coinsEarned={rewardData?.coinsEarned}
                message={rewardData?.message}
            />

            {/* Glow Celebration Popup */}
            <AnimatePresence>
                {showGlowCelebration && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowGlowCelebration(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0, y: 50 }}
                            transition={{ type: 'spring', damping: 15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 rounded-3xl p-1 shadow-2xl max-w-sm w-full"
                        >
                            <div className="bg-white dark:bg-gray-900 rounded-[22px] p-8 text-center relative overflow-hidden">
                                {/* Sparkle animations */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{
                                                opacity: [0, 1, 0],
                                                scale: [0, 1, 0],
                                                x: Math.random() * 300 - 150,
                                                y: Math.random() * 300 - 150
                                            }}
                                            transition={{
                                                duration: 2,
                                                delay: Math.random() * 2,
                                                repeat: Infinity
                                            }}
                                            className="absolute left-1/2 top-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                                        />
                                    ))}
                                </div>

                                {/* Glowing icon */}
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50"
                                >
                                    <Sparkles className="w-12 h-12 text-white" />
                                </motion.div>

                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-3xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-3"
                                >
                                    🎉 Congratulations! 🎉
                                </motion.h2>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-lg text-gray-600 dark:text-gray-400 mb-4"
                                >
                                    You&apos;ve unlocked <span className="font-bold text-amber-600">Glow Status</span> for 24 hours!
                                </motion.p>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl p-4 mb-6"
                                >
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        ✨ Your dashboard now <strong>glows</strong> with special effects!<br />
                                        🎨 Colors change every 3 hours!<br />
                                        💎 Keep spending coins to maintain your status!
                                    </p>
                                </motion.div>

                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={() => setShowGlowCelebration(false)}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 transition-all"
                                >
                                    Awesome! 🌟
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
