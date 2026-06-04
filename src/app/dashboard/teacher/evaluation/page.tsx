'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Search,
    Filter,
    CheckCircle,
    Clock,
    Eye,
    Users,
    FileText,
    ChevronDown,
    Loader2,
    BarChart3,
    Send,
    Calendar,
    RefreshCw,
    AlertCircle,
    Hourglass,
    ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    subscribeToEvaluations,
    getEvaluationStats,
    publishResultsBulk,
} from '@/services/evaluationService';
import { createResultNotification } from '@/lib/services';
import { EVALUATION_STATUS_CONFIG } from '@/lib/constants';
import type { TestResult, EvaluationStatus } from '@/types';

export default function EvaluationDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Data
    const [submissions, setSubmissions] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPending: 0,
        totalUnderReview: 0,
        totalEvaluated: 0,
        totalPublished: 0,
        averageEvalTimeHours: 0,
    });

    // Filters
    const [statusFilter, setStatusFilter] = useState<EvaluationStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState<number | 'all'>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [publishing, setPublishing] = useState(false);

    // Auth check
    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/login');
        if (!authLoading && user?.role !== 'teacher') router.push('/dashboard/student');
    }, [user, authLoading, router]);

    // Load stats
    useEffect(() => {
        if (!user) return;
        getEvaluationStats().then(setStats).catch(console.error);
    }, [user]);

    // Real-time subscription to evaluations
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const unsubscribe = subscribeToEvaluations((results) => {
            setSubmissions(results);
            setLoading(false);
        }, statusFilter === 'all' ? undefined : statusFilter);

        return () => unsubscribe();
    }, [user, statusFilter]);

    // Derived: unique subjects and classes from submissions
    const uniqueSubjects = Array.from(new Set(submissions.map(s => s.subject))).sort();
    const uniqueClasses = Array.from(new Set(submissions.map(s => s.studentClass))).sort((a, b) => a - b);

    // Filtered submissions
    const filteredSubmissions = submissions.filter(s => {
        if (classFilter !== 'all' && s.studentClass !== classFilter) return false;
        if (subjectFilter !== 'all' && s.subject !== subjectFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!s.studentName.toLowerCase().includes(q) && !s.testTitle.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // Status badge component
    const StatusBadge = ({ status }: { status: EvaluationStatus }) => {
        const config = EVALUATION_STATUS_CONFIG[status];
        const classMap: Record<string, string> = {
            pending: 'eval-status-pending',
            under_review: 'eval-status-review',
            evaluated: 'eval-status-evaluated',
            published: 'eval-status-published',
        };
        return (
            <span className={`eval-status-badge ${classMap[status]}`}>
                {status === 'pending' && <span className="eval-pulse-dot bg-amber-500" />}
                {config.icon} {config.label}
            </span>
        );
    };

    // Toggle selection
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Select all visible
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredSubmissions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
        }
    };

    // Bulk publish
    const handleBulkPublish = async () => {
        const evaluatedIds = Array.from(selectedIds).filter(id => {
            const sub = submissions.find(s => s.id === id);
            return sub?.evaluationStatus === 'evaluated';
        });

        if (evaluatedIds.length === 0) return;

        setPublishing(true);
        try {
            await publishResultsBulk(evaluatedIds);

            // Send notifications for each published result
            for (const id of evaluatedIds) {
                const sub = submissions.find(s => s.id === id);
                if (sub && user) {
                    try {
                        await createResultNotification({
                            studentId: sub.studentId,
                            studentClass: sub.studentClass,
                            testTitle: sub.testTitle,
                            subject: sub.subject,
                            score: sub.marksObtained || sub.score,
                            totalMarks: sub.totalMarks || sub.totalQuestions,
                            resultId: sub.id,
                            teacherId: user.uid,
                            teacherName: user.name,
                        });
                    } catch {
                        // Non-blocking notification failure
                    }
                }
            }

            setSelectedIds(new Set());
            // Refresh stats
            getEvaluationStats().then(setStats);
        } catch (err) {
            console.error('Bulk publish error:', err);
        } finally {
            setPublishing(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#1650EB]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard/teacher')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Evaluation Center</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Review & publish student results</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { getEvaluationStats().then(setStats); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            title="Refresh stats"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="eval-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Hourglass className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            {stats.totalPending > 0 && <span className="eval-pulse-dot bg-amber-500" />}
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPending}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="eval-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUnderReview}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="eval-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ClipboardCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvaluated}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Evaluated</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="eval-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPublished}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
                    </motion.div>
                </div>

                {/* Filters & Search */}
                <div className="eval-card p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by student name or test..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1650EB]/20 focus:border-[#1650EB] text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            {(['all', 'pending', 'under_review', 'evaluated', 'published'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === s ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                >
                                    {s === 'all' ? 'All' : EVALUATION_STATUS_CONFIG[s].label.split(' ')[0]}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Filter className="w-4 h-4" /> Filters
                            {(classFilter !== 'all' || subjectFilter !== 'all') && (
                                <span className="w-2 h-2 rounded-full bg-[#1650EB]" />
                            )}
                        </button>
                    </div>

                    {/* Expanded Filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <select
                                        value={classFilter}
                                        onChange={(e) => setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="all">All Classes</option>
                                        {uniqueClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                                    </select>

                                    <select
                                        value={subjectFilter}
                                        onChange={(e) => setSubjectFilter(e.target.value)}
                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="all">All Subjects</option>
                                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>

                                    {(classFilter !== 'all' || subjectFilter !== 'all') && (
                                        <button
                                            onClick={() => { setClassFilter('all'); setSubjectFilter('all'); }}
                                            className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="eval-card p-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-900 dark:text-white">{selectedIds.size}</strong> selected
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    Deselect All
                                </button>
                                <button
                                    onClick={handleBulkPublish}
                                    disabled={publishing}
                                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                >
                                    {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    Publish Selected
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submissions Table */}
                <div className="eval-card overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-[auto_2fr_0.7fr_1.2fr_0.8fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-[#1650EB]"
                            />
                        </div>
                        <div>Student</div>
                        <div>Class</div>
                        <div>Test</div>
                        <div>Marks</div>
                        <div>Status</div>
                        <div>Submitted</div>
                        <div>Action</div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="eval-skeleton-row">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <div key={j} className="skeleton h-5 rounded" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredSubmissions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-6">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <ClipboardCheck className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No submissions found</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                                {statusFilter !== 'all'
                                    ? `No ${EVALUATION_STATUS_CONFIG[statusFilter as EvaluationStatus].label.toLowerCase()} submissions.`
                                    : 'Create a test with Manual or Hybrid evaluation mode to see submissions here.'}
                            </p>
                        </div>
                    )}

                    {/* Rows */}
                    {!loading && filteredSubmissions.map((sub, idx) => (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="grid grid-cols-1 md:grid-cols-[auto_2fr_0.7fr_1.2fr_0.8fr_1fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors items-center"
                        >
                            {/* Checkbox */}
                            <div className="hidden md:flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(sub.id)}
                                    onChange={() => toggleSelection(sub.id)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-[#1650EB]"
                                />
                            </div>

                            {/* Student */}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1650EB] to-indigo-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {sub.studentName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sub.studentName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate md:hidden">{sub.testTitle}</p>
                                </div>
                            </div>

                            {/* Class */}
                            <div className="hidden md:block">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Class {sub.studentClass}</span>
                            </div>

                            {/* Test */}
                            <div className="hidden md:block">
                                <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={sub.testTitle}>{sub.testTitle}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{sub.subject}</p>
                            </div>

                            {/* Marks */}
                            <div className="hidden md:block">
                                {sub.evaluationStatus === 'published' || sub.evaluationStatus === 'evaluated' ? (
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {sub.marksObtained ?? '--'}/{sub.totalMarks ?? sub.totalQuestions}
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-400">--/{sub.totalMarks ?? sub.totalQuestions}</span>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <StatusBadge status={sub.evaluationStatus || 'pending'} />
                            </div>

                            {/* Submitted Date */}
                            <div className="hidden md:block">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {sub.timestamp instanceof Date
                                        ? sub.timestamp.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                        : new Date(sub.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    }
                                </p>
                                <p className="text-xs text-gray-400">
                                    {sub.timestamp instanceof Date
                                        ? sub.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                        : new Date(sub.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                    }
                                </p>
                            </div>

                            {/* Action */}
                            <div>
                                <button
                                    onClick={() => router.push(`/dashboard/teacher/evaluation/${sub.id}`)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                        sub.evaluationStatus === 'pending' || sub.evaluationStatus === 'under_review'
                                            ? 'bg-[#1650EB] text-white hover:bg-[#1243c7]'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {sub.evaluationStatus === 'pending' || sub.evaluationStatus === 'under_review' ? (
                                        <><Eye className="w-3 h-3" /> Evaluate</>
                                    ) : (
                                        <><Eye className="w-3 h-3" /> View</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
