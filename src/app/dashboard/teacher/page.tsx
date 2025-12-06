'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    GraduationCap,
    BookOpen,
    Users,
    Download,
    Plus,
    Trash2,
    Edit,
    LogOut,
    Loader2,
    Upload,
    FileJson,
    FileSpreadsheet,
    X,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    BarChart3,
    Settings,
    User as UserIcon,
    Trophy,
    Clock,
    Target,
    Search,
    Filter,
    Eye,
    Copy,
    Check,
    ArrowRight,
    Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getAllTests,
    getAllResults,
    getResultsByTest,
    getAllStudents,
    createTest,
    deleteTest,
    deleteResult,
    uploadQuestions,
    updateTestStatus
} from '@/lib/services';
import { downloadCSV, downloadAnalyticsCSV } from '@/lib/utils/downloadCSV';
import { parseCSV, parseJSON, type ParsedQuestion } from '@/lib/utils/parseQuestions';
import type { Test, TestResult, User } from '@/types';
import { CLASS_OPTIONS, SUBJECTS } from '@/lib/constants';

type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'one_word' | 'short_answer';

interface QuestionTypeOption {
    value: QuestionType;
    label: string;
    description: string;
    icon: string;
}

const QUESTION_TYPES: QuestionTypeOption[] = [
    { value: 'mcq', label: 'Multiple Choice', description: '4 options, 1 correct', icon: '🔘' },
    { value: 'true_false', label: 'True/False', description: '2 options only', icon: '✅' },
    { value: 'fill_blank', label: 'Fill in Blank', description: 'Complete the sentence', icon: '📝' },
    { value: 'one_word', label: 'One Word', description: 'Single word answer', icon: '💬' },
    { value: 'short_answer', label: 'Short Answer', description: '2-3 sentence response', icon: '📄' },
];

