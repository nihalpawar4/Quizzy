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
    Flame
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestsByClass, getResultsByStudent, hasStudentTakenTest, getTopPerformers, canClaimStreakToday, claimDailyStreak } from '@/lib/services';
import type { Test, TestResult } from '@/types';
import type { LeaderboardEntry } from '@/lib/services';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export default function StudentDashboard() {
    const { user, loading: authLoading, signOut } = useAuth();
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
    const [activeTab, setActiveTab] = useState<'tests' | 'reports'>('tests');
    const [selectedReport, setSelectedReport] = useState<TestResult | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Streak state
    const [streakLoading, setStreakLoading] = useState(false);
    const [streakMessage, setStreakMessage] = useState<string | null>(null);

    // Update current time every minute for report availability check
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Check if report is available (between 1 hour and 6 hours after submission)
    const isReportAvailable = (result: TestResult): boolean => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const oneHourLater = new Date(submittedAt.getTime() + 60 * 60 * 1000); // 1 hour
        const sixHoursLater = new Date(submittedAt.getTime() + 6 * 60 * 60 * 1000); // 6 hours
        return currentTime >= oneHourLater && currentTime < sixHoursLater;
    };

    // Check if report has expired (after 6 hours)
    const isReportExpired = (result: TestResult): boolean => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const sixHoursLater = new Date(submittedAt.getTime() + 6 * 60 * 60 * 1000);
        return currentTime >= sixHoursLater;
    };

    // Get time remaining until report is available or expires
    const getTimeRemaining = (result: TestResult): string => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const oneHourLater = new Date(submittedAt.getTime() + 60 * 60 * 1000);
        const sixHoursLater = new Date(submittedAt.getTime() + 6 * 60 * 60 * 1000);

        if (currentTime < oneHourLater) {
            // Not yet available
            const diff = oneHourLater.getTime() - currentTime.getTime();
            const minutes = Math.ceil(diff / 60000);
            if (minutes >= 60) {
                return `Available in ${Math.ceil(minutes / 60)} hr`;
            }
            return `Available in ${minutes} min`;
        } else if (currentTime < sixHoursLater) {
            // Available, show expiry time
            const diff = sixHoursLater.getTime() - currentTime.getTime();
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

    // Handle streak claim
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
                // Reload page to get updated user data
                setTimeout(() => {
                    setStreakMessage(null);
                    window.location.reload();
                }, 2000);
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

    const loadData = useCallback(async () => {
        if (!user?.studentClass || !user?.uid) return;

        try {
            setLoading(true);
            const testsData = await getTestsByClass(user.studentClass);
            setTests(testsData);
            const resultsData = await getResultsByStudent(user.uid);
            setResults(resultsData);
            const taken = new Set<string>();
            for (const test of testsData) {
                const hasTaken = await hasStudentTakenTest(user.uid, test.id);
                if (hasTaken) taken.add(test.id);
            }
            setTakenTests(taken);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.studentClass, user?.uid]);

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

    // Real-time listener for new tests
    useEffect(() => {
        if (!user?.studentClass) return;

        const testsRef = collection(db, COLLECTIONS.TESTS);
        const q = query(
            testsRef,
            where('targetClass', '==', user.studentClass),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.toDate() || new Date();
                    const now = new Date();
                    const timeDiff = now.getTime() - createdAt.getTime();

                    // Show notification only for tests created in the last 30 seconds
                    if (timeDiff < 30000) {
                        const newTest: Test = {
                            id: change.doc.id,
                            ...data,
                            createdAt
                        } as Test;
                        setNewTestNotification(newTest);

                        // Refresh tests list
                        loadData();

                        // Auto-hide notification after 10 seconds
                        setTimeout(() => setNewTestNotification(null), 10000);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [user?.studentClass, loadData]);

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
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-[#1650EB] to-[#1650EB] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-white animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold">New Test Available! 🎉</p>
                            <p className="text-sm text-white/90">{newTestNotification.title} - {newTestNotification.subject}</p>
                        </div>
                        <button
                            onClick={() => setNewTestNotification(null)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
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
                            onClick={() => setActiveTab('reports')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <FileText className="w-4 h-4" /> My Reports
                            {results.length > 0 && (
                                <span className="bg-[#1650EB] text-white text-xs px-2 py-0.5 rounded-full">{results.length}</span>
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
                                    return (
                                        <motion.div
                                            key={test.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${hasTaken ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-800'} hover:shadow-lg transition-shadow`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <span className="inline-block px-3 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full mb-2">{test.subject}</span>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{test.title}</h4>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                <span>{test.questionCount || '?'} Questions</span>
                                                {test.duration && <span>{test.duration} min</span>}
                                            </div>
                                            {hasTaken && result ? (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <Trophy className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Score: {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)</span>
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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reports available 1-6 hours after test</p>
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
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl">
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
        </div>
    );
}
