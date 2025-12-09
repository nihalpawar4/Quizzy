'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    Flag,
    Shield,
    ShieldAlert,
    Maximize,
    AlertTriangle,
    Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestById, getQuestionsByTestId, submitTestResult, hasStudentTakenTest } from '@/lib/services';
import { deductCoinsForTest, getWalletByStudentId } from '@/lib/creditServices';
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
    const searchParams = useSearchParams();
    const testId = params.id as string;
    const isPremiumTest = searchParams.get('premium') === 'true';

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

    // Timing tracking
    const [testStartTime, setTestStartTime] = useState<Date | null>(null);
    const [testEndTime, setTestEndTime] = useState<Date | null>(null);

    // Marking data
    const [marksObtained, setMarksObtained] = useState<number>(0);
    const [totalMarks, setTotalMarks] = useState<number>(0);
    const [negativeMarksApplied, setNegativeMarksApplied] = useState<number>(0);

    // Anti-cheat tracking
    const [antiCheatEnabled, setAntiCheatEnabled] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [copyAttempts, setCopyAttempts] = useState(0);
    const [rightClickAttempts, setRightClickAttempts] = useState(0);
    const [fullscreenExits, setFullscreenExits] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showAntiCheatWarning, setShowAntiCheatWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');

    // Instructions screen state
    const [showInstructionsScreen, setShowInstructionsScreen] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(false);

    // Coin payment state
    const [showCoinPayment, setShowCoinPayment] = useState(false);
    const [coinsPaid, setCoinsPaid] = useState(false);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [isPayingCoins, setIsPayingCoins] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Determine question type - use stored type if available, otherwise infer from options
    const getQuestionType = (question: Question): 'mcq' | 'true_false' | 'text_input' => {
        // Check stored type first
        if (question.type) {
            if (question.type === 'mcq') return 'mcq';
            if (question.type === 'true_false') return 'true_false';
            if (question.type === 'fill_blank' || question.type === 'one_word' || question.type === 'short_answer') {
                return 'text_input';
            }
        }

        // Fallback: infer from options
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

    // Anti-cheat: Enter fullscreen
    const enterFullscreen = useCallback(async () => {
        if (!antiCheatEnabled) return;
        try {
            if (containerRef.current && document.fullscreenElement === null) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            }
        } catch (err) {
            console.log('Fullscreen not supported:', err);
        }
    }, [antiCheatEnabled]);

    // Anti-cheat: Visibility change detection
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => prev + 1);
                setWarningMessage('⚠️ Tab switch detected! This will be reported.');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [antiCheatEnabled, isSubmitted]);

    // Anti-cheat: Copy prevention
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            setCopyAttempts(prev => prev + 1);
            setWarningMessage('📋 Copy is disabled during the test!');
            setShowAntiCheatWarning(true);
            setTimeout(() => setShowAntiCheatWarning(false), 3000);
        };

        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault();
            setCopyAttempts(prev => prev + 1);
            setWarningMessage('✂️ Cut is disabled during the test!');
            setShowAntiCheatWarning(true);
            setTimeout(() => setShowAntiCheatWarning(false), 3000);
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            setCopyAttempts(prev => prev + 1);
            setWarningMessage('📋 Paste is disabled during the test!');
            setShowAntiCheatWarning(true);
            setTimeout(() => setShowAntiCheatWarning(false), 3000);
        };

        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCut);
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
        };
    }, [antiCheatEnabled, isSubmitted]);

    // Anti-cheat: Right-click prevention
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            setRightClickAttempts(prev => prev + 1);
            setWarningMessage('🚫 Right-click is disabled during the test!');
            setShowAntiCheatWarning(true);
            setTimeout(() => setShowAntiCheatWarning(false), 3000);
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [antiCheatEnabled, isSubmitted]);

    // Anti-cheat: Keyboard shortcuts prevention
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, F12, Ctrl+Shift+I
            if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'u', 's'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                setCopyAttempts(prev => prev + 1);
                setWarningMessage('⌨️ Keyboard shortcuts are disabled!');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);
            }
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                setWarningMessage('🔧 Developer tools are disabled!');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [antiCheatEnabled, isSubmitted]);

    // Anti-cheat: Fullscreen exit detection
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isFullscreen) {
                setFullscreenExits(prev => prev + 1);
                setIsFullscreen(false);
                setWarningMessage('🖥️ Fullscreen exited! This will be reported.');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);
            } else if (document.fullscreenElement) {
                setIsFullscreen(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [antiCheatEnabled, isSubmitted, isFullscreen]);

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
            setAntiCheatEnabled(testData.enableAntiCheat || false);

            const questionsData = await getQuestionsByTestId(testId);
            if (questionsData.length === 0) {
                setError('This test has no questions yet');
                setLoading(false);
                return;
            }

            setQuestions(questionsData);
            setAnswers(new Array(questionsData.length).fill(null));

            // Calculate total marks
            const marksPerQ = testData.marksPerQuestion || 1;
            setTotalMarks(questionsData.length * marksPerQ);

            // Check if test requires coin payment (not mandatory and has coin cost)
            const requiresPayment = !testData.isMandatory && testData.coinCost && testData.coinCost > 0 && !isPremiumTest;

            if (requiresPayment) {
                // Get user's wallet balance
                const wallet = await getWalletByStudentId(user!.uid);
                setUserBalance(wallet?.balance || 0);
                setShowCoinPayment(true);
            } else {
                // No payment needed, show instructions or start
                if (testData.showInstructions !== false) {
                    setShowInstructionsScreen(true);
                } else {
                    setTestStartTime(new Date());
                    if (testData.duration) {
                        setTimeLeft(testData.duration * 60);
                    }
                    if (testData.enableAntiCheat) {
                        setTimeout(() => enterFullscreen(), 500);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading test:', err);
            setError('Failed to load test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle coin payment
    const handleCoinPayment = async () => {
        if (!user || !test || !test.coinCost) return;

        setIsPayingCoins(true);
        try {
            const result = await deductCoinsForTest(
                user.uid,
                user.name,
                test.id,
                test.title,
                test.coinCost,
                test.isPremium || false // isPremiumTest - determines if it counts toward glow
            );

            if (!result.success) {
                setError(result.message);
                setIsPayingCoins(false);
                return;
            }

            setCoinsPaid(true);
            setShowCoinPayment(false);

            // Now show instructions or start test
            if (test.showInstructions !== false) {
                setShowInstructionsScreen(true);
            } else {
                setTestStartTime(new Date());
                if (test.duration) {
                    setTimeLeft(test.duration * 60);
                }
                if (test.enableAntiCheat) {
                    setTimeout(() => enterFullscreen(), 500);
                }
            }
        } catch (err) {
            console.error('Error paying coins:', err);
            setError('Failed to process payment. Please try again.');
        } finally {
            setIsPayingCoins(false);
        }
    };

    // Start test after agreeing to instructions
    const startTestAfterInstructions = () => {
        if (!hasAgreed || !test) return;

        setShowInstructionsScreen(false);
        setTestStartTime(new Date());

        if (test.duration) {
            setTimeLeft(test.duration * 60);
        }

        if (test.enableAntiCheat) {
            setTimeout(() => enterFullscreen(), 500);
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
        const endTime = new Date();
        setTestEndTime(endTime);

        try {
            let correctCount = 0;
            let wrongCount = 0;
            const detailedAnswers: { questionId: string; questionText: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];

            questions.forEach((q, index) => {
                const userAnswer = answers[index];
                const questionType = getQuestionType(q);
                let isCorrect = false;
                let userAnswerStr = '';
                let correctAnswerStr = '';

                if (questionType === 'text_input') {
                    userAnswerStr = typeof userAnswer === 'string' ? userAnswer : '';
                    // Use correctAnswer field if available, otherwise fallback to options[0]
                    correctAnswerStr = q.correctAnswer || q.options[0] || '';
                    isCorrect = isTextAnswerCorrect(userAnswerStr, correctAnswerStr);
                } else {
                    // MCQ or True/False
                    if (typeof userAnswer === 'number' && userAnswer === q.correctOption) {
                        isCorrect = true;
                    }
                    userAnswerStr = typeof userAnswer === 'number' && q.options[userAnswer] ? q.options[userAnswer] : 'Not answered';
                    correctAnswerStr = q.options[q.correctOption] || '';
                }

                if (isCorrect) {
                    correctCount++;
                } else if (userAnswer !== null && userAnswer !== '') {
                    wrongCount++;
                }

                detailedAnswers.push({
                    questionId: q.id,
                    questionText: q.text,
                    userAnswer: userAnswerStr,
                    correctAnswer: correctAnswerStr,
                    isCorrect
                });
            });

            setScore(correctCount);

            // Calculate marks with negative marking
            const marksPerQ = test.marksPerQuestion || 1;
            const negMarksPerQ = test.negativeMarking ? (test.negativeMarksPerQuestion || 0.25) : 0;
            const positiveMarks = correctCount * marksPerQ;
            const negativeMarks = wrongCount * negMarksPerQ;
            const finalMarks = Math.max(0, positiveMarks - negativeMarks); // Ensure marks don't go below 0

            setMarksObtained(finalMarks);
            setNegativeMarksApplied(negativeMarks);

            // Calculate time taken
            const timeTakenSeconds = testStartTime ? Math.floor((endTime.getTime() - testStartTime.getTime()) / 1000) : 0;

            // Submit with detailed answers and timing/anti-cheat data
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
                detailedAnswers,
                // Timing data
                startTime: testStartTime || undefined,
                endTime: endTime,
                timeTakenSeconds,
                // Marking data
                totalMarks: questions.length * marksPerQ,
                marksObtained: finalMarks,
                negativeMarksApplied: negativeMarks,
                // Anti-cheat data
                tabSwitchCount,
                copyAttempts,
                rightClickAttempts,
                fullscreenExits,
                antiCheatEnabled
            });

            // Exit fullscreen on submit
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }

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

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m ${secs}s`;
        }
        return `${mins}m ${secs}s`;
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

    // Coin Payment Screen
    if (showCoinPayment && test) {
        const canAfford = userBalance >= (test.coinCost || 0);
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-6 text-white text-center">
                        <Coins className="w-16 h-16 mx-auto mb-3" />
                        <h1 className="text-2xl font-bold mb-1">Coin Payment Required</h1>
                        <p className="text-amber-100">This test costs coins to attempt</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Test Info */}
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{test.title}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{test.subject} • Class {test.targetClass}</p>
                        </div>

                        {/* Cost Display */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 text-center">
                            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">Test Cost</p>
                            <div className="flex items-center justify-center gap-2">
                                <Coins className="w-8 h-8 text-amber-500" />
                                <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">{test.coinCost}</span>
                                <span className="text-lg text-amber-500">coins</span>
                            </div>
                        </div>

                        {/* Balance Display */}
                        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <span className="text-gray-600 dark:text-gray-400">Your Balance:</span>
                            <span className={`font-bold text-lg ${canAfford ? 'text-green-600' : 'text-red-500'}`}>
                                {userBalance} coins
                            </span>
                        </div>

                        {/* Glow Progress Info */}
                        {!test.isPremium && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                                    ✨ This spending will count toward your <strong>Glow Status</strong> goal!
                                </p>
                            </div>
                        )}

                        {/* Insufficient Balance Warning */}
                        {!canAfford && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">Insufficient coins!</span>
                                </div>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    You need {(test.coinCost || 0) - userBalance} more coins to attempt this test.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <button
                            onClick={() => router.push('/dashboard/student')}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleCoinPayment}
                            disabled={!canAfford || isPayingCoins}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all ${canAfford && !isPayingCoins
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                        >
                            {isPayingCoins ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : canAfford ? (
                                <>
                                    <Coins className="w-4 h-4" />
                                    Pay {test.coinCost} Coins & Start
                                </>
                            ) : (
                                'Not Enough Coins'
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Instructions Screen
    if (showInstructionsScreen && test) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1650EB] to-indigo-600 p-6 text-white">
                        <h1 className="text-2xl font-bold mb-1">{test.title}</h1>
                        <p className="text-indigo-100">{test.subject} • Class {test.targetClass}</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Test Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{questions.length}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Questions</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{test.duration || '∞'}</p>
                                <p className="text-xs text-green-600 dark:text-green-400">Minutes</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{test.marksPerQuestion || 1}</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">Marks/Q</p>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{totalMarks}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">Total Marks</p>
                            </div>
                        </div>

                        {/* Rules */}
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                📋 Test Rules & Guidelines
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">Read each question carefully before answering</p>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">You can navigate between questions using Next/Previous buttons</p>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">Your progress is automatically saved</p>
                                </div>
                                {test.duration && (
                                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                                        <p className="text-sm text-amber-700 dark:text-amber-400">Test will auto-submit when time runs out</p>
                                    </div>
                                )}
                                {test.negativeMarking && (
                                    <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                        <p className="text-sm text-red-700 dark:text-red-400">
                                            <strong>Negative Marking:</strong> -{test.negativeMarksPerQuestion || 0.25} marks for each wrong answer
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Anti-Cheat Warning */}
                        {antiCheatEnabled && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    <h4 className="font-semibold text-purple-700 dark:text-purple-400">Proctored Test - Important!</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                        <span>🖥️</span> Fullscreen mode required
                                    </div>
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                        <span>🚫</span> Copy/Paste disabled
                                    </div>
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                        <span>👁️</span> Tab switches monitored
                                    </div>
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                        <span>📊</span> Activity reported to teacher
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Agreement Checkbox */}
                        <div className="flex items-start gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <input
                                type="checkbox"
                                id="agree"
                                checked={hasAgreed}
                                onChange={(e) => setHasAgreed(e.target.checked)}
                                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#1650EB] focus:ring-[#1650EB]"
                            />
                            <label htmlFor="agree" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                I have read and understood all the rules. I agree to take this test honestly and will not use any unfair means.
                                {antiCheatEnabled && ' I understand that my activity will be monitored.'}
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <button
                            onClick={() => router.push('/dashboard/student')}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={startTestAfterInstructions}
                            disabled={!hasAgreed}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all ${hasAgreed
                                ? 'bg-gradient-to-r from-[#1650EB] to-indigo-600 hover:from-[#1243c7] hover:to-indigo-700 shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                        >
                            {hasAgreed ? '🚀 Start Test Now' : '☑️ Please agree to start'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isSubmitted) {
        const percentage = Math.round((score / questions.length) * 100);
        const timeTaken = testStartTime && testEndTime ? Math.floor((testEndTime.getTime() - testStartTime.getTime()) / 1000) : 0;

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#1650EB] to-[#1650EB] flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Test Completed!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{test?.title}</p>

                    <div className="flex justify-center mb-6">
                        <CircularProgress percentage={percentage} />
                    </div>

                    {/* Score Details */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 space-y-2">
                        <p className="text-lg text-gray-900 dark:text-white">
                            <span className="font-bold text-[#1650EB]">{score}</span> / <span className="font-bold">{questions.length}</span> correct
                        </p>
                        {test?.negativeMarking && (
                            <div className="text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Marks: <span className="font-semibold text-green-600">{marksObtained.toFixed(2)}</span> / {totalMarks}
                                </p>
                                {negativeMarksApplied > 0 && (
                                    <p className="text-red-500 text-xs">
                                        (-{negativeMarksApplied.toFixed(2)} negative marks)
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Time Taken */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">Time taken: {formatDuration(timeTaken)}</span>
                        </div>
                    </div>

                    {/* Anti-cheat Report */}
                    {antiCheatEnabled && (tabSwitchCount > 0 || copyAttempts > 0 || rightClickAttempts > 0 || fullscreenExits > 0) && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                <ShieldAlert className="w-5 h-5" />
                                <span className="font-medium">Proctoring Report</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-amber-600 dark:text-amber-400">
                                {tabSwitchCount > 0 && <p>Tab switches: {tabSwitchCount}</p>}
                                {copyAttempts > 0 && <p>Copy attempts: {copyAttempts}</p>}
                                {rightClickAttempts > 0 && <p>Right clicks: {rightClickAttempts}</p>}
                                {fullscreenExits > 0 && <p>Fullscreen exits: {fullscreenExits}</p>}
                            </div>
                        </div>
                    )}

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
        <div ref={containerRef} className="min-h-screen bg-gray-50 dark:bg-gray-950 zen-mode">
            {/* Anti-Cheat Warning Toast */}
            <AnimatePresence>
                {showAntiCheatWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3"
                    >
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">{warningMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="zen-hide bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => { if (confirm('Are you sure you want to leave? Your progress will be lost.')) { if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); router.push('/dashboard/student'); } }} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Exit Test</span>
                    </button>
                    <div className="text-center">
                        <h1 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{test?.title}</h1>
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{test?.subject}</span>
                            {antiCheatEnabled && (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <Shield className="w-3 h-3" /> Proctored
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {antiCheatEnabled && !isFullscreen && (
                            <button
                                onClick={enterFullscreen}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg"
                            >
                                <Maximize className="w-3 h-3" />
                                Fullscreen
                            </button>
                        )}
                        {timeLeft !== null && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeLeft <= 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                <Clock className="w-4 h-4" />
                                <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                            </div>
                        )}
                        {/* Submit Button with Stats */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="hidden sm:flex items-center gap-1">
                                <span className="text-green-200">{answeredCount}</span>
                                <span className="text-green-300">/</span>
                                <span className="text-green-100">{questions.length}</span>
                            </span>
                            <Flag className="w-4 h-4" />
                            <span className="hidden sm:inline">Submit</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Marking Info Banner */}
            {test?.negativeMarking && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                    <div className="max-w-4xl mx-auto px-6 py-2">
                        <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                            ⚠️ Negative marking enabled: +{test.marksPerQuestion || 1} for correct, -{test.negativeMarksPerQuestion || 0.25} for wrong answers
                        </p>
                    </div>
                </div>
            )}

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
                        <div className="mb-4 flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${questionType === 'mcq' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                                questionType === 'true_false' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                    currentQuestion.type === 'fill_blank' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' :
                                        currentQuestion.type === 'one_word' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' :
                                            'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300'
                                }`}>
                                {questionType === 'mcq' ? '🔘 Multiple Choice' :
                                    questionType === 'true_false' ? '✅ True/False' :
                                        currentQuestion.type === 'fill_blank' ? '📝 Fill in Blank' :
                                            currentQuestion.type === 'one_word' ? '💬 One Word' :
                                                '📄 Short Answer'}
                            </span>
                            {test?.marksPerQuestion && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({test.marksPerQuestion} mark{test.marksPerQuestion > 1 ? 's' : ''})
                                </span>
                            )}
                        </div>

                        {/* Question Text */}
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-8 leading-relaxed select-none">
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
                                    style={{ userSelect: antiCheatEnabled ? 'none' : 'auto' }}
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
                                            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all select-none ${isSelected
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

                {/* Question Navigator */}
                <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-[#1650EB]" />
                            <span className="text-gray-600 dark:text-gray-400">Current</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-green-500" />
                            <span className="text-gray-600 dark:text-gray-400">Attempted ({answeredCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-red-400" />
                            <span className="text-gray-600 dark:text-gray-400">Not Attempted ({questions.length - answeredCount})</span>
                        </div>
                    </div>

                    {/* Question Dots */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {questions.map((_, index) => {
                            const isCurrentQuestion = index === currentIndex;
                            const isAnswered = answers[index] !== null && answers[index] !== '';

                            let colorClass = '';
                            if (isCurrentQuestion) {
                                colorClass = 'bg-[#1650EB] text-white ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-900';
                            } else if (isAnswered) {
                                colorClass = 'bg-green-500 text-white hover:bg-green-600';
                            } else {
                                colorClass = 'bg-red-400 text-white hover:bg-red-500';
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${colorClass}`}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