export default function TeacherDashboard() {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();

    // Data states
    const [tests, setTests] = useState<Test[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Stat modal states
    const [showTestsModal, setShowTestsModal] = useState(false);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
    const [showScoreModal, setShowScoreModal] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'tests' | 'analytics' | 'create'>('tests');

    // Create test states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1); // Step 1: Details, Step 2: Question Type, Step 3: Upload
    const [newTest, setNewTest] = useState<{
        title: string;
        subject: typeof SUBJECTS[number];
        targetClass: number;
        duration: number;
        questionType: QuestionType;
    }>({
        title: '',
        subject: SUBJECTS[0],
        targetClass: 5,
        duration: 30,
        questionType: 'mcq'
    });
    const [uploadMethod, setUploadMethod] = useState<'csv' | 'json' | 'manual'>('csv');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [jsonInput, setJsonInput] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);

    // Analytics states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState<number | 'all'>('all');
    const [filterSubject, setFilterSubject] = useState<string | 'all'>('all');

    // Detailed analytics modal
    const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [detailedResults, setDetailedResults] = useState<TestResult[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Manual question entry
    const [manualQuestions, setManualQuestions] = useState<ParsedQuestion[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        text: '',
        options: ['', '', '', ''],
        correctOption: 0
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [testsData, resultsData, studentsData] = await Promise.all([
                getAllTests(),
                getAllResults(),
                getAllStudents()
            ]);
            setTests(testsData);
            setResults(resultsData);
            setStudents(studentsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (!authLoading && user?.role !== 'teacher') {
            router.push('/dashboard/student');
            return;
        }
        if (user) {
            loadData();
        }
    }, [user, authLoading, router, loadData]);

    // Handle CSV file upload
    const handleCSVUpload = async (file: File) => {
        setCsvFile(file);
        setParseError(null);
        try {
            const text = await file.text();
            const result = parseCSV(text);
            if (result.success) {
                setParsedQuestions(result.questions);
            } else {
                setParseError(result.errors.join(', '));
                setParsedQuestions([]);
            }
        } catch (error) {
            setParseError(error instanceof Error ? error.message : 'Failed to parse CSV');
            setParsedQuestions([]);
        }
    };

    // Handle JSON paste
    const handleJSONParse = () => {
        setParseError(null);
        try {
            const result = parseJSON(jsonInput);
            if (result.success) {
                setParsedQuestions(result.questions);
            } else {
                setParseError(result.errors.join(', '));
                setParsedQuestions([]);
            }
        } catch (error) {
            setParseError(error instanceof Error ? error.message : 'Failed to parse JSON');
            setParsedQuestions([]);
        }
    };

    // Add manual question
    const addManualQuestion = () => {
        if (!currentQuestion.text.trim()) return;

        const newQuestion: ParsedQuestion = {
            text: currentQuestion.text,
            options: currentQuestion.options.filter(o => o.trim()),
            correctOption: currentQuestion.correctOption
        };

        setManualQuestions([...manualQuestions, newQuestion]);
        setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOption: 0 });
    };

    // Create test
    const handleCreateTest = async () => {
        const questions = uploadMethod === 'manual' ? manualQuestions : parsedQuestions;

        if (!newTest.title.trim() || questions.length === 0) {
            setParseError('Please provide a title and at least one question');
            return;
        }

        setIsCreating(true);
        try {
            const testId = await createTest({
                title: newTest.title,
                subject: newTest.subject,
                targetClass: newTest.targetClass,
                duration: newTest.duration,
                createdBy: user!.uid,
                isActive: true,
                questionCount: questions.length
            });

            await uploadQuestions(testId, questions);

            setCreateSuccess(true);
            await loadData();

            setTimeout(() => {
                setShowCreateModal(false);
                setCreateSuccess(false);
                resetCreateForm();
            }, 2000);
        } catch (error) {
            console.error('Error creating test:', error);
            setParseError('Failed to create test. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const resetCreateForm = () => {
        setNewTest({ title: '', subject: SUBJECTS[0], targetClass: 5, duration: 30, questionType: 'mcq' });
        setCsvFile(null);
        setJsonInput('');
        setParsedQuestions([]);
        setManualQuestions([]);
        setParseError(null);
        setUploadMethod('csv');
        setCreateStep(1);
    };

    // Delete test
    const handleDeleteTest = async (testId: string) => {
        if (!confirm('Are you sure you want to delete this test?')) return;
        try {
            await deleteTest(testId);
            await loadData();
        } catch (error) {
            console.error('Error deleting test:', error);
        }
    };

    // Toggle test status
    const handleToggleStatus = async (testId: string, currentStatus: boolean) => {
        try {
            await updateTestStatus(testId, !currentStatus);
            await loadData();
        } catch (error) {
            console.error('Error updating test status:', error);
        }
    };

    // Delete a result/submission
    const handleDeleteResult = async (resultId: string) => {
        if (!confirm('Are you sure you want to delete this submission? This cannot be undone.')) return;
        try {
            await deleteResult(resultId);
            await loadData();
        } catch (error) {
            console.error('Error deleting result:', error);
        }
    };

    // View detailed analytics for a test
    const viewDetailedAnalytics = async (test: Test) => {
        setSelectedTest(test);
        setShowDetailedAnalytics(true);
        setLoadingDetails(true);
        try {
            const testResults = await getResultsByTest(test.id);
            setDetailedResults(testResults);
        } catch (error) {
            console.error('Error loading detailed results:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Download results
    const handleDownloadResults = () => {
        const filteredResults = getFilteredResults();
        downloadAnalyticsCSV(filteredResults, `quizy-results-${new Date().toISOString().split('T')[0]}`);
    };

    // Filter results
    const getFilteredResults = () => {
        return results.filter(r => {
            const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.testTitle.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesClass = filterClass === 'all' || r.studentClass === filterClass;
            const matchesSubject = filterSubject === 'all' || r.subject === filterSubject;
            return matchesSearch && matchesClass && matchesSubject;
        });
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    // Stats
    const totalStudents = new Set(results.map(r => r.studentId)).size;
    const totalTests = tests.length;
    const averageScore = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length)
        : 0;

    const filteredResults = getFilteredResults();

    // Sample JSON for copying - dynamic based on question type
    const getSampleJSON = () => {
        switch (newTest.questionType) {
            case 'mcq':
                return `[
  { "question": "What is 2 + 2?", "options": ["3", "4", "5", "6"], "correct": 1 },
  { "question": "Capital of India?", "options": ["Mumbai", "Delhi", "Chennai", "Kolkata"], "correct": 1 }
]`;
            case 'true_false':
                return `[
  { "question": "The Earth is flat.", "answer": "False" },
  { "question": "Water boils at 100°C.", "answer": "True" }
]`;
            case 'fill_blank':
                return `[
  { "question": "The capital of France is ___.", "answer": "Paris" },
  { "question": "H2O is commonly known as ___.", "answer": "Water" }
]`;
            case 'one_word':
                return `[
  { "question": "What is the smallest planet?", "answer": "Mercury" },
  { "question": "What gas do plants produce?", "answer": "Oxygen" }
]`;
            case 'short_answer':
                return `[
  { "question": "Explain photosynthesis briefly.", "answer": "Process by which plants make food using sunlight" },
  { "question": "What causes rain?", "answer": "Water evaporates and condenses in clouds" }
]`;
            default:
                return `[{ "question": "Your question?", "answer": "Answer" }]`;
        }
    };
    const sampleJSON = getSampleJSON();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white">Quizy</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Teacher Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" title="Profile Settings">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                                <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                        Welcome, {user.name}! 👋
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your tests, view student performance, and create engaging assessments.
                    </p>
                </motion.div>

                {/* Stats Cards - Clickable */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                    <button onClick={() => setShowTestsModal(true)} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all text-left group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTests}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
                            </div>
                        </div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all tests →</p>
                    </button>
                    <button onClick={() => setShowStudentsModal(true)} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all text-left group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all students →</p>
                    </button>
                    <button onClick={() => setShowSubmissionsModal(true)} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all text-left group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{results.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
                            </div>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all submissions →</p>
                    </button>
                    <button onClick={() => setShowScoreModal(true)} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-lg transition-all text-left group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageScore}%</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score</p>
                            </div>
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view breakdown →</p>
                    </button>
                </motion.div>

                {/* Tabs */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                        {[
                            { id: 'tests', label: 'My Tests', icon: BookOpen },
                            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Tests Tab */}
                {activeTab === 'tests' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Create Test Button */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Tests</h3>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Create Test
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400 mb-4">No tests created yet.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Your First Test
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tests.map((test) => {
                                    const testResults = results.filter(r => r.testId === test.id);
                                    const avgTestScore = testResults.length > 0
                                        ? Math.round(testResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / testResults.length)
                                        : null;

                                    return (
                                        <motion.div
                                            key={test.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                                                            {test.subject}
                                                        </span>
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                                            Class {test.targetClass}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">{test.title}</h4>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleStatus(test.id, test.isActive)}
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${test.isActive
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {test.isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                <span>{test.questionCount || 0} Questions</span>
                                                {test.duration && <span>{test.duration} min</span>}
                                            </div>

                                            <div className="flex items-center justify-between text-sm mb-4">
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {testResults.length} submissions
                                                </span>
                                                {avgTestScore !== null && (
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        Avg: {avgTestScore}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => viewDetailedAnalytics(test)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Analytics
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTest(test.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students or tests..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Classes</option>
                                {CLASS_OPTIONS.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">All Subjects</option>
                                {SUBJECTS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleDownloadResults}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Download CSV
                            </button>
                        </div>

                        {/* Results Table */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {filteredResults.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    No results found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredResults.slice(0, 50).map((result) => (
                                                <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900 dark:text-white">{result.studentName}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                        Class {result.studentClass}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                                                        {result.testTitle}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                                                            {result.subject}
                                                        </span>
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
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleDeleteResult(result.id)}
                                                            className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete submission"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredResults.length > 50 && (
                                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                                    Showing 50 of {filteredResults.length} results. Download CSV for full data.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Create Test Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {createSuccess ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Test Created!</h3>
                                    <p className="text-gray-600 dark:text-gray-400">Your test is now live for students.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Header with Steps */}
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Test</h3>
                                            <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {/* Step Indicator */}
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3].map((step) => (
                                                <div key={step} className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${createStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                                        {step}
                                                    </div>
                                                    <span className={`text-sm hidden sm:block ${createStep >= step ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                                        {step === 1 ? 'Details' : step === 2 ? 'Question Type' : 'Upload'}
                                                    </span>
                                                    {step < 3 && <div className={`w-8 h-0.5 ${createStep > step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {/* STEP 1: Test Details */}
                                        {createStep === 1 && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Title *</label>
                                                        <input type="text" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} placeholder="e.g., Chapter 5 Quiz" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label>
                                                        <select value={newTest.subject} onChange={(e) => setNewTest({ ...newTest, subject: e.target.value as typeof SUBJECTS[number] })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Class *</label>
                                                        <select value={newTest.targetClass} onChange={(e) => setNewTest({ ...newTest, targetClass: Number(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                                            {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                                                        <input type="number" value={newTest.duration} onChange={(e) => setNewTest({ ...newTest, duration: Number(e.target.value) })} min={5} max={180} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 2: Question Type */}
                                        {createStep === 2 && (
                                            <div className="space-y-6">
                                                <p className="text-gray-600 dark:text-gray-400">Select the type of questions for this test:</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {QUESTION_TYPES.map((type) => (
                                                        <button key={type.value} onClick={() => setNewTest({ ...newTest, questionType: type.value })} className={`p-6 rounded-2xl border-2 transition-all text-left ${newTest.questionType === type.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                            <span className="text-3xl">{type.icon}</span>
                                                            <p className="font-semibold text-gray-900 dark:text-white mt-3">{type.label}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 3: Upload Questions */}
                                        {createStep === 3 && (
                                            <div className="space-y-6">
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex items-center gap-3">
                                                    <span className="text-2xl">{QUESTION_TYPES.find(t => t.value === newTest.questionType)?.icon}</span>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{QUESTION_TYPES.find(t => t.value === newTest.questionType)?.label} Questions</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload or enter your {newTest.questionType.replace('_', ' ')} questions</p>
                                                    </div>
                                                </div>

                                                {/* Upload Method Selection */}
                                                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                                                    {[{ id: 'csv', label: 'CSV Upload', icon: FileSpreadsheet }, { id: 'json', label: 'JSON Paste', icon: FileJson }, { id: 'manual', label: 'Manual Entry', icon: Edit }].map((method) => (
                                                        <button key={method.id} onClick={() => setUploadMethod(method.id as typeof uploadMethod)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${uploadMethod === method.id ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                                            <method.icon className="w-4 h-4" />
                                                            {method.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* CSV Upload */}
                                                {uploadMethod === 'csv' && (
                                                    <div className="space-y-4">
                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                                                            <p className="font-medium text-gray-900 dark:text-white mb-2">CSV Format:</p>
                                                            {newTest.questionType === 'mcq' && <p>Question, Option A, Option B, Option C, Option D, Correct (A/B/C/D)</p>}
                                                            {newTest.questionType === 'true_false' && <p>Question, Correct (True/False)</p>}
                                                            {(newTest.questionType === 'fill_blank' || newTest.questionType === 'one_word' || newTest.questionType === 'short_answer') && <p>Question, Answer</p>}
                                                        </div>
                                                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                                                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                                            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleCSVUpload(e.target.files[0])} className="hidden" id="csv-upload" />
                                                            <label htmlFor="csv-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors cursor-pointer">
                                                                <Upload className="w-4 h-4" /> Select CSV File
                                                            </label>
                                                        </div>
                                                        {csvFile && <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{csvFile.name} uploaded</p>}
                                                    </div>
                                                )}

                                                {/* JSON Paste */}
                                                {uploadMethod === 'json' && (
                                                    <div className="space-y-4">
                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sample JSON:</p>
                                                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">{sampleJSON}</pre>
                                                        </div>
                                                        <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Paste your JSON here..." rows={8} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                        <button onClick={handleJSONParse} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                                                            <FileJson className="w-4 h-4" /> Parse JSON
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Manual Entry */}
                                                {uploadMethod === 'manual' && (
                                                    <div className="space-y-4">
                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Text</label>
                                                                <input type="text" value={currentQuestion.text} onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} placeholder="Enter your question..." className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                            </div>
                                                            {newTest.questionType === 'mcq' && (
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {currentQuestion.options.map((opt, idx) => (
                                                                        <div key={idx} className="flex items-center gap-2">
                                                                            <input type="radio" name="correctOption" checked={currentQuestion.correctOption === idx} onChange={() => setCurrentQuestion({ ...currentQuestion, correctOption: idx })} className="w-4 h-4 text-indigo-600" />
                                                                            <input type="text" value={opt} onChange={(e) => { const newOptions = [...currentQuestion.options]; newOptions[idx] = e.target.value; setCurrentQuestion({ ...currentQuestion, options: newOptions }); }} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {newTest.questionType === 'true_false' && (
                                                                <div className="flex gap-4">
                                                                    {['True', 'False'].map((opt, idx) => (
                                                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                                            <input type="radio" name="tfOption" checked={currentQuestion.correctOption === idx} onChange={() => setCurrentQuestion({ ...currentQuestion, correctOption: idx, options: ['True', 'False'] })} className="w-4 h-4 text-indigo-600" />
                                                                            <span className="text-gray-700 dark:text-gray-300">{opt}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {(newTest.questionType === 'fill_blank' || newTest.questionType === 'one_word' || newTest.questionType === 'short_answer') && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Correct Answer</label>
                                                                    <input type="text" value={currentQuestion.options[0] || ''} onChange={(e) => setCurrentQuestion({ ...currentQuestion, options: [e.target.value], correctOption: 0 })} placeholder="Enter the correct answer..." className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                                </div>
                                                            )}
                                                            <button onClick={addManualQuestion} disabled={!currentQuestion.text.trim()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                                <Plus className="w-4 h-4" /> Add Question
                                                            </button>
                                                        </div>
                                                        {manualQuestions.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Added Questions ({manualQuestions.length})</p>
                                                                {manualQuestions.map((q, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{idx + 1}. {q.text}</span>
                                                                        <button onClick={() => setManualQuestions(manualQuestions.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Parsed Questions Preview */}
                                                {parsedQuestions.length > 0 && uploadMethod !== 'manual' && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                                        <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{parsedQuestions.length} questions parsed!</p>
                                                    </div>
                                                )}

                                                {parseError && (
                                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                                        <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{parseError}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer with Navigation */}
                                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                                        <button onClick={() => createStep > 1 ? setCreateStep((createStep - 1) as 1 | 2 | 3) : (setShowCreateModal(false), resetCreateForm())} className="px-6 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            {createStep > 1 ? 'Back' : 'Cancel'}
                                        </button>
                                        {createStep < 3 ? (
                                            <button onClick={() => setCreateStep((createStep + 1) as 1 | 2 | 3)} disabled={createStep === 1 && !newTest.title.trim()} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                Next <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={handleCreateTest} disabled={isCreating || (uploadMethod === 'manual' ? manualQuestions.length === 0 : parsedQuestions.length === 0)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><CheckCircle className="w-4 h-4" /> Create Test</>}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detailed Analytics Modal */}
            <AnimatePresence>
                {showDetailedAnalytics && selectedTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setShowDetailedAnalytics(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTest.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedTest.subject} • Class {selectedTest.targetClass} • {detailedResults.length} submissions</p>
                                </div>
                                <button onClick={() => setShowDetailedAnalytics(false)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingDetails ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                    </div>
                                ) : detailedResults.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400">No submissions yet for this test.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {detailedResults.map((result, idx) => (
                                            <div key={result.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                                {/* Student Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                                                            <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white">{result.studentName}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Class {result.studentClass} • {result.timestamp.toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-4 py-2 rounded-xl font-bold ${(result.score / result.totalQuestions) >= 0.7 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                        (result.score / result.totalQuestions) >= 0.4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                        }`}>
                                                        {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                                                    </div>
                                                </div>

                                                {/* Detailed Answers */}
                                                {result.detailedAnswers && result.detailedAnswers.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Question-by-Question Breakdown:</p>
                                                        <div className="grid gap-2">
                                                            {result.detailedAnswers.map((ans, qIdx) => (
                                                                <div key={qIdx} className={`p-3 rounded-lg border ${ans.isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                                        Q{qIdx + 1}: {ans.questionText}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-4 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-500 dark:text-gray-400">Student&apos;s Answer: </span>
                                                                            <span className={`font-medium ${ans.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                {ans.userAnswer || '(No answer)'}
                                                                            </span>
                                                                        </div>
                                                                        {!ans.isCorrect && (
                                                                            <div>
                                                                                <span className="text-gray-500 dark:text-gray-400">Correct Answer: </span>
                                                                                <span className="font-medium text-green-600 dark:text-green-400">{ans.correctAnswer}</span>
                                                                            </div>
                                                                        )}
                                                                        <span className={`ml-auto ${ans.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                            {ans.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                        Detailed answers not available (legacy submission)
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                                <button onClick={() => setShowDetailedAnalytics(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tests Modal */}
            <AnimatePresence>
                {showTestsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTestsModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">All Tests ({tests.length})</h3>
                                        <p className="text-sm text-gray-500">Complete list of created tests</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTestsModal(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {tests.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No tests created yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {tests.map((test, idx) => {
                                            const testResults = results.filter(r => r.testId === test.id);
                                            return (
                                                <div key={test.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">{test.title}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">{test.subject}</span>
                                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">Class {test.targetClass}</span>
                                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{test.questionCount || 0} Questions</span>
                                                                {test.duration && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{test.duration} min</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${test.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{test.isActive ? 'Active' : 'Inactive'}</span>
                                                            <p className="text-sm text-gray-500 mt-2">{testResults.length} submissions</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Students Modal */}
            <AnimatePresence>
                {showStudentsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowStudentsModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">All Students ({students.length})</h3>
                                        <p className="text-sm text-gray-500">Registered students on the platform</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowStudentsModal(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {students.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No students registered yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {students.map((student) => {
                                            const studentResults = results.filter(r => r.studentId === student.uid);
                                            const avgScore = studentResults.length > 0 ? Math.round(studentResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / studentResults.length) : null;
                                            return (
                                                <div key={student.uid} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                                                            <UserIcon className="w-6 h-6 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Mail className="w-4 h-4" />
                                                                <span>{student.email}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">Class {student.studentClass || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500">{studentResults.length} tests taken</p>
                                                        {avgScore !== null && (
                                                            <p className={`text-sm font-medium ${avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>Avg: {avgScore}%</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submissions Modal */}
            <AnimatePresence>
                {showSubmissionsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSubmissionsModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">All Submissions ({results.length})</h3>
                                        <p className="text-sm text-gray-500">Complete submission history</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSubmissionsModal(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {results.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No submissions yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Student</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Test</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Subject</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Score</th>
                                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((result) => (
                                                    <tr key={result.id} className="border-b border-gray-100 dark:border-gray-800">
                                                        <td className="py-3 px-4">
                                                            <p className="font-medium text-gray-900 dark:text-white">{result.studentName}</p>
                                                            <p className="text-xs text-gray-500">Class {result.studentClass}</p>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{result.testTitle}</td>
                                                        <td className="py-3 px-4"><span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">{result.subject}</span></td>
                                                        <td className="py-3 px-4">
                                                            <span className={`font-medium ${(result.score / result.totalQuestions) >= 0.7 ? 'text-green-600' : (result.score / result.totalQuestions) >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">{result.timestamp.toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Score Breakdown Modal */}
            <AnimatePresence>
                {showScoreModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowScoreModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
                                        <Target className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Score Breakdown</h3>
                                        <p className="text-sm text-gray-500">Overall: {averageScore}% average across {results.length} submissions</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowScoreModal(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {results.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No submissions to analyze.</p>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Score Distribution */}
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Score Distribution</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-green-600">{results.filter(r => (r.score / r.totalQuestions) >= 0.7).length}</p>
                                                    <p className="text-sm text-green-700 dark:text-green-400">Excellent (≥70%)</p>
                                                </div>
                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-yellow-600">{results.filter(r => (r.score / r.totalQuestions) >= 0.4 && (r.score / r.totalQuestions) < 0.7).length}</p>
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-400">Average (40-69%)</p>
                                                </div>
                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-red-600">{results.filter(r => (r.score / r.totalQuestions) < 0.4).length}</p>
                                                    <p className="text-sm text-red-700 dark:text-red-400">Needs Work (&lt;40%)</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* By Subject */}
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Average by Subject</h4>
                                            <div className="space-y-2">
                                                {SUBJECTS.map(subject => {
                                                    const subjectResults = results.filter(r => r.subject === subject);
                                                    if (subjectResults.length === 0) return null;
                                                    const avgSubjectScore = Math.round(subjectResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / subjectResults.length);
                                                    return (
                                                        <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                            <span className="text-gray-700 dark:text-gray-300">{subject}</span>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${avgSubjectScore >= 70 ? 'bg-green-500' : avgSubjectScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${avgSubjectScore}%` }} />
                                                                </div>
                                                                <span className="font-medium text-gray-900 dark:text-white w-12 text-right">{avgSubjectScore}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
