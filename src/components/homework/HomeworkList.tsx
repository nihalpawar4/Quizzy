'use client';

/**
 * HomeworkList Component
 * Displays homework assignments as modern cards for students
 * Mobile-first responsive design
 * By Nihal Pawar
 */

import { motion } from 'framer-motion';
import {
    BookOpen,
    Calendar,
    Clock,
    User,
    Sparkles,
    FileText,
    AlertCircle
} from 'lucide-react';
import type { Homework } from '@/types/homework';

interface HomeworkListProps {
    homeworks: Homework[];
    loading?: boolean;
}

// Skeleton loader for loading state
function HomeworkSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5"
                >
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl skeleton flex-shrink-0" />
                        <div className="flex-1 space-y-2.5">
                            <div className="h-4 sm:h-5 w-3/4 skeleton rounded-lg" />
                            <div className="h-3 sm:h-4 w-1/3 skeleton rounded-lg" />
                            <div className="h-3 w-full skeleton rounded-lg" />
                            <div className="h-3 w-5/6 skeleton rounded-lg" />
                        </div>
                    </div>
                </div>
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
            className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800"
        >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Homework Yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Your teacher hasn&apos;t uploaded any homework for your class yet. Check back later! 📚
            </p>
        </motion.div>
    );
}

// Subject color mapping
function getSubjectStyle(subject: string): { bg: string; text: string; icon: string } {
    const subjectMap: Record<string, { bg: string; text: string; icon: string }> = {
        'Mathematics': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: '📐' },
        'Science': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: '🔬' },
        'English': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: '📖' },
        'Hindi': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: '📝' },
        'Social Studies': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: '🌍' },
        'Computer Science': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', icon: '💻' },
        'General Knowledge': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', icon: '🧠' },
    };
    return subjectMap[subject] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: '📄' };
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isOverdue(dueDate?: Date): boolean {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
}

function getDaysUntilDue(dueDate: Date): string {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `${days}d left`;
}

export default function HomeworkList({ homeworks, loading = false }: HomeworkListProps) {
    if (loading) {
        return <HomeworkSkeleton />;
    }

    if (homeworks.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-3">
            {homeworks.map((homework, index) => {
                const subjectStyle = getSubjectStyle(homework.subject);
                const overdue = isOverdue(homework.dueDate);

                return (
                    <motion.div
                        key={homework.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-lg hover:border-[#1650EB]/30 dark:hover:border-[#6095DB]/30 group ${
                            overdue
                                ? 'border-red-200 dark:border-red-800/50'
                                : 'border-gray-200 dark:border-gray-800'
                        }`}
                    >
                        <div className="p-3.5 sm:p-5">
                            <div className="flex items-start gap-3 sm:gap-4">
                                {/* Subject Icon */}
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${subjectStyle.bg} rounded-xl flex items-center justify-center flex-shrink-0 text-lg sm:text-xl group-hover:scale-110 transition-transform`}>
                                    {subjectStyle.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-tight group-hover:text-[#1650EB] dark:group-hover:text-[#6095DB] transition-colors">
                                            {homework.title}
                                        </h3>
                                        {/* New Badge - show for homework less than 1 hour old */}
                                        {(Date.now() - new Date(homework.createdAt).getTime()) < 3600000 && (
                                            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                New
                                            </span>
                                        )}
                                    </div>

                                    {/* Subject Badge + Date */}
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${subjectStyle.bg} ${subjectStyle.text} text-[10px] sm:text-xs font-medium rounded-full`}>
                                            <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {homework.subject}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {formatDate(homework.createdAt)}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                        {homework.description}
                                    </p>

                                    {/* Footer - Due Date & Teacher */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                                        {homework.dueDate && (
                                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-lg ${
                                                overdue
                                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                            }`}>
                                                {overdue ? (
                                                    <AlertCircle className="w-3 h-3" />
                                                ) : (
                                                    <Clock className="w-3 h-3" />
                                                )}
                                                {getDaysUntilDue(homework.dueDate)}
                                                <span className="hidden sm:inline text-gray-400 dark:text-gray-500 font-normal ml-0.5">
                                                    ({formatDateTime(homework.dueDate)})
                                                </span>
                                            </span>
                                        )}
                                        {homework.createdByName && (
                                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                {homework.createdByName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
