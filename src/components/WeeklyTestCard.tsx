'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Loader2,
    X,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trophy,
    BookOpen,
    ChevronRight,
    ChevronLeft,
    Timer,
    Sparkles,
    Play,
} from 'lucide-react';
import type { Question, User, TestSession, WeeklyTestResult } from '@/types';
import {
    generateWeeklyTestQuestions,
    getWeeklyTestNumber,
    hasCompletedWeeklyTest,
    submitWeeklyTest,
    getWeeklyTestHistory,
    WEEKLY_TEST_QUESTION_COUNT,
    WEEKLY_TEST_TIMER_SECONDS,
    isSunday,
} from '@/services/weeklyTestService';
import {
    createTestSession,
    getActiveWeeklySession,
    getWeeklyTestSessionId,
    updateSessionProgress,
    completeSession as completeTestSession,
} from '@/services/testSessionService';

// ── Types ────────────────────────────────────────────────────────────

interface WeeklyTestCardProps {
    user: User;
    onComplete?: (score: number, total: number) => void;
}

// ── Timer Display ────────────────────────────────────────────────────

function TimerDisplay({ seconds, warning }: { seconds: number; warning: boolean }) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums transition-colors ${
            warning
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}>
            <Timer className="w-4 h-4" />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────

export default function WeeklyTestCard({ user, onComplete }: WeeklyTestCardProps) {
    // Core state
    const [phase, setPhase] = useState<'loading' | 'unavailable' | 'start' | 'instructions' | 'generating' | 'test' | 'submitting' | 'results' | 'completed' | 'error'>('loading');
    const [error, setError] = useState('');
    const [weekNumber, setWeekNumber] = useState(1);
    const [questions, setQuestions] = useState<(Question & { subject?: string })[]>([]);
    const [history, setHistory] = useState<WeeklyTestResult[]>([]);

    // Test state
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [timeLeft, setTimeLeft] = useState(WEEKLY_TEST_TIMER_SECONDS);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isSubmittingRef = useRef(false);

    // Results
    const [finalScore, setFinalScore] = useState(0);
    const [showReview, setShowReview] = useState(false);

    // ── Load initial state ───────────────────────────────────────────

    useEffect(() => {
        async function init() {
            try {
                if (!isSunday()) {
                    setPhase('unavailable');
                    return;
                }

                const wn = getWeeklyTestNumber();
                setWeekNumber(wn);

                // Check if already completed
                const completed = await hasCompletedWeeklyTest(user.uid, wn);
                if (completed) {
                    // Load history for display
                    const hist = await getWeeklyTestHistory(user.uid);
                    setHistory(hist);
                    setPhase('completed');
                    return;
                }

                // Check for existing in-progress session
                const existingSession = await getActiveWeeklySession(
                    user.uid,
                    user.studentClass || 0,
                    wn
                );

                if (existingSession && existingSession.status === 'in_progress') {
                    // Resume — but we need the questions regenerated
                    // (they're not stored in the session)
                    setSessionId(existingSession.id);
                    sessionIdRef.current = existingSession.id;
                    setCurrentQ(existingSession.currentQuestion);
                    setAnswers(existingSession.answers as (number | null)[]);

                    // Calculate remaining time
                    const elapsed = Math.floor(
                        (Date.now() - existingSession.startedAt.getTime()) / 1000
                    );
                    const remaining = Math.max(0, WEEKLY_TEST_TIMER_SECONDS - elapsed);
                    if (remaining <= 0) {
                        // Time's up — auto-submit
                        setPhase('start');
                        return;
                    }
                    setTimeLeft(remaining);
                    setStartTime(existingSession.startedAt);

                    // Need to regenerate questions for resuming
                    setPhase('generating');
                    const result = await generateWeeklyTestQuestions(
                        user.uid,
                        user.studentClass || 0,
                        wn
                    );
                    if (result.error || result.questions.length === 0) {
                        setError(result.error || 'Failed to load test questions.');
                        setPhase('error');
                        return;
                    }
                    setQuestions(result.questions);
                    setPhase('test');
                    return;
                }

                if (existingSession && existingSession.status === 'completed') {
                    const hist = await getWeeklyTestHistory(user.uid);
                    setHistory(hist);
                    setPhase('completed');
                    return;
                }

                setPhase('start');
            } catch (err) {
                console.error('[WeeklyTest] Init error:', err);
                setError('Failed to load weekly test. Please refresh.');
                setPhase('error');
            }
        }

        if (user?.uid) init();
    }, [user?.uid, user?.studentClass]);

    // ── Timer ────────────────────────────────────────────────────────

    useEffect(() => {
        if (phase !== 'test') {
            // Clear timer whenever phase is not 'test'
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    // Time's up — auto-submit (guard against double submit)
                    if (!isSubmittingRef.current) {
                        isSubmittingRef.current = true;
                        handleSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [phase]);

    // ── Generate questions & start test ──────────────────────────────

    const handleStartTest = useCallback(async () => {
        setPhase('generating');
        setError('');

        try {
            const result = await generateWeeklyTestQuestions(
                user.uid,
                user.studentClass || 0,
                weekNumber
            );

            if (result.error || result.questions.length === 0) {
                setError(result.error || 'Failed to generate questions.');
                setPhase('error');
                return;
            }

            setQuestions(result.questions);
            setAnswers(new Array(result.questions.length).fill(null));
            setCurrentQ(0);
            setStartTime(new Date());
            setTimeLeft(WEEKLY_TEST_TIMER_SECONDS);

            // Create session
            try {
                const testId = getWeeklyTestSessionId(user.studentClass || 0, weekNumber);
                const session = await createTestSession({
                    userId: user.uid,
                    testId,
                    sessionType: 'weekly_test',
                    totalQuestions: result.questions.length,
                });
                setSessionId(session.id);
                sessionIdRef.current = session.id;
            } catch (err) {
                console.error('[WeeklyTest] Session creation failed:', err);
            }

            setPhase('test');
        } catch (err) {
            console.error('[WeeklyTest] Generation failed:', err);
            setError('Failed to generate weekly test. Please try again.');
            setPhase('error');
        }
    }, [user.uid, user.studentClass, weekNumber]);

    // ── Answer selection ─────────────────────────────────────────────

    const handleSelectAnswer = useCallback((optionIndex: number) => {
        setAnswers(prev => {
            const next = [...prev];
            next[currentQ] = optionIndex;

            // Save progress to session
            const sid = sessionIdRef.current;
            if (sid) {
                const score = next.reduce<number>((acc, ans, idx) => {
                    if (ans !== null && questions[idx] && ans === questions[idx].correctOption) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);
                updateSessionProgress(sid, {
                    currentQuestion: currentQ,
                    answers: next,
                    score,
                }).catch(err => console.error('[WeeklyTest] Save progress failed:', err));
            }

            return next;
        });

        // Auto-advance to next question after a brief delay (like daily challenge)
        if (currentQ < questions.length - 1) {
            setTimeout(() => {
                setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
            }, 600);
        }
    }, [currentQ, questions]);

    // ── Navigation ───────────────────────────────────────────────────

    const goToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentQ(index);
        }
    }, [questions.length]);

    // ── Submit ───────────────────────────────────────────────────────

    const handleSubmit = useCallback(async () => {
        if (phase === 'submitting' || phase === 'results' || isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        // Stop the timer immediately
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setPhase('submitting');

        // Calculate score
        let score = 0;
        const detailedAnswers = questions.map((q, idx) => {
            const userAns = answers[idx];
            const isCorrect = userAns !== null && userAns === q.correctOption;
            if (isCorrect) score++;

            return {
                questionText: q.text,
                userAnswer: userAns !== null ? q.options[userAns] : 'Not answered',
                correctAnswer: q.options[q.correctOption],
                isCorrect,
                options: q.options,
            };
        });

        const timeTaken = startTime
            ? Math.floor((Date.now() - startTime.getTime()) / 1000)
            : WEEKLY_TEST_TIMER_SECONDS;

        setFinalScore(score);

        try {
            await submitWeeklyTest(
                user,
                score,
                questions.length,
                weekNumber,
                timeTaken,
                detailedAnswers
            );

            // Complete session
            const sid = sessionIdRef.current;
            if (sid) {
                await completeTestSession(sid, score).catch(err =>
                    console.error('[WeeklyTest] Session complete failed:', err)
                );
            }

            onComplete?.(score, questions.length);
        } catch (err) {
            console.error('[WeeklyTest] Submit failed:', err);
        }

        setPhase('results');
    }, [phase, questions, answers, startTime, user, weekNumber, onComplete]);

    // ── Render: Loading ──────────────────────────────────────────────
    // Return null during loading — no skeleton flash (parent pre-checks completion)

    if (phase === 'loading') {
        return null;
    }

    // ── Render: Unavailable (not Sunday) ─────────────────────────────

    if (phase === 'unavailable') {
        return null; // Don't render anything on non-Sundays
    }

    // ── Render: Error ────────────────────────────────────────────────

    if (phase === 'error') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800"
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800 dark:text-red-300">Weekly Test Error</h3>
                        <p className="text-red-600 dark:text-red-400 text-sm mt-0.5">{error}</p>
                    </div>
                    <button
                        onClick={() => setPhase('start')}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Render: Already Completed ────────────────────────────────────
    // Return null — parent handles dismiss + toast (same as daily challenge)

    if (phase === 'completed') {
        return null;
    }

    // ── Render: Start Card ───────────────────────────────────────────

    if (phase === 'start') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/20"
            >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">Weekly Test {weekNumber}</h3>
                                <span className="px-2 py-0.5 bg-white/15 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Sunday Special
                                </span>
                            </div>
                            <p className="text-white/70 text-sm mt-0.5">
                                {WEEKLY_TEST_QUESTION_COUNT} questions • {Math.floor(WEEKLY_TEST_TIMER_SECONDS / 60)} min timer
                            </p>
                            <p className="text-white/50 text-xs mt-1">
                                Based on your completed tests — same concepts, new questions!
                            </p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPhase('instructions')}
                        className="flex items-center gap-2 bg-white text-purple-700 px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Start Test
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    // ── Render: Instructions Modal ───────────────────────────────────

    if (phase === 'instructions') {
        return (
            <>
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setPhase('start')} />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[61] max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Weekly Test {weekNumber}</h3>
                                    <p className="text-white/70 text-xs">Weekly Assessment</p>
                                </div>
                            </div>
                            <button onClick={() => setPhase('start')} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-3">
                            {[
                                { icon: '📝', title: `${WEEKLY_TEST_QUESTION_COUNT} Questions`, desc: 'All multiple choice (MCQ) format' },
                                { icon: '⏱️', title: `${Math.floor(WEEKLY_TEST_TIMER_SECONDS / 60)} Minutes Timer`, desc: 'Test auto-submits when time runs out' },
                                { icon: '🧠', title: 'Concept Based', desc: 'New questions based on your completed tests' },
                                { icon: '🔒', title: 'One Attempt Only', desc: 'You cannot retake this weekly test' },
                                { icon: '📊', title: 'Instant Results', desc: 'View your score and review answers after submission' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <span className="text-xl w-8 text-center">{item.icon}</span>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleStartTest}
                            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-base shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5" />
                            Begin Weekly Test
                        </motion.button>
                    </div>
                </motion.div>
            </>
        );
    }

    // ── Render: Generating Questions ─────────────────────────────────

    if (phase === 'generating') {
        return (
            <>
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[61] max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                        Generating Your Test...
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Preparing {WEEKLY_TEST_QUESTION_COUNT} questions based on your completed tests. This may take a few seconds.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-purple-500 rounded-full"
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </>
        );
    }

    // ── Render: Test In Progress ─────────────────────────────────────

    if (phase === 'test' || phase === 'submitting') {
        const q = questions[currentQ];
        if (!q) return null;

        const answeredCount = answers.filter(a => a !== null).length;
        const progress = (answeredCount / questions.length) * 100;
        const isTimerWarning = timeLeft <= 300; // 5 minutes

        return (
            <>
                {/* Full-screen overlay */}
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[61] flex flex-col bg-white dark:bg-gray-950 overflow-hidden"
                >
                    {/* ── Top Bar ── */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                    Weekly Test {weekNumber}
                                </h3>
                                <p className="text-[10px] text-gray-400">
                                    {answeredCount}/{questions.length} answered
                                </p>
                            </div>
                        </div>

                        <TimerDisplay seconds={timeLeft} warning={isTimerWarning} />
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="h-1 bg-gray-100 dark:bg-gray-800">
                        <motion.div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* ── Question Area ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-5">
                        <div className="max-w-2xl mx-auto">
                            {/* Question number */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Question {currentQ + 1} of {questions.length}
                                </span>
                                {(q as Question & { subject?: string }).subject && (
                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                                        {(q as Question & { subject?: string }).subject}
                                    </span>
                                )}
                            </div>

                            {/* Question text */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentQ}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-5 leading-relaxed">
                                        {q.text}
                                    </p>

                                    {/* Options */}
                                    <div className="space-y-2.5">
                                        {q.options.map((opt, idx) => {
                                            const isSelected = answers[currentQ] === idx;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSelectAnswer(idx)}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                                                        isSelected
                                                            ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-500 ring-1 ring-violet-500'
                                                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                            isSelected
                                                                ? 'bg-violet-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                            {String.fromCharCode(65 + idx)}
                                                        </span>
                                                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{opt}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── Bottom Navigation ── */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="max-w-2xl mx-auto">
                            {/* Question dots */}
                            <div className="flex flex-wrap gap-1.5 mb-3 justify-center">
                                {questions.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToQuestion(idx)}
                                        className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${
                                            idx === currentQ
                                                ? 'bg-violet-500 text-white scale-110 shadow-md shadow-violet-500/30'
                                                : answers[idx] !== null
                                                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>

                            {/* Nav buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => goToQuestion(currentQ - 1)}
                                    disabled={currentQ === 0}
                                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                <div className="flex-1" />

                                {currentQ < questions.length - 1 ? (
                                    <button
                                        onClick={() => goToQuestion(currentQ + 1)}
                                        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-all shadow-sm"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={phase === 'submitting'}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50"
                                    >
                                        {phase === 'submitting' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Submit Test
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </>
        );
    }

    // ── Render: Results ──────────────────────────────────────────────

    if (phase === 'results') {
        const scorePercent = Math.round((finalScore / questions.length) * 100);
        const timeTaken = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
        const timeMins = Math.floor(timeTaken / 60);
        const timeSecs = timeTaken % 60;

        const gradeColor = scorePercent >= 80 ? 'from-emerald-500 to-green-600'
            : scorePercent >= 60 ? 'from-amber-500 to-orange-500'
            : 'from-red-500 to-rose-600';

        const gradeEmoji = scorePercent >= 80 ? '🏆' : scorePercent >= 60 ? '👍' : '📚';
        const gradeText = scorePercent >= 80 ? 'Excellent!' : scorePercent >= 60 ? 'Good Job!' : 'Keep Practicing!';

        return (
            <>
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 z-[61] flex flex-col bg-white dark:bg-gray-950 overflow-hidden"
                >
                    {/* Results Header */}
                    <div className={`bg-gradient-to-r ${gradeColor} px-6 py-8 text-white text-center`}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="text-5xl mb-3"
                        >
                            {gradeEmoji}
                        </motion.div>
                        <h2 className="text-2xl font-extrabold">{gradeText}</h2>
                        <p className="text-white/80 text-sm mt-1">Weekly Test {weekNumber} Complete</p>

                        <div className="flex items-center justify-center gap-6 mt-5">
                            <div>
                                <p className="text-3xl font-extrabold">{finalScore}/{questions.length}</p>
                                <p className="text-white/70 text-xs">Score</p>
                            </div>
                            <div className="w-px h-10 bg-white/20" />
                            <div>
                                <p className="text-3xl font-extrabold">{scorePercent}%</p>
                                <p className="text-white/70 text-xs">Percentage</p>
                            </div>
                            <div className="w-px h-10 bg-white/20" />
                            <div>
                                <p className="text-3xl font-extrabold">{timeMins}:{String(timeSecs).padStart(2, '0')}</p>
                                <p className="text-white/70 text-xs">Time Taken</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 flex gap-3 border-b border-gray-200 dark:border-gray-800">
                        <button
                            onClick={() => setShowReview(!showReview)}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                showReview
                                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {showReview ? 'Hide Review' : '📋 Review Answers'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/25 hover:shadow-lg transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Review Section */}
                    {showReview && (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {questions.map((q, idx) => {
                                const userAns = answers[idx];
                                const isCorrect = userAns !== null && userAns === q.correctOption;
                                return (
                                    <div key={idx} className={`rounded-xl border p-4 ${
                                        isCorrect
                                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                            : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                                    }`}>
                                        <div className="flex items-start gap-2 mb-2">
                                            {isCorrect ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                <span className="text-gray-400 mr-1">Q{idx + 1}.</span>
                                                {q.text}
                                            </p>
                                        </div>

                                        <div className="ml-7 space-y-1.5">
                                            {q.options.map((opt, optIdx) => {
                                                const isUserChoice = userAns === optIdx;
                                                const isCorrectOption = q.correctOption === optIdx;
                                                return (
                                                    <div key={optIdx} className={`text-xs px-3 py-1.5 rounded-lg ${
                                                        isCorrectOption
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                                                            : isUserChoice && !isCorrectOption
                                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 line-through'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                        {String.fromCharCode(65 + optIdx)}) {opt}
                                                        {isCorrectOption && ' ✓'}
                                                        {isUserChoice && !isCorrectOption && ' ✗'}
                                                    </div>
                                                );
                                            })}
                                            {q.explanation && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 pl-1">
                                                    💡 {q.explanation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!showReview && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm">Click &quot;Review Answers&quot; to see your detailed results</p>
                        </div>
                    )}
                </motion.div>
            </>
        );
    }

    return null;
}
