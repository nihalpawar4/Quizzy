'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    XCircle,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Timer,
    Sparkles,
    Trophy,
    Crown,
    Zap,
} from 'lucide-react';
import type { Question, Test, User } from '@/types';
import {
    getTestQuestions,
    submitExclusiveTest,
} from '@/services/exclusiveTestService';
import { EXCLUSIVE_TEST_XP_REWARD } from '@/lib/constants';

// ── Props ────────────────────────────────────────────────────────────

interface ExclusiveTestScreenProps {
    test: Test;
    user: User;
    onComplete: (score: number, total: number) => void;
    onClose: () => void;
}

// ── Answer type: number for MCQ/true_false, string for fill/text ──

type AnswerValue = number | string | null;

// ── Timer Display ────────────────────────────────────────────────────

function ExclusiveTimer({ seconds, warning }: { seconds: number; warning: boolean }) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums transition-colors ${
            warning
                ? 'bg-red-500/20 text-red-300 animate-pulse'
                : 'bg-white/10 text-white/90'
        }`}>
            <Timer className="w-4 h-4" />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
    );
}

// ── Confetti Particle ────────────────────────────────────────────────

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
    return (
        <motion.div
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            animate={{
                opacity: [1, 1, 0],
                y: [0, -80 - Math.random() * 120],
                x: [-40 + Math.random() * 80],
                scale: [1, 0.5],
                rotate: [0, 360 + Math.random() * 360],
            }}
            transition={{ duration: 1.5 + Math.random() * 0.5, delay, ease: 'easeOut' }}
        />
    );
}

// ── Helper: Check if answer is correct ───────────────────────────────

function isAnswerCorrect(q: Question, answer: AnswerValue): boolean {
    if (answer === null || answer === undefined) return false;

    const qType = q.type || 'mcq';

    if (qType === 'mcq' || qType === 'true_false') {
        return typeof answer === 'number' && answer === q.correctOption;
    }

    if (qType === 'fill_blank' || qType === 'one_word' || qType === 'short_answer') {
        if (typeof answer !== 'string' || !answer.trim()) return false;
        const correct = (q.correctAnswer || q.options?.[q.correctOption] || '').trim().toLowerCase();
        const userStr = answer.trim().toLowerCase();
        return userStr === correct;
    }

    return false;
}

// ── Helper: Get display text for user answer ─────────────────────────

function getUserAnswerDisplay(q: Question, answer: AnswerValue): string {
    if (answer === null || answer === undefined) return 'Not answered';

    const qType = q.type || 'mcq';

    if (qType === 'mcq' || qType === 'true_false') {
        if (typeof answer === 'number' && q.options?.[answer]) {
            return q.options[answer];
        }
        return 'Not answered';
    }

    if (typeof answer === 'string') {
        return answer.trim() || 'Not answered';
    }

    return 'Not answered';
}

// ── Helper: Get correct answer display ───────────────────────────────

function getCorrectAnswerDisplay(q: Question): string {
    const qType = q.type || 'mcq';

    if (qType === 'fill_blank' || qType === 'one_word' || qType === 'short_answer') {
        return q.correctAnswer || q.options?.[q.correctOption] || '';
    }

    if (q.options?.[q.correctOption]) {
        return q.options[q.correctOption];
    }

    return q.correctAnswer || '';
}

// ── Main Component ───────────────────────────────────────────────────

export default function ExclusiveTestScreen({ test, user, onComplete, onClose }: ExclusiveTestScreenProps) {
    const [phase, setPhase] = useState<'loading' | 'test' | 'submitting' | 'results'>('loading');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<AnswerValue[]>([]);
    const [timeLeft, setTimeLeft] = useState((test.duration || 20) * 60);
    const [startTime] = useState(new Date());
    const [finalScore, setFinalScore] = useState(0);
    const [showReview, setShowReview] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isSubmittingRef = useRef(false);

    // ── Load questions ───────────────────────────────────────────────

    useEffect(() => {
        async function load() {
            try {
                const qs = await getTestQuestions(test.id);
                setQuestions(qs);
                setAnswers(new Array(qs.length).fill(null));
                setPhase('test');
            } catch (err) {
                console.error('[ExclusiveTest] Load error:', err);
            }
        }
        load();
    }, [test.id]);

    // ── Timer ────────────────────────────────────────────────────────

    useEffect(() => {
        if (phase !== 'test') {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ── Select MCQ / True-False answer ───────────────────────────────

    const handleSelectOption = useCallback((optionIndex: number) => {
        setAnswers(prev => {
            const next = [...prev];
            next[currentQ] = optionIndex;
            return next;
        });

        // Auto-advance after brief delay
        if (currentQ < questions.length - 1) {
            setTimeout(() => {
                setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
            }, 400);
        }
    }, [currentQ, questions.length]);

    // ── Set text answer (fill_blank, one_word, short_answer) ─────────

    const handleTextAnswer = useCallback((text: string) => {
        setAnswers(prev => {
            const next = [...prev];
            next[currentQ] = text;
            return next;
        });
    }, [currentQ]);

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

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setPhase('submitting');

        let score = 0;
        const detailedAnswers = questions.map((q, idx) => {
            const userAns = answers[idx];
            const correct = isAnswerCorrect(q, userAns);
            if (correct) score++;

            return {
                questionText: q.text,
                userAnswer: getUserAnswerDisplay(q, userAns),
                correctAnswer: getCorrectAnswerDisplay(q),
                isCorrect: correct,
            };
        });

        const timeTaken = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setFinalScore(score);

        try {
            await submitExclusiveTest({
                userId: user.uid,
                userName: user.name,
                studentClass: user.studentClass || 0,
                testId: test.id,
                testTitle: test.title,
                subject: test.subject,
                score,
                totalQuestions: questions.length,
                timeTakenSeconds: timeTaken,
                detailedAnswers,
            });

            onComplete(score, questions.length);
        } catch (err) {
            console.error('[ExclusiveTest] Submit failed:', err);
        }

        setPhase('results');
    }, [phase, questions, answers, startTime, user, test, onComplete]);

    // ── Render: Loading ──────────────────────────────────────────────

    if (phase === 'loading') {
        return (
            <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl"
                >
                    <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <h3 className="font-bold text-lg text-white mb-2">
                            Loading Exclusive Test...
                        </h3>
                        <p className="text-white/70 text-sm">
                            Preparing {test.title}
                        </p>
                        <div className="mt-4 flex justify-center gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-white/60 rounded-full"
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

        const qType = q.type || 'mcq';
        const answeredCount = answers.filter(a => a !== null && a !== '').length;
        const progress = (answeredCount / questions.length) * 100;
        const isTimerWarning = timeLeft <= 120;

        return (
            <>
                <div className="fixed inset-0 bg-black/80 z-[70]" />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[71] flex flex-col overflow-hidden"
                >
                    {/* ── Premium Header ── */}
                    <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-500 px-4 py-3 relative overflow-hidden flex-shrink-0">
                        {/* Decorative shimmer */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
                                    <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-white">{test.title}</h3>
                                        <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                                            Exclusive
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/70">
                                        {answeredCount}/{questions.length} answered · {test.subject}
                                    </p>
                                </div>
                            </div>

                            <ExclusiveTimer seconds={timeLeft} warning={isTimerWarning} />
                        </div>
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="h-1 bg-amber-900/30 flex-shrink-0">
                        <motion.div
                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-300"
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* ── Question Area ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 pb-8 bg-gradient-to-b from-gray-950 to-gray-900" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">
                                        Question {currentQ + 1} of {questions.length}
                                    </span>
                                    {qType !== 'mcq' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                                            {qType === 'true_false' ? 'True / False'
                                                : qType === 'fill_blank' ? 'Fill in Blank'
                                                : qType === 'one_word' ? 'One Word'
                                                : qType === 'short_answer' ? 'Short Answer'
                                                : qType}
                                        </span>
                                    )}
                                </div>
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    <Zap className="w-3 h-3" />
                                    +{EXCLUSIVE_TEST_XP_REWARD} XP
                                </span>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentQ}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <p className="text-base sm:text-lg font-semibold text-white mb-5 leading-relaxed">
                                        {q.text}
                                    </p>

                                    {/* ── MCQ Options ── */}
                                    {(qType === 'mcq') && q.options && (
                                        <div className="space-y-2.5">
                                            {q.options.map((opt, idx) => {
                                                const isSelected = answers[currentQ] === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectOption(idx)}
                                                        disabled={phase === 'submitting'}
                                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                                                            isSelected
                                                                ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-white/10 text-white/60'
                                                            }`}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            <span className="text-sm text-white/90 font-medium">{opt}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* ── True / False ── */}
                                    {qType === 'true_false' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {['True', 'False'].map((label, idx) => {
                                                const isSelected = answers[currentQ] === idx;
                                                return (
                                                    <button
                                                        key={label}
                                                        onClick={() => handleSelectOption(idx)}
                                                        disabled={phase === 'submitting'}
                                                        className={`p-5 rounded-xl border-2 text-center transition-all duration-150 ${
                                                            isSelected
                                                                ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-lg ${
                                                            isSelected ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                            {idx === 0 ? '✓' : '✗'}
                                                        </div>
                                                        <span className="text-sm font-bold text-white/90">{label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* ── Fill in Blank / One Word / Short Answer ── */}
                                    {(qType === 'fill_blank' || qType === 'one_word' || qType === 'short_answer') && (
                                        <div>
                                            {qType === 'short_answer' ? (
                                                <textarea
                                                    value={(answers[currentQ] as string) || ''}
                                                    onChange={e => handleTextAnswer(e.target.value)}
                                                    disabled={phase === 'submitting'}
                                                    placeholder={
                                                        qType === 'short_answer' ? 'Type your answer here...' : 'Type your answer...'
                                                    }
                                                    rows={4}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm font-medium placeholder-white/30 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={(answers[currentQ] as string) || ''}
                                                    onChange={e => handleTextAnswer(e.target.value)}
                                                    disabled={phase === 'submitting'}
                                                    placeholder={
                                                        qType === 'fill_blank' ? 'Fill in the blank...'
                                                        : 'Type your one-word answer...'
                                                    }
                                                    autoFocus
                                                    className="w-full px-4 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white text-base font-medium placeholder-white/30 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                />
                                            )}
                                            <p className="text-[10px] text-white/30 mt-2">
                                                {qType === 'fill_blank' ? 'Enter the missing word or phrase'
                                                    : qType === 'one_word' ? 'Answer in exactly one word'
                                                    : 'Write a short answer'}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── Bottom Navigation ── */}
                    <div className="px-4 py-3 border-t border-white/10 bg-gray-950 flex-shrink-0">
                        <div className="max-w-2xl mx-auto">
                            {/* Question number strip */}
                            <div
                                className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar pb-1"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                                ref={(el) => {
                                    if (el) {
                                        const btn = el.children[currentQ] as HTMLElement;
                                        if (btn) {
                                            const scrollLeft = btn.offsetLeft - el.clientWidth / 2 + btn.clientWidth / 2;
                                            el.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
                                        }
                                    }
                                }}
                            >
                                {questions.map((_, idx) => {
                                    const hasAnswer = answers[idx] !== null && answers[idx] !== '';
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => goToQuestion(idx)}
                                            className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all flex-shrink-0 ${
                                                idx === currentQ
                                                    ? 'bg-amber-500 text-white scale-110 shadow-md shadow-amber-500/30'
                                                    : hasAnswer
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-white/5 text-white/30'
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => goToQuestion(currentQ - 1)}
                                    disabled={currentQ === 0}
                                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 bg-white/10 text-white/80 hover:bg-white/15"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                <div className="flex-1" />

                                {currentQ < questions.length - 1 ? (
                                    <button
                                        onClick={() => goToQuestion(currentQ + 1)}
                                        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
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
                                                Submit
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

    // ── Render: Results (Centered) ───────────────────────────────────

    if (phase === 'results') {
        const scorePercent = Math.round((finalScore / questions.length) * 100);
        const timeTaken = Math.floor((Date.now() - startTime.getTime()) / 1000);
        const timeMins = Math.floor(timeTaken / 60);
        const timeSecs = timeTaken % 60;

        const confettiColors = ['#f59e0b', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];

        return (
            <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 z-[71] flex flex-col overflow-hidden bg-gray-950"
                >
                    {/* ── Scrollable content with centered result card ── */}
                    <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {/* Center the result card vertically when review is hidden */}
                        <div className={`${!showReview ? 'min-h-full flex items-center justify-center' : ''} px-4 py-8`}>
                            <div className="w-full max-w-md mx-auto">
                                {/* Result Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 border border-amber-500/20"
                                >
                                    {/* Gold header */}
                                    <div className="bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-500 px-6 py-8 text-white text-center relative overflow-hidden">
                                        {/* Confetti burst */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            {scorePercent >= 60 && confettiColors.map((color, i) =>
                                                Array.from({ length: 3 }, (_, j) => (
                                                    <ConfettiParticle key={`${i}-${j}`} delay={i * 0.1 + j * 0.05} color={color} />
                                                ))
                                            )}
                                        </div>

                                        {/* Shimmer */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        />

                                        <div className="relative">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: 0.2 }}
                                                className="text-5xl mb-3"
                                            >
                                                🏆
                                            </motion.div>

                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <Crown className="w-5 h-5" />
                                                <h2 className="text-xl font-extrabold">
                                                    {scorePercent >= 80 ? 'Outstanding!' : scorePercent >= 60 ? 'Well Done!' : 'Keep Practicing!'}
                                                </h2>
                                            </div>
                                            <p className="text-white/80 text-sm">{user.name} — Exclusive Test</p>

                                            <div className="flex items-center justify-center gap-6 mt-5">
                                                <div>
                                                    <p className="text-3xl font-extrabold">{finalScore}/{questions.length}</p>
                                                    <p className="text-white/70 text-xs">Score</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/20" />
                                                <div>
                                                    <p className="text-3xl font-extrabold">{scorePercent}%</p>
                                                    <p className="text-white/70 text-xs">Accuracy</p>
                                                </div>
                                                <div className="w-px h-10 bg-white/20" />
                                                <div>
                                                    <p className="text-3xl font-extrabold">{timeMins}:{String(timeSecs).padStart(2, '0')}</p>
                                                    <p className="text-white/70 text-xs">Time</p>
                                                </div>
                                            </div>

                                            {/* XP Reward Badge */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full border border-white/20"
                                            >
                                                <Zap className="w-4 h-4 text-yellow-200" />
                                                <span className="text-sm font-bold">+{EXCLUSIVE_TEST_XP_REWARD} XP Earned!</span>
                                                <Sparkles className="w-4 h-4 text-yellow-200" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="bg-gray-900 px-6 py-4 flex gap-3">
                                        <button
                                            onClick={() => setShowReview(!showReview)}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                                showReview
                                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                                                    : 'bg-white/10 text-white/70'
                                            }`}
                                        >
                                            {showReview ? 'Hide Review' : '📋 Review Answers'}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/25 hover:shadow-lg transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Review Section (below the card) */}
                                {showReview && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 space-y-3"
                                    >
                                        {questions.map((q, idx) => {
                                            const userAns = answers[idx];
                                            const correct = isAnswerCorrect(q, userAns);
                                            const qType = q.type || 'mcq';

                                            return (
                                                <div key={idx} className={`rounded-xl border p-4 ${
                                                    correct
                                                        ? 'border-emerald-500/30 bg-emerald-500/5'
                                                        : 'border-red-500/30 bg-red-500/5'
                                                }`}>
                                                    <div className="flex items-start gap-2 mb-2">
                                                        {correct ? (
                                                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <p className="text-sm font-medium text-white">
                                                            <span className="text-white/40 mr-1">Q{idx + 1}.</span>
                                                            {q.text}
                                                        </p>
                                                    </div>

                                                    <div className="ml-7 space-y-1.5">
                                                        {/* MCQ / True-False: show options */}
                                                        {(qType === 'mcq' || qType === 'true_false') && q.options && (
                                                            <>
                                                                {(qType === 'true_false' ? ['True', 'False'] : q.options).map((opt, optIdx) => {
                                                                    const isUserChoice = userAns === optIdx;
                                                                    const isCorrectOption = q.correctOption === optIdx;
                                                                    return (
                                                                        <div key={optIdx} className={`text-xs px-3 py-1.5 rounded-lg ${
                                                                            isCorrectOption
                                                                                ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                                                                                : isUserChoice && !isCorrectOption
                                                                                    ? 'bg-red-500/20 text-red-400 line-through'
                                                                                    : 'text-white/40'
                                                                        }`}>
                                                                            {qType === 'mcq' ? `${String.fromCharCode(65 + optIdx)}) ` : ''}{opt}
                                                                            {isCorrectOption && ' ✓'}
                                                                            {isUserChoice && !isCorrectOption && ' ✗'}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        {/* Fill / Text answer review */}
                                                        {(qType === 'fill_blank' || qType === 'one_word' || qType === 'short_answer') && (
                                                            <div className="space-y-1.5">
                                                                <div className={`text-xs px-3 py-1.5 rounded-lg ${
                                                                    correct ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    Your answer: {getUserAnswerDisplay(q, userAns)}
                                                                    {correct ? ' ✓' : ' ✗'}
                                                                </div>
                                                                {!correct && (
                                                                    <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold">
                                                                        Correct answer: {getCorrectAnswerDisplay(q)} ✓
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {q.explanation && (
                                                            <p className="text-xs text-amber-400 mt-1 pl-1">
                                                                💡 {q.explanation}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </>
        );
    }

    return null;
}
