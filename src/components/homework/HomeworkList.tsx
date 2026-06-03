'use client';

/**
 * HomeworkList Component — Premium 2026 EdTech Redesign
 * Accordion-style homework cards with stats strip
 * Glassmorphism, soft gradients, Apple/Linear-inspired design
 * Mobile-first responsive design
 * By Nihal Pawar
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    CheckCircle,
    Loader2,
    ArrowRight,
} from 'lucide-react';
import type { Homework } from '@/types/homework';
import { markHomeworkComplete, getStudentHomeworkCompletions } from '@/services/homeworkService';

interface HomeworkListProps {
    homeworks: Homework[];
    loading?: boolean;
    studentId?: string;
    studentName?: string;
    userClass?: number;
}

// Subject icon SVG illustrations
function SubjectIcon({ subject, className = '' }: { subject: string; className?: string }) {
    const size = 'w-full h-full';
    switch (subject) {
        case 'Mathematics':
        case 'Maths':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#dbeafe" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#eff6ff" />
                        <text x="24" y="30" textAnchor="middle" fill="#2563eb" fontSize="18" fontWeight="700" fontFamily="system-ui">+÷</text>
                    </svg>
                </div>
            );
        case 'Science':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#d1fae5" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#ecfdf5" />
                        <path d="M20 14v10l-4 6a2 2 0 001.7 3h12.6a2 2 0 001.7-3l-4-6V14" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <path d="M18 14h12" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="22" cy="29" r="1.5" fill="#059669" opacity="0.5"/>
                        <circle cx="26" cy="27" r="1" fill="#059669" opacity="0.4"/>
                    </svg>
                </div>
            );
        case 'Hindi':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#ffedd5" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#fff7ed" />
                        <text x="24" y="32" textAnchor="middle" fill="#ea580c" fontSize="22" fontWeight="700" fontFamily="system-ui">अ</text>
                    </svg>
                </div>
            );
        case 'English':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#ede9fe" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#f5f3ff" />
                        <text x="24" y="32" textAnchor="middle" fill="#7c3aed" fontSize="22" fontWeight="700" fontFamily="system-ui">A</text>
                    </svg>
                </div>
            );
        case 'Social Studies':
        case 'Social Science':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#fef3c7" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#fffbeb" />
                        <circle cx="24" cy="24" r="9" stroke="#d97706" strokeWidth="2" fill="none"/>
                        <path d="M15 24h18M24 15c-2 3-2 15 0 18M24 15c2 3 2 15 0 18" stroke="#d97706" strokeWidth="1.2" fill="none"/>
                    </svg>
                </div>
            );
        case 'Computer':
        case 'Computer Science':
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#e0e7ff" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#eef2ff" />
                        <rect x="14" y="16" width="20" height="14" rx="2" stroke="#6366f1" strokeWidth="2" fill="none"/>
                        <path d="M18 34h12M24 30v4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </div>
            );
        default:
            // Combined / General
            return (
                <div className={`${className}`}>
                    <svg viewBox="0 0 48 48" fill="none" className={size}>
                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#dcfce7" />
                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#f0fdf4" />
                        <rect x="15" y="13" width="18" height="22" rx="2" stroke="#16a34a" strokeWidth="1.8" fill="none"/>
                        <path d="M19 18h10M19 22h7M19 26h9" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M15 16l3-3v4" fill="#16a34a" opacity="0.4"/>
                    </svg>
                </div>
            );
    }
}

// Subject badge color mapping
function getSubjectBadge(subject: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
        'Mathematics': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
        'Maths': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
        'Science': { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
        'Hindi': { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
        'English': { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
        'Social Studies': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
        'Social Science': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
        'Computer': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
        'Computer Science': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
        'Combined': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    };
    return map[subject] || { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function isOverdue(dueDate?: Date): boolean {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
}

function isDueSoon(dueDate?: Date): boolean {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
}

// Status pill component
function StatusPill({ status }: { status: 'completed' | 'due-soon' | 'in-progress' | 'to-do' | 'overdue' }) {
    const styles = {
        'completed': {
            bg: 'bg-emerald-50 dark:bg-emerald-900/25',
            text: 'text-emerald-600 dark:text-emerald-400',
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            label: 'Completed',
        },
        'due-soon': {
            bg: 'bg-red-50 dark:bg-red-900/25',
            text: 'text-red-500 dark:text-red-400',
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
            label: 'Due Soon',
        },
        'in-progress': {
            bg: 'bg-blue-50 dark:bg-blue-900/25',
            text: 'text-blue-600 dark:text-blue-400',
            icon: <svg className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="20 18"/></svg>,
            label: 'In Progress',
        },
        'to-do': {
            bg: 'bg-gray-50 dark:bg-gray-800/60',
            text: 'text-gray-500 dark:text-gray-400',
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/></svg>,
            label: 'To Do',
        },
        'overdue': {
            bg: 'bg-red-50 dark:bg-red-900/25',
            text: 'text-red-600 dark:text-red-400',
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
            label: 'Overdue',
        },
    };
    const s = styles[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} whitespace-nowrap`}>
            {s.icon}
            {s.label}
        </span>
    );
}

function getHomeworkStatus(hw: Homework, isCompleted: boolean): 'completed' | 'due-soon' | 'in-progress' | 'to-do' | 'overdue' {
    if (isCompleted) return 'completed';
    if (hw.dueDate && isOverdue(hw.dueDate)) return 'overdue';
    if (hw.dueDate && isDueSoon(hw.dueDate)) return 'due-soon';
    // For non-completed items with no due date or far due date
    return 'to-do';
}

// Skeleton loader
function HomeworkSkeleton() {
    return (
        <div className="space-y-3">
            {/* Stats skeleton */}
            <div className="grid grid-cols-4 gap-2.5 mb-5">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 skeleton rounded-2xl" />
                ))}
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[76px] skeleton rounded-2xl" />
            ))}
        </div>
    );
}

