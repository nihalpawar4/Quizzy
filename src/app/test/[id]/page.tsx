'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
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
    Bookmark,
    BookmarkCheck,
    RefreshCw,
    RotateCcw,
    Circle,
    CheckCircle2,
    MoreHorizontal,
    List,
    Ban,
    Eye,
    Copy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestById, getQuestionsByTestId, submitTestResult, hasStudentTakenTest } from '@/lib/services';
import type { Test, Question, TestSession } from '@/types';
import MotivationalLoader from '@/components/ui/MotivationalLoader';
import { addMistakesFromResult } from '@/services/mistakeBucketService';
import { OBJECTIVE_QUESTION_TYPES } from '@/lib/constants';
import type { EvaluationMode } from '@/types';
import {
    createTestSession,
    getActiveTestSession,
    updateSessionProgress,
    completeSession,
} from '@/services/testSessionService';

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

    // Refs to mirror latest state — used by handleFinalSubmit so it always
    // has current values even when called from stale event listener closures
    const userRef = useRef(user);
    const testRef = useRef(test);
    const questionsRef = useRef(questions);
    const answersRef = useRef(answers);
    const isSubmittingRef = useRef(isSubmitting);
    const testStartTimeRef = useRef<Date | null>(null);
    const tabSwitchCountRef = useRef(0);
    const copyAttemptsRef = useRef(0);
    const rightClickAttemptsRef = useRef(0);
    const fullscreenExitsRef = useRef(0);

    // Timing tracking
    const [testStartTime, setTestStartTime] = useState<Date | null>(null);
    const [testEndTime, setTestEndTime] = useState<Date | null>(null);

    // Tamper-proof timer: store absolute deadline timestamp (ms since epoch)
    // This survives tab switches, app backgrounding, and phone locking
    const deadlineRef = useRef<number | null>(null);

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

    // Keep refs in sync with latest state values
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { testRef.current = test; }, [test]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);
    useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);
    useEffect(() => { copyAttemptsRef.current = copyAttempts; }, [copyAttempts]);
    useEffect(() => { rightClickAttemptsRef.current = rightClickAttempts; }, [rightClickAttempts]);
    useEffect(() => { fullscreenExitsRef.current = fullscreenExits; }, [fullscreenExits]);
    useEffect(() => { testStartTimeRef.current = testStartTime; }, [testStartTime]);

    // Auto-submit tracking: count total violations (tab switches + fullscreen exits)
    // 1st violation = warning, 2nd violation = auto-submit (works on ALL devices including mobile)
    // Debounce: on mobile, a single tab switch can fire both visibilitychange AND fullscreenchange
    // simultaneously, so we debounce to prevent double-counting within 1.5 seconds
    const violationCountRef = useRef(0);
    const lastViolationTimeRef = useRef(0);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [violationWarningMessage, setViolationWarningMessage] = useState('');
    const autoSubmitTriggeredRef = useRef(false);

    // Instructions screen state
    const [showInstructionsScreen, setShowInstructionsScreen] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [isResuming, setIsResuming] = useState(false);



    // Review modal state
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Exit confirmation modal state
    const [showExitModal, setShowExitModal] = useState(false);

    // Flagged questions for review
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

    // Submit error state (separate from load error to avoid replacing the whole UI)
    const [submitError, setSubmitError] = useState<string | null>(null);
    const submitRetryCountRef = useRef(0);

    // Anti-cheat session tracking
    const [activeSession, setActiveSession] = useState<TestSession | null>(null);
    const activeSessionRef = useRef<TestSession | null>(null);
    const sessionSavePendingRef = useRef(false);
    useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

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

    // Anti-cheat: Enter fullscreen - use documentElement for better mobile support
    const enterFullscreen = useCallback(async () => {
        if (!antiCheatEnabled) return;
        try {
            const element = document.documentElement;
            if (document.fullscreenElement === null) {
                // Try different fullscreen methods for cross-browser support
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if ((element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
                    await (element as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
                } else if ((element as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
                    await (element as HTMLElement & { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen();
                } else if ((element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
                    await (element as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
                }
                setIsFullscreen(true);
                // Add body class to prevent background scrolling issues
                document.body.classList.add('modal-open');
            }
        } catch (err) {
            console.log('Fullscreen not supported on this device:', err);
            // On mobile devices that don't support fullscreen, still mark as "fullscreen" to enable anti-cheat
            setIsFullscreen(true);
        }
    }, [antiCheatEnabled]);

    // Helper: set the deadline and persist to sessionStorage
    const setDeadline = useCallback((deadlineMs: number) => {
        deadlineRef.current = deadlineMs;
        try {
            sessionStorage.setItem(`testDeadline_${testId}`, String(deadlineMs));
        } catch { /* sessionStorage unavailable */ }
    }, [testId]);

    // Helper: get persisted deadline from sessionStorage
    const getPersistedDeadline = useCallback((): number | null => {
        try {
            const stored = sessionStorage.getItem(`testDeadline_${testId}`);
            return stored ? Number(stored) : null;
        } catch { return null; }
    }, [testId]);

    // Helper: clear persisted deadline
    const clearPersistedDeadline = useCallback(() => {
        try {
            sessionStorage.removeItem(`testDeadline_${testId}`);
        } catch { /* ignore */ }
    }, [testId]);

    // Anti-cheat: Visibility change detection (works on ALL devices including mobile)
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => prev + 1);
                setWarningMessage('⚠️ Tab switch detected! This will be reported.');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);

                // Auto-submit logic — applies to ALL screen sizes (desktop + mobile)
                // Debounce: skip if a violation was already counted within 1.5s (prevents
                // double-counting when both visibilitychange + fullscreenchange fire together)
                if (!autoSubmitTriggeredRef.current) {
                    const now = Date.now();
                    if (now - lastViolationTimeRef.current > 1500) {
                        lastViolationTimeRef.current = now;
                        violationCountRef.current += 1;
                        if (violationCountRef.current <= 2) {
                            // First or second violation: show blocking warning
                            setViolationWarningMessage(`⚠️ WARNING: Tab switch detected! (${violationCountRef.current}/2 warnings) One more violation and your test will be automatically submitted.`);
                            setShowViolationWarning(true);
                        } else if (violationCountRef.current >= 3) {
                            // Third violation: auto-submit
                            autoSubmitTriggeredRef.current = true;
                            setShowViolationWarning(false);
                            handleFinalSubmit();
                        }
                    }
                }
            } else {
                // Tab became visible again — recalculate timer from deadline
                // This handles mobile phone lock/unlock and tab switching
                if (deadlineRef.current && !isSubmitted) {
                    const remaining = Math.max(0, Math.floor((deadlineRef.current - Date.now()) / 1000));
                    if (remaining <= 0) {
                        // Time expired while backgrounded — auto-submit
                        if (!autoSubmitTriggeredRef.current) {
                            autoSubmitTriggeredRef.current = true;
                            handleFinalSubmit();
                        }
                    } else {
                        setTimeLeft(remaining);
                    }
                }
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

    // Anti-cheat: Fullscreen exit detection (works on ALL devices)
    useEffect(() => {
        if (!antiCheatEnabled || isSubmitted) return;

        const handleFullscreenChange = () => {
            // Skip if test is being submitted — exiting fullscreen during submit is expected
            if (isSubmittingRef.current) return;

            if (!document.fullscreenElement && isFullscreen) {
                setFullscreenExits(prev => prev + 1);
                setIsFullscreen(false);
                setWarningMessage('🖥️ Fullscreen exited! This will be reported.');
                setShowAntiCheatWarning(true);
                setTimeout(() => setShowAntiCheatWarning(false), 3000);
                // Remove body class when exiting fullscreen
                document.body.classList.remove('modal-open');

                // Auto-submit logic — applies to ALL screen sizes (desktop + mobile)
                // Debounce: skip if a violation was already counted within 1.5s (prevents
                // double-counting when both visibilitychange + fullscreenchange fire together)
                if (!autoSubmitTriggeredRef.current) {
                    const now = Date.now();
                    if (now - lastViolationTimeRef.current > 1500) {
                        lastViolationTimeRef.current = now;
                        violationCountRef.current += 1;
                        if (violationCountRef.current <= 2) {
                            // First or second violation: show blocking warning
                            setViolationWarningMessage(`⚠️ WARNING: You exited fullscreen! (${violationCountRef.current}/2 warnings) One more violation and your test will be automatically submitted.`);
                            setShowViolationWarning(true);
                        } else if (violationCountRef.current >= 3) {
                            // Third violation: auto-submit
                            autoSubmitTriggeredRef.current = true;
                            setShowViolationWarning(false);
                            handleFinalSubmit();
                        }
                    }
                }
            } else if (document.fullscreenElement) {
                setIsFullscreen(true);
                // Add body class when entering fullscreen
                document.body.classList.add('modal-open');
            }
        };

        // Handle various browser prefixes for fullscreen change event
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [antiCheatEnabled, isSubmitted, isFullscreen]);

    // Auto-submit on page close/quit: if the test is in progress and the user
    // closes the browser, navigates away, or quits the app, submit immediately.
    // Uses sendBeacon for reliability — it fires even during page unload.
    useEffect(() => {
        if (isSubmitted || !test || !user) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Show browser-native confirmation dialog
            e.preventDefault();
            // Trigger auto-submit via the main handler
            if (!autoSubmitTriggeredRef.current && !isSubmittingRef.current) {
                autoSubmitTriggeredRef.current = true;
                handleFinalSubmit();
            }
        };

        const handlePageHide = () => {
            // pagehide fires on mobile when app is swiped away or phone locked
            if (!autoSubmitTriggeredRef.current && !isSubmittingRef.current) {
                autoSubmitTriggeredRef.current = true;
                handleFinalSubmit();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [isSubmitted, test, user]);

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

    // Tamper-proof timer effect: uses absolute deadline instead of decrementing counter.
    // On mobile, setInterval pauses when the tab/app is backgrounded, but the deadline
    // is absolute — so when the tab becomes visible again, timeLeft is recalculated correctly.
    useEffect(() => {
        if (deadlineRef.current === null || isSubmitted) return;

        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.floor((deadlineRef.current! - Date.now()) / 1000));
            if (remaining <= 0) {
                clearInterval(timer);
                setTimeLeft(0);
                if (!autoSubmitTriggeredRef.current) {
                    autoSubmitTriggeredRef.current = true;
                    handleFinalSubmit();
                }
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [deadlineRef.current, isSubmitted]);

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

            // Check if test has expired
            if (testData.expiresAt && new Date(testData.expiresAt) < new Date()) {
                setError('This test has expired and is no longer available.');
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

            // Calculate total marks
            const marksPerQ = testData.marksPerQuestion || 1;
            setTotalMarks(questionsData.length * marksPerQ);

            // ── Anti-cheat: Check for existing active session ──
            try {
                const existingSession = await getActiveTestSession(user!.uid, testId);
                if (existingSession && existingSession.status === 'in_progress') {
                    // Resume from saved session
                    console.log('[Quizy] Resuming test from session:', existingSession.id, 'question:', existingSession.currentQuestion);
                    setActiveSession(existingSession);
                    setAnswers(existingSession.answers as AnswerValue[]);
                    setCurrentIndex(existingSession.currentQuestion);
                    setIsResuming(true);

                    // Show instructions screen with "Resume" button
                    setHasAgreed(true); // Auto-agree since they already started
                    setShowInstructionsScreen(true);
                    return;
                }
            } catch (sessionErr) {
                console.error('[Quizy] Session check failed (non-blocking):', sessionErr);
            }

            // No active session — fresh start
            setAnswers(new Array(questionsData.length).fill(null));

            // Show instructions or start test directly
            if (testData.showInstructions !== false) {
                setShowInstructionsScreen(true);
            } else {
                await startTestWithSession(testData, questionsData.length);
                if (testData.enableAntiCheat) {
                    setTimeout(() => enterFullscreen(), 500);
                }
            }
        } catch (err) {
            console.error('Error loading test:', err);
            setError('Failed to load test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Initialize the tamper-proof deadline-based timer
    const startTimer = (testData: Test, sessionStartTime?: Date) => {
        const startTime = sessionStartTime || new Date();
        setTestStartTime(startTime);

        if (testData.duration) {
            // Always clear any old persisted deadline first to prevent stale timers on retake
            clearPersistedDeadline();

            // Calculate deadline from actual start time (not now) — critical for resume
            let timerDeadline = startTime.getTime() + testData.duration * 60 * 1000;

            // If test has an expiresAt, use whichever comes first
            if (testData.expiresAt) {
                const expiryMs = new Date(testData.expiresAt).getTime();
                timerDeadline = Math.min(timerDeadline, expiryMs);
            }

            setDeadline(timerDeadline);

            // Calculate initial timeLeft
            const remaining = Math.max(0, Math.floor((deadlineRef.current! - Date.now()) / 1000));
            if (remaining <= 0) {
                // Already expired (e.g., came back after long time)
                setTimeLeft(0);
                handleFinalSubmit();
                return;
            }
            setTimeLeft(remaining);
        }
    };

    // Resume timer from a persisted session's startedAt timestamp
    const resumeTimerFromSession = (testData: Test, session: TestSession) => {
        startTimer(testData, session.startedAt);
    };

    // Start test and create a Firestore session
    const startTestWithSession = async (testData: Test, questionCount: number) => {
        startTimer(testData);
        // Create persistent session in Firestore
        try {
            const session = await createTestSession({
                userId: user!.uid,
                testId: testData.id,
                sessionType: 'test',
                totalQuestions: questionCount,
            });
            setActiveSession(session);
            console.log('[Quizy] Created test session:', session.id);
        } catch (err) {
            console.error('[Quizy] Failed to create test session (non-blocking):', err);
        }
    };

    // Start test after agreeing to instructions
    const startTestAfterInstructions = async () => {
        if (!hasAgreed || !test) return;

        setShowInstructionsScreen(false);

        if (isResuming && activeSession) {
            // Resuming — restore timer from session, don't create new session
            resumeTimerFromSession(test, activeSession);
            if (test.enableAntiCheat) {
                setTimeout(() => enterFullscreen(), 500);
            }
        } else {
            // Fresh start — create new session
            await startTestWithSession(test, questions.length);
            if (test.enableAntiCheat) {
                setTimeout(() => enterFullscreen(), 500);
            }
        }
    };

    const handleAnswer = useCallback((value: AnswerValue) => {
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIndex] = value;

            // Auto-save progress to Firestore session (fire-and-forget)
            const session = activeSessionRef.current;
            if (session && !sessionSavePendingRef.current) {
                sessionSavePendingRef.current = true;
                updateSessionProgress(session.id, {
                    currentQuestion: currentIndex,
                    answers: newAnswers,
                    score: newAnswers.filter((a, i) => {
                        if (a === null) return false;
                        const q = questionsRef.current[i];
                        if (!q) return false;
                        if (typeof a === 'number') return a === q.correctOption;
                        if (typeof a === 'string') return a.toLowerCase().trim() === (q.correctAnswer || q.options[0] || '').toLowerCase().trim();
                        return false;
                    }).length,
                }).catch(err => {
                    console.error('[Quizy] Session save failed:', err);
                }).finally(() => {
                    sessionSavePendingRef.current = false;
                });
            }

            return newAnswers;
        });
    }, [currentIndex]);

    const handleTextAnswer = useCallback((text: string) => {
        handleAnswer(text);
    }, [handleAnswer]);

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setDirection(1);
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            // Update session currentQuestion
            const session = activeSessionRef.current;
            if (session) {
                updateSessionProgress(session.id, {
                    currentQuestion: nextIdx,
                    answers: answersRef.current,
                    score: 0, // score recalculated on next answer
                }).catch(() => {});
            }
        }
    }, [currentIndex, questions.length]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            setDirection(-1);
            const prevIdx = currentIndex - 1;
            setCurrentIndex(prevIdx);
            // Update session currentQuestion
            const session = activeSessionRef.current;
            if (session) {
                updateSessionProgress(session.id, {
                    currentQuestion: prevIdx,
                    answers: answersRef.current,
                    score: 0,
                }).catch(() => {});
            }
        }
    }, [currentIndex]);

    // Check if text answer is correct (case-insensitive, trim whitespace)
    const isTextAnswerCorrect = (userAnswer: string, correctAnswer: string): boolean => {
        const normalizedUser = userAnswer.toLowerCase().trim();
        const normalizedCorrect = correctAnswer.toLowerCase().trim();
        return normalizedUser === normalizedCorrect;
    };

    // Show review modal before final submit
    const handleSubmitClick = () => {
        setShowReviewModal(true);
    };

    // Toggle flag on a question for review
    const toggleFlag = useCallback((index: number) => {
        setFlaggedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    // Clear answer for the current question
    const clearAnswer = useCallback(() => {
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIndex] = null;
            return newAnswers;
        });
    }, [currentIndex]);

    // Final submit after review confirmation
    // Uses refs instead of state to avoid stale closure issues when called
    // from event listeners (visibilitychange, fullscreenchange, timer)
    const handleFinalSubmit = async () => {
        const currentUser = userRef.current;
        const currentTest = testRef.current;
        const currentQuestions = questionsRef.current;
        const currentAnswers = answersRef.current;

        if (!currentUser || !currentTest || isSubmittingRef.current) return;

        setShowReviewModal(false);
        setIsSubmitting(true);
        isSubmittingRef.current = true;
        // Mark as submitting early so fullscreen exit handler doesn't fire a false warning
        setIsFullscreen(false);
        const endTime = new Date();
        setTestEndTime(endTime);

        try {
            let correctCount = 0;
            let wrongCount = 0;
            const detailedAnswers: { questionId: string; questionText: string; userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation?: string }[] = [];

            currentQuestions.forEach((q, index) => {
                const userAnswer = currentAnswers[index];
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
                    isCorrect,
                    explanation: q.explanation || '',
                });
            });

            setScore(correctCount);

            // Calculate marks with negative marking
            const marksPerQ = currentTest.marksPerQuestion || 1;
            const negMarksPerQ = currentTest.negativeMarking ? (currentTest.negativeMarksPerQuestion || 0.25) : 0;
            const positiveMarks = correctCount * marksPerQ;
            const negativeMarks = wrongCount * negMarksPerQ;
            const finalMarks = Math.max(0, positiveMarks - negativeMarks); // Ensure marks don't go below 0

            setMarksObtained(finalMarks);
            setNegativeMarksApplied(negativeMarks);

            // Calculate time taken
            const currentStartTime = testStartTimeRef.current;
            const timeTakenSeconds = currentStartTime ? Math.floor((endTime.getTime() - currentStartTime.getTime()) / 1000) : 0;

            // Submit with detailed answers and timing/anti-cheat data
            // Determine evaluation status based on test's evaluation mode
            const evalMode: EvaluationMode = currentTest.evaluationMode || 'auto';
            let evaluationStatus: 'pending' | 'published' = 'published';
            
            if (evalMode === 'manual') {
                evaluationStatus = 'pending';
            } else if (evalMode === 'hybrid') {
                // Check if there are any subjective questions
                const hasSubjective = currentQuestions.some(q => 
                    !OBJECTIVE_QUESTION_TYPES.includes(q.type as typeof OBJECTIVE_QUESTION_TYPES[number])
                );
                evaluationStatus = hasSubjective ? 'pending' : 'published';
            }

            await submitTestResult({
                studentId: currentUser.uid,
                studentName: currentUser.name,
                studentEmail: currentUser.email,
                studentClass: currentUser.studentClass || 0,
                testId: currentTest.id,
                testTitle: currentTest.title,
                subject: currentTest.subject,
                score: correctCount,
                totalQuestions: currentQuestions.length,
                answers: currentAnswers.map(a => typeof a === 'number' ? a : -1),
                detailedAnswers,
                // Timing data
                startTime: currentStartTime || new Date(),
                endTime: endTime,
                timeTakenSeconds,
                // Marking data
                totalMarks: currentQuestions.length * marksPerQ,
                marksObtained: finalMarks,
                negativeMarksApplied: negativeMarks,
                // Anti-cheat data
                tabSwitchCount: tabSwitchCountRef.current,
                copyAttempts: copyAttemptsRef.current,
                rightClickAttempts: rightClickAttemptsRef.current,
                fullscreenExits: fullscreenExitsRef.current,
                antiCheatEnabled,
                // Evaluation data
                evaluationStatus,
                evaluationMode: evalMode,
            });

            // Exit fullscreen on submit and cleanup
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
            // Remove body class
            document.body.classList.remove('modal-open');

            // Clear persisted deadline from sessionStorage
            clearPersistedDeadline();

            // Save wrong answers to Mistake Bucket for Practice Mode
            try {
                await addMistakesFromResult(
                    currentUser.uid,
                    currentUser.studentClass || 0,
                    {
                        id: '',
                        studentId: currentUser.uid,
                        studentName: currentUser.name,
                        studentEmail: currentUser.email,
                        studentClass: currentUser.studentClass || 0,
                        testId: currentTest.id,
                        testTitle: currentTest.title,
                        subject: currentTest.subject,
                        score: correctCount,
                        totalQuestions: currentQuestions.length,
                        answers: currentAnswers.map(a => typeof a === 'number' ? a : -1),
                        detailedAnswers,
                        timestamp: endTime,
                    }
                );
            } catch (mbErr) {
                console.error('[Quizy] Mistake Bucket save failed (non-blocking):', mbErr);
            }

            // Mark session as completed in Firestore
            const currentSession = activeSessionRef.current;
            if (currentSession) {
                completeSession(currentSession.id, correctCount).catch(err =>
                    console.error('[Quizy] Session complete failed:', err)
                );
            }

            setIsSubmitted(true);
        } catch (err) {
            console.error('Error submitting test:', err);
            // Auto-retry up to 3 times with exponential backoff
            if (submitRetryCountRef.current < 3) {
                submitRetryCountRef.current += 1;
                const delay = Math.pow(2, submitRetryCountRef.current - 1) * 1000; // 1s, 2s, 4s
                console.log(`[Quizy] Auto-retrying submit (attempt ${submitRetryCountRef.current}/3) in ${delay}ms...`);
                setSubmitError(`Submission failed. Retrying automatically (${submitRetryCountRef.current}/3)...`);
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                setTimeout(() => {
                    handleFinalSubmit();
                }, delay);
                return;
            }
            // All retries exhausted — show manual retry banner (NOT the load error screen)
            setSubmitError('Failed to submit test. Please check your connection and try again.');
            isSubmittingRef.current = false;
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
                <MotivationalLoader subtitle="Preparing your test..." />
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



    // Instructions Screen
    if (showInstructionsScreen && test) {
        return (
            <div className="instructions-screen min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-3 sm:p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="instructions-card max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] max-h-[95dvh]"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 bg-gradient-to-r from-[#1650EB] to-indigo-600 p-4 sm:p-6 text-white">
                        <h1 className="text-xl sm:text-2xl font-bold mb-1">{test.title}</h1>
                        <p className="text-sm sm:text-base text-indigo-100">{test.subject} • Class {test.targetClass}</p>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="instructions-content flex-1 overflow-y-auto -webkit-overflow-scrolling-touch p-4 sm:p-6 space-y-4 sm:space-y-6">
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

                        {/* Auto-Submit Warning — applies to ALL devices */}
                        {antiCheatEnabled && (
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <h4 className="font-semibold text-red-700 dark:text-red-400">⚠️ Auto-Submit Rule (All Devices)</h4>
                                </div>
                                <div className="space-y-2 text-sm text-red-700 dark:text-red-400">
                                    <p>On <strong>all devices (including mobile)</strong>, the following rules apply:</p>
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold">1st &amp; 2nd violation:</span>
                                        <span>If you <strong>switch tabs</strong>, <strong>minimize the app</strong>, or <strong>exit fullscreen</strong>, you will receive a <strong>warning</strong>.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold">3rd violation:</span>
                                        <span>Your test will be <strong>automatically submitted</strong> with whatever answers you have completed.</span>
                                    </div>
                                    <p className="mt-2 font-medium text-red-800 dark:text-red-300">⚠️ Stay focused! Do not switch apps, lock your phone, or switch tabs during the test!</p>
                                </div>
                            </div>
                        )}

                        {/* Test Expiry Info */}
                        {test.expiresAt && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <h4 className="font-semibold text-amber-700 dark:text-amber-400">⏰ Test Expiry</h4>
                                </div>
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    This test expires on <strong>{new Date(test.expiresAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.
                                    If the test expires while you are taking it, it will be automatically submitted.
                                </p>
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
                    <div className="instructions-footer flex-shrink-0 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                            onClick={() => router.push('/dashboard/student')}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-xl bg-gray-200 dark:bg-gray-700 sm:bg-transparent sm:dark:bg-transparent"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={startTestAfterInstructions}
                            disabled={!hasAgreed}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-semibold text-white transition-all ${hasAgreed
                                ? 'bg-gradient-to-r from-[#1650EB] to-indigo-600 hover:from-[#1243c7] hover:to-indigo-700 shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                        >
                            {isResuming
                                ? '🔄 Resume Test Now'
                                : hasAgreed ? '🚀 Start Test Now' : '☑️ Please agree to start'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isSubmitted) {
        const percentage = Math.round((score / questions.length) * 100);
        const timeTaken = testStartTime && testEndTime ? Math.floor((testEndTime.getTime() - testStartTime.getTime()) / 1000) : 0;
        const evalMode = test?.evaluationMode || 'auto';
        const isPendingEval = evalMode === 'manual' || (evalMode === 'hybrid' && questions.some(q => !OBJECTIVE_QUESTION_TYPES.includes(q.type as typeof OBJECTIVE_QUESTION_TYPES[number])));

        // Calculate expected result date
        const expectedDays = test?.expectedResultDays || 5;
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + expectedDays);

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isPendingEval ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-[#1650EB] to-[#1650EB]'}`}>
                        {isPendingEval ? (
                            <Clock className="w-10 h-10 text-white" />
                        ) : (
                            <CheckCircle className="w-10 h-10 text-white" />
                        )}
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {isPendingEval ? 'Submitted Successfully!' : 'Test Completed!'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{test?.title}</p>

                    {isPendingEval ? (
                        /* Pending Evaluation Card */
                        <div className="space-y-4 mb-6">
                            <div className="eval-card p-5 text-left space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="eval-status-badge eval-status-pending">
                                        <span className="eval-pulse-dot bg-amber-500" />
                                        Pending Evaluation
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span className="text-gray-600 dark:text-gray-400">Submitted on</span>
                                        <span className="font-medium text-gray-900 dark:text-white ml-auto">
                                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                                        <span className="font-medium text-amber-600 dark:text-amber-400 ml-auto">
                                            Awaiting Teacher Review
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Flag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-gray-600 dark:text-gray-400">Results expected</span>
                                        <span className="font-medium text-gray-900 dark:text-white ml-auto">
                                            {expectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation mode info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 text-left">
                                {evalMode === 'manual' ? (
                                    <p>📝 Your teacher will manually review all answers. You&apos;ll be notified when results are published.</p>
                                ) : (
                                    <p>🔄 Objective questions have been auto-graded. Your teacher will review subjective answers. You&apos;ll be notified when full results are ready.</p>
                                )}
                            </div>

                            {/* Time Taken */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                                <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">Time taken: {formatDuration(timeTaken)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Auto Evaluation - Show Score Immediately */
                        <>
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
                        </>
                    )}

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
        <div ref={containerRef} className={`test-page-container bg-gray-50 dark:bg-gray-950 zen-mode ${isFullscreen ? 'fullscreen-container' : ''}`}>
            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="review-modal-overlay"
                        onClick={() => setShowReviewModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="review-modal-content"
                        >
                            {/* Header */}
                            <div className="review-modal-header bg-gradient-to-r from-[#1650EB] to-indigo-600 p-4 sm:p-6 text-white">
                                <h2 className="text-xl sm:text-2xl font-bold mb-1">Review Your Test</h2>
                                <p className="text-sm text-indigo-100">Check your answers before final submission</p>
                            </div>

                            {/* Content - Scrollable */}
                            <div className="review-modal-body p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{answeredCount}</p>
                                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">Attempted</p>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center border border-orange-200 dark:border-orange-800">
                                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{questions.length - answeredCount}</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">Unattempted</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{questions.length}</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Total</p>
                                    </div>
                                </div>

                                {/* Time Remaining */}
                                {timeLeft !== null && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-purple-700 dark:text-purple-400 font-medium">Time Remaining:</span>
                                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                                                {formatTime(timeLeft)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Question Grid */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">Questions Overview</h3>
                                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 sm:gap-2">
                                        {questions.map((_, index) => {
                                            const isAnswered = answers[index] !== null && answers[index] !== '';
                                            const isCurrent = index === currentIndex;
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        setCurrentIndex(index);
                                                        setShowReviewModal(false);
                                                    }}
                                                    className={`aspect-square rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[36px] ${isCurrent
                                                        ? 'bg-[#1650EB] text-white ring-2 ring-[#1650EB] ring-offset-1 dark:ring-offset-gray-900'
                                                        : isAnswered
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-700'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                                                        } active:scale-95`}
                                                >
                                                    {index + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Warning if unattempted */}
                                {answeredCount < questions.length && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-yellow-800 dark:text-yellow-400">
                                                    {questions.length - answeredCount} question(s) unattempted
                                                </p>
                                                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                                                    You can go back and answer them before submitting.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="review-modal-footer bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Flag className="w-5 h-5" />
                                            Submit Test
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Anti-Cheat Warning Toast */}
            <AnimatePresence>
                {showAntiCheatWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">{warningMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Violation Warning Modal — blocking modal on first violation */}
            <AnimatePresence>
                {showViolationWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Red warning header */}
                            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">⚠️ First Warning!</h3>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-gray-700 dark:text-gray-300 text-center text-sm leading-relaxed">
                                    {violationWarningMessage}
                                </p>

                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                                    <p className="text-red-700 dark:text-red-400 text-sm font-medium text-center">
                                        🚨 This is your <strong>ONLY</strong> warning. Next violation = <strong>Automatic Submission</strong>.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowViolationWarning(false);
                                        // Re-enter fullscreen if anti-cheat is enabled
                                        if (antiCheatEnabled) {
                                            setTimeout(() => enterFullscreen(), 300);
                                        }
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-[#1650EB] to-indigo-600 text-white rounded-xl font-semibold hover:from-[#1243c7] hover:to-indigo-700 transition-all shadow-lg"
                                >
                                    I Understand — Continue Test
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowExitModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertTriangle className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Exit Test?</h3>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Progress info */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your progress</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {answers.filter(a => a !== null && a !== '').length} <span className="text-base font-normal text-gray-400">/ {questions.length}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">questions answered</p>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                    If you leave now, your progress will be <strong className="text-red-600 dark:text-red-400">lost</strong> and the test will not be submitted.
                                </p>

                                {/* Actions */}
                                <div className="flex flex-col gap-2.5">
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="w-full py-3 bg-[#1650EB] text-white rounded-xl font-semibold hover:bg-[#1243c7] transition-colors"
                                    >
                                        ← Resume Test
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                                            document.body.classList.remove('modal-open');
                                            router.push('/dashboard/student');
                                        }}
                                        className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Leave Test
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="test-header zen-hide bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="test-desktop-max-w mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <button onClick={() => setShowExitModal(true)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
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
                            onClick={handleSubmitClick}
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
                    <div className="test-desktop-max-w mx-auto px-6 py-2">
                        <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                            ⚠️ Negative marking enabled: +{test.marksPerQuestion || 1} for correct, -{test.negativeMarksPerQuestion || 0.25} for wrong answers
                        </p>
                    </div>
                </div>
            )}

            {/* Submit Error Banner */}
            <AnimatePresence>
                {submitError && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
                    >
                        <div className="test-desktop-max-w mx-auto px-6 py-3">
                            <div className="flex items-center justify-center gap-3">
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                                <button
                                    onClick={() => {
                                        setSubmitError(null);
                                        submitRetryCountRef.current = 0;
                                        handleFinalSubmit();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Retry
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Bar — visible on all sizes */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="test-desktop-max-w mx-auto px-6">
                    <div className="flex items-center justify-between py-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <span>{answeredCount} answered{flaggedQuestions.size > 0 ? ` · ${flaggedQuestions.size} flagged` : ''}</span>
                    </div>
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                        <motion.div className="h-full bg-[#1650EB]" initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
                    </div>
                </div>
            </div>

            {/* ===== DESKTOP SPLIT LAYOUT / MOBILE STACKED ===== */}
            <div className="test-desktop-layout test-desktop-max-w mx-auto">
                {/* LEFT PANE — Question Card */}
                <main className="test-question-pane">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }} className="question-card bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
                            {/* Top bar: Type badge + marks | Flag + More */}
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <List className="w-5 h-5 text-[#1650EB]" />
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${questionType === 'mcq' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                                        questionType === 'true_false' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                            currentQuestion.type === 'fill_blank' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' :
                                                currentQuestion.type === 'one_word' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' :
                                                    'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300'
                                        }`}>
                                        {questionType === 'mcq' ? 'Multiple Choice' :
                                            questionType === 'true_false' ? 'True/False' :
                                                currentQuestion.type === 'fill_blank' ? 'Fill in Blank' :
                                                    currentQuestion.type === 'one_word' ? 'One Word' :
                                                        'Short Answer'}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        {test?.marksPerQuestion || 1} Mark{(test?.marksPerQuestion || 1) > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleFlag(currentIndex)}
                                        className={`flag-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${flaggedQuestions.has(currentIndex)
                                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {flaggedQuestions.has(currentIndex) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                        Flag
                                    </button>
                                    <button className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Question Number + Text */}
                            <div className="flex items-start gap-4 mb-8">
                                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1650EB] text-white flex items-center justify-center text-sm font-bold">
                                    {String(currentIndex + 1).padStart(2, '0')}
                                </span>
                                <h2 className="question-text text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-relaxed select-none pt-1.5">
                                    {currentQuestion.text}
                                </h2>
                            </div>

                            {/* Answer Input based on question type */}
                            {questionType === 'text_input' ? (
                                <div className="space-y-4 ml-14">
                                    <textarea
                                        value={typeof answers[currentIndex] === 'string' ? answers[currentIndex] as string : ''}
                                        onChange={(e) => handleTextAnswer(e.target.value)}
                                        placeholder="Type your answer here..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-[#1650EB] focus:border-[#1650EB] outline-none transition-all resize-none"
                                        style={{ userSelect: antiCheatEnabled ? 'none' : 'auto' }}
                                    />
                                </div>
                            ) : (
                                // MCQ / True-False Options — with radio circle
                                <div className="space-y-3 ml-0 sm:ml-14">
                                    {currentQuestion.options.map((option, index) => {
                                        const isSelected = answers[currentIndex] === index;
                                        const optionLetter = questionType === 'true_false' ? '' : String.fromCharCode(65 + index);

                                        return (
                                            <motion.button
                                                key={index}
                                                onClick={() => handleAnswer(index)}
                                                whileTap={{ scale: 0.99 }}
                                                className={`option-button w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all select-none ${isSelected
                                                    ? 'border-[#1650EB] bg-indigo-50/50 dark:bg-indigo-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                                                    }`}
                                            >
                                                {/* Radio Circle */}
                                                <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                    ? 'border-[#1650EB] bg-[#1650EB]'
                                                    : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                                                </span>
                                                {/* Letter Badge */}
                                                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${isSelected
                                                    ? 'bg-[#1650EB] text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {questionType === 'true_false' ? (option === 'True' ? '✓' : '✗') : optionLetter}
                                                </span>
                                                {/* Option Text */}
                                                <span className={`text-base ${isSelected
                                                    ? 'text-gray-900 dark:text-white font-medium'
                                                    : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {option}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Desktop inline navigation — Previous / counter / Next */}
                            <div className="desktop-inline-nav hidden lg:flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentIndex === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {currentIndex + 1} / {questions.length}
                                </span>
                                {currentIndex === questions.length - 1 ? (
                                    <button
                                        onClick={handleSubmitClick}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                                    >
                                        <Flag className="w-4 h-4" />
                                        Finish Test
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Mobile-only question navigator (hidden on desktop) */}
                    <div className="question-navigator lg:hidden mt-4 sm:mt-6 bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-[10px] sm:text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-[#1650EB]" />
                                <span className="text-gray-600 dark:text-gray-400">Current</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-500" />
                                <span className="text-gray-600 dark:text-gray-400">Done ({answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-400" />
                                <span className="text-gray-600 dark:text-gray-400">Pending ({questions.length - answeredCount})</span>
                            </div>
                            {flaggedQuestions.size > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-500" />
                                    <span className="text-gray-600 dark:text-gray-400">Flagged ({flaggedQuestions.size})</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                            {questions.map((_, index) => {
                                const isCurrentQuestion = index === currentIndex;
                                const isAnswered = answers[index] !== null && answers[index] !== '';
                                const isFlagged = flaggedQuestions.has(index);
                                let colorClass = '';
                                if (isCurrentQuestion) colorClass = 'bg-[#1650EB] text-white ring-2 ring-blue-300 ring-offset-1 dark:ring-offset-gray-900';
                                else if (isFlagged) colorClass = 'bg-amber-500 text-white';
                                else if (isAnswered) colorClass = 'bg-green-500 text-white';
                                else colorClass = 'bg-red-400 text-white';
                                return (
                                    <button key={index} onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                                        className={`question-dot w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all ${colorClass}`}>
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* RIGHT PANE — Desktop Navigator Sidebar */}
                <aside className="test-navigator-pane hidden lg:flex flex-col gap-4">
                    {/* Timer Card with circular progress */}
                    {timeLeft !== null && (
                        <div className={`nav-panel-card rounded-2xl p-5 ${timeLeft <= 60 ? 'timer-danger' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Remaining</span>
                                    </div>
                                    <span className={`text-3xl font-bold font-mono tracking-tight ${timeLeft <= 60 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                                {/* Circular progress ring */}
                                <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0 -rotate-90">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                                        className="text-gray-200 dark:text-gray-700" />
                                    <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
                                        strokeDasharray={`${2 * Math.PI * 20}`}
                                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - (timeLeft / ((test?.duration || 60) * 60)))}`}
                                        strokeLinecap="round"
                                        className={`transition-all duration-1000 ${timeLeft <= 60 ? 'text-red-500' : 'text-[#1650EB]'}`}
                                        stroke="currentColor" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Question Navigator Panel */}
                    <div className="nav-panel-card rounded-2xl p-5 flex-1">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Question Navigator</h3>

                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4 text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#1650EB] inline-block" />
                                <span className="text-gray-600 dark:text-gray-400">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                                <span className="text-gray-600 dark:text-gray-400">Answered ({answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
                                <span className="text-gray-600 dark:text-gray-400">Unanswered ({questions.length - answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                                <span className="text-gray-600 dark:text-gray-400">Flagged ({flaggedQuestions.size})</span>
                            </div>
                        </div>

                        {/* Question Grid — 6 columns */}
                        <div className="nav-question-grid grid grid-cols-6 gap-1.5">
                            {questions.map((_, index) => {
                                const isCurrentQuestion = index === currentIndex;
                                const isAnswered = answers[index] !== null && answers[index] !== '';
                                const isFlagged = flaggedQuestions.has(index);

                                let dotClass = '';
                                if (isCurrentQuestion) dotClass = 'nav-dot-current';
                                else if (isFlagged && isAnswered) dotClass = 'nav-dot-flagged-answered';
                                else if (isFlagged) dotClass = 'nav-dot-flagged';
                                else if (isAnswered) dotClass = 'nav-dot-answered';
                                else dotClass = 'nav-dot-unanswered';

                                return (
                                    <button
                                        key={index}
                                        onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                                        className={`nav-dot relative aspect-square rounded-lg text-xs font-semibold transition-all ${dotClass}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmitClick}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-bold text-base hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Flag className="w-5 h-5" />
                                Submit Test
                                <span className="text-red-200">({answeredCount}/{questions.length})</span>
                            </>
                        )}
                    </button>
                </aside>
            </div>



            {/* Fixed Navigation at Bottom — Mobile only */}
            <div className="test-navigation safe-area-bottom lg:hidden">
                <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Prev</span>
                </button>
                <div className="flex flex-col items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{currentIndex + 1}/{questions.length}</span>
                    <span>{answeredCount} done</span>
                </div>
                {currentIndex === questions.length - 1 ? (
                    <button onClick={handleSubmitClick} disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isSubmitting ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Submitting...</span></>) : (<><Flag className="w-5 h-5" /><span>Finish</span></>)}
                    </button>
                ) : (
                    <button onClick={handleNext} className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                        <span>Next</span><ArrowRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
