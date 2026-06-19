'use client';

/**
 * DetailedAnalytics — Premium-gated analytics dashboard.
 * Shows subject-wise performance, trends, and class rank.
 * Non-premium users see a blurred preview with upgrade CTA.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    Target,
    Award,
    Lock,
    Crown,
    Flame,
    BookOpen,
} from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsByStudent } from '@/lib/services';
import type { TestResult, MistakeBucketItem } from '@/types';
import Link from 'next/link';

interface DetailedAnalyticsProps {
    mistakeBucketItems?: MistakeBucketItem[];
}

interface SubjectStats {
    subject: string;
    avgScore: number;
    testsCount: number;
    bestScore: number;
    worstScore: number;
}

export default function DetailedAnalytics({ mistakeBucketItems = [] }: DetailedAnalyticsProps) {
    const { isPremium } = usePremium();
    const { user } = useAuth();
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        getResultsByStudent(user.uid)
            .then(setResults)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user?.uid]);

    // ─── Compute Analytics ───────────────────────────────────────

    const subjectStats = useMemo((): SubjectStats[] => {
        const map: Record<string, { scores: number[]; count: number }> = {};
        results.forEach(r => {
            if (r.totalQuestions <= 0 || r.isPdfTest) return;
            const pct = Math.round((r.score / r.totalQuestions) * 100);
            if (!map[r.subject]) map[r.subject] = { scores: [], count: 0 };
            map[r.subject].scores.push(pct);
            map[r.subject].count++;
        });

        return Object.entries(map).map(([subject, data]) => ({
            subject,
            avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            testsCount: data.count,
            bestScore: Math.max(...data.scores),
            worstScore: Math.min(...data.scores),
        })).sort((a, b) => b.avgScore - a.avgScore);
    }, [results]);

    const recentTrend = useMemo(() => {
        const sorted = [...results]
            .filter(r => r.totalQuestions > 0 && !r.isPdfTest)
            .sort((a, b) => {
                const ta = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
                const tb = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
                return ta.getTime() - tb.getTime();
            })
            .slice(-10);

        return sorted.map(r => ({
            score: Math.round((r.score / r.totalQuestions) * 100),
            label: r.subject.substring(0, 3),
        }));
    }, [results]);

    const weakTopics = useMemo(() => {
        const topicMap: Record<string, { wrong: number; total: number }> = {};
        mistakeBucketItems.forEach(item => {
            const key = item.subject;
            if (!topicMap[key]) topicMap[key] = { wrong: 0, total: 0 };
            topicMap[key].wrong++;
            topicMap[key].total++;
        });

        return Object.entries(topicMap)
            .map(([topic, data]) => ({ topic, errors: data.wrong }))
            .sort((a, b) => b.errors - a.errors)
            .slice(0, 6);
    }, [mistakeBucketItems]);

    const overallAvg = useMemo(() => {
        const scorable = results.filter(r => r.totalQuestions > 0 && !r.isPdfTest);
        if (scorable.length === 0) return 0;
        return Math.round(
            scorable.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / scorable.length
        );
    }, [results]);

    // ─── Render ──────────────────────────────────────────────────

    const analyticsContent = (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: BarChart3, label: 'Avg Score', value: `${overallAvg}%`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { icon: BookOpen, label: 'Tests Taken', value: `${results.filter(r => !r.isPdfTest).length}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    { icon: Flame, label: 'Streak', value: `${user?.currentStreak || 0}d`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                    { icon: Target, label: 'Mistakes', value: `${mistakeBucketItems.filter(m => !m.isMastered).length}`, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`${stat.bg} rounded-2xl p-3.5 text-center`}
                    >
                        <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Subject Performance Bars */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1650EB]" />
                    Subject Performance
                </h3>
                <div className="space-y-3">
                    {subjectStats.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Take some tests to see analytics</p>
                    ) : (
                        subjectStats.map((stat, i) => (
                            <motion.div
                                key={stat.subject}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{stat.subject}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{stat.avgScore}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stat.avgScore}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: stat.avgScore >= 80
                                                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                                : stat.avgScore >= 60
                                                    ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                                                    : stat.avgScore >= 40
                                                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-gray-400">{stat.testsCount} tests</span>
                                    <span className="text-[10px] text-gray-400">Best: {stat.bestScore}%</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Score Trend */}
            {recentTrend.length >= 2 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Score Trend (Last {recentTrend.length} Tests)
                    </h3>
                    <div className="relative h-32">
                        <svg viewBox={`0 0 ${recentTrend.length * 40} 100`} className="w-full h-full" preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[25, 50, 75].map(y => (
                                <line key={y} x1="0" y1={100 - y} x2={recentTrend.length * 40} y2={100 - y}
                                    stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" strokeDasharray="4 4" />
                            ))}
                            {/* Gradient area */}
                            <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#1650EB" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#1650EB" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points={`${recentTrend.map((p, i) => `${i * 40 + 20},${100 - p.score}`).join(' ')} ${(recentTrend.length - 1) * 40 + 20},100 20,100`}
                                fill="url(#trendGrad)"
                            />
                            {/* Line */}
                            <polyline
                                points={recentTrend.map((p, i) => `${i * 40 + 20},${100 - p.score}`).join(' ')}
                                fill="none"
                                stroke="#1650EB"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Dots */}
                            {recentTrend.map((p, i) => (
                                <circle key={i} cx={i * 40 + 20} cy={100 - p.score} r="3" fill="#1650EB" stroke="white" strokeWidth="1.5" />
                            ))}
                        </svg>
                        {/* Labels */}
                        <div className="flex justify-between mt-1 px-2">
                            {recentTrend.map((p, i) => (
                                <span key={i} className="text-[9px] text-gray-400 font-medium">{p.label}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Weak Topics */}
            {weakTopics.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-rose-500" />
                        Areas to Improve
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {weakTopics.map((topic, i) => (
                            <div
                                key={topic.topic}
                                className="p-2.5 rounded-xl text-center"
                                style={{
                                    background: `rgba(239, 68, 68, ${0.05 + (i === 0 ? 0.1 : i === 1 ? 0.07 : 0.03)})`,
                                }}
                            >
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{topic.topic}</p>
                                <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{topic.errors} mistake{topic.errors > 1 ? 's' : ''}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* XP & Achievement Summary */}
            <div className="bg-gradient-to-br from-[#1650EB]/5 to-purple-500/5 dark:from-[#1650EB]/10 dark:to-purple-500/10 rounded-2xl p-4 border border-[#1650EB]/10 dark:border-[#1650EB]/20">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Your Journey
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-lg font-bold text-[#1650EB]">{(user?.xp || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Total XP</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-amber-500">{user?.longestStreak || 0}</p>
                        <p className="text-[10px] text-gray-500">Best Streak</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-emerald-500">{mistakeBucketItems.filter(m => m.isMastered).length}</p>
                        <p className="text-[10px] text-gray-500">Mastered</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // If not premium, show blurred preview
    if (!isPremium) {
        return (
            <div className="relative">
                <div className="filter blur-[6px] pointer-events-none select-none opacity-60">
                    {analyticsContent}
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-gray-950/40 backdrop-blur-sm rounded-2xl z-10">
                    <div className="text-center px-6 py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Premium Analytics</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
                            Unlock detailed subject breakdown, score trends, and improvement insights.
                        </p>
                        <Link
                            href="/premium"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all hover:-translate-y-0.5"
                        >
                            <Crown className="w-4 h-4" />
                            Unlock with Premium
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#1650EB] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return analyticsContent;
}