// Empty state
function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
            <div className="w-20 h-20 mb-5">
                <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
                    <rect x="8" y="8" width="64" height="64" rx="16" fill="#f0fdf4"/>
                    <rect x="20" y="18" width="28" height="36" rx="4" stroke="#86efac" strokeWidth="2.5" fill="white"/>
                    <path d="M28 28h12M28 34h8M28 40h10" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="54" cy="54" r="14" fill="#dcfce7" stroke="#22c55e" strokeWidth="2"/>
                    <path d="M48 54l4 4 8-8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No Homework Yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Your teacher hasn&apos;t uploaded any homework for your class yet. Check back later! 📚
            </p>
        </motion.div>
    );
}

export default function HomeworkList({ homeworks, loading = false, studentId, studentName, userClass }: HomeworkListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [isMarking, setIsMarking] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Load completion status
    const loadCompletions = useCallback(async () => {
        if (!studentId) return;
        try {
            const completed = await getStudentHomeworkCompletions(studentId);
            setCompletedIds(completed);
        } catch (error) {
            console.error('Error loading homework completions:', error);
        }
    }, [studentId]);

    useEffect(() => {
        loadCompletions();
    }, [loadCompletions]);

    const handleMarkComplete = async (homeworkId: string) => {
        if (!studentId || !studentName) return;
        setIsMarking(true);
        try {
            await markHomeworkComplete(homeworkId, studentId, studentName);
            setCompletedIds(prev => new Set([...prev, homeworkId]));
        } catch (error) {
            console.error('Error marking homework complete:', error);
        } finally {
            setIsMarking(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loading) return <HomeworkSkeleton />;
    if (homeworks.length === 0) return <EmptyState />;

    // Compute stats
    const totalHW = homeworks.length;
    const completedCount = homeworks.filter(h => completedIds.has(h.id)).length;
    const dueSoonCount = homeworks.filter(h => !completedIds.has(h.id) && h.dueDate && isDueSoon(h.dueDate)).length;
    const completionPercent = totalHW > 0 ? Math.round((completedCount / totalHW) * 100) : 0;
    const completionTrend = completionPercent >= 50;

    // Filter homeworks
    const filteredHomeworks = filterStatus === 'All'
        ? homeworks
        : homeworks.filter(h => {
            const status = getHomeworkStatus(h, completedIds.has(h.id));
            if (filterStatus === 'Completed') return status === 'completed';
            if (filterStatus === 'Due Soon') return status === 'due-soon' || status === 'overdue';
            if (filterStatus === 'To Do') return status === 'to-do' || status === 'in-progress';
            return true;
        });

    return (
        <div>
            {/* Stats Strip */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
                {/* Done % */}
                <div className="relative overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800/80 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 32 32" className="w-full h-full">
                                <circle cx="16" cy="16" r="12" fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-gray-700"/>
                                <circle cx="16" cy="16" r="12" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"
                                    strokeDasharray={`${(completionPercent / 100) * 75.4} 75.4`}
                                    transform="rotate(-90 16 16)"
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                                <path d="M13 16l2 2 4-4" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-none">{completionPercent}%</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Done</span>
                        <svg className={`w-3 h-3 ${completionTrend ? 'text-green-500' : 'text-red-400'}`} viewBox="0 0 12 12" fill="none">
                            <path d={completionTrend ? 'M2 8L6 3L10 8' : 'M2 4L6 9L10 4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>

                {/* Total HW */}
                <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800/80 shadow-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 mb-1">
                        <svg viewBox="0 0 32 32" className="w-full h-full">
                            <rect x="6" y="4" width="20" height="24" rx="4" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/>
                            <rect x="10" y="10" width="12" height="2" rx="1" fill="#3b82f6" opacity="0.6"/>
                            <rect x="10" y="15" width="8" height="2" rx="1" fill="#3b82f6" opacity="0.4"/>
                            <rect x="10" y="20" width="10" height="2" rx="1" fill="#3b82f6" opacity="0.3"/>
                        </svg>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-none">{totalHW}</p>
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Total HW</span>
                </div>

                {/* Due Soon */}
                <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800/80 shadow-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 mb-1">
                        <svg viewBox="0 0 32 32" className="w-full h-full">
                            <circle cx="16" cy="16" r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/>
                            <path d="M16 10v6.5l3.5 2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-none">{dueSoonCount}</p>
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Due Soon</span>
                </div>

                {/* Completed */}
                <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800/80 shadow-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 mb-1">
                        <svg viewBox="0 0 32 32" className="w-full h-full">
                            <circle cx="16" cy="16" r="12" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5"/>
                            <path d="M11 16l3.5 3.5 7-7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-none">{completedCount}</p>
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Completed</span>
                </div>
            </div>

            {/* Homework Accordion Cards */}
            <div className="space-y-3">
                {filteredHomeworks.map((homework, index) => {
                    const isCompleted = completedIds.has(homework.id);
                    const isExpanded = expandedId === homework.id;
                    const status = getHomeworkStatus(homework, isCompleted);
                    const badge = getSubjectBadge(homework.subject);

                    return (
                        <motion.div
                            key={homework.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.3 }}
                            className={`relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all duration-300 ${
                                isExpanded
                                    ? 'shadow-lg shadow-gray-200/50 dark:shadow-black/20 border-gray-200 dark:border-gray-700'
                                    : 'shadow-sm border-gray-100 dark:border-gray-800/80 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                        >
                            {/* Collapsed Header (always visible) */}
                            <div
                                className="flex items-center gap-3 px-4 py-3.5 sm:py-4 cursor-pointer select-none"
                                onClick={() => toggleExpand(homework.id)}
                            >
                                {/* Subject Icon */}
                                <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12">
                                    <SubjectIcon subject={homework.subject} className="w-full h-full" />
                                </div>

                                {/* Title + Meta */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug truncate">
                                        {homework.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${badge.bg} ${badge.text}`}>
                                            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                                            {homework.subject}
                                        </span>
                                        <span className="text-gray-300 dark:text-gray-600">·</span>
                                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1.5 5h9" stroke="currentColor" strokeWidth="0.8"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/></svg>
                                            {formatDate(homework.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Pill */}
                                <div className="shrink-0">
                                    <StatusPill status={status} />
                                </div>

                                {/* Chevron */}
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="shrink-0"
                                >
                                    <ChevronDown className={`w-5 h-5 ${isExpanded ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                </motion.div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800/80">
                                            {/* Description */}
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap mt-3 mb-4">
                                                {homework.description}
                                            </p>

                                            {/* Info Row: Assigned by + Status + CTA */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-4 sm:gap-6">
                                                    {/* Assigned By */}
                                                    {homework.createdByName && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none">
                                                                    <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/>
                                                                    <path d="M3 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">Assigned by</p>
                                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{homework.createdByName}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Status */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none">
                                                                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4"/>
                                                                <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">Status</p>
                                                            <p className={`text-xs font-semibold ${
                                                                isCompleted ? 'text-emerald-600 dark:text-emerald-400'
                                                                : status === 'due-soon' || status === 'overdue' ? 'text-red-500 dark:text-red-400'
                                                                : 'text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                                {isCompleted ? 'Completed' : status === 'due-soon' ? 'Due Soon' : status === 'overdue' ? 'Overdue' : 'Pending'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CTA Button */}
                                                {studentId && (
                                                    <div className="shrink-0">
                                                        {isCompleted ? (
                                                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 border border-gray-150 dark:border-gray-700">
                                                                View Details <ArrowRight className="w-3.5 h-3.5" />
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleMarkComplete(homework.id); }}
                                                                disabled={isMarking}
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-sm shadow-indigo-200 dark:shadow-none"
                                                            >
                                                                {isMarking ? (
                                                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Marking...</>
                                                                ) : (
                                                                    <>Mark Done <CheckCircle className="w-3.5 h-3.5" /></>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
