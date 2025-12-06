'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    Flag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestById, getQuestionsByTestId, submitTestResult, hasStudentTakenTest } from '@/lib/services';
import type { Test, Question } from '@/types';

// Circular Progress Component
function CircularProgress({
    percentage,
    size = 180,
    strokeWidth = 12
}: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 70) return '#22c55e';
        if (percentage >= 40) return '#eab308';
        return '#ef4444';
    };

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="circular-progress" width={size} height={size}>
                <circle
                    className="circular-progress-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    className="circular-progress-bar"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke={getColor()}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-4xl font-bold text-gray-900 dark:text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                >
                    {percentage}%
                </motion.span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Score</span>
            </div>
        </div>
    );
}

// Slide variants for question transitions
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0
    }),
    center: {
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0
    })
};

// Answer type - can be number (option index) or string (text answer)
type AnswerValue = number | string | null;

export default function TestPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [test, setTest] = useState<Test | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswerValue[]>([]);
    const [direction, setDirection] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Determine question type based on options
    const getQuestionType = (question: Question): 'mcq' | 'true_false' | 'text_input' => {
        if (question.options.length === 2 &&
            question.options[0].toLowerCase() === 'true' &&
            question.options[1].toLowerCase() === 'false') {
            return 'true_false';
        }
        if (question.options.length <= 1) {
            return 'text_input'; // Fill blank, one word, short answer
        }
        return 'mcq';
    };

    // Load test data
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }

        if (testId && user) {
            loadTest();
        }
    }, [testId, user, authLoading, router]);

    // Timer effect
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || isSubmitted) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isSubmitted]);

    const loadTest = async () => {
        try {
            setLoading(true);
            setError(null);

            const hasTaken = await hasStudentTakenTest(user!.uid, testId);
            if (hasTaken) {
                setError('You have already completed this test.');
                setLoading(false);
                return;
            }

            const testData = await getTestById(testId);
            if (!testData) {
                setError('Test not found');
                setLoading(false);
                return;
            }

            if (user?.studentClass && testData.targetClass !== user.studentClass) {
                setError('This test is not available for your class');
                setLoading(false);
                return;
            }

            setTest(testData);

            if (testData.duration) {
                setTimeLeft(testData.duration * 60);
            }

            const questionsData = await getQuestionsByTestId(testId);
            if (questionsData.length === 0) {
                setError('This test has no questions yet');
                setLoading(false);
                return;
            }

            setQuestions(questionsData);
            setAnswers(new Array(questionsData.length).fill(null));
        } catch (err) {
            console.error('Error loading test:', err);
            setError('Failed to load test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = useCallback((value: AnswerValue) => {
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIndex] = value;
            return newAnswers;
        });
    }, [currentIndex]);

    const handleTextAnswer = useCallback((text: string) => {
        handleAnswer(text);
    }, [handleAnswer]);

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, questions.length]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    // Check if text answer is correct (case-insensitive, trim whitespace)
    const isTextAnswerCorrect = (userAnswer: string, correctAnswer: string): boolean => {
        const normalizedUser = userAnswer.toLowerCase().trim();
        const normalizedCorrect = correctAnswer.toLowerCase().trim();
        return normalizedUser === normalizedCorrect;
    };

    const handleSubmit = async () => {
        if (!user || !test || isSubmitting) return;

        setIsSubmitting(true);

        try {
            let correctCount = 0;
            const detailedAnswers: { questionId: string; questionText: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];

            questions.forEach((q, index) => {
                const userAnswer = answers[index];
                const questionType = getQuestionType(q);
                let isCorrect = false;
                let userAnswerStr = '';
                let correctAnswerStr = '';

                if (questionType === 'text_input') {
                    userAnswerStr = typeof userAnswer === 'string' ? userAnswer : '';
                    correctAnswerStr = q.options[0] || '';
                    isCorrect = isTextAnswerCorrect(userAnswerStr, correctAnswerStr);
                } else {
                    // MCQ or True/False
                    if (typeof userAnswer === 'number' && userAnswer === q.correctOption) {
                        isCorrect = true;
                    }
                    userAnswerStr = typeof userAnswer === 'number' && q.options[userAnswer] ? q.options[userAnswer] : 'Not answered';
                    correctAnswerStr = q.options[q.correctOption] || '';
                }

                if (isCorrect) correctCount++;

                detailedAnswers.push({
                    questionId: q.id,
                    questionText: q.text,
                    userAnswer: userAnswerStr,
                    correctAnswer: correctAnswerStr,
                    isCorrect
                });
            });

            setScore(correctCount);

            // Submit with detailed answers for analytics
            await submitTestResult({
                studentId: user.uid,
                studentName: user.name,
                studentEmail: user.email,
                studentClass: user.studentClass || 0,
                testId: test.id,
                testTitle: test.title,
                subject: test.subject,
                score: correctCount,
                totalQuestions: questions.length,
                answers: answers.map(a => typeof a === 'number' ? a : -1),
                detailedAnswers // This stores what students actually wrote/chose
            });

            setIsSubmitted(true);
        } catch (err) {
            console.error('Error submitting test:', err);
            setError('Failed to submit test. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading test...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Test</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button onClick={() => router.push('/dashboard/student')} className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#1650EB] to-[#1650EB] flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Test Completed!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">{test?.title}</p>
                    <div className="flex justify-center mb-8">
                        <CircularProgress percentage={percentage} />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8">
                        <p className="text-lg text-gray-900 dark:text-white">
                            You scored <span className="font-bold text-[#1650EB]">{score}</span> out of <span className="font-bold">{questions.length}</span>
                        </p>
                    </div>
                    <button onClick={() => router.push('/dashboard/student')} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                        Back to Dashboard
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const answeredCount = answers.filter(a => a !== null && a !== '').length;
    const questionType = getQuestionType(currentQuestion);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 zen-mode">
            {/* Header */}
            <header className="zen-hide bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => { if (confirm('Are you sure you want to leave? Your progress will be lost.')) { router.push('/dashboard/student'); } }} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Exit Test</span>
                    </button>
                    <div className="text-center">
                        <h1 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{test?.title}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{test?.subject}</p>
                    </div>
                    {timeLeft !== null && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeLeft <= 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex items-center justify-between py-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <span>{answeredCount} answered</span>
                    </div>
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                        <motion.div className="h-full bg-[#1650EB]" initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
                    </div>
                </div>
            </div>

            {/* Question Area */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                        {/* Question Type Badge */}
                        <div className="mb-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${questionType === 'mcq' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-[#1243c7] dark:text-indigo-300' :
                                    questionType === 'true_false' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                }`}>
                                {questionType === 'mcq' ? '🔘 Multiple Choice' : questionType === 'true_false' ? '✅ True/False' : '📝 Type Your Answer'}
                            </span>
                        </div>

                        {/* Question Text */}
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-8 leading-relaxed">
                            {currentQuestion.text}
                        </h2>

                        {/* Answer Input based on question type */}
                        {questionType === 'text_input' ? (
                            // Text Input for Fill Blank / One Word / Short Answer
                            <div className="space-y-4">
                                <textarea
                                    value={typeof answers[currentIndex] === 'string' ? answers[currentIndex] as string : ''}
                                    onChange={(e) => handleTextAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-[#1650EB] focus:border-[#1650EB] outline-none transition-all resize-none"
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    💡 Type your answer exactly as you think it should be
                                </p>
                            </div>
                        ) : (
                            // MCQ or True/False Options
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => {
                                    const isSelected = answers[currentIndex] === index;
                                    const optionLetter = questionType === 'true_false' ? '' : String.fromCharCode(65 + index);

                                    return (
                                        <motion.button
                                            key={index}
                                            onClick={() => handleAnswer(index)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                ? 'border-[#1650EB] bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                                }`}
                                        >
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm ${isSelected
                                                ? 'bg-[#1650EB] text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {questionType === 'true_false' ? (option === 'True' ? '✓' : '✗') : optionLetter}
                                            </span>
                                            <span className={`text-base ${isSelected
                                                ? 'text-indigo-900 dark:text-indigo-100 font-medium'
                                                : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {option}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                    <button onClick={handlePrevious} disabled={currentIndex === 0} className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                    </button>

                    {currentIndex === questions.length - 1 ? (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {isSubmitting ? (<><Loader2 className="w-5 h-5 animate-spin" />Submitting...</>) : (<><Flag className="w-5 h-5" />Finish Test</>)}
                        </button>
                    ) : (
                        <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                            Next
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Question Navigator Dots */}
                <div className="flex flex-wrap justify-center gap-2 mt-8">
                    {questions.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${index === currentIndex
                                ? 'bg-[#1650EB] text-white'
                                : answers[index] !== null && answers[index] !== ''
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
