'use client';

/**
 * Teacher Weekly Student Report Page
 * Shows a 7-day rolling report for selected students
 * Mobile-responsive with PDF and CSV downloads
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Search,
    User as UserIcon,
    Calendar,
    Award,
    Clock,
    Target,
    TrendingUp,
    TrendingDown,
    Download,
    FileText,
    Send,
    Loader2,
    AlertCircle,
    BarChart3,
    CheckCircle,
    XCircle,
    Flame,
    BookOpen,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { getAllStudents } from '@/lib/services';
import { getWeeklyReport, formatWeekRange } from '@/lib/weeklyReportServices';
import type { User } from '@/types';
import type { WeeklyReportData } from '@/types/weeklyReport';

export default function WeeklyReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // State
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exportLoading, setExportLoading] = useState<'pdf' | 'csv' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showStudentList, setShowStudentList] = useState(true);

    // Auth check
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (!authLoading && user?.role !== 'teacher') {
            router.push('/dashboard/student');
            return;
        }
    }, [user, authLoading, router]);

    // Load students
    useEffect(() => {
        const loadStudents = async () => {
            try {
                const allStudents = await getAllStudents();
                setStudents(allStudents);
                setFilteredStudents(allStudents);
            } catch (err) {
                console.error('Error loading students:', err);
                setError('Failed to load students');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'teacher') {
            loadStudents();
        }
    }, [user]);

    // Filter students by search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredStudents(
                students.filter(
                    s =>
                        s.name.toLowerCase().includes(query) ||
                        s.email.toLowerCase().includes(query) ||
                        String(s.studentClass).includes(query)
                )
            );
        }
    }, [searchQuery, students]);

    // Load report when student is selected
    const handleSelectStudent = async (student: User) => {
        setSelectedStudent(student);
        setReportLoading(true);
        setError(null);
        // Hide student list on mobile after selection
        if (window.innerWidth < 1024) {
            setShowStudentList(false);
        }

        try {
            const data = await getWeeklyReport(student);
            setReportData(data);
        } catch (err) {
            console.error('Error loading report:', err);
            setError('Failed to load report data');
        } finally {
            setReportLoading(false);
        }
    };

    // Show toast message
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Download CSV (simple, universally compatible)
    const handleDownloadCSV = () => {
        if (!reportData) return;

        setExportLoading('csv');
        try {
            const lines: string[] = [];

            // Header
            lines.push(`Weekly Report - ${reportData.studentName}`);
            lines.push(`Period: ${formatWeekRange(reportData.weekStart, reportData.weekEnd)}`);
            lines.push(`Class: ${reportData.studentClass}`);
            lines.push(`Email: ${reportData.studentEmail}`);
            lines.push('');

            // Summary
            lines.push('SUMMARY STATISTICS');
            lines.push(`Total Quizzes,${reportData.stats.totalQuizzes}`);
            lines.push(`Average Score,${reportData.stats.avgScore}%`);
            lines.push(`Accuracy,${reportData.stats.accuracy}%`);
            lines.push(`Total Time (min),${reportData.stats.totalTimeMinutes}`);
            lines.push(`Questions Solved,${reportData.stats.questionsSolved}`);
            lines.push(`Active Days,${reportData.stats.activeDays}/7`);
            lines.push(`Best Day,${reportData.stats.bestDay ? `${reportData.stats.bestDay.date} (${reportData.stats.bestDay.score}%)` : 'N/A'}`);
            lines.push(`Worst Day,${reportData.stats.worstDay ? `${reportData.stats.worstDay.date} (${reportData.stats.worstDay.score}%)` : 'N/A'}`);
            lines.push('');

            // Daily breakdown
            lines.push('DAILY BREAKDOWN');
            lines.push('Date,Day,Quizzes,Score %,Accuracy %,Time (min),Questions');
            reportData.dailyBreakdown.forEach(d => {
                lines.push(`${d.date},${d.dayName},${d.quizzes},${d.isActive ? d.scorePercent : 0},${d.isActive ? d.accuracy : 0},${d.timeMinutes},${d.questions}`);
            });
            lines.push('');

            // Topics
            if (reportData.topTopics.length > 0) {
                lines.push('STRONGEST TOPICS');
                lines.push('Topic,Accuracy %,Attempts');
                reportData.topTopics.forEach(t => {
                    lines.push(`${t.topic},${t.accuracy},${t.attempts}`);
                });
                lines.push('');
            }

            if (reportData.weakTopics.length > 0) {
                lines.push('WEAKEST TOPICS');
                lines.push('Topic,Accuracy %,Attempts');
                reportData.weakTopics.forEach(t => {
                    lines.push(`${t.topic},${t.accuracy},${t.attempts}`);
                });
            }

            const csvContent = lines.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Weekly_Report_${reportData.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('CSV downloaded! Open in Excel or Google Sheets', 'success');
        } catch (err) {
            console.error('Error generating CSV:', err);
            showToast('Failed to generate CSV', 'error');
        } finally {
            setExportLoading(null);
        }
    };

    // Download as printable HTML (works like PDF when printed)
    const handleDownloadPDF = () => {
        if (!reportData) return;

        setExportLoading('pdf');
        try {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Report - ${reportData.studentName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #1650EB; margin-bottom: 5px; }
        h2 { color: #374151; margin: 20px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
        .header { margin-bottom: 20px; }
        .meta { color: #6b7280; font-size: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
        .stat-card { background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1650EB; }
        .stat-label { font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f9fafb; font-weight: 600; }
        .topic-section { display: flex; gap: 20px; margin: 15px 0; }
        .topic-box { flex: 1; padding: 12px; border-radius: 8px; }
        .topic-box.strong { background: #d1fae5; }
        .topic-box.weak { background: #fee2e2; }
        .topic-box h3 { font-size: 14px; margin-bottom: 8px; }
        .topic-item { font-size: 13px; padding: 3px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Weekly Student Report</h1>
        <p class="meta"><strong>${reportData.studentName}</strong> • Class ${reportData.studentClass} • ${reportData.studentEmail}</p>
        <p class="meta">📅 ${formatWeekRange(reportData.weekStart, reportData.weekEnd)}</p>
    </div>

    <h2>Summary Statistics</h2>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${reportData.stats.totalQuizzes}</div><div class="stat-label">Total Quizzes</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.avgScore}%</div><div class="stat-label">Avg Score</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.accuracy}%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.totalTimeMinutes}m</div><div class="stat-label">Time Spent</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.questionsSolved}</div><div class="stat-label">Questions</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.activeDays}/7</div><div class="stat-label">Active Days</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.bestDay?.score || 0}%</div><div class="stat-label">Best Day</div></div>
        <div class="stat-card"><div class="stat-value">${reportData.stats.worstDay?.score || 0}%</div><div class="stat-label">Worst Day</div></div>
    </div>

    <h2>Daily Breakdown</h2>
    <table>
        <tr><th>Date</th><th>Day</th><th>Quizzes</th><th>Score</th><th>Accuracy</th><th>Time</th><th>Questions</th></tr>
        ${reportData.dailyBreakdown.map(d => `
        <tr>
            <td>${d.date}</td>
            <td>${d.dayName}</td>
            <td>${d.quizzes}</td>
            <td>${d.isActive ? d.scorePercent + '%' : '-'}</td>
            <td>${d.isActive ? d.accuracy + '%' : '-'}</td>
            <td>${d.timeMinutes}m</td>
            <td>${d.questions}</td>
        </tr>`).join('')}
    </table>

    ${reportData.stats.totalQuizzes > 0 ? `
    <h2>Topic Performance</h2>
    <div class="topic-section">
        <div class="topic-box strong">
            <h3>✅ Strongest Topics</h3>
            ${reportData.topTopics.map((t, i) => `<div class="topic-item">${i + 1}. ${t.topic} - ${t.accuracy}%</div>`).join('') || '<div class="topic-item">No data</div>'}
        </div>
        <div class="topic-box weak">
            <h3>⚠️ Needs Improvement</h3>
            ${reportData.weakTopics.map((t, i) => `<div class="topic-item">${i + 1}. ${t.topic} - ${t.accuracy}%</div>`).join('') || '<div class="topic-item">No data</div>'}
        </div>
    </div>
    ` : ''}

    <div class="footer">
        Generated on ${new Date().toLocaleDateString()} • Quizy - Smart Learning Platform
    </div>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Weekly_Report_${reportData.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('Report downloaded! Open and print to PDF', 'success');
        } catch (err) {
            console.error('Error generating report:', err);
            showToast('Failed to generate report', 'error');
        } finally {
            setExportLoading(null);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1650EB] mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Unauthorized
    if (!user || user.role !== 'teacher') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/teacher"
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Weekly Reports
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                                7-day student performance
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                {/* Mobile: Toggle student list */}
                <div className="lg:hidden mb-4">
                    <button
                        onClick={() => setShowStudentList(!showStudentList)}
                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
                    >
                        <span className="font-medium text-gray-900 dark:text-white">
                            {selectedStudent ? selectedStudent.name : 'Select Student'}
                        </span>
                        {showStudentList ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* Student Selector */}
                    <AnimatePresence>
                        {(showStudentList || window.innerWidth >= 1024) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="lg:col-span-4 xl:col-span-3"
                            >
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 lg:sticky lg:top-24">
                                    <h2 className="font-semibold text-gray-900 dark:text-white mb-3 hidden lg:block">
                                        Select Student
                                    </h2>

                                    {/* Search */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none"
                                        />
                                    </div>

                                    {/* Student List */}
                                    <div className="max-h-[40vh] lg:max-h-[60vh] overflow-y-auto space-y-1.5">
                                        {filteredStudents.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">
                                                No students found
                                            </p>
                                        ) : (
                                            filteredStudents.map((student) => (
                                                <button
                                                    key={student.uid}
                                                    onClick={() => handleSelectStudent(student)}
                                                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left ${selectedStudent?.uid === student.uid
                                                            ? 'bg-[#1650EB]/10 border-2 border-[#1650EB]'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selectedStudent?.uid === student.uid
                                                            ? 'bg-[#1650EB]'
                                                            : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}>
                                                        <UserIcon className={`w-4 h-4 ${selectedStudent?.uid === student.uid
                                                                ? 'text-white'
                                                                : 'text-gray-600 dark:text-gray-400'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${selectedStudent?.uid === student.uid
                                                                ? 'text-[#1650EB]'
                                                                : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                            {student.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            Class {student.studentClass}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Report Content */}
                    <div className={`${showStudentList ? 'lg:col-span-8 xl:col-span-9' : 'col-span-full'}`}>
                        {/* No student selected */}
                        {!selectedStudent && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 text-center">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserIcon className="w-7 h-7 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Select a Student
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Choose a student to view their weekly report
                                </p>
                            </div>
                        )}

                        {/* Loading report */}
                        {selectedStudent && reportLoading && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-[#1650EB] mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">
                                    Loading report...
                                </p>
                            </div>
                        )}

                        {/* Error state */}
                        {selectedStudent && error && !reportLoading && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-8 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                                <p className="text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Report */}
                        {selectedStudent && reportData && !reportLoading && (
                            <div className="space-y-4">
                                {/* Export buttons */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={exportLoading !== null}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {exportLoading === 'pdf' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        PDF Report
                                    </button>
                                    <button
                                        onClick={handleDownloadCSV}
                                        disabled={exportLoading !== null}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {exportLoading === 'csv' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileText className="w-4 h-4" />
                                        )}
                                        Excel/CSV
                                    </button>
                                </div>

                                {/* Report Card */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    {/* Header */}
                                    <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1650EB]/10 rounded-full flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#1650EB]" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                                    {reportData.studentName}
                                                </h2>
                                                <p className="text-xs sm:text-sm text-gray-500">
                                                    Class {reportData.studentClass}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-[#1650EB]">
                                            <Calendar className="w-4 h-4" />
                                            <span className="font-medium">
                                                {formatWeekRange(reportData.weekStart, reportData.weekEnd)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="p-4 sm:p-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
                                            <StatCard icon={<BookOpen className="w-4 h-4" />} label="Quizzes" value={reportData.stats.totalQuizzes} color="blue" />
                                            <StatCard icon={<Target className="w-4 h-4" />} label="Avg Score" value={`${reportData.stats.avgScore}%`} color="green" />
                                            <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Accuracy" value={`${reportData.stats.accuracy}%`} color="purple" />
                                            <StatCard icon={<Clock className="w-4 h-4" />} label="Time" value={`${reportData.stats.totalTimeMinutes}m`} color="orange" />
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
                                            <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Questions" value={reportData.stats.questionsSolved} color="indigo" />
                                            <StatCard icon={<Flame className="w-4 h-4" />} label="Active" value={`${reportData.stats.activeDays}/7`} color="red" />
                                            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Best" value={reportData.stats.bestDay ? `${reportData.stats.bestDay.score}%` : '-'} color="emerald" />
                                            <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Worst" value={reportData.stats.worstDay ? `${reportData.stats.worstDay.score}%` : '-'} color="gray" />
                                        </div>

                                        {/* No activity message */}
                                        {reportData.stats.totalQuizzes === 0 && (
                                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center mb-6">
                                                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                                    No quiz activity this week
                                                </p>
                                            </div>
                                        )}

                                        {/* Charts */}
                                        {reportData.stats.totalQuizzes > 0 && (
                                            <div className="space-y-4 mb-6">
                                                {/* Score Chart */}
                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                        Score Trend
                                                    </h3>
                                                    <div className="h-40 sm:h-52">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={reportData.chartData.dates.map((date, i) => ({
                                                                date,
                                                                score: reportData.chartData.scores[i],
                                                            }))}>
                                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                                <Tooltip />
                                                                <Line type="monotone" dataKey="score" stroke="#1650EB" strokeWidth={2} dot={{ fill: '#1650EB', r: 3 }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                {/* Bar Charts */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                            Quizzes/Day
                                                        </h3>
                                                        <div className="h-32">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={reportData.chartData.dates.map((date, i) => ({
                                                                    date,
                                                                    quizzes: reportData.chartData.quizzesPerDay[i],
                                                                }))}>
                                                                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                                                                    <YAxis tick={{ fontSize: 10 }} />
                                                                    <Tooltip />
                                                                    <Bar dataKey="quizzes" fill="#10B981" radius={[3, 3, 0, 0]} />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                            Time/Day (min)
                                                        </h3>
                                                        <div className="h-32">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={reportData.chartData.dates.map((date, i) => ({
                                                                    date,
                                                                    time: reportData.chartData.timePerDay[i],
                                                                }))}>
                                                                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                                                                    <YAxis tick={{ fontSize: 10 }} />
                                                                    <Tooltip />
                                                                    <Bar dataKey="time" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Daily Table */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4 overflow-x-auto mb-6">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                Daily Breakdown
                                            </h3>
                                            <table className="w-full text-xs sm:text-sm min-w-[500px]">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Date</th>
                                                        <th className="text-center py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Quiz</th>
                                                        <th className="text-center py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Score</th>
                                                        <th className="text-center py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Acc</th>
                                                        <th className="text-center py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Time</th>
                                                        <th className="text-center py-2 px-1.5 font-medium text-gray-600 dark:text-gray-400">Qs</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.dailyBreakdown.map((row) => (
                                                        <tr key={row.date} className={`border-b border-gray-100 dark:border-gray-800 ${!row.isActive ? 'opacity-50' : ''}`}>
                                                            <td className="py-2 px-1.5">{row.date.slice(5)}</td>
                                                            <td className="text-center py-2 px-1.5">{row.quizzes}</td>
                                                            <td className="text-center py-2 px-1.5">{row.isActive ? `${row.scorePercent}%` : '-'}</td>
                                                            <td className="text-center py-2 px-1.5">{row.isActive ? `${row.accuracy}%` : '-'}</td>
                                                            <td className="text-center py-2 px-1.5">{row.timeMinutes}m</td>
                                                            <td className="text-center py-2 px-1.5">{row.questions}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Topics */}
                                        {reportData.stats.totalQuizzes > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <TopicCard title="Strongest" icon={<TrendingUp className="w-4 h-4" />} topics={reportData.topTopics} color="emerald" />
                                                <TopicCard title="Weakest" icon={<TrendingDown className="w-4 h-4" />} topics={reportData.weakTopics} color="red" />
                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Award className="w-4 h-4 text-blue-600" />
                                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Most Practiced</h4>
                                                    </div>
                                                    {reportData.mostPracticedTopic ? (
                                                        <div>
                                                            <p className="font-medium text-blue-800 dark:text-blue-200">{reportData.mostPracticedTopic.topic}</p>
                                                            <p className="text-xs text-blue-600">{reportData.mostPracticedTopic.attempts} attempts</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-blue-600">No data</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
        gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
    };

    return (
        <div className={`${colors[color]} rounded-xl p-2.5 sm:p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[10px] sm:text-xs font-medium opacity-80">{label}</span>
            </div>
            <p className="text-base sm:text-lg font-bold">{value}</p>
        </div>
    );
}

// Topic Card Component
function TopicCard({ title, icon, topics, color }: { title: string; icon: React.ReactNode; topics: { topic: string; accuracy: number }[]; color: 'emerald' | 'red' }) {
    const colorClass = color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600';
    const textClass = color === 'emerald' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200';

    return (
        <div className={`${colorClass} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h4 className={`text-sm font-semibold ${textClass}`}>{title}</h4>
            </div>
            {topics.length === 0 ? (
                <p className="text-xs opacity-70">No data</p>
            ) : (
                <ul className="space-y-1">
                    {topics.slice(0, 3).map((t, i) => (
                        <li key={t.topic} className={`text-xs ${textClass} flex justify-between`}>
                            <span>{i + 1}. {t.topic}</span>
                            <span className="font-medium">{t.accuracy}%</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
