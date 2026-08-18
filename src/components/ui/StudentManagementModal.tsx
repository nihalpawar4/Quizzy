'use client';

/**
 * StudentManagementModal — Premium SaaS 2026 Design
 * A beautifully designed modal for managing students with search, class filters,
 * colorful avatar initials, stats chips, and smooth animations.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    X,
    Search,
    GraduationCap,
    BookOpen,
    Target,
    ArrowRight,
    Loader2,
    Check,
    Ban,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import type { User, TestResult, ClassChangeRequest } from '@/types';

interface StudentManagementModalProps {
    students: User[];
    results: TestResult[];
    classChangeRequests: ClassChangeRequest[];
    processingClassChange: string | null;
    studentActionLoading: string | null;
    confirmDeleteStudent: string | null;
    onClose: () => void;
    onApproveClassChange: (id: string) => void;
    onRejectClassChange: (id: string) => void;
    onRestrictStudent: (uid: string) => void;
    onEnableStudent: (uid: string) => void;
    onDeleteStudent: (uid: string) => void;
    onSetConfirmDelete: (uid: string | null) => void;
}

// Color palette for avatar backgrounds — deterministic by name
const AVATAR_COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-purple-600',
    'from-lime-500 to-green-600',
    'from-sky-500 to-cyan-600',
    'from-rose-500 to-pink-600',
];

function getAvatarColor(name: string) {
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function StudentManagementModal({
    students,
    results,
    classChangeRequests,
    processingClassChange,
    studentActionLoading,
    confirmDeleteStudent,
    onClose,
    onApproveClassChange,
    onRejectClassChange,
    onRestrictStudent,
    onEnableStudent,
    onDeleteStudent,
    onSetConfirmDelete,
}: StudentManagementModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState<number | null>(null);

    // Available classes (unique, sorted)
    const availableClasses = Array.from(
        new Set(students.map(s => s.studentClass || 0).filter(Boolean))
    ).sort((a, b) => a - b);

    // Filtered students
    const filteredStudents = students.filter(s => {
        const matchesSearch = !searchQuery ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = classFilter === null || s.studentClass === classFilter;
        return matchesSearch && matchesClass;
    });

    // Stats
    const totalActive = students.filter(s => !s.isRestricted).length;
    const totalRestricted = students.filter(s => s.isRestricted).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[60] flex justify-center items-start overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                className="bg-white dark:bg-[#111318] w-full min-h-screen sm:min-h-0 sm:max-w-2xl sm:max-h-[88vh] sm:rounded-3xl overflow-hidden flex flex-col sm:my-6 shadow-2xl shadow-black/25 dark:shadow-black/60 border-0 sm:border border-gray-200/50 dark:border-white/[0.06]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─────── Header with gradient ─────── */}
                <div className="relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-700" />
                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

                    <div className="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
                        {/* Title row */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/25">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">Students</h3>
                                    <p className="text-[11px] text-white/70 font-medium mt-0.5">
                                        {students.length} registered · {totalActive} active
                                        {totalRestricted > 0 && ` · ${totalRestricted} restricted`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white transition-all duration-200 active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search by name or email…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>

                {/* ─────── Class filter chips ─────── */}
                {availableClasses.length > 1 && (
                    <div className="px-5 sm:px-6 py-2.5 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.015]">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setClassFilter(null)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                                    classFilter === null
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                                        : 'bg-white dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.1] ring-1 ring-gray-200/80 dark:ring-white/10'
                                }`}
                            >
                                All ({students.length})
                            </button>
                            {availableClasses.map(cls => {
                                const count = students.filter(s => s.studentClass === cls).length;
                                return (
                                    <button
                                        key={cls}
                                        onClick={() => setClassFilter(classFilter === cls ? null : cls)}
                                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                                            classFilter === cls
                                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                                                : 'bg-white dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.1] ring-1 ring-gray-200/80 dark:ring-white/10'
                                        }`}
                                    >
                                        Class {cls} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─────── Class Change Requests ─────── */}
                {classChangeRequests.length > 0 && (
                    <div className="px-5 sm:px-6 pt-4 shrink-0">
                        <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <h4 className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                    Pending Requests ({classChangeRequests.length})
                                </h4>
                            </div>
                            <div className="space-y-1.5">
                                {classChangeRequests.map((request) => (
                                    <div key={request.id} className="flex items-center justify-between gap-3 p-2.5 bg-white/70 dark:bg-white/[0.05] rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{request.studentName}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="px-1.5 py-0.5 bg-gray-200/80 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded">
                                                    {request.currentClass}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-amber-500" />
                                                <span className="px-1.5 py-0.5 bg-amber-200/80 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold rounded">
                                                    {request.requestedClass}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => onRejectClassChange(request.id)}
                                                disabled={processingClassChange === request.id}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200/60 dark:border-red-800/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                            >
                                                {processingClassChange === request.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                            </button>
                                            <button
                                                onClick={() => onApproveClassChange(request.id)}
                                                disabled={processingClassChange === request.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 shadow-sm shadow-emerald-600/20"
                                            >
                                                {processingClassChange === request.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─────── Student List ─────── */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
                    {filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mb-4">
                                <Users className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {searchQuery ? 'No students match your search' : 'No students registered yet'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[220px]">
                                {searchQuery ? 'Try a different name or email' : 'Students will appear here once they sign up'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredStudents.map((student, index) => {
                                const studentResults = results.filter(r => r.studentId === student.uid && !r.isPdfTest && r.totalQuestions > 0);
                                const avgScore = studentResults.length > 0
                                    ? Math.round(studentResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / studentResults.length)
                                    : null;
                                const isLoading = studentActionLoading === student.uid;
                                const showDeleteConfirm = confirmDeleteStudent === student.uid;
                                const initials = getInitials(student.name);
                                const avatarColor = getAvatarColor(student.name);

                                return (
                                    <motion.div
                                        key={student.uid}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(index * 0.015, 0.25), duration: 0.2 }}
                                        className={`group relative p-3 rounded-2xl border transition-all duration-200 ${
                                            student.isRestricted
                                                ? 'bg-red-50/40 dark:bg-red-950/15 border-red-200/40 dark:border-red-900/25'
                                                : 'bg-white dark:bg-white/[0.025] border-gray-100 dark:border-white/[0.05] hover:border-gray-200/80 dark:hover:border-white/[0.09] hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-none'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${student.isRestricted ? 'from-red-400 to-red-600' : avatarColor} flex items-center justify-center shadow-sm mt-0.5`}>
                                                <span className="text-[11px] font-extrabold text-white leading-none">{initials}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">{student.name}</h4>
                                                    {student.isPremium && (
                                                        <span className="shrink-0 px-1.5 py-[1px] bg-gradient-to-r from-amber-400/20 to-yellow-400/20 dark:from-amber-500/20 dark:to-yellow-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-extrabold rounded-[4px] uppercase tracking-wider ring-1 ring-amber-300/30 dark:ring-amber-600/30">
                                                            ✦ Pro
                                                        </span>
                                                    )}
                                                    {student.isRestricted && (
                                                        <span className="shrink-0 px-1.5 py-[1px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[8px] font-extrabold rounded-[4px] uppercase tracking-wider">
                                                            Blocked
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5 leading-tight">{student.email}</p>

                                                {/* Metrics row */}
                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-[3px] bg-gray-100/80 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 text-[10px] font-semibold rounded-md">
                                                        <GraduationCap className="w-3 h-3 opacity-60" />
                                                        {student.studentClass || '—'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-[3px] bg-gray-100/80 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 text-[10px] font-semibold rounded-md">
                                                        <BookOpen className="w-3 h-3 opacity-60" />
                                                        {studentResults.length}
                                                    </span>
                                                    {avgScore !== null && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-bold rounded-md ${
                                                            avgScore >= 70
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                                : avgScore >= 40
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                        }`}>
                                                            <Target className="w-3 h-3 opacity-70" />
                                                            {avgScore}%
                                                        </span>
                                                    )}
                                                    {(student.currentStreak || 0) > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-2 py-[3px] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-md">
                                                            🔥 {student.currentStreak}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="shrink-0 flex items-center gap-1 mt-0.5">
                                                {showDeleteConfirm ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="flex items-center gap-1.5 py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200/50 dark:border-red-800/30"
                                                    >
                                                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold whitespace-nowrap">Delete?</span>
                                                        <button
                                                            onClick={() => onDeleteStudent(student.uid)}
                                                            disabled={isLoading}
                                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                                                        >
                                                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => onSetConfirmDelete(null)}
                                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        {student.isRestricted ? (
                                                            <button
                                                                onClick={() => onEnableStudent(student.uid)}
                                                                disabled={isLoading}
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-200 disabled:opacity-50 active:scale-95"
                                                                title="Unblock student"
                                                            >
                                                                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => onRestrictStudent(student.uid)}
                                                                disabled={isLoading}
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-transparent text-gray-300 dark:text-gray-600 hover:bg-amber-50 dark:hover:bg-amber-900/15 hover:text-amber-500 dark:hover:text-amber-400 transition-all duration-200 disabled:opacity-50 active:scale-95"
                                                                title="Restrict student"
                                                            >
                                                                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => onSetConfirmDelete(student.uid)}
                                                            disabled={isLoading}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-transparent text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/15 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 disabled:opacity-50 active:scale-95"
                                                            title="Delete student"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─────── Footer ─────── */}
                <div className="shrink-0 px-5 sm:px-6 py-2.5 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.015]">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                        <span>{filteredStudents.length === students.length ? `${students.length} students` : `${filteredStudents.length} of ${students.length}`}</span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {totalActive} active
                            </span>
                            {totalRestricted > 0 && (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {totalRestricted} blocked
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
