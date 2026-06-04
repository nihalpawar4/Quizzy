'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Save,
    Send,
    Loader2,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Award,
    User,
    FileText,
    Calendar,
    BarChart3,
    Minus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getResultById,
    startEvaluation,
    submitEvaluation,
    submitAndPublish,
    saveEvaluationDraft,
    getEvaluationDraft,
    getAdjacentSubmissions,
    publishResult,
} from '@/services/evaluationService';
import { getQuestionsByTestId } from '@/lib/services';
import { createResultNotification } from '@/lib/services';
import { OBJECTIVE_QUESTION_TYPES } from '@/lib/constants';
import type { TestResult, Question, QuestionEvaluation } from '@/types';

export default function AnswerReviewPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const submissionId = params.submissionId as string;

    // Data
    const [result, setResult] = useState<TestResult | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Evaluation state
    const [evaluations, setEvaluations] = useState<QuestionEvaluation[]>([]);
    const [overallFeedback, setOverallFeedback] = useState('');
    const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(0);

    // Navigation
    const [adjacentIds, setAdjacentIds] = useState<{ previousId: string | null; nextId: string | null; totalCount: number; currentIndex: number }>({
        previousId: null, nextId: null, totalCount: 0, currentIndex: 0
    });

    // Auto-save
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>('');

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);

    // Auth check
    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/login');
        if (!authLoading && user?.role !== 'teacher') router.push('/dashboard/student');
    }, [user, authLoading, router]);

    // Load data
    useEffect(() => {
        if (!user || !submissionId) return;
        loadData();
    }, [user, submissionId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Step 1: Load result
            const resultData = await getResultById(submissionId);
            if (!resultData) {
                setError('Submission not found');
                setLoading(false);
                return;
            }

            setResult(resultData);

            // Step 2: Load questions (gracefully handle missing questions)
            let questionsData: Question[] = [];
            try {
                questionsData = await getQuestionsByTestId(resultData.testId);
            } catch (qErr) {
                console.warn('Could not load questions for test:', resultData.testId, qErr);
                // Continue — we can still evaluate using detailedAnswers from the result
            }
            setQuestions(questionsData);

            // Step 3: Build evaluations from draft, existing evaluation, or from detailedAnswers/questions
            let draft: { questionEvaluations: QuestionEvaluation[]; teacherFeedback: string } | null = null;
            try {
                draft = await getEvaluationDraft(submissionId);
            } catch {
                // Draft loading is non-critical
            }

            if (draft && draft.questionEvaluations.length > 0) {
                setEvaluations(draft.questionEvaluations);
                setOverallFeedback(draft.teacherFeedback);
            } else if (resultData.questionEvaluations && resultData.questionEvaluations.length > 0) {
                // Load from existing evaluation
                setEvaluations(resultData.questionEvaluations);
                setOverallFeedback(resultData.teacherFeedback || '');
            } else {
                // Initialize evaluations — use questions if available, else use detailedAnswers
                const marksPerQ = resultData.totalMarks && resultData.totalQuestions
                    ? resultData.totalMarks / resultData.totalQuestions
                    : 1;

                if (questionsData.length > 0) {
                    // Build from questions + detailedAnswers
                    const initialEvals: QuestionEvaluation[] = questionsData.map((q, idx) => {
                        const detailedAnswer = resultData.detailedAnswers?.[idx];
                        const isObjective = OBJECTIVE_QUESTION_TYPES.includes(q.type as typeof OBJECTIVE_QUESTION_TYPES[number]);

                        // Auto-evaluate objective questions
                        if (isObjective && detailedAnswer) {
                            return {
                                questionId: q.id,
                                questionText: q.text,
                                obtainedMarks: detailedAnswer.isCorrect ? marksPerQ : 0,
                                maxMarks: marksPerQ,
                                feedback: '',
                                status: detailedAnswer.isCorrect ? 'correct' as const : 'incorrect' as const,
                            };
                        }

                        return {
                            questionId: q.id,
                            questionText: q.text,
                            obtainedMarks: 0,
                            maxMarks: marksPerQ,
                            feedback: '',
                            status: 'not_evaluated' as const,
                        };
                    });
                    setEvaluations(initialEvals);
                } else if (resultData.detailedAnswers && resultData.detailedAnswers.length > 0) {
                    // Fallback: build from detailedAnswers when questions aren't available
                    const initialEvals: QuestionEvaluation[] = resultData.detailedAnswers.map((da) => ({
                        questionId: da.questionId,
                        questionText: da.questionText,
                        obtainedMarks: da.isCorrect ? marksPerQ : 0,
                        maxMarks: marksPerQ,
                        feedback: '',
                        status: da.isCorrect ? 'correct' as const : 'not_evaluated' as const,
                    }));
                    setEvaluations(initialEvals);
                }
            }

            // Step 4: Mark as under review if pending (non-blocking)
            if (resultData.evaluationStatus === 'pending' && user) {
                try {
                    await startEvaluation(submissionId, user.uid, user.name);
                } catch (startErr) {
                    console.warn('Could not start evaluation:', startErr);
                }
            }

            // Step 5: Load adjacent submissions (non-blocking)
            try {
                const adjacent = await getAdjacentSubmissions(resultData.testId, submissionId);
                setAdjacentIds(adjacent);
            } catch (adjErr) {
                console.warn('Could not load adjacent submissions:', adjErr);
            }

        } catch (err) {
            console.error('Error loading submission:', err);
            setError('Failed to load submission. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-save draft every 30 seconds
    useEffect(() => {
        if (!user || !result || evaluations.length === 0) return;

        const currentData = JSON.stringify({ evaluations, overallFeedback });
        if (currentData === lastSavedRef.current) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                setSaveStatus('saving');
                await saveEvaluationDraft(submissionId, {
                    questionEvaluations: evaluations,
                    teacherFeedback: overallFeedback,
                    evaluatorId: user.uid,
                });
                lastSavedRef.current = currentData;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch {
                setSaveStatus('idle');
            }
        }, 30000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [evaluations, overallFeedback, user, result, submissionId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveDraft();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
                e.preventDefault();
                if (adjacentIds.nextId) router.push(`/dashboard/teacher/evaluation/${adjacentIds.nextId}`);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (adjacentIds.previousId) router.push(`/dashboard/teacher/evaluation/${adjacentIds.previousId}`);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [adjacentIds]);

    // Update a question's evaluation
    const updateEvaluation = (index: number, updates: Partial<QuestionEvaluation>) => {
        setEvaluations(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    // Quick mark buttons
    const markCorrect = (index: number) => {
        const maxMarks = evaluations[index].maxMarks;
        updateEvaluation(index, { obtainedMarks: maxMarks, status: 'correct' });
    };

    const markPartial = (index: number) => {
        const maxMarks = evaluations[index].maxMarks;
        updateEvaluation(index, { obtainedMarks: Math.round(maxMarks * 0.5 * 100) / 100, status: 'partially_correct' });
    };

    const markIncorrect = (index: number) => {
        updateEvaluation(index, { obtainedMarks: 0, status: 'incorrect' });
    };

    // Calculate totals
    const totalObtained = evaluations.reduce((sum, e) => sum + e.obtainedMarks, 0);
    const totalMaxMarks = evaluations.reduce((sum, e) => sum + e.maxMarks, 0);
    const evaluatedCount = evaluations.filter(e => e.status !== 'not_evaluated').length;
    const progressPercent = questions.length > 0 ? Math.round((evaluatedCount / questions.length) * 100) : 0;

    // Save draft manually
    const handleSaveDraft = async () => {
        if (!user) return;
        try {
            setSaveStatus('saving');
            await saveEvaluationDraft(submissionId, {
                questionEvaluations: evaluations,
                teacherFeedback: overallFeedback,
                evaluatorId: user.uid,
            });
            lastSavedRef.current = JSON.stringify({ evaluations, overallFeedback });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            console.error('Save draft error:', err);
            setSaveStatus('idle');
        }
    };

    // Derive strength and improvement areas
    const deriveAreas = () => {
        const strengths: string[] = [];
        const improvements: string[] = [];

        evaluations.forEach((ev, idx) => {
            const q = questions[idx];
            if (!q) return;
            const topic = q.text.substring(0, 50);
            if (ev.status === 'correct') strengths.push(topic);
            else if (ev.status === 'incorrect' || ev.status === 'partially_correct') improvements.push(topic);
        });

        return {
            strengthAreas: strengths.slice(0, 5),
            improvementAreas: improvements.slice(0, 5),
        };
    };

    // Submit evaluation (evaluate only, don't publish)
    const handleSubmitEvaluation = async () => {
        if (!user || !result) return;

        setIsSubmitting(true);
        try {
            const areas = deriveAreas();
            await submitEvaluation(submissionId, {
                questionEvaluations: evaluations,
                teacherFeedback: overallFeedback,
                marksObtained: totalObtained,
                totalMarks: totalMaxMarks,
                evaluatorId: user.uid,
                evaluatorName: user.name,
                ...areas,
            });
            router.push('/dashboard/teacher/evaluation');
        } catch (err) {
            console.error('Submit evaluation error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit and publish immediately
    const handleSubmitAndPublish = async () => {
        if (!user || !result) return;

        setIsSubmitting(true);
        try {
            const areas = deriveAreas();
            await submitAndPublish(submissionId, {
                questionEvaluations: evaluations,
                teacherFeedback: overallFeedback,
                marksObtained: totalObtained,
                totalMarks: totalMaxMarks,
                evaluatorId: user.uid,
                evaluatorName: user.name,
                ...areas,
            });

            // Send notification
            try {
                await createResultNotification({
                    studentId: result.studentId,
                    studentClass: result.studentClass,
                    testTitle: result.testTitle,
                    subject: result.subject,
                    score: totalObtained,
                    totalMarks: totalMaxMarks,
                    resultId: submissionId,
                    teacherId: user.uid,
                    teacherName: user.name,
                });
            } catch {
                // Non-blocking
            }

            setShowPublishConfirm(false);
            router.push('/dashboard/teacher/evaluation');
        } catch (err) {
            console.error('Publish error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get status border class for question card
    const getCardClass = (status: QuestionEvaluation['status']) => {
        switch (status) {
            case 'correct': return 'evaluated-correct';
            case 'partially_correct': return 'evaluated-partial';
            case 'incorrect': return 'evaluated-incorrect';
            default: return 'not-evaluated';
        }
    };

    if (authLoading || !user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-[#1650EB]" /></div>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1650EB] mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading submission...</p>
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
                <div className="eval-card p-8 text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{error || 'Submission not found'}</p>
                    <button onClick={() => router.push('/dashboard/teacher/evaluation')} className="mt-4 px-6 py-2 bg-[#1650EB] text-white rounded-xl text-sm font-medium hover:bg-[#1243c7] transition-colors">
                        Back to Evaluations
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard/teacher/evaluation')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">{result.studentName}</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.testTitle} • {result.subject}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Auto-save indicator */}
                            <div className={`autosave-indicator ${saveStatus}`}>
                                {saveStatus === 'saving' && <><span className="autosave-dot w-2 h-2 rounded-full bg-amber-500" /> Saving...</>}
                                {saveStatus === 'saved' && <><CheckCircle className="w-3 h-3" /> Saved</>}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => adjacentIds.previousId && router.push(`/dashboard/teacher/evaluation/${adjacentIds.previousId}`)}
                                    disabled={!adjacentIds.previousId}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 transition-colors"
                                    title="Previous student (Ctrl+←)"
                                >
                                    <ArrowLeft className="w-4 h-4 text-gray-500" />
                                </button>
                                <span className="text-xs text-gray-500 px-1">
                                    {adjacentIds.currentIndex + 1}/{adjacentIds.totalCount}
                                </span>
                                <button
                                    onClick={() => adjacentIds.nextId && router.push(`/dashboard/teacher/evaluation/${adjacentIds.nextId}`)}
                                    disabled={!adjacentIds.nextId}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-30 transition-colors"
                                    title="Next student (Ctrl+→)"
                                >
                                    <ArrowRight className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="eval-progress-bar mb-0">
                        <div className="eval-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Content — Questions */}
                    <div className="flex-1 space-y-4">
                        {/* Student Info Card */}
                        <div className="eval-card p-4">
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-400">{result.studentName}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600 dark:text-gray-400">Class {result.studentClass}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {result.timeTakenSeconds ? `${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s` : '--'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {result.timestamp instanceof Date
                                            ? result.timestamp.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : new Date(result.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Question Cards */}
                        {questions.map((q, idx) => {
                            const detailedAnswer = result.detailedAnswers?.[idx];
                            const evaluation = evaluations[idx];
                            if (!evaluation) return null;
                            const isExpanded = expandedQuestionIndex === idx;
                            const isObjective = OBJECTIVE_QUESTION_TYPES.includes(q.type as typeof OBJECTIVE_QUESTION_TYPES[number]);

                            return (
                                <motion.div
                                    key={q.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={`question-eval-card ${getCardClass(evaluation.status)}`}
                                >
                                    {/* Question Header — always visible */}
                                    <button
                                        onClick={() => setExpandedQuestionIndex(isExpanded ? null : idx)}
                                        className="w-full flex items-start justify-between gap-3 text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-[#1650EB] bg-[#1650EB]/10 px-2 py-0.5 rounded-md">Q{idx + 1}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{q.type.replace('_', ' ')}</span>
                                                {isObjective && <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Auto</span>}
                                            </div>
                                            <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">{q.text}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{evaluation.obtainedMarks}/{evaluation.maxMarks}</span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 space-y-4">
                                                    {/* Student's Answer */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Student&apos;s Answer</p>
                                                        <div className="student-answer-box">
                                                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                                                {detailedAnswer?.userAnswer || 'Not answered'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Correct Answer */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Correct Answer</p>
                                                        <div className="correct-answer-box">
                                                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                                                {detailedAnswer?.correctAnswer || q.correctAnswer || q.options[q.correctOption] || '--'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Explanation */}
                                                    {q.explanation && (
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
                                                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">💡 Explanation</p>
                                                            <p className="text-sm text-purple-800 dark:text-purple-300">{q.explanation}</p>
                                                        </div>
                                                    )}

                                                    {/* Marks & Quick Actions */}
                                                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">Marks:</span>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={evaluation.maxMarks}
                                                                step={0.5}
                                                                value={evaluation.obtainedMarks}
                                                                onChange={(e) => {
                                                                    const val = Math.min(parseFloat(e.target.value) || 0, evaluation.maxMarks);
                                                                    const status = val === evaluation.maxMarks ? 'correct' : val === 0 ? 'incorrect' : 'partially_correct';
                                                                    updateEvaluation(idx, { obtainedMarks: val, status });
                                                                }}
                                                                className="marks-input"
                                                            />
                                                            <span className="text-sm text-gray-400">/ {evaluation.maxMarks}</span>
                                                        </div>

                                                        <div className="flex gap-1.5 ml-auto">
                                                            <button onClick={() => markCorrect(idx)} className={`p-2 rounded-lg transition-colors ${evaluation.status === 'correct' ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400'}`} title="Full marks">
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => markPartial(idx)} className={`p-2 rounded-lg transition-colors ${evaluation.status === 'partially_correct' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400'}`} title="Half marks">
                                                                <Minus className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => markIncorrect(idx)} className={`p-2 rounded-lg transition-colors ${evaluation.status === 'incorrect' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400'}`} title="Zero marks">
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Per-question feedback */}
                                                    <div>
                                                        <textarea
                                                            value={evaluation.feedback || ''}
                                                            onChange={(e) => updateEvaluation(idx, { feedback: e.target.value })}
                                                            placeholder="Add feedback for this question (optional)..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1650EB]/20 focus:border-[#1650EB] text-gray-900 dark:text-white placeholder:text-gray-400"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-80 space-y-4 lg:sticky lg:top-20 lg:self-start animate-slideInRight">
                        {/* Score Summary */}
                        <div className="eval-card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4 text-[#1650EB]" /> Score Summary
                            </h3>
                            <div className="text-center mb-4">
                                <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalObtained.toFixed(1)}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">out of {totalMaxMarks}</p>
                                <p className="text-lg font-semibold text-[#1650EB] mt-1">
                                    {totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0}%
                                </p>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{evaluatedCount}/{questions.length} evaluated</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="eval-progress-bar">
                                    <div className="eval-progress-fill" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </div>

                            {/* Question Dots */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {evaluations.map((ev, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setExpandedQuestionIndex(idx)}
                                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                                            expandedQuestionIndex === idx ? 'ring-2 ring-[#1650EB] ring-offset-1 dark:ring-offset-gray-900' : ''
                                        } ${
                                            ev.status === 'correct' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                                            ev.status === 'partially_correct' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                                            ev.status === 'incorrect' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Overall Feedback */}
                        <div className="eval-card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[#1650EB]" /> Overall Feedback
                            </h3>
                            <textarea
                                value={overallFeedback}
                                onChange={(e) => setOverallFeedback(e.target.value)}
                                placeholder="Write overall feedback for the student..."
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1650EB]/20 focus:border-[#1650EB] text-gray-900 dark:text-white placeholder:text-gray-400"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="eval-card p-5 space-y-3">
                            <button
                                onClick={handleSaveDraft}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Save className="w-4 h-4" /> Save Draft
                                <span className="kbd-hint ml-1">⌘S</span>
                            </button>

                            <button
                                onClick={handleSubmitEvaluation}
                                disabled={isSubmitting || evaluatedCount === 0}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1650EB] text-white rounded-xl text-sm font-medium hover:bg-[#1243c7] disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Complete Evaluation
                            </button>

                            <button
                                onClick={() => setShowPublishConfirm(true)}
                                disabled={isSubmitting || evaluatedCount === 0}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" /> Complete & Publish
                            </button>
                        </div>

                        {/* Keyboard Hints */}
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1 px-1">
                            <p><span className="kbd-hint">⌘S</span> Save draft</p>
                            <p><span className="kbd-hint">⌘→</span> Next student</p>
                            <p><span className="kbd-hint">⌘←</span> Previous student</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Publish Confirmation Modal */}
            <AnimatePresence>
                {showPublishConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowPublishConfirm(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="eval-card p-6 max-w-sm w-full text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                                <Send className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Publish Results?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                This will make the result visible to <strong>{result.studentName}</strong>.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Score: <strong className="text-gray-900 dark:text-white">{totalObtained.toFixed(1)}/{totalMaxMarks}</strong> ({totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0}%)
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowPublishConfirm(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSubmitAndPublish} disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Publish
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
