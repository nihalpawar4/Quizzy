'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Plus, Loader2, Trash2, BookOpen, Calendar,
    FileText, GraduationCap, Home, CheckCircle, AlertCircle, Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import HomeworkForm from '@/components/homework/HomeworkForm';
import { subscribeToAllHomework, deleteHomework } from '@/services/homeworkService';
import type { Homework } from '@/types/homework';
import { CLASS_OPTIONS, SUBJECTS } from '@/lib/constants';

export default function TeacherHomeworkPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [filterClass, setFilterClass] = useState<number | 'all'>('all');
    const [filterSubject, setFilterSubject] = useState<string | 'all'>('all');

    useEffect(() => {
        if (!authLoading && !user) { router.push('/auth/login'); return; }
        if (!authLoading && user?.role !== 'teacher') { router.push('/dashboard/student'); }
    }, [user, authLoading, router]);

    useEffect(() => {
        const unsub = subscribeToAllHomework((data) => { setHomeworks(data); setLoading(false); });
        return () => unsub();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this homework?')) return;
        setDeletingId(id);
        try { await deleteHomework(id); setDeleteSuccess(true); setTimeout(() => setDeleteSuccess(false), 2000); }
        catch (e) { console.error(e); }
        finally { setDeletingId(null); }
    };

    const filtered = homeworks.filter(hw =>
        (filterClass === 'all' || hw.classNumber === filterClass) &&
        (filterSubject === 'all' || hw.subject === filterSubject)
    );

    if (authLoading || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin" />
        </div>
    );

    const subjectColors: Record<string, string> = {
        'Mathematics': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        'Science': 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        'English': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        'Hindi': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        'Social Studies': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        'Computer Science': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
        'General Knowledge': 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/teacher" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white">Homework Manager</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Upload & manage assignments</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" title="Home">
                            <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary text-sm py-2.5 px-4">
                            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Upload Homework</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <AnimatePresence>
                    {showForm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                            <HomeworkForm teacherId={user.uid} teacherName={user.name} onSuccess={() => setShowForm(false)} onClose={() => setShowForm(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {deleteSuccess && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="mb-4 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Homework deleted</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{homeworks.length}</p><p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total</p></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{homeworks.filter(h => { const t = new Date(); t.setHours(0,0,0,0); return new Date(h.createdAt) >= t; }).length}</p><p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Today</p></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{new Set(homeworks.map(h => h.classNumber)).size}</p><p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Classes</p></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div><p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{new Set(homeworks.map(h => h.subject)).size}</p><p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Subjects</p></div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <select value={filterClass === 'all' ? 'all' : filterClass} onChange={(e) => setFilterClass(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="input text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 w-auto">
                        <option value="all">All Classes</option>
                        {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 w-auto">
                        <option value="all">All Subjects</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {(filterClass !== 'all' || filterSubject !== 'all') && (
                        <button onClick={() => { setFilterClass('all'); setFilterSubject('all'); }} className="text-xs text-[#1650EB] dark:text-[#6095DB] hover:underline">Clear</button>
                    )}
                </div>

                {/* List */}
                {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
                            <div className="flex items-start gap-3 sm:gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl skeleton" /><div className="flex-1 space-y-2.5"><div className="h-4 sm:h-5 w-3/4 skeleton rounded-lg" /><div className="h-3 sm:h-4 w-1/2 skeleton rounded-lg" /></div></div>
                        </div>
                    ))}</div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 sm:py-16 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 sm:mb-6"><BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" /></div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">No Homework Found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{filterClass !== 'all' || filterSubject !== 'all' ? 'Try adjusting filters.' : 'Upload your first homework!'}</p>
                        {filterClass === 'all' && filterSubject === 'all' && <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus className="w-5 h-5" />Upload Homework</button>}
                    </motion.div>
                ) : (
                    <div className="space-y-3">{filtered.map((hw, i) => (
                        <motion.div key={hw.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 sm:p-5 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{hw.title}</h3>
                                        <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${subjectColors[hw.subject] || 'bg-gray-100 text-gray-600'}`}>{hw.subject}</span>
                                        <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Class {hw.classNumber}</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1.5 sm:mb-2">{hw.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(hw.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        {hw.dueDate && <span className="flex items-center gap-1 text-amber-500"><AlertCircle className="w-3 h-3" />Due: {new Date(hw.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(hw.id)} disabled={deletingId === hw.id}
                                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0">
                                    {deletingId === hw.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>
                    ))}</div>
                )}
            </main>
        </div>
    );
}
