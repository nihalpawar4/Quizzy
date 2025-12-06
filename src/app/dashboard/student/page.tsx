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
    RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestsByClass, getResultsByStudent, hasStudentTakenTest, getTopPerformers } from '@/lib/services';
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
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
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
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
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
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white">Quizy</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Student Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" title="Profile Settings">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Class {user.studentClass}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </Link>
                        <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Sign Out">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome back, {user.name}! 👋
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Ready to test your knowledge? Choose a test below to get started.
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageScore}%</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Available Tests - FIRST */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        📚 Available Tests for Class {user.studentClass}
                    </h3>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
                                                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full mb-2">{test.subject}</span>
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
                                            <Link href={`/test/${test.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                                                Start Test <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

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
                                <button onClick={loadLeaderboard} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Refresh">
                                    <RefreshCw className={`w-5 h-5 ${leaderboardLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {leaderboardLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
                                                    {entry.studentName} {entry.studentId === user.uid && <span className="text-xs text-indigo-600 dark:text-indigo-400">(You)</span>}
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
                                        <button onClick={() => setShowAllLeaderboard(!showAllLeaderboard)} className="w-full py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">#{userRank.rank}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">Your Rank</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{userRank.totalTests} tests completed</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{userRank.averageScore}%</p>
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
                                    className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex items-center gap-3"
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
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Coming Soon!</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{comingSoonFeature}</span> is under development and will be available soon. Stay tuned!
                            </p>
                            <button onClick={() => setShowComingSoon(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                                <X className="w-4 h-4" /> Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
