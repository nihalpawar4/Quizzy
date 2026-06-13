'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    BookOpen,
    Clock,
    ArrowRight,
    User,
    Trophy,
    Loader2,
    Target,
    Calendar,
    MessageSquare,
    HelpCircle,
    X,
    Sparkles,
    Bell,
    RefreshCw,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Timer,
    BookMarked,
    ExternalLink,
    Trash2,
    Megaphone,
    Hourglass,
    Filter,
    SlidersHorizontal,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsByStudent, hasStudentTakenTest, markNotificationAsViewed, deleteNotification, submitPdfTestDownload, markPdfTestViewed } from '@/lib/services';
import { subscribeToMistakes, subscribeToMasteredMistakes, recordAttempt } from '@/services/mistakeBucketService';
import { generateStudentReportPDF } from '@/lib/utils/generatePDF';

import type { Test, TestResult, SubjectNote, Notification, MistakeBucketItem, Question, User as AppUser, GameStats } from '@/types';
import type { Homework } from '@/types/homework';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { subscribeToHomework, getStudentHomeworkCompletions } from '@/services/homeworkService';
import { requestAndStoreFCMToken } from '@/lib/messaging';
import HomeworkList from '@/components/homework/HomeworkList';
import NotesList from '@/components/notes/NotesList';
import { getDailyQuizQuestions, hasCompletedDailyQuiz, submitDailyQuiz, getDailyQuizHistory } from '@/services/dailyQuizService';
import {
    createTestSession,
    getActiveDailySession,
    getDailyChallengeTestId,
    updateSessionProgress,
    completeSession as completeTestSession,
    getActiveTestSessionIds,
} from '@/services/testSessionService';
import type { TestSession } from '@/types';

import { useChat } from '@/contexts/ChatContext';
import { saveLastRoute } from '@/lib/routePersistence';
import { generatePDFWithCover } from '@/lib/utils/generatePDFCover';
import { getUserProfile } from '@/lib/services';

import MotivationalLoader from '@/components/ui/MotivationalLoader';
import StudentSidebar from '@/components/ui/StudentSidebar';
// import GamesZone from '@/components/games/GamesZone';
// import { subscribeToCoins } from '@/services/coinService';
// import { subscribeToGameStats } from '@/services/gameService';

export default function StudentDashboard() {
    const { user, loading: authLoading, signOut, refreshUser } = useAuth();
    const { totalUnreadCount } = useChat();
    const router = useRouter();

    // Save current route for persistence
    useEffect(() => {
        saveLastRoute('/dashboard/student');
    }, []);

    const [tests, setTests] = useState<Test[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [takenTests, setTakenTests] = useState<Set<string>>(new Set());
    const [resumableTests, setResumableTests] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [comingSoonFeature, setComingSoonFeature] = useState('');

    // New test notification
    const [newTestNotification, setNewTestNotification] = useState<Test | null>(null);

    // My Reports state
    const [activeTab, setActiveTab] = useState<'tests' | 'reports' | 'notes' | 'homework' | 'practice'>('tests');
    const [selectedReport, setSelectedReport] = useState<TestResult | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    // New reports notification state
    const [newReportsCount, setNewReportsCount] = useState(0);
    const [newReportNotification, setNewReportNotification] = useState<TestResult | null>(null);

    // Notes state
    const [notes, setNotes] = useState<SubjectNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<SubjectNote | null>(null);

    // Homework state
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [homeworkLoading, setHomeworkLoading] = useState(true);
    const [completedHomeworkIds, setCompletedHomeworkIds] = useState<Set<string>>(new Set());

    // Notification state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [viewedNotificationIds, setViewedNotificationIds] = useState<Set<string>>(new Set());
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    // Test filter state
    const [filterSubject, setFilterSubject] = useState<string>('All');
    const [filterType, setFilterType] = useState<'All' | 'Quiz' | 'PDF'>('All');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed' | 'Expired'>('All');
    const [showFilters, setShowFilters] = useState(false);
    const [filterTouched, setFilterTouched] = useState<Set<string>>(new Set());
    const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
    const [reportFilterSubject, setReportFilterSubject] = useState<string>('All');

    // Practice Mode - Mistake Bucket state
    const [mistakeBucketItems, setMistakeBucketItems] = useState<MistakeBucketItem[]>([]);
    const [masteredCount, setMasteredCount] = useState(0);

    // Daily Quiz Challenge state
    const [dailyQuizQuestions, setDailyQuizQuestions] = useState<Question[]>([]);
    const [dailyQuizCompleted, setDailyQuizCompleted] = useState(false);
    const [dailyQuizLoading, setDailyQuizLoading] = useState(true);
    const [showDailyHistory, setShowDailyHistory] = useState(false);
    const [dailyHistory, setDailyHistory] = useState<{ date: string; score: number; totalQuestions: number; completedAt: Date }[]>([]);
    const [dailyHistoryLoading, setDailyHistoryLoading] = useState(false);
    const [dailyQuizScore, setDailyQuizScore] = useState<{ score: number; total: number } | null>(null);
    const [dailyQuizSession, setDailyQuizSession] = useState<TestSession | null>(null);


    // PDF Test viewer state
    const [selectedPdfTest, setSelectedPdfTest] = useState<Test | null>(null);

    // Games Zone state (disabled)
    // const [userCoins, setUserCoins] = useState(0);
    // const [gameStats, setGameStats] = useState<GameStats | null>(null);
    // const [coinsRefreshKey, setCoinsRefreshKey] = useState(0);

    // Mobile swipe-to-switch-tab (Instagram-style)
    const mobileTabOrder: Array<'tests' | 'practice' | 'notes' | 'homework'> = ['tests', 'practice', 'notes', 'homework'];
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    }, []);
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
        const dt = Date.now() - touchStartRef.current.time;
        touchStartRef.current = null;
        // Only trigger if horizontal swipe is dominant and fast enough
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7 || dt > 400) return;
        const currentIdx = mobileTabOrder.indexOf(activeTab as typeof mobileTabOrder[number]);
        if (currentIdx === -1) return;
        if (dx < 0 && currentIdx < mobileTabOrder.length - 1) {
            // Swipe left → next tab
            const next = mobileTabOrder[currentIdx + 1];
            setActiveTab(next);
        } else if (dx > 0 && currentIdx > 0) {
            // Swipe right → previous tab
            const prev = mobileTabOrder[currentIdx - 1];
            setActiveTab(prev);
        }
    }, [activeTab]);

    // Lock body scroll when any modal is open
    const isAnyModalOpen = showComingSoon || !!selectedReport || !!selectedNote || !!selectedNotification || !!selectedPdfTest;
    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isAnyModalOpen]);

    // Track PDF views when student opens viewer
    useEffect(() => {
        if (selectedPdfTest && user?.uid && user?.name) {
            markPdfTestViewed(selectedPdfTest.id, user.uid, user.name).catch(err =>
                console.error('[Quizy] Error marking PDF as viewed:', err)
            );
        }
    }, [selectedPdfTest, user?.uid, user?.name]);



    // Read notes tracking (persisted in localStorage)
    const [readNoteIds, setReadNoteIds] = useState<Set<string>>(new Set());

    // Countdown timers for scheduled tests
    const [countdowns, setCountdowns] = useState<{ [testId: string]: string }>({});



    // Update current time every minute for report availability check
    useEffect(() => {
        setCurrentTime(new Date());
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Load read notes from localStorage
    useEffect(() => {
        if (user?.uid) {
            const stored = localStorage.getItem(`readNotes_${user.uid}`);
            if (stored) {
                try {
                    setReadNoteIds(new Set(JSON.parse(stored)));
                } catch (e) {
                    console.error('Error parsing read notes:', e);
                }
            }
        }
    }, [user?.uid]);

    // Countdown timer for scheduled tests - update every second
    useEffect(() => {
        const updateCountdowns = () => {
            const now = new Date();
            const newCountdowns: { [testId: string]: string } = {};

            tests.forEach(test => {
                if (test.scheduledStartTime) {
                    const startTime = new Date(test.scheduledStartTime);
                    const diff = startTime.getTime() - now.getTime();

                    if (diff > 0) {
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                        if (hours > 0) {
                            newCountdowns[test.id] = `${hours}h ${minutes}m ${seconds}s`;
                        } else if (minutes > 0) {
                            newCountdowns[test.id] = `${minutes}m ${seconds}s`;
                        } else {
                            newCountdowns[test.id] = `${seconds}s`;
                        }
                    }
                }
            });

            setCountdowns(newCountdowns);
        };

        updateCountdowns();
        const interval = setInterval(updateCountdowns, 1000);
        return () => clearInterval(interval);
    }, [tests]);

    // ──────────── Score Helpers ────────────
    // When teacher evaluates (manual/hybrid), use marksObtained/totalMarks.
    // For auto-evaluated tests, use score/totalQuestions.
    const getResultScorePercent = (r: TestResult): number | null => {
        if (r.evaluationStatus === 'pending' || r.evaluationStatus === 'under_review') return null;
        if (r.evaluationStatus === 'evaluated') return null; // Not published yet
        if (r.isPdfTest) {
            return r.pdfEvaluated && r.pdfMaxMarks ? Math.round(((r.pdfMarksAwarded || 0) / r.pdfMaxMarks) * 100) : null;
        }
        // Published manual/hybrid evaluation — use teacher marks
        if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.totalMarks > 0 && r.marksObtained !== undefined) {
            return Math.round((r.marksObtained / r.totalMarks) * 100);
        }
        // Auto-evaluated or legacy
        return r.totalQuestions > 0 ? Math.round((r.score / r.totalQuestions) * 100) : 0;
    };

    const getResultScoreLabel = (r: TestResult): string => {
        if (r.evaluationStatus === 'pending' || r.evaluationStatus === 'under_review') return 'Awaiting Teacher Review';
        if (r.evaluationStatus === 'evaluated') return 'Evaluated — Results coming soon';
        if (r.isPdfTest) {
            return r.pdfEvaluated ? `Score: ${r.pdfMarksAwarded}/${r.pdfMaxMarks}` : 'Awaiting evaluation';
        }
        // Published manual/hybrid — show marks
        if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.marksObtained !== undefined) {
            return `Marks: ${r.marksObtained}/${r.totalMarks}`;
        }
        return `Score: ${r.score}/${r.totalQuestions}`;
    };

    const getResultScoreFraction = (r: TestResult): string => {
        // Published manual/hybrid — use marks
        if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.marksObtained !== undefined) {
            return `${r.marksObtained}/${r.totalMarks}`;
        }
        if (r.isPdfTest && r.pdfEvaluated) {
            return `${r.pdfMarksAwarded}/${r.pdfMaxMarks}`;
        }
        return `${r.score}/${r.totalQuestions}`;
    };

    // Compute average score that respects teacher evaluations
    const getResultScoreForAverage = (r: TestResult): number | null => {
        if (r.evaluationStatus === 'pending' || r.evaluationStatus === 'under_review' || r.evaluationStatus === 'evaluated') return null;
        if (r.isPdfTest) {
            return r.pdfEvaluated && r.pdfMaxMarks && r.pdfMaxMarks > 0 ? ((r.pdfMarksAwarded || 0) / r.pdfMaxMarks) * 100 : null;
        }
        if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.totalMarks > 0 && r.marksObtained !== undefined) {
            return (r.marksObtained / r.totalMarks) * 100;
        }
        return r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : null;
    };

    // Check if report is available (instantly available up to 24 hours after submission)
    const isReportAvailable = (result: TestResult): boolean => {
        if (!currentTime) return true;
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        return currentTime < twentyFourHoursLater;
    };

    // Check if report has expired (after 24 hours)
    const isReportExpired = (result: TestResult): boolean => {
        if (!currentTime) return false;
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);
        return currentTime >= twentyFourHoursLater;
    };

    // Get time remaining until report expires (reports are now instantly available)
    const getTimeRemaining = (result: TestResult): string => {
        const submittedAt = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
        const twentyFourHoursLater = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);

        if (!currentTime || currentTime < twentyFourHoursLater) {
            // Available, show expiry time
            const diff = currentTime ? twentyFourHoursLater.getTime() - currentTime.getTime() : 0;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.ceil((diff % 3600000) / 60000);
            if (hours > 0) {
                return `Expires in ${hours}h ${minutes}m`;
            }
            return `Expires in ${minutes} min`;
        }
        return 'Expired';
    };

    // Download report as PDF file
    const downloadReport = (result: TestResult) => {
        if (!result.detailedAnswers) return;
        generateStudentReportPDF(result);
    };

    // Download PDF test with branded cover page
    const downloadPdfTest = async (test: Test) => {
        if (!test.pdfUrl || !user) return;

        try {
            // Fetch teacher name
            let teacherName = 'Teacher';
            try {
                const teacherProfile = await getUserProfile(test.createdBy);
                if (teacherProfile) teacherName = teacherProfile.name;
            } catch {
                // Use default
            }

            // Generate PDF with cover page
            const blob = await generatePDFWithCover(test.pdfUrl, {
                testTitle: test.title,
                subject: test.subject,
                targetClass: test.targetClass,
                teacherName,
                createdAt: test.createdAt instanceof Date ? test.createdAt : new Date(),
                duration: test.duration,
                marksPerQuestion: test.marksPerQuestion,
                questionCount: test.questionCount,
                difficultyLevel: test.difficultyLevel,
                pdfFileName: test.pdfFileName,
            });

            // Download with test title as filename
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${test.title.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Mark as completed — submit result to Firestore
            await submitPdfTestDownload({
                studentId: user.uid,
                studentName: user.name,
                studentEmail: user.email,
                studentClass: user.studentClass || 0,
                testId: test.id,
                testTitle: test.title,
                subject: test.subject,
            });

            // Update local state immediately
            setTakenTests(prev => new Set([...prev, test.id]));
            const updatedResults = await getResultsByStudent(user.uid);
            setResults(updatedResults);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            // Fallback: download without cover page
            const link = document.createElement('a');
            link.href = test.pdfUrl;
            link.download = test.pdfFileName || `${test.title}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    const loadData = useCallback(async (testsData?: Test[]) => {
        if (!user?.studentClass || !user?.uid) return;

        try {
            // Only show loading on first load, not on updates
            if (tests.length === 0) setLoading(true);

            // If testsData is provided (from real-time update), use it directly
            if (testsData) {
                setTests(testsData);
            }
            const resultsData = await getResultsByStudent(user.uid);
            setResults(resultsData);

            // Derive taken tests directly from results - no extra API calls!
            const taken = new Set<string>(resultsData.map(r => r.testId));
            setTakenTests(taken);

            // Load active (in-progress) test sessions to show "Resume" buttons
            try {
                const activeIds = await getActiveTestSessionIds(user.uid);
                setResumableTests(activeIds);
            } catch (err) {
                console.error('[Quizy] Failed to load active sessions:', err);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.studentClass, user?.uid, tests.length]);



    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (!authLoading && user?.role !== 'student') {
            router.push('/dashboard/teacher');
            return;
        }
        if (user?.studentClass) {
            loadData();
        }
    }, [user, authLoading, router, loadData]);

    // Real-time listener for ALL test changes (new tests, status changes, etc.)
    useEffect(() => {
        if (!user?.studentClass) return;

        const testsRef = collection(db, COLLECTIONS.TESTS);
        const q = query(
            testsRef,
            where('targetClass', '==', user.studentClass),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Build the complete list of active tests from the snapshot
            const allTests: Test[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.isActive) {
                    allTests.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        scheduledStartTime: data.scheduledStartTime?.toDate() || undefined,
                        expiresAt: data.expiresAt?.toDate() || undefined
                    } as Test);
                }
            });

            // Update tests state immediately for real-time sync
            setTests(allTests);

            // Check for new tests to show notification
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const createdAt = data.createdAt?.toDate() || new Date();
                    const now = new Date();
                    const timeDiff = now.getTime() - createdAt.getTime();

                    // Show notification only for tests created in the last 30 seconds
                    if (timeDiff < 30000 && data.isActive) {
                        const newTest: Test = {
                            id: change.doc.id,
                            ...data,
                            createdAt,
                            scheduledStartTime: data.scheduledStartTime?.toDate() || undefined,
                            expiresAt: data.expiresAt?.toDate() || undefined
                        } as Test;
                        setNewTestNotification(newTest);

                        // Auto-hide notification after 10 seconds
                        setTimeout(() => setNewTestNotification(null), 10000);
                    }
                }
            });

            // Reload taken tests status
            loadData(allTests);
        });

        return () => unsubscribe();
    }, [user?.studentClass, user?.uid]);

    // Real-time listener for new results (reports)
    useEffect(() => {
        if (!user?.uid) return;

        const resultsRef = collection(db, COLLECTIONS.RESULTS);
        const q = query(
            resultsRef,
            where('studentId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allResults: TestResult[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allResults.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                } as TestResult);
            });

            // Update results state
            setResults(allResults);

            // Update takenTests immediately to prevent color flicker
            setTakenTests(new Set(allResults.map(r => r.testId)));

            // Check for new results (only after initial load)
            if (!isInitialLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const timestamp = data.timestamp?.toDate() || new Date();
                        const now = new Date();
                        const timeDiff = now.getTime() - timestamp.getTime();

                        // Show notification only for results added in the last 30 seconds
                        if (timeDiff < 30000) {
                            const newResult: TestResult = {
                                id: change.doc.id,
                                ...data,
                                timestamp
                            } as TestResult;

                            // Increment new reports count
                            setNewReportsCount(prev => prev + 1);

                            // Show popup notification
                            setNewReportNotification(newResult);

                            // Auto-hide notification after 10 seconds
                            setTimeout(() => setNewReportNotification(null), 10000);
                        }
                    }
                });
            }

            isInitialLoad = false;
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Real-time listener for notes (filtered by student's class)
    useEffect(() => {
        if (!user?.studentClass) return;

        const notesRef = collection(db, COLLECTIONS.NOTES);
        const q = query(
            notesRef,
            where('targetClass', '==', user.studentClass),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allNotes: SubjectNote[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allNotes.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                } as SubjectNote);
            });
            setNotes(allNotes);
        });

        return () => unsubscribe();
    }, [user?.studentClass]);

    // Real-time listener for homework (filtered by student's class)
    useEffect(() => {
        if (!user?.studentClass) return;
        const unsub = subscribeToHomework(user.studentClass, (data) => {
            setHomeworks(data);
            setHomeworkLoading(false);
        });
        return () => unsub();
    }, [user?.studentClass]);

    // Load homework completions for badge count
    useEffect(() => {
        if (!user?.uid) return;
        getStudentHomeworkCompletions(user.uid).then(setCompletedHomeworkIds).catch(console.error);
    }, [user?.uid]);

    // Request FCM token for push notifications
    useEffect(() => {
        if (user?.uid) {
            requestAndStoreFCMToken(user.uid).catch(console.error);
        }
    }, [user?.uid]);

    // Real-time listener for Mistake Bucket
    useEffect(() => {
        if (!user?.uid) return;
        const unsub1 = subscribeToMistakes(user.uid, setMistakeBucketItems);
        const unsub2 = subscribeToMasteredMistakes(user.uid, setMasteredCount);
        return () => { unsub1(); unsub2(); };
    }, [user?.uid]);

    // Real-time listener for coins (disabled)
    // useEffect(() => {
    //     if (!user?.uid) return;
    //     const unsub = subscribeToCoins(user.uid, setUserCoins);
    //     return () => unsub();
    // }, [user?.uid, coinsRefreshKey]);

    // Real-time listener for game stats (disabled)
    // useEffect(() => {
    //     if (!user?.uid) return;
    //     const unsub = subscribeToGameStats(user.uid, setGameStats);
    //     return () => unsub();
    // }, [user?.uid]);

    // Load Daily Quiz Challenge data
    useEffect(() => {
        if (!user?.uid || !user?.studentClass) return;
        setDailyQuizLoading(true);
        Promise.all([
            getDailyQuizQuestions(user.studentClass),
            hasCompletedDailyQuiz(user.uid),
            getActiveDailySession(user.uid, user.studentClass),
        ]).then(([questions, completed, session]) => {
            setDailyQuizQuestions(questions);
            setDailyQuizCompleted(completed);
            setDailyQuizSession(session);
        }).catch(err => {
            console.error('[Quizy] Daily quiz load error:', err);
        }).finally(() => {
            setDailyQuizLoading(false);
        });
    }, [user?.uid, user?.studentClass]);

    // Real-time listener for user profile changes (class change from profile settings)
    // When studentClass is changed in Firestore, this triggers refreshUser() which updates
    // the AuthContext user object, causing all dependent listeners to re-subscribe instantly
    useEffect(() => {
        if (!user?.uid) return;

        const userDocRef = firestoreDoc(db, COLLECTIONS.USERS, user.uid);
        let currentClass = user.studentClass;

        const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const newClass = data.studentClass;
                // Only refresh if the class has actually changed
                if (newClass && newClass !== currentClass) {
                    currentClass = newClass;
                    console.log('[Quizy] Class changed to', newClass, '- refreshing data...');
                    refreshUser();
                }
            }
        });

        return () => unsubscribe();
    }, [user?.uid, user?.studentClass, refreshUser]);

    // Real-time listener for notifications (filtered by student's class)
    useEffect(() => {
        if (!user?.studentClass || !user?.uid) return;

        const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
        const q = query(
            notificationsRef,
            where('targetClass', '==', user.studentClass),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allNotifications: Notification[] = [];
            const now = new Date();

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || new Date();
                const viewedAt = data.viewedBy?.[user.uid]?.toDate ? data.viewedBy[user.uid].toDate() : null;

                // Check if notification should be hidden (viewed more than 5 minutes ago)
                if (viewedAt) {
                    const timeSinceViewed = (now.getTime() - viewedAt.getTime()) / 1000 / 60; // minutes
                    if (timeSinceViewed > 5) {
                        return; // Skip this notification
                    }
                }

                // Only show notifications from last 24 hours
                const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / 1000 / 60 / 60;
                if (hoursSinceCreated > 24) {
                    return;
                }

                allNotifications.push({
                    id: doc.id,
                    ...data,
                    createdAt
                } as Notification);
            });

            setNotifications(allNotifications);
        });

        return () => unsubscribe();
    }, [user?.studentClass, user?.uid]);



    // Handle marking notification as viewed
    const handleViewNotification = async (notificationId: string) => {
        if (!user?.uid || viewedNotificationIds.has(notificationId)) return;

        try {
            await markNotificationAsViewed(notificationId, user.uid);
            setViewedNotificationIds(prev => new Set([...prev, notificationId]));
        } catch (error) {
            console.error('Error marking notification as viewed:', error);
        }
    };

    // Handle deleting notification completely
    const handleDismissNotification = async (notificationId: string) => {
        if (!user?.uid) return;

        try {
            await deleteNotification(notificationId);
            // Remove from local state immediately
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    };

    // Open notification in detail modal
    const handleOpenNotification = async (notification: Notification) => {
        setSelectedNotification(notification);
        setShowNotificationPanel(false);
        // Mark as viewed when opened
        if (user?.uid && !notification.viewedBy?.[user.uid]) {
            await handleViewNotification(notification.id);
        }
    };

    // Mark note as read
    const handleMarkNoteAsRead = (noteId: string) => {
        if (!user?.uid) return;

        const newReadIds = new Set([...readNoteIds, noteId]);
        setReadNoteIds(newReadIds);
        localStorage.setItem(`readNotes_${user.uid}`, JSON.stringify([...newReadIds]));
    };

    // Get unread notes count
    const unreadNotesCount = notes.filter(n => !readNoteIds.has(n.id)).length;

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleComingSoon = (feature: string) => {
        setComingSoonFeature(feature);
        setShowComingSoon(true);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <MotivationalLoader subtitle="Loading your dashboard..." />
            </div>
        );
    }

    // Compute average score for stats (uses helpers that respect teacher evaluations)
    const scorableForAvg = results.map(r => getResultScoreForAverage(r)).filter((v): v is number => v !== null);
    const averageScore = scorableForAvg.length > 0
        ? Math.round(scorableForAvg.reduce((a, b) => a + b, 0) / scorableForAvg.length)
        : 0;


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative flex">
            {/* Left Sidebar Navigation */}
            <StudentSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'reports') setNewReportsCount(0);
                }}
                userName={user.name}
                userClass={user.studentClass || 0}
                userPhotoURL={user.photoURL}
                notificationCount={notifications.filter(n => !n.viewedBy?.[user.uid]).length}
                newReportsCount={newReportsCount}
                unreadNotesCount={unreadNotesCount}
                pendingHomeworkCount={homeworks.filter(h => !completedHomeworkIds.has(h.id)).length}
                totalUnreadChat={totalUnreadCount}
                onNotificationClick={() => setShowNotificationPanel(!showNotificationPanel)}
                onSignOut={handleSignOut}
                onComingSoon={handleComingSoon}
                mistakeBucketCount={mistakeBucketItems.length}
                streak={user.currentStreak || 0}
            />

            {/* Main Content Area */}
            <div className="flex-1 min-h-screen relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {/* New Test Notification */}
            <AnimatePresence>
                {newTestNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        onClick={() => setNewTestNotification(null)}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-[#1650EB] to-[#1650EB] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-white animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold">New Test Available! 🎉</p>
                            <p className="text-sm text-white/90">{newTestNotification.title} - {newTestNotification.subject}</p>
                            <p className="text-xs text-white/70 mt-1">Click to dismiss</p>
                        </div>
                        <div className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Report Notification */}
            <AnimatePresence>
                {newReportNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        onClick={() => {
                            setNewReportNotification(null);
                            setActiveTab('reports');
                            setNewReportsCount(0);
                        }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white animate-bounce" />
                        </div>
                        <div>
                            <p className="font-bold">New Report Available! 📊</p>
                            <p className="text-sm text-white/90">
                                {newReportNotification.isPdfTest
                                    ? (newReportNotification.pdfEvaluated ? `${newReportNotification.testTitle} - Marks: ${newReportNotification.pdfMarksAwarded}/${newReportNotification.pdfMaxMarks}` : `${newReportNotification.testTitle} - Awaiting evaluation`)
                                    : `${newReportNotification.testTitle} - Score: ${newReportNotification.score}/${newReportNotification.totalQuestions} (${newReportNotification.totalQuestions > 0 ? Math.round((newReportNotification.score / newReportNotification.totalQuestions) * 100) : 0}%)`}
                            </p>
                            <p className="text-xs text-white/70 mt-1">Click to view</p>
                        </div>
                        <div className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Panel Dropdown (repositioned for sidebar layout) */}
            <AnimatePresence>
                {showNotificationPanel && (
                    <>
                        {/* Backdrop to close */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[55]" 
                            onClick={() => setShowNotificationPanel(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="fixed right-4 top-16 lg:top-4 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[60]"
                                    >
                                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Bell className="w-4 h-4" /> Notifications
                                            </h3>
                                            <button
                                                onClick={() => setShowNotificationPanel(false)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                            >
                                                <X className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center">
                                                    <Bell className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notification) => {
                                                    const isNew = !notification.viewedBy?.[user.uid];
                                                    return (
                                                        <div
                                                            key={notification.id}
                                                            className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isNew ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                                            onClick={() => handleOpenNotification(notification)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notification.type === 'test' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                                                    notification.type === 'note' ? 'bg-green-100 dark:bg-green-900/30' :
                                                                        'bg-amber-100 dark:bg-amber-900/30'
                                                                    }`}>
                                                                    {notification.type === 'test' ? (
                                                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                    ) : notification.type === 'note' ? (
                                                                        <BookMarked className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                                    ) : (
                                                                        <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{notification.title}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{notification.message}</p>
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                        {new Date(notification.createdAt).toLocaleString('en-IN', {
                                                                            hour: '2-digit', minute: '2-digit',
                                                                            day: '2-digit', month: 'short'
                                                                        })}
                                                                        {notification.createdByName && ` • ${notification.createdByName}`}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDismissNotification(notification.id);
                                                                    }}
                                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                    title="Dismiss"
                                                                >
                                                                    <X className="w-3 h-3 text-gray-400" />
                                                                </button>
                                                            </div>
                                                            {isNew && (
                                                                <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">New</span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {notifications.length > 0 && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Notifications auto-dismiss 5 min after viewing
                                                </p>
                                            </div>
                                        )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-20 lg:pt-24 pb-24 lg:pb-8">
                {/* Welcome Section - Only shown on Tests tab */}
                {activeTab === 'tests' && (
                <div className="mb-5">
                    {/* Welcome CTA Banner — Inspired by reference */}
                    {(() => {
                        const hour = currentTime ? currentTime.getHours() : 18;
                        // 4 periods: morning (5-11), afternoon (12-16), evening (17-19), night (20-4)
                        const isMorning = hour >= 5 && hour < 12;
                        const isAfternoon = hour >= 12 && hour < 17;
                        const isEvening = hour >= 17 && hour < 20;
                        // night: hour >= 20 || hour < 5
                        const bannerGradient = isMorning
                            ? 'linear-gradient(135deg, #be185d 0%, #e11d48 15%, #f97316 40%, #f59e0b 65%, #38bdf8 100%)'
                            : isAfternoon
                            ? 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 30%, #38bdf8 55%, #facc15 100%)'
                            : isEvening
                            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #5b21b6 60%, #7c3aed 100%)'
                            : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #1e293b 60%, #0f172a 100%)';
                        const nameGradient = isMorning
                            ? 'linear-gradient(135deg, #ffffff, #fef3c7, #ffffff)'
                            : isAfternoon
                            ? 'linear-gradient(135deg, #ffffff, #e0f2fe, #ffffff)'
                            : isEvening
                            ? 'linear-gradient(135deg, #67e8f9, #a5f3fc, #ffffff)'
                            : 'linear-gradient(135deg, #34d399, #6ee7b7, #a7f3d0)';
                        const accentColor = isMorning ? '#fb923c' : isAfternoon ? '#38bdf8' : isEvening ? '#a78bfa' : '#34d399';
                        return (
                    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 pb-5 sm:pb-6" style={{ background: bannerGradient }}>
                        <style dangerouslySetInnerHTML={{ __html: `
                            @keyframes sparkle-twinkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
                            @keyframes dot-pulse { 0%,100%{opacity:0.08} 50%{opacity:0.15} }
                            @keyframes wave-flow { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                            .sparkle-a{animation:sparkle-twinkle 2s ease-in-out infinite}
                            .sparkle-b{animation:sparkle-twinkle 3s ease-in-out infinite 0.7s}
                            .sparkle-c{animation:sparkle-twinkle 2.5s ease-in-out infinite 1.2s}
                            .sparkle-d{animation:sparkle-twinkle 3.5s ease-in-out infinite 0.3s}
                            .sparkle-e{animation:sparkle-twinkle 2.8s ease-in-out infinite 1.8s}
                        ` }} />

                        {/* Background decorative elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {/* Large circle behind mascot area */}
                            <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
                            <div className="absolute right-[5%] top-[20%] w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />

                            {/* Dot grid pattern */}
                            <div className="absolute right-[25%] top-[15%] w-20 h-16 sm:w-24 sm:h-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '8px 8px', animation: 'dot-pulse 4s ease-in-out infinite' }} />

                            {/* Sparkle stars */}
                            <div className="sparkle-a absolute top-4 left-[8%] text-yellow-300/70 text-xs">✦</div>
                            <div className="sparkle-b absolute top-6 right-[35%] text-white/40 text-[10px]">✦</div>
                            <div className="sparkle-c absolute bottom-12 right-[20%] text-white/30 text-xs">✦</div>
                            <div className="sparkle-d absolute top-[35%] right-[45%] text-yellow-200/40 text-[8px]">✧</div>
                            <div className="sparkle-e absolute bottom-8 left-[30%] text-white/20 text-[10px]">✦</div>

                            {/* Curved wave line at bottom */}
                            <svg className="absolute bottom-0 left-0 w-full h-12 sm:h-16" viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ opacity: 0.08 }}>
                                <path d="M0,40 C200,10 400,50 600,30 C800,10 1000,50 1200,25" stroke="white" strokeWidth="1.5" fill="none" />
                                <path d="M0,50 C200,25 400,55 600,40 C800,20 1000,55 1200,35" stroke={accentColor} strokeWidth="1" fill="none" style={{ opacity: 0.5 }} />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="relative flex items-start justify-between gap-4">
                            {/* Left: Text content */}
                            <div className="flex-1 min-w-0 z-10">
                                {/* Greeting */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-lg sm:text-xl">
                                        {!currentTime ? '👋' : isMorning ? '🌅' : isAfternoon ? '☀️' : isEvening ? '🌙' : '🌌'}
                                    </span>
                                    <span className="text-white/70 text-sm sm:text-base font-medium">
                                        {!currentTime ? 'Welcome' : isMorning ? 'Good Morning' : isAfternoon ? 'Good Afternoon' : isEvening ? 'Good Evening' : 'Good Night'}
                                    </span>
                                </div>

                                {/* Name — horizontal on desktop, stacked on mobile */}
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
                                    Welcome back,{' '}
                                    <span className="font-extrabold text-white">
                                        {user.name}!
                                    </span> 👋
                                </h2>

                                {/* Motivational subtitle */}
                                <p className="text-white/50 text-sm mt-2 leading-relaxed hidden sm:block">
                                    Great to see you again. Let&apos;s continue your <span style={{ color: accentColor }} className="font-semibold">learning journey</span>.
                                </p>

                                {/* Keep going card — desktop only */}
                                {(() => {
                                    const thoughts = [
                                        { icon: '📖', title: 'Keep going!', sub: 'Consistency today, success tomorrow.' },
                                        { icon: '🧠', title: 'Stay curious!', sub: 'Every question leads to growth.' },
                                        { icon: '🎯', title: 'Stay focused!', sub: 'Small steps lead to big wins.' },
                                        { icon: '💪', title: 'You got this!', sub: 'Believe in your amazing potential.' },
                                        { icon: '🌟', title: 'Shine bright!', sub: 'Your effort will always pay off.' },
                                        { icon: '🔥', title: "You're on fire!", sub: 'Keep the momentum going strong.' },
                                        { icon: '📚', title: 'Learn daily!', sub: 'Knowledge is your greatest superpower.' },
                                        { icon: '🏆', title: 'Be a champion!', sub: 'Winners never quit, quitters never win.' },
                                        { icon: '⚡', title: 'Power up!', sub: 'Every lesson makes you stronger.' },
                                        { icon: '🌱', title: 'Grow daily!', sub: 'Progress matters more than perfection.' },
                                        { icon: '🚀', title: 'Aim higher!', sub: 'The sky is never the limit.' },
                                        { icon: '💡', title: 'Think smart!', sub: 'Understanding beats memorizing every time.' },
                                        { icon: '🎓', title: 'Dream big!', sub: 'Education opens doors to everything.' },
                                        { icon: '✨', title: 'Be brilliant!', sub: 'Your hard work creates magic.' },
                                        { icon: '🧩', title: 'Solve it!', sub: 'Every problem has a solution.' },
                                        { icon: '📝', title: 'Practice more!', sub: 'Repetition is the mother of mastery.' },
                                        { icon: '🎪', title: 'Have fun!', sub: 'Learning is an exciting adventure.' },
                                        { icon: '🌈', title: 'Stay positive!', sub: 'Great things take time and patience.' },
                                        { icon: '🔑', title: 'Unlock potential!', sub: 'You are capable of amazing things.' },
                                        { icon: '🎵', title: 'Find your rhythm!', sub: 'Steady effort creates lasting results.' },
                                        { icon: '🛤️', title: 'Trust the process!', sub: 'Every expert was once a beginner.' },
                                        { icon: '💎', title: 'Be unstoppable!', sub: 'Pressure creates diamonds, keep pushing.' },
                                        { icon: '🌊', title: 'Ride the wave!', sub: 'Embrace challenges, they build character.' },
                                        { icon: '🏅', title: 'Earn your badge!', sub: 'Discipline today, freedom tomorrow always.' },
                                        { icon: '🦅', title: 'Soar high!', sub: 'Your potential is limitless and infinite.' },
                                    ];
                                    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
                                    const t = thoughts[dayOfYear % thoughts.length];
                                    return (
                                <div className="mt-3 sm:mt-4 hidden sm:inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.08]">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}22` }}>
                                        <span className="text-base">{t.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-xs sm:text-sm font-bold">{t.title}</p>
                                        <p className="text-white/45 text-[10px] sm:text-xs">{t.sub}</p>
                                    </div>
                                </div>
                                    );
                                })()}


                            </div>

                            {/* Right: Student Mascot */}
                            <div className="shrink-0 relative hidden sm:block" style={{ marginRight: '-32px', marginBottom: '-48px', marginTop: '-40px' }}>
                                <img 
                                    src="/images/student-mascot.png" 
                                    alt="Student mascot" 
                                    className="w-64 h-64 sm:w-80 sm:h-80 object-contain relative z-10"
                                    style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.35))' }}
                                />
                            </div>
                            {/* Mobile mascot — smaller, overlapping right */}
                            <div className="shrink-0 relative sm:hidden" style={{ marginRight: '-24px', marginBottom: '-40px', marginTop: '-32px' }}>
                                <img 
                                    src="/images/student-mascot.png" 
                                    alt="Student mascot" 
                                    className="w-48 h-48 object-contain relative z-10"
                                    style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}
                                />
                            </div>
                        </div>
                    </div>
                        );
                    })()}
                </div>
                )}


                {/* Daily Quiz Challenge — only shown when loaded and not completed */}
                {activeTab === 'tests' && !dailyQuizLoading && !dailyQuizCompleted && (
                    <DailyQuizCard
                        questions={dailyQuizQuestions}
                        completed={dailyQuizCompleted}
                        loading={dailyQuizLoading}
                        user={user}
                        streak={user.currentStreak || 0}
                        longestStreak={user.longestStreak || 0}
                        existingSession={dailyQuizSession}
                        onComplete={(score, total) => {
                            setDailyQuizCompleted(true);
                            setDailyQuizScore({ score, total });
                            refreshUser();
                            // Auto-hide the score toast after 4 seconds
                            setTimeout(() => setDailyQuizScore(null), 4000);
                        }}
                    />
                )}

                {/* Daily Quiz Score Toast — shown briefly after completion */}
                {activeTab === 'tests' && dailyQuizScore && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="mb-5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg shadow-green-500/20"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎉</span>
                                <div>
                                    <p className="font-bold">Daily Challenge Complete!</p>
                                    <p className="text-white/80 text-sm">Score: {dailyQuizScore.score}/{dailyQuizScore.total} • 🔥 Streak updated!</p>
                                </div>
                            </div>
                            <button onClick={() => setDailyQuizScore(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Available Tests Tab */}
                {activeTab === 'tests' && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                                    <rect x="4" y="4" width="40" height="40" rx="12" fill="#eff6ff"/>
                                    <rect x="8" y="8" width="32" height="32" rx="8" fill="#dbeafe"/>
                                    <rect x="14" y="12" width="20" height="24" rx="3" fill="#fff" stroke="#3b82f6" strokeWidth="1.2"/>
                                    <path d="M18 18h12M18 22h8M18 26h10" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
                                    <circle cx="33" cy="16" r="5" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1"/>
                                    <path d="M31 16l1.5 1.5 3-3" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    Available Tests
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                                    Choose a test and challenge yourself
                                </p>
                            </div>
                        </div>

                        <div className="mb-5 relative">
                            {/* Button Row: Filters + Daily Challenge side by side */}
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={() => {
                                        setShowFilters(!showFilters);
                                        setShowDailyHistory(false);
                                        if (!showFilters) setFilterTouched(new Set());
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                                        showFilters || filterSubject !== 'All' || filterType !== 'All' || filterStatus !== 'All'
                                            ? 'bg-[#1650EB] text-white shadow-lg shadow-[#1650EB]/20 border-[#1650EB]'
                                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 border-gray-200 dark:border-gray-800 shadow-sm'
                                    }`}
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Filters
                                    {(filterSubject !== 'All' || filterType !== 'All' || filterStatus !== 'All') && (
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    )}
                                </button>

                                <button
                                    onClick={async () => {
                                        setShowDailyHistory(!showDailyHistory);
                                        setShowFilters(false);
                                        if (!showDailyHistory && dailyHistory.length === 0) {
                                            setDailyHistoryLoading(true);
                                            try {
                                                const history = await getDailyQuizHistory(user.uid);
                                                setDailyHistory(history);
                                            } catch (e) { console.error(e); }
                                            setDailyHistoryLoading(false);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                                        showDailyHistory
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 border-amber-500'
                                            : 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-sm'
                                    }`}
                                >
                                    🔥 Daily Challenge
                                    {dailyHistory.length > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${showDailyHistory ? 'bg-white/25 text-white' : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200'}`}>
                                            {dailyHistory.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Filters Popup — floating overlay */}
                            <AnimatePresence>
                                {showFilters && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[28px] border border-gray-200/80 dark:border-gray-800/80 p-5 space-y-4 shadow-2xl shadow-black/5"
                                        >
                                            {/* Subject Filter */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Subject</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['All', ...Array.from(new Set(tests.map(t => t.subject)))].map(subject => (
                                                        <button
                                                            key={subject}
                                                            onClick={() => {
                                                                setFilterSubject(subject);
                                                                setFilterTouched(prev => {
                                                                    const next = new Set(prev);
                                                                    next.add('subject');
                                                                    return next;
                                                                });
                                                                setTimeout(() => setShowFilters(false), 200);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                filterSubject === subject
                                                                    ? 'bg-[#1650EB] text-white shadow-sm'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {subject}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Type Filter */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {(['All', 'Quiz', 'PDF'] as const).map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => {
                                                                setFilterType(type);
                                                                setFilterTouched(prev => {
                                                                    const next = new Set(prev);
                                                                    next.add('type');
                                                                    return next;
                                                                });
                                                                setTimeout(() => setShowFilters(false), 200);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                                                filterType === type
                                                                    ? type === 'PDF' ? 'bg-purple-500 text-white shadow-sm'
                                                                        : type === 'Quiz' ? 'bg-emerald-500 text-white shadow-sm'
                                                                        : 'bg-[#1650EB] text-white shadow-sm'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {type === 'PDF' && '📄'}
                                                            {type === 'Quiz' && '📝'}
                                                            {type === 'All' && '📋'}
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Status Filter */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {(['All', 'Pending', 'Completed', 'Expired'] as const).map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => {
                                                                setFilterStatus(status);
                                                                setFilterTouched(prev => {
                                                                    const next = new Set(prev);
                                                                    next.add('status');
                                                                    return next;
                                                                });
                                                                setTimeout(() => setShowFilters(false), 200);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                                                filterStatus === status
                                                                    ? status === 'Completed' ? 'bg-green-500 text-white shadow-sm'
                                                                        : status === 'Expired' ? 'bg-red-500 text-white shadow-sm'
                                                                        : status === 'Pending' ? 'bg-amber-500 text-white shadow-sm'
                                                                        : 'bg-[#1650EB] text-white shadow-sm'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {status === 'Completed' && '✅'}
                                                            {status === 'Pending' && '⏳'}
                                                            {status === 'Expired' && '⏰'}
                                                            {status === 'All' && '📋'}
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Clear Filters */}
                                            {(filterSubject !== 'All' || filterType !== 'All' || filterStatus !== 'All') && (
                                                <button
                                                    onClick={() => { setFilterSubject('All'); setFilterType('All'); setFilterStatus('All'); setFilterTouched(new Set()); }}
                                                    className="text-xs text-[#1650EB] hover:text-[#1243c7] font-medium flex items-center gap-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Clear all filters
                                                </button>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>

                            {/* Daily Challenge History — Modal Popup */}
                            <AnimatePresence>
                                {showDailyHistory && (
                                    <>
                                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]" onClick={() => setShowDailyHistory(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[56] max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-5 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    🏆 Challenge History
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                        🔥 {user.currentStreak || 0} streak
                                                    </span>
                                                    <span className="text-xs text-gray-400">Best: {user.longestStreak || 0}</span>
                                                    <button onClick={() => setShowDailyHistory(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                                        <X className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                {dailyHistoryLoading ? (
                                                    <div className="text-center py-6">
                                                        <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto" />
                                                    </div>
                                                ) : dailyHistory.length === 0 ? (
                                                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-6">No challenges completed yet. Start today!</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {dailyHistory.map((entry, i) => {
                                                            const pct = Math.round((entry.score / entry.totalQuestions) * 100);
                                                            return (
                                                                <div key={entry.date} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📝'}</span>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                                {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                {entry.totalQuestions} questions
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                                            {entry.score}/{entry.totalQuestions}
                                                                        </span>
                                                                        <p className="text-xs text-gray-400">{pct}%</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {(() => {
                            // Apply filters
                            const filteredTests = tests.filter(test => {
                                // Subject filter
                                if (filterSubject !== 'All' && test.subject !== filterSubject) return false;
                                // Type filter
                                if (filterType === 'Quiz' && test.isPdfTest) return false;
                                if (filterType === 'PDF' && !test.isPdfTest) return false;
                                // Status filter
                                const hasTaken = takenTests.has(test.id);
                                const isExpiredTest = !hasTaken && test.expiresAt && new Date(test.expiresAt) < new Date();
                                if (filterStatus === 'Completed' && !hasTaken) return false;
                                if (filterStatus === 'Pending' && (hasTaken || isExpiredTest)) return false;
                                if (filterStatus === 'Expired' && !isExpiredTest) return false;
                                return true;
                            });

                            return (
                                <>
                        {/* Active filter summary */}
                        {(filterSubject !== 'All' || filterType !== 'All' || filterStatus !== 'All') && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                Showing {filteredTests.length} of {tests.length} tests
                                {filterSubject !== 'All' && <span className="font-medium text-[#1650EB]"> • {filterSubject}</span>}
                                {filterType !== 'All' && <span className="font-medium text-[#1650EB]"> • {filterType === 'PDF' ? 'PDF Papers' : 'Quizzes'}</span>}
                                {filterStatus !== 'All' && <span className="font-medium text-[#1650EB]"> • {filterStatus}</span>}
                            </p>
                        )}

                        {loading && tests.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
                            </div>
                        ) : filteredTests.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">
                                    {tests.length === 0
                                        ? 'No tests available for your class yet. Check back later!'
                                        : 'No tests match your filters. Try adjusting the filters above.'}
                                </p>
                                {tests.length > 0 && (
                                    <button
                                        onClick={() => { setFilterSubject('All'); setFilterType('All'); setFilterStatus('All'); }}
                                        className="mt-3 text-sm text-[#1650EB] hover:text-[#1243c7] font-medium"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredTests.map((test, index) => {
                                    const hasTaken = takenTests.has(test.id);
                                    const hasActiveSession = resumableTests.has(test.id);
                                    const result = results.find(r => r.testId === test.id);
                                    const isScheduled = test.scheduledStartTime && new Date(test.scheduledStartTime) > new Date();
                                    const isExpired = !hasTaken && test.expiresAt && new Date(test.expiresAt) < new Date();
                                    const countdown = countdowns[test.id];
                                    const isExpanded = expandedTestId === test.id;
                                    const isPdf = test.isPdfTest;
                                    const pdfResult = isPdf ? results.find(r => r.testId === test.id && r.isPdfTest) : null;
                                    const scorePercent = hasTaken && result
                                        ? getResultScorePercent(result)
                                        : null;

                                    // Subject icon config
                                    const subjectName = test.isCombinedSubject ? 'Combined' : (test.subject || 'General');
                                    const subjectIconSvgs: Record<string, { svg: React.ReactNode; border: string }> = {
                                        'Mathematics': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#eff6ff"/><rect x="10" y="10" width="24" height="24" rx="6" fill="#fff" stroke="#3b82f6" strokeWidth="1.3"/><text x="17" y="23" fill="#3b82f6" fontSize="8" fontWeight="bold">÷</text><text x="25" y="23" fill="#3b82f6" fontSize="8" fontWeight="bold">×</text><text x="17" y="33" fill="#3b82f6" fontSize="8" fontWeight="bold">+</text><text x="25" y="33" fill="#3b82f6" fontSize="8" fontWeight="bold">−</text></svg>
                                        ), border: 'border-blue-100 dark:border-blue-900/40' },
                                        'Science': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#ecfdf5"/><path d="M17 8v12l-5 10a2.5 2.5 0 002.2 3.5h15.6a2.5 2.5 0 002.2-3.5l-5-10V8" stroke="#10b981" strokeWidth="1.3" fill="none"/><line x1="16" y1="8" x2="28" y2="8" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round"/><circle cx="20" cy="28" r="1.5" fill="#10b981" opacity="0.4"/><circle cx="25" cy="26" r="1" fill="#10b981" opacity="0.3"/></svg>
                                        ), border: 'border-emerald-100 dark:border-emerald-900/40' },
                                        'Hindi': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#fef2f2"/><rect x="10" y="10" width="24" height="24" rx="6" fill="#fff" stroke="#ef4444" strokeWidth="1.3"/><text x="22" y="29" textAnchor="middle" fill="#ef4444" fontSize="15" fontWeight="bold" fontFamily="serif">अ</text></svg>
                                        ), border: 'border-red-100 dark:border-red-900/40' },
                                        'English': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#faf5ff"/><rect x="10" y="10" width="24" height="24" rx="6" fill="#fff" stroke="#8b5cf6" strokeWidth="1.3"/><text x="22" y="29" textAnchor="middle" fill="#8b5cf6" fontSize="15" fontWeight="bold">A</text></svg>
                                        ), border: 'border-purple-100 dark:border-purple-900/40' },
                                        'Social Science': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#f0fdf4"/><circle cx="22" cy="22" r="10" stroke="#22c55e" strokeWidth="1.3" fill="none"/><ellipse cx="22" cy="22" rx="10" ry="4" stroke="#22c55e" strokeWidth="0.8" opacity="0.5"/><line x1="22" y1="12" x2="22" y2="32" stroke="#22c55e" strokeWidth="0.8" opacity="0.5"/></svg>
                                        ), border: 'border-green-100 dark:border-green-900/40' },
                                        'Combined': { svg: (
                                            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#f3e8ff"/><rect x="10" y="9" width="14" height="18" rx="3" fill="#fff" stroke="#a855f7" strokeWidth="1.3"/><rect x="20" y="16" width="14" height="18" rx="3" fill="#fff" stroke="#a855f7" strokeWidth="1.3"/><path d="M13 15h8M13 19h5" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.5"/><path d="M23 22h8M23 26h5" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.5"/></svg>
                                        ), border: 'border-purple-100 dark:border-purple-900/40' },
                                    };
                                    const pdfIconSvg = (
                                        <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#f8fafc"/><rect x="12" y="8" width="20" height="28" rx="3" fill="#fff" stroke="#94a3b8" strokeWidth="1.3"/><path d="M16 14h12M16 19h8M16 24h10M16 29h6" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" opacity="0.4"/><path d="M26 8v6h6" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                                    );
                                    const iconSvgConfig = subjectIconSvgs[subjectName] || { svg: (
                                        <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect width="44" height="44" rx="14" fill="#f9fafb"/><circle cx="22" cy="18" r="6" stroke="#6b7280" strokeWidth="1.3" fill="none"/><text x="22" y="21" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="bold">?</text><circle cx="22" cy="32" r="1.5" fill="#6b7280" opacity="0.4"/></svg>
                                    ), border: 'border-gray-100 dark:border-gray-800' };

                                    // Total marks
                                    const totalMarks = test.marksPerQuestion && test.questionCount ? test.marksPerQuestion * test.questionCount : null;

                                    return (
                                        <div key={test.id} className={`bg-white dark:bg-gray-900 rounded-[24px] border ${isExpanded ? 'border-[#1650EB]/20 ring-1 ring-[#1650EB]/5 shadow-lg shadow-[#1650EB]/5' : `${iconSvgConfig.border} hover:shadow-md`} overflow-hidden ${isExpired ? 'opacity-55' : ''} transition-all duration-200`}>
                                            {/* Main Row */}
                                            <div
                                                className="flex items-center gap-3.5 px-4 py-4 cursor-pointer"
                                                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                                            >
                                                {/* Subject Icon — SVG Illustration */}
                                                <div className="w-[52px] h-[52px] shrink-0">
                                                    {isPdf ? pdfIconSvg : iconSvgConfig.svg}
                                                </div>

                                                {/* Center: Title + Meta + Status */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[15px] text-gray-900 dark:text-white line-clamp-2 tracking-tight">
                                                        {test.title}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {isPdf ? 'PDF Test' : (
                                                            <>{test.questionCount || '?'} Questions · {test.duration || '?'} min</>
                                                        )}
                                                    </p>
                                                    {totalMarks && !isPdf && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{totalMarks} marks</p>
                                                    )}
                                                    {/* Status badge */}
                                                    <div className="mt-1.5">
                                                        {hasTaken ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Completed
                                                            </span>
                                                        ) : isExpired ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
                                                            </span>
                                                        ) : isScheduled ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Upcoming
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Score Pill — only shown for completed tests */}
                                                <div className="shrink-0">
                                                    {hasTaken && result && !isPdf ? (
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                            scorePercent !== null && scorePercent >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                                                            scorePercent !== null && scorePercent >= 40 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' :
                                                            'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
                                                        }`}>
                                                            {scorePercent !== null ? getResultScoreFraction(result) : '—'}
                                                        </span>
                                                    ) : hasTaken && isPdf && pdfResult ? (
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                            pdfResult.pdfEvaluated ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                                                        }`}>
                                                            {pdfResult.pdfEvaluated ? `${pdfResult.pdfMarksAwarded}/${pdfResult.pdfMaxMarks}` : 'Awaiting'}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* Action Button */}
                                                <div className="shrink-0">
                                                    {hasTaken ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExpandedTestId(expandedTestId === test.id ? null : test.id); }}
                                                            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-gradient-to-r from-[#1650EB] to-[#4f5bd5] text-white hover:shadow-lg hover:shadow-[#1650EB]/20 transition-all active:scale-95"
                                                        >
                                                            View Result <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    ) : isExpired ? (
                                                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-500 border border-red-100 dark:border-red-900/40">
                                                            Missed
                                                        </span>
                                                    ) : isScheduled ? (
                                                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                                                            Upcoming
                                                        </span>
                                                    ) : isPdf ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedPdfTest(test); }}
                                                            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-gradient-to-r from-[#1650EB] to-[#4f5bd5] text-white hover:shadow-lg hover:shadow-[#1650EB]/20 transition-all active:scale-95"
                                                        >
                                                            Start <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            href={`/test/${test.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full text-white hover:shadow-lg transition-all active:scale-95 ${hasActiveSession
                                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-orange-500/20'
                                                                : 'bg-gradient-to-r from-[#1650EB] to-[#4f5bd5] hover:shadow-[#1650EB]/20'
                                                            }`}
                                                        >
                                                            {hasActiveSession ? 'Resume' : 'Start'} <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    )}
                                                </div>

                                                {/* Expand Chevron */}
                                                <ChevronDown className={`w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Expanded Dropdown Details */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 pb-4 pt-2 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100/60 dark:border-gray-800/60">
                                                            {hasTaken && result ? (
                                                                /* ── Result View (like My Reports) ── */
                                                                <div>
                                                                    {/* Score Summary Header */}
                                                                    <div className="flex items-center gap-4 mb-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                                                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white ${
                                                                            scorePercent !== null && scorePercent >= 70 ? 'bg-emerald-500' :
                                                                            scorePercent !== null && scorePercent >= 40 ? 'bg-amber-500' :
                                                                            'bg-red-500'
                                                                        }`}>
                                                                            {scorePercent !== null ? `${scorePercent}%` : '—'}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                                {(() => {
                                                                                    if (result.isPdfTest) return result.pdfEvaluated ? `${result.pdfMarksAwarded}/${result.pdfMaxMarks} marks` : 'Awaiting evaluation';
                                                                                    if (result.evaluationStatus === 'pending' || result.evaluationStatus === 'under_review') return 'Awaiting evaluation';
                                                                                    if (result.evaluationStatus === 'evaluated') return 'Evaluated — coming soon';
                                                                                    return `${getResultScoreFraction(result)} ${result.evaluationStatus === 'published' && (result.evaluationMode === 'manual' || result.evaluationMode === 'hybrid') ? 'marks' : 'correct'}`;
                                                                                })()}
                                                                            </p>
                                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                                {result.subject} • Completed {result.timestamp ? new Date(result.timestamp instanceof Date ? result.timestamp : (result.timestamp as {toDate: () => Date}).toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Score Progress Bar */}
                                                                    {scorePercent !== null && (
                                                                        <div className="mb-3">
                                                                            <div className="flex items-center justify-between text-xs mb-1">
                                                                                <span className="text-gray-500">Score</span>
                                                                                <span className={`font-bold ${scorePercent >= 70 ? 'text-emerald-600' : scorePercent >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{scorePercent}%</span>
                                                                            </div>
                                                                            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-500 ${scorePercent >= 70 ? 'bg-emerald-500' : scorePercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                                    style={{ width: `${scorePercent}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* PDF result / remarks */}
                                                                    {isPdf && pdfResult && (
                                                                        <div className="mb-3 space-y-2">
                                                                            {pdfResult.pdfEvaluated && pdfResult.pdfTeacherRemarks && (
                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                                                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">Teacher Remarks:</p>
                                                                                    <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">&quot;{pdfResult.pdfTeacherRemarks}&quot;</p>
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                onClick={() => downloadPdfTest(test)}
                                                                                className="flex items-center justify-center gap-2 w-full py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5" /> Re-download PDF
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* View Full Report Button */}
                                                                    <button
                                                                        onClick={() => setSelectedReport(result)}
                                                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1650EB] text-white rounded-xl font-medium text-sm hover:bg-[#1243c7] transition-colors"
                                                                    >
                                                                        <FileText className="w-4 h-4" /> View Full Report
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                /* ── Non-completed: show test info ── */
                                                                <>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                                                {/* Subject */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Subject</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                                                        {test.isCombinedSubject ? '📚 Combined' : test.subject}
                                                                    </p>
                                                                    {test.isCombinedSubject && test.combinedSubjects && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">{test.combinedSubjects.join(', ')}</p>
                                                                    )}
                                                                </div>
                                                                {/* Questions / Type */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Format</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                                                        {isPdf ? '📄 PDF Paper' : `${test.questionCount || '?'} Questions`}
                                                                    </p>
                                                                    {test.difficultyLevel && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">Difficulty: {test.difficultyLevel}</p>
                                                                    )}
                                                                </div>
                                                                {/* Duration */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Duration</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                                                        {test.duration ? `${test.duration} min` : 'No limit'}
                                                                    </p>
                                                                    {test.marksPerQuestion && test.questionCount && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">{test.marksPerQuestion * test.questionCount} marks</p>
                                                                    )}
                                                                </div>
                                                                {/* Status */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Status</p>
                                                                    {isExpired ? (
                                                                        <p className="text-sm font-medium text-red-500 mt-0.5">⏰ Expired</p>
                                                                    ) : isScheduled ? (
                                                                        <p className="text-sm font-medium text-amber-500 mt-0.5">⏳ Scheduled</p>
                                                                    ) : (
                                                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">Ready</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Countdown Timer */}
                                                            {isScheduled && countdown && (
                                                                <div className="flex items-center justify-between p-3 mb-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                                                    <div className="flex items-center gap-2">
                                                                        <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
                                                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Starts in:</span>
                                                                    </div>
                                                                    <span className="text-base font-bold text-amber-600 font-mono">{countdown}</span>
                                                                </div>
                                                            )}

                                                            {/* Expiry Warning */}
                                                            {test.expiresAt && !hasTaken && !isExpired && (
                                                                <div className="flex items-center justify-between p-3 mb-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                                    <div className="flex items-center gap-2">
                                                                        <Hourglass className="w-4 h-4 text-red-600 animate-pulse" />
                                                                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Expires:</span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-red-600">
                                                                        {new Date(test.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Action buttons row */}
                                                            <div className="flex items-center gap-2">
                                                                {!hasTaken && !isExpired && !isScheduled && (
                                                                    isPdf ? (
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <button
                                                                                onClick={() => setSelectedPdfTest(test)}
                                                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-colors"
                                                                            >
                                                                                <ExternalLink className="w-4 h-4" /> View PDF
                                                                            </button>
                                                                            {test.pdfUrl && (
                                                                                <button
                                                                                    onClick={() => downloadPdfTest(test)}
                                                                                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-xl font-medium text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                                                >
                                                                                    <Download className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <Link
                                                                            href={`/test/${test.id}`}
                                                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-medium text-sm transition-colors ${hasActiveSession
                                                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                                                                                : 'bg-[#1650EB] hover:bg-[#1243c7]'
                                                                            }`}
                                                                        >
                                                                            {hasActiveSession ? '🔄 Resume Test' : 'Start Test'} <ArrowRight className="w-4 h-4" />
                                                                        </Link>
                                                                    )
                                                                )}
                                                            </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* My Reports Tab */}
                {activeTab === 'reports' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        {/* Reports Header */}
                        {(() => {
                            const allSubjects = [...new Set(results.map(r => r.subject))];
                            const filteredResults = reportFilterSubject === 'All' ? results : results.filter(r => r.subject === reportFilterSubject);

                            // Combined score calculation (uses helpers that respect teacher evaluations)
                            const scorableForCombined = filteredResults.map(r => getResultScoreForAverage(r)).filter((v): v is number => v !== null);
                            const combinedScore = scorableForCombined.length > 0
                                ? Math.round(scorableForCombined.reduce((a, b) => a + b, 0) / scorableForCombined.length)
                                : 0;

                            // Circular progress values
                            const circleRadius = 36;
                            const circleCircumference = 2 * Math.PI * circleRadius;
                            const circleOffset = circleCircumference - (combinedScore / 100) * circleCircumference;
                            const scoreColor = combinedScore >= 70 ? '#22c55e' : combinedScore >= 40 ? '#f59e0b' : '#ef4444';

                            // Subject color mapping for illustrations
                            const subjectStyles: Record<string, { gradient: string; iconBg: string; iconColor: string; badgeBg: string; badgeText: string; letter: string }> = {
                                'Mathematics': { gradient: 'from-blue-400 to-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-100 dark:bg-blue-900/40', badgeText: 'text-blue-700 dark:text-blue-300', letter: '∑' },
                                'Science': { gradient: 'from-emerald-400 to-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40', badgeText: 'text-emerald-700 dark:text-emerald-300', letter: '⚗' },
                                'Hindi': { gradient: 'from-orange-400 to-red-500', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-100 dark:bg-orange-900/40', badgeText: 'text-orange-700 dark:text-orange-300', letter: 'अ' },
                                'English': { gradient: 'from-purple-400 to-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-100 dark:bg-purple-900/40', badgeText: 'text-purple-700 dark:text-purple-300', letter: 'A' },
                                'Social Science': { gradient: 'from-amber-400 to-amber-600', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-900/40', badgeText: 'text-amber-700 dark:text-amber-300', letter: '🌍' },
                                'Combined': { gradient: 'from-indigo-400 to-violet-600', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40', badgeText: 'text-indigo-700 dark:text-indigo-300', letter: '⊕' },
                            };
                            const defaultStyle = { gradient: 'from-slate-400 to-slate-600', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300', letter: '📝' };

                            return (
                                <>
                        {/* Header with filter */}
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Reports</h2>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All your test reports in one place</p>
                            </div>
                            <div className="relative">
                                <select
                                    value={reportFilterSubject}
                                    onChange={(e) => setReportFilterSubject(e.target.value)}
                                    className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-9 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                >
                                    <option value="All">All Subjects</option>
                                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Info Banner — illustration + circular gauge */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30 border border-gray-200/80 dark:border-gray-800 p-5 sm:p-6 mb-6">
                            <div className="flex items-center justify-between">
                                {/* Left — illustration + text */}
                                <div className="flex items-center gap-4">
                                    {/* Report Illustration SVG */}
                                    <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 relative">
                                        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                            {/* Clipboard base */}
                                            <rect x="18" y="16" width="52" height="68" rx="8" fill="url(#clipGrad)" opacity="0.15"/>
                                            <rect x="22" y="20" width="52" height="68" rx="8" fill="white" stroke="url(#clipGrad)" strokeWidth="2"/>
                                            {/* Clipboard top clip */}
                                            <rect x="36" y="14" width="24" height="14" rx="4" fill="url(#clipGrad)"/>
                                            <rect x="40" y="18" width="16" height="6" rx="2" fill="white"/>
                                            {/* Text lines */}
                                            <rect x="32" y="40" width="32" height="3" rx="1.5" fill="#c7d2fe"/>
                                            <rect x="32" y="48" width="24" height="3" rx="1.5" fill="#e0e7ff"/>
                                            <rect x="32" y="56" width="28" height="3" rx="1.5" fill="#c7d2fe"/>
                                            <rect x="32" y="64" width="20" height="3" rx="1.5" fill="#e0e7ff"/>
                                            {/* Check marks */}
                                            <circle cx="36" cy="73" r="4" fill="#22c55e" opacity="0.2"/>
                                            <path d="M34 73 L35.5 74.5 L38 72" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            {/* Clock overlay */}
                                            <circle cx="64" cy="72" r="14" fill="white" stroke="url(#clipGrad)" strokeWidth="2"/>
                                            <circle cx="64" cy="72" r="10" fill="url(#clipGrad)" opacity="0.1"/>
                                            <path d="M64 66 L64 72 L68 75" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                                            <defs>
                                                <linearGradient id="clipGrad" x1="18" y1="16" x2="74" y2="88" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#818cf8"/>
                                                    <stop offset="1" stopColor="#6366f1"/>
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reports available</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">instantly for</p>
                                        <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-0.5">24 Hours</p>
                                    </div>
                                </div>

                                {/* Right — circular performance gauge */}
                                <div className="text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Overall Performance</p>
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                                            <circle cx="48" cy="48" r={circleRadius} fill="none" stroke="#e5e7eb" strokeWidth="6" className="dark:stroke-gray-700"/>
                                            <circle cx="48" cy="48" r={circleRadius} fill="none" stroke={scoreColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={circleCircumference} strokeDashoffset={circleOffset} style={{ transition: 'stroke-dashoffset 1s ease' }}/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{combinedScore}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">Combined Score</p>
                                </div>
                            </div>
                        </div>

                        {/* Report Cards */}
                        {filteredResults.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" viewBox="0 0 96 96" fill="none">
                                    <rect x="22" y="20" width="52" height="60" rx="8" fill="currentColor" opacity="0.15"/>
                                    <rect x="32" y="36" width="32" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>
                                    <rect x="32" y="44" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
                                    <rect x="32" y="52" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400 font-medium">No test reports yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Complete a test to see your detailed analysis!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredResults.map((result, index) => {
                                    const reportAvailable = isReportAvailable(result);
                                    const reportExpired = isReportExpired(result);
                                    const isPendingEvaluation = result.evaluationStatus === 'pending' || result.evaluationStatus === 'under_review';
                                    const isEvaluatedNotPublished = result.evaluationStatus === 'evaluated';
                                    const scorePercent = getResultScorePercent(result) ?? 0;
                                    const style = subjectStyles[result.subject] || defaultStyle;
                                    const scoreLabel = getResultScoreLabel(result);
                                    const dateStr = new Date(result.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(result.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                    return (
                                        <motion.div
                                            key={result.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * index }}
                                            className={`group relative bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-200 ${
                                                reportExpired || isPendingEvaluation
                                                    ? 'border-gray-200 dark:border-gray-800'
                                                    : 'border-gray-200 dark:border-gray-800 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200 dark:hover:border-indigo-800'
                                            }`}
                                        >
                                            <div
                                                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-5 ${isPendingEvaluation ? 'cursor-default' : 'cursor-pointer'} ${reportExpired ? 'opacity-70' : ''}`}
                                                onClick={() => {
                                                    if (reportAvailable && !reportExpired && !isPendingEvaluation && !isEvaluatedNotPublished) {
                                                        setSelectedReport(result);
                                                    }
                                                }}
                                            >
                                                {/* Left — Subject Icon */}
                                                <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${style.iconBg} flex items-center justify-center`}>
                                                    <span className={`text-xl sm:text-2xl font-bold ${style.iconColor}`}>{style.letter}</span>
                                                </div>

                                                {/* Center — Content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Title */}
                                                    <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                                                        {result.testTitle}
                                                    </h4>

                                                    {/* Subject badge + Score/Status badge */}
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badgeBg} ${style.badgeText}`}>
                                                            {result.subject}
                                                        </span>
                                                        {isPendingEvaluation ? (
                                                            <span className="eval-status-badge eval-status-pending">
                                                                <span className="eval-pulse-dot bg-amber-500" />
                                                                Pending Evaluation
                                                            </span>
                                                        ) : isEvaluatedNotPublished ? (
                                                            <span className="eval-status-badge eval-status-evaluated">
                                                                ✅ Evaluated
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    scorePercent >= 70
                                                                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                                                        : scorePercent >= 40
                                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                                                }`}>
                                                                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d={scorePercent >= 40 ? "M2 8L6 3L10 8" : "M2 4L6 9L10 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                    {scorePercent}%
                                                                </span>
                                                                {reportExpired && (
                                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                        Expired
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Score + Date */}
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                                        {scoreLabel} &bull; {dateStr}
                                                    </p>

                                                    {/* Expired / Available status */}
                                                    {reportExpired ? (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none">
                                                                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                                                                <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                                            </svg>
                                                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Report Expired</span>
                                                        </div>
                                                    ) : reportAvailable ? (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 16 16" fill="none">
                                                                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                                                                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                            <span className="text-xs font-medium text-green-600 dark:text-green-400">{getTimeRemaining(result)}</span>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {/* Right — Decorative gradient document illustration */}
                                                <div className="shrink-0 hidden sm:flex items-center gap-3">
                                                    <div className={`w-14 h-16 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg opacity-80`}>
                                                        <svg className="w-8 h-8 text-white/90" viewBox="0 0 32 32" fill="none">
                                                            <rect x="6" y="4" width="20" height="24" rx="3" fill="currentColor" opacity="0.3"/>
                                                            <rect x="10" y="10" width="12" height="2" rx="1" fill="currentColor"/>
                                                            <rect x="10" y="15" width="8" height="2" rx="1" fill="currentColor" opacity="0.6"/>
                                                            <rect x="10" y="20" width="10" height="2" rx="1" fill="currentColor" opacity="0.4"/>
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Chevron */}
                                                <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                                                    <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500"/>
                                                </div>
                                            </div>

                                            {/* Action buttons row for available reports — only show when published or auto-evaluated */}
                                            {reportAvailable && !reportExpired && !isPendingEvaluation && !isEvaluatedNotPublished && (
                                                <div className="flex items-center gap-2 px-4 sm:px-5 pb-4 pt-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); downloadReport(result); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                    >
                                                        <Download className="w-3.5 h-3.5"/> Download
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedReport(result); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5"/> View Report
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                                </>
                            );
                        })()}
                    </motion.div>
                )}



                {/* Study Notes Tab */}
                {activeTab === 'notes' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                                    <rect x="4" y="4" width="40" height="40" rx="12" fill="#eff6ff"/>
                                    <rect x="8" y="8" width="32" height="32" rx="8" fill="#dbeafe"/>
                                    <rect x="14" y="18" width="20" height="16" rx="2" fill="#fff" stroke="#3b82f6" strokeWidth="1.2"/>
                                    <rect x="14" y="10" width="14" height="12" rx="2" fill="#fff" stroke="#3b82f6" strokeWidth="1.2"/>
                                    <rect x="18" y="14" width="6" height="4" rx="1" fill="#3b82f6" opacity="0.3"/>
                                    <path d="M18 22h10M18 26h6" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round"/>
                                    <circle cx="32" cy="14" r="4" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1"/>
                                    <path d="M30.5 14l1 1 2.5-2.5" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    Study Notes
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                                    All your notes in one place
                                </p>
                            </div>
                        </div>

                        <NotesList
                            notes={notes}
                            readNoteIds={readNoteIds}
                            onReadNote={handleMarkNoteAsRead}
                            onOpenNote={(note) => setSelectedNote(note)}
                        />
                    </motion.div>
                )}

                {/* Homework Tab */}
                {activeTab === 'homework' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                                        <rect x="4" y="4" width="40" height="40" rx="10" fill="#fef3c7"/>
                                        <rect x="8" y="8" width="32" height="32" rx="7" fill="#fffbeb"/>
                                        <rect x="14" y="13" width="20" height="22" rx="3" stroke="#f59e0b" strokeWidth="1.8" fill="white"/>
                                        <path d="M18 19h12M18 24h8M18 29h10" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M30 10l-3 5h6l-3-5z" fill="#f59e0b" opacity="0.6"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                        Homework for Class {user.studentClass}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                                        Stay organized and complete your tasks ✨
                                    </p>
                                </div>
                            </div>
                        </div>

                        <HomeworkList
                            homeworks={homeworks}
                            loading={homeworkLoading}
                            studentId={user?.uid}
                            studentName={user?.name}
                            userClass={user.studentClass || 0}
                        />
                    </motion.div>
                )}

                {/* Practice Mode Tab */}
                {activeTab === 'practice' && (
                    <PracticeModeTab
                        mistakeItems={mistakeBucketItems}
                        masteredCount={masteredCount}
                        onRecordAttempt={recordAttempt}
                    />
                )}

                {/* Games Zone Tab (disabled)
                {activeTab === 'games' && (
                    <GamesZone
                        userId={user.uid}
                        userName={user.name}
                        coins={userCoins}
                        gameStats={gameStats}
                        onCoinsChange={() => setCoinsRefreshKey(k => k + 1)}
                    />
                )}
                */}


            </main>

            {/* Coming Soon Modal */}
            <AnimatePresence>
                {showComingSoon && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowComingSoon(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-gradient-to-br from-[#1650EB] to-[#1650EB] rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Coming Soon!</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                <span className="font-semibold text-[#1650EB] dark:text-[#6095DB]">{comingSoonFeature}</span> is under development and will be available soon. Stay tuned!
                            </p>
                            <button onClick={() => setShowComingSoon(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                <X className="w-4 h-4" /> Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Report Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto p-0 sm:p-4 sm:pt-8"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 shadow-2xl w-full min-h-screen sm:min-h-0 sm:max-w-3xl sm:max-h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col sm:my-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedReport.testTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedReport.subject} • {getResultScoreLabel(selectedReport)}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {(() => {
                                    // Check if this result needs teacher evaluation and hasn't been published
                                    const needsEval = selectedReport.evaluationStatus === 'pending' || selectedReport.evaluationStatus === 'under_review' || selectedReport.evaluationStatus === 'evaluated';
                                    const isManualOrHybrid = selectedReport.evaluationMode === 'manual' || selectedReport.evaluationMode === 'hybrid';

                                    if (needsEval && isManualOrHybrid) {
                                        // Show awaiting evaluation view
                                        return (
                                            <div className="text-center py-16">
                                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                                    <Clock className="w-10 h-10 text-amber-500" />
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                    {selectedReport.evaluationStatus === 'evaluated' ? 'Evaluation Complete' : 'Evaluation in Progress'}
                                                </h4>
                                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                                                    {selectedReport.evaluationStatus === 'evaluated'
                                                        ? 'Your teacher has reviewed your answers. The detailed report will be available once results are published.'
                                                        : selectedReport.evaluationStatus === 'under_review'
                                                        ? 'Your teacher is currently reviewing your answers. You\'ll be notified when the results are ready.'
                                                        : 'Your answers have been submitted and are waiting for your teacher to review. You\'ll be notified when the results are published.'}
                                                </p>

                                                {/* Basic submission info (no scores or answers) */}
                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 max-w-sm mx-auto space-y-3 text-left">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Questions</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{selectedReport.totalQuestions}</span>
                                                    </div>
                                                    {selectedReport.timeTakenSeconds && (
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-500 dark:text-gray-400">Time Taken</span>
                                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                                {Math.floor(selectedReport.timeTakenSeconds / 60)}m {selectedReport.timeTakenSeconds % 60}s
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Submitted</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {new Date(selectedReport.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                                        <span className={`font-semibold ${
                                                            selectedReport.evaluationStatus === 'evaluated'
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {selectedReport.evaluationStatus === 'evaluated' ? '✅ Evaluated' : selectedReport.evaluationStatus === 'under_review' ? '👀 Under Review' : '⏳ Pending'}
                                                        </span>
                                                    </div>
                                                    {selectedReport.evaluationMode && (
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-500 dark:text-gray-400">Evaluation Type</span>
                                                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                                {selectedReport.evaluationMode === 'hybrid' ? 'Auto + Manual' : selectedReport.evaluationMode}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Teacher feedback if evaluated but not published */}
                                                {selectedReport.evaluationStatus === 'evaluated' && selectedReport.teacherFeedback && (
                                                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 max-w-md mx-auto text-left">
                                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Teacher Feedback</p>
                                                        <p className="text-sm text-blue-800 dark:text-blue-300">{selectedReport.teacherFeedback}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Published / auto-evaluated — show full report
                                    if (selectedReport.detailedAnswers && selectedReport.detailedAnswers.length > 0) {
                                        // For published manual/hybrid results, show evaluation data if available
                                        const hasQuestionEvals = selectedReport.questionEvaluations && selectedReport.questionEvaluations.length > 0;

                                        if (hasQuestionEvals && (selectedReport.evaluationMode === 'manual' || selectedReport.evaluationMode === 'hybrid')) {
                                            // Show teacher-evaluated format
                                            return (
                                                <div className="space-y-4">
                                                    {/* Overall feedback */}
                                                    {selectedReport.teacherFeedback && (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 mb-4">
                                                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📝 Teacher\'s Overall Feedback</p>
                                                            <p className="text-sm text-blue-800 dark:text-blue-300">{selectedReport.teacherFeedback}</p>
                                                        </div>
                                                    )}

                                                    {/* Strength & Improvement areas */}
                                                    {(selectedReport.strengthAreas && selectedReport.strengthAreas.length > 0) && (
                                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">💪 Strengths</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {selectedReport.strengthAreas.map((s, i) => (
                                                                    <span key={i} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(selectedReport.improvementAreas && selectedReport.improvementAreas.length > 0) && (
                                                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">📈 Areas to Improve</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {selectedReport.improvementAreas.map((s, i) => (
                                                                    <span key={i} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Per-question evaluations */}
                                                    {selectedReport.questionEvaluations!.map((qe, index) => {
                                                        const da = selectedReport.detailedAnswers?.[index];
                                                        const statusColor = qe.status === 'correct'
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                            : qe.status === 'partially_correct'
                                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                                                        const statusIcon = qe.status === 'correct' ? '✅' : qe.status === 'partially_correct' ? '⚠️' : '❌';

                                                        return (
                                                            <div key={qe.questionId || index} className={`p-4 rounded-xl border ${statusColor}`}>
                                                                <div className="flex items-start gap-3">
                                                                    <span className="text-lg mt-0.5">{statusIcon}</span>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                                                Q{index + 1}: {qe.questionText}
                                                                            </p>
                                                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-2 flex-shrink-0">
                                                                                {qe.obtainedMarks}/{qe.maxMarks}
                                                                            </span>
                                                                        </div>

                                                                        {/* Student's answer */}
                                                                        {da && (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                                                                <div className="p-2 rounded-lg bg-white/60 dark:bg-gray-800/60">
                                                                                    <span className="text-gray-500 dark:text-gray-400">Your Answer: </span>
                                                                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                                                                        {da.userAnswer || 'Not answered'}
                                                                                    </span>
                                                                                </div>
                                                                                {da.correctAnswer && (
                                                                                    <div className="p-2 rounded-lg bg-green-100/60 dark:bg-green-900/30">
                                                                                        <span className="text-gray-500 dark:text-gray-400">Correct Answer: </span>
                                                                                        <span className="font-medium text-green-700 dark:text-green-300">
                                                                                            {da.correctAnswer}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Teacher feedback per question */}
                                                                        {qe.feedback && (
                                                                            <div className="mt-2 p-2 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg">
                                                                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Teacher: </span>
                                                                                <span className="text-sm text-blue-800 dark:text-blue-300">{qe.feedback}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Explanation */}
                                                                        {da?.explanation && (
                                                                            <div className="mt-2 p-2 bg-amber-50/80 dark:bg-amber-900/20 rounded-lg">
                                                                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">💡 Explanation: </span>
                                                                                <span className="text-sm text-amber-800 dark:text-amber-300">{da.explanation}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }

                                        // Auto-evaluated (original format)
                                        return (
                                            <div className="space-y-4">
                                                {selectedReport.detailedAnswers.map((answer, index) => (
                                                    <div
                                                        key={answer.questionId || index}
                                                        className={`p-4 rounded-xl border ${answer.isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${answer.isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                                                                {answer.isCorrect ? (
                                                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                                ) : (
                                                                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900 dark:text-white mb-2">
                                                                    Q{index + 1}: {answer.questionText}
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                                    <div className={`p-2 rounded-lg ${answer.isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                                                                        <span className="text-gray-500 dark:text-gray-400">Your Answer: </span>
                                                                        <span className={`font-medium ${answer.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                                            {answer.userAnswer || 'Not answered'}
                                                                        </span>
                                                                    </div>
                                                                    {!answer.isCorrect && (
                                                                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                                                                            <span className="text-gray-500 dark:text-gray-400">Correct Answer: </span>
                                                                            <span className="font-medium text-green-700 dark:text-green-300">
                                                                                {answer.correctAnswer}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Explanation */}
                                                                {answer.explanation && (
                                                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className="text-base mt-0.5">💡</span>
                                                                            <div>
                                                                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Explanation</p>
                                                                                <p className="text-sm text-amber-800 dark:text-amber-300">{answer.explanation}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    // No detailed answers available
                                    return (
                                        <div className="text-center py-12">
                                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400">Detailed answer breakdown is not available for this test.</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                                {getResultScoreLabel(selectedReport)}
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    {/* Only show score breakdown if published */}
                                    {selectedReport.evaluationStatus === 'published' || !selectedReport.evaluationMode || selectedReport.evaluationMode === 'auto' ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {selectedReport.questionEvaluations
                                                        ? `${selectedReport.marksObtained?.toFixed(1) || selectedReport.score}/${selectedReport.totalMarks || selectedReport.totalQuestions}`
                                                        : `${selectedReport.score} Correct`}
                                                </span>
                                            </div>
                                            {!selectedReport.questionEvaluations && (
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedReport.totalQuestions - selectedReport.score} Incorrect</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Results pending</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Only show download if published */}
                                    {(selectedReport.evaluationStatus === 'published' || !selectedReport.evaluationMode || selectedReport.evaluationMode === 'auto') && (
                                        <button
                                            onClick={() => downloadReport(selectedReport)}
                                            className="flex items-center gap-2 px-4 py-2 border border-[#1650EB] text-[#1650EB] dark:text-[#6095DB] dark:border-[#6095DB] rounded-xl font-medium hover:bg-[#1650EB]/10 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden sm:inline">Download PDF</span>
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                        Close Report
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Note Detail Modal */}
            <AnimatePresence>
                {selectedNote && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto p-0 sm:p-4 sm:pt-8"
                        onClick={() => setSelectedNote(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 shadow-2xl w-full min-h-screen sm:min-h-0 sm:max-w-3xl sm:max-h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col sm:my-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">
                                            {selectedNote.subject}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedNote.contentType === 'json' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                            {selectedNote.contentType.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h3>
                                    {selectedNote.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedNote.description}</p>
                                    )}
                                </div>
                                <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedNote.contentType === 'json' ? (
                                    (() => {
                                        try {
                                            const jsonContent = JSON.parse(selectedNote.content);
                                            return (
                                                <div className="space-y-6">
                                                    {/* Title if present */}
                                                    {jsonContent.title && (
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{jsonContent.title}</h4>
                                                    )}

                                                    {/* Topics */}
                                                    {jsonContent.topics && Array.isArray(jsonContent.topics) && (
                                                        <div className="space-y-4">
                                                            {jsonContent.topics.map((topic: { name?: string; content?: string; keyPoints?: string[]; formulas?: string[] }, idx: number) => (
                                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                                    {topic.name && <h5 className="font-semibold text-gray-900 dark:text-white mb-2">{topic.name}</h5>}
                                                                    {topic.content && <p className="text-gray-700 dark:text-gray-300 mb-3">{topic.content}</p>}
                                                                    {topic.keyPoints && topic.keyPoints.length > 0 && (
                                                                        <div className="mb-3">
                                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Key Points:</p>
                                                                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                                                                {topic.keyPoints.map((point: string, i: number) => <li key={i}>{point}</li>)}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                    {topic.formulas && topic.formulas.length > 0 && (
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Formulas:</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {topic.formulas.map((formula: string, i: number) => (
                                                                                    <code key={i} className="px-2 py-1 bg-white dark:bg-gray-900 rounded text-sm font-mono text-purple-600 dark:text-purple-400">{formula}</code>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Summary */}
                                                    {jsonContent.summary && (
                                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Summary</p>
                                                            <p className="text-gray-700 dark:text-gray-300">{jsonContent.summary}</p>
                                                        </div>
                                                    )}

                                                    {/* Important Terms */}
                                                    {jsonContent.importantTerms && Object.keys(jsonContent.importantTerms).length > 0 && (
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Important Terms</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {Object.entries(jsonContent.importantTerms).map(([term, def]) => (
                                                                    <div key={term} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                                        <span className="font-medium text-gray-900 dark:text-white">{term}: </span>
                                                                        <span className="text-gray-600 dark:text-gray-400">{String(def)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Raw JSON fallback for unrecognized structure */}
                                                    {!jsonContent.topics && !jsonContent.summary && !jsonContent.importantTerms && (
                                                        <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-x-auto text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                            {JSON.stringify(jsonContent, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            );
                                        } catch {
                                            return (
                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                    <p className="text-red-700 dark:text-red-400">Error parsing JSON content. Raw content:</p>
                                                    <pre className="mt-2 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{selectedNote.content}</pre>
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none">
                                        {/* Check if content is a URL */}
                                        {selectedNote.content.startsWith('http://') || selectedNote.content.startsWith('https://') ? (
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                                                <p className="text-blue-700 dark:text-blue-400 mb-4">This is a link to external content:</p>
                                                <a
                                                    href={selectedNote.content}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                    Open Link
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                                {selectedNote.content}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end flex-shrink-0">
                                <button onClick={() => setSelectedNote(null)} className="px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Detail Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto p-0 sm:p-4 sm:pt-8"
                        onClick={() => setSelectedNotification(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 shadow-2xl w-full sm:max-w-md sm:rounded-2xl overflow-hidden sm:my-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with type-specific color */}
                            <div className={`p-6 ${selectedNotification.type === 'test' ? 'bg-blue-500' :
                                selectedNotification.type === 'note' ? 'bg-green-500' :
                                    'bg-amber-500'
                                } text-white`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        {selectedNotification.type === 'test' ? (
                                            <FileText className="w-6 h-6" />
                                        ) : selectedNotification.type === 'note' ? (
                                            <BookMarked className="w-6 h-6" />
                                        ) : (
                                            <Megaphone className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-80">
                                            {selectedNotification.type === 'test' ? 'New Test' :
                                                selectedNotification.type === 'note' ? 'Study Material' :
                                                    'Announcement'}
                                        </p>
                                        <h3 className="text-lg font-bold">{selectedNotification.title}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4">
                                    {selectedNotification.message}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    {selectedNotification.subject && (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            {selectedNotification.subject}
                                        </span>
                                    )}
                                    <span>
                                        {new Date(selectedNotification.createdAt).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                {selectedNotification.createdByName && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                                        From: <span className="font-medium">{selectedNotification.createdByName}</span>
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                                <button
                                    onClick={() => {
                                        handleDismissNotification(selectedNotification.id);
                                        setSelectedNotification(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* PDF Test Viewer Modal */}
            <AnimatePresence>
                {selectedPdfTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
                        onClick={() => setSelectedPdfTest(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 shadow-2xl w-full max-w-4xl max-h-[95vh] rounded-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedPdfTest.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedPdfTest.subject} • Class {selectedPdfTest.targetClass}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPdfTest(null)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* PDF Content */}
                            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                {selectedPdfTest.pdfUrl ? (
                                    <iframe
                                        src={selectedPdfTest.pdfUrl}
                                        className="w-full h-full min-h-[60vh]"
                                        title={`PDF: ${selectedPdfTest.title}`}
                                        style={{ border: 'none' }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full min-h-[60vh]">
                                        <div className="text-center">
                                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">PDF not available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                                    {selectedPdfTest.pdfFileName || 'test-paper.pdf'}
                                </p>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setSelectedPdfTest(null)}
                                        className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        Close
                                    </button>
                                    {selectedPdfTest.pdfUrl && (
                                        <button
                                            onClick={() => downloadPdfTest(selectedPdfTest)}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-pink-700 transition-all"
                                        >
                                            <Download className="w-4 h-4" /> Download PDF
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>



            </div>{/* Close flex-1 content wrapper */}
        </div>
    );
}

// ==================== PRACTICE MODE TAB ====================
interface PracticeModeTabProps {
    mistakeItems: MistakeBucketItem[];
    masteredCount: number;
    onRecordAttempt: (itemId: string, isCorrect: boolean, currentStreak: number) => Promise<{ newStreak: number; isMastered: boolean }>;
}

function PracticeModeTab({ mistakeItems, masteredCount, onRecordAttempt }: PracticeModeTabProps) {
    const [isReviewing, setIsReviewing] = useState(false);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [sessionResults, setSessionResults] = useState<{ correct: number; wrong: number; mastered: number }>({ correct: 0, wrong: 0, mastered: 0 });
    const [reviewItems, setReviewItems] = useState<MistakeBucketItem[]>([]);
    const [showSummary, setShowSummary] = useState(false);
    const [optionsMap, setOptionsMap] = useState<Record<number, string[]>>({});

    // Group mistakes by subject
    const subjectGroups = mistakeItems.reduce((acc, item) => {
        acc[item.subject] = (acc[item.subject] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Get yesterday's mistakes
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterdayMistakes = mistakeItems.filter(item => {
        const addedAt = item.addedAt instanceof Date ? item.addedAt : new Date(item.addedAt);
        return addedAt >= yesterday && addedAt < today;
    });

    // Build shuffled options for a mistake item
    const buildOptionsForItem = (item: MistakeBucketItem): string[] => {
        const optionSet = new Set<string>();
        optionSet.add(item.correctAnswer);
        optionSet.add(item.userWrongAnswer);
        const distractors = ['None of the above', 'All of the above', 'Cannot be determined', 'Not enough information'];
        let i = 0;
        while (optionSet.size < 4 && i < distractors.length) {
            if (distractors[i] !== item.correctAnswer && distractors[i] !== item.userWrongAnswer) {
                optionSet.add(distractors[i]);
            }
            i++;
        }
        const arr = Array.from(optionSet);
        for (let j = arr.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [arr[j], arr[k]] = [arr[k], arr[j]];
        }
        return arr;
    };

    const startReview = (items: MistakeBucketItem[]) => {
        const itemsCopy = [...items];
        // Pre-build all shuffled options
        const map: Record<number, string[]> = {};
        itemsCopy.forEach((item, idx) => {
            map[idx] = buildOptionsForItem(item);
        });
        setOptionsMap(map);
        setReviewItems(itemsCopy);
        setCurrentReviewIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setSessionResults({ correct: 0, wrong: 0, mastered: 0 });
        setShowSummary(false);
        setIsReviewing(true);
    };

    const handleAnswerSelect = async (answer: string) => {
        if (showResult) return;
        setSelectedAnswer(answer);
        setShowResult(true);

        const currentItem = reviewItems[currentReviewIndex];
        const isCorrect = answer === currentItem.correctAnswer;

        try {
            const result = await onRecordAttempt(currentItem.id, isCorrect, currentItem.correctStreak);
            setSessionResults(prev => ({
                correct: prev.correct + (isCorrect ? 1 : 0),
                wrong: prev.wrong + (isCorrect ? 0 : 1),
                mastered: prev.mastered + (result.isMastered ? 1 : 0),
            }));
        } catch (err) {
            console.error('[Quizy] Error recording attempt:', err);
        }
    };

    const handleNext = () => {
        if (currentReviewIndex < reviewItems.length - 1) {
            setCurrentReviewIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            setShowSummary(true);
        }
    };

    const exitReview = () => {
        setIsReviewing(false);
        setShowSummary(false);
    };

    // Summary screen after review
    if (showSummary) {
        const totalReviewed = sessionResults.correct + sessionResults.wrong;
        const accuracy = totalReviewed > 0 ? Math.round((sessionResults.correct / totalReviewed) * 100) : 0;
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">Review Complete! 🎉</h2>
                        <p className="text-green-100 mt-1">Here&apos;s how you did</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionResults.correct}</p>
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1">Correct</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{sessionResults.wrong}</p>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">Wrong</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{sessionResults.mastered}</p>
                                <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">Mastered ✨</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accuracy</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{accuracy}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${accuracy}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className={`h-3 rounded-full ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                />
                            </div>
                        </div>

                        {sessionResults.mastered > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                <p className="text-sm text-purple-700 dark:text-purple-400">
                                    🎯 <strong>{sessionResults.mastered} question{sessionResults.mastered > 1 ? 's' : ''}</strong> cleared from your bucket! Get it right once to master it.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={exitReview}
                            className="w-full py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                        >
                            Back to Practice Mode
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Review quiz screen
    if (isReviewing && reviewItems.length > 0) {
        const currentItem = reviewItems[currentReviewIndex];
        const progress = ((currentReviewIndex + 1) / reviewItems.length) * 100;
        const options = optionsMap[currentReviewIndex] || [currentItem.correctAnswer, currentItem.userWrongAnswer];

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-2xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={exitReview} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1">
                            <X className="w-4 h-4" /> Exit
                        </button>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {currentReviewIndex + 1} / {reviewItems.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                            animate={{ width: `${progress}%` }}
                            className="h-2 rounded-full bg-gradient-to-r from-[#1650EB] to-green-500"
                        />
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
                    {/* Subject & Test info */}
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <span className="text-xs font-medium text-[#1650EB] dark:text-[#6095DB] bg-[#1650EB]/10 dark:bg-[#1650EB]/20 px-2.5 py-1 rounded-full">
                            {currentItem.subject}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            from: {currentItem.testTitle}
                        </span>
                    </div>

                    {/* Question */}
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {currentItem.questionText}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                            Get it right once to clear it from your bucket
                        </p>

                        {/* Answer Options */}
                        <div className="space-y-3">
                            {options.map((option, idx) => {
                                const isSelected = selectedAnswer === option;
                                const isCorrect = option === currentItem.correctAnswer;
                                const isWrong = showResult && isSelected && !isCorrect;
                                const showCorrectHighlight = showResult && isCorrect;

                                return (
                                    <motion.button
                                        key={idx}
                                        whileTap={!showResult ? { scale: 0.98 } : {}}
                                        onClick={() => handleAnswerSelect(option)}
                                        disabled={showResult}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                            showCorrectHighlight
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : isWrong
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : isSelected
                                                ? 'border-[#1650EB] bg-[#1650EB]/5'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-[#1650EB]/50 dark:hover:border-[#1650EB]/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                                showCorrectHighlight
                                                    ? 'bg-green-500 text-white'
                                                    : isWrong
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {showCorrectHighlight ? <CheckCircle className="w-4 h-4" /> : isWrong ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm font-medium ${
                                                showCorrectHighlight
                                                    ? 'text-green-700 dark:text-green-400'
                                                    : isWrong
                                                    ? 'text-red-700 dark:text-red-400'
                                                    : 'text-gray-800 dark:text-gray-200'
                                            }`}>
                                                {option}
                                            </span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {showResult && currentItem.explanation && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                            >
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    <strong>💡 Explanation:</strong> {currentItem.explanation}
                                </p>
                            </motion.div>
                        )}

                        {/* Next Button */}
                        {showResult && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleNext}
                                className="mt-6 w-full py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors flex items-center justify-center gap-2"
                            >
                                {currentReviewIndex < reviewItems.length - 1 ? (
                                    <>Next Question <ArrowRight className="w-4 h-4" /></>
                                ) : (
                                    <>View Results <Trophy className="w-4 h-4" /></>
                                )}
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    }

    // Subject icon configs
    const subjectIcons: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        'Combined': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#f3e8ff"/>
                    <rect x="8" y="7" width="12" height="15" rx="2" fill="#fff" stroke="#a855f7" strokeWidth="1.3"/>
                    <rect x="16" y="13" width="12" height="15" rx="2" fill="#fff" stroke="#a855f7" strokeWidth="1.3"/>
                    <path d="M11 12h6M11 15h4" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
                    <path d="M19 18h6M19 21h4" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
                </svg>
            ),
            color: '#a855f7', bg: 'bg-purple-50 dark:bg-purple-900/20'
        },
        'Hindi': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#fef2f2"/>
                    <rect x="8" y="8" width="20" height="20" rx="4" fill="#fff" stroke="#ef4444" strokeWidth="1.3"/>
                    <text x="18" y="24" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold" fontFamily="serif">अ</text>
                </svg>
            ),
            color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20'
        },
        'Mathematics': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#eff6ff"/>
                    <rect x="8" y="8" width="20" height="20" rx="4" fill="#fff" stroke="#3b82f6" strokeWidth="1.3"/>
                    <text x="14" y="19" fill="#3b82f6" fontSize="7" fontWeight="bold">÷</text>
                    <text x="21" y="19" fill="#3b82f6" fontSize="7" fontWeight="bold">×</text>
                    <text x="14" y="27" fill="#3b82f6" fontSize="7" fontWeight="bold">+</text>
                    <text x="21" y="27" fill="#3b82f6" fontSize="7" fontWeight="bold">−</text>
                    <line x1="18" y1="10" x2="18" y2="26" stroke="#3b82f6" strokeWidth="0.6" opacity="0.3"/>
                    <line x1="10" y1="22" x2="26" y2="22" stroke="#3b82f6" strokeWidth="0.6" opacity="0.3"/>
                </svg>
            ),
            color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        'Science': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#ecfdf5"/>
                    <path d="M14 8v10l-4 8a2 2 0 001.8 3h12.4a2 2 0 001.8-3l-4-8V8" stroke="#10b981" strokeWidth="1.3" fill="none"/>
                    <line x1="13" y1="8" x2="23" y2="8" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="16" cy="23" r="1.5" fill="#10b981" opacity="0.4"/>
                    <circle cx="20" cy="21" r="1" fill="#10b981" opacity="0.3"/>
                </svg>
            ),
            color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20'
        },
        'English': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#faf5ff"/>
                    <rect x="8" y="8" width="20" height="20" rx="4" fill="#fff" stroke="#8b5cf6" strokeWidth="1.3"/>
                    <text x="18" y="24" textAnchor="middle" fill="#8b5cf6" fontSize="13" fontWeight="bold">A</text>
                </svg>
            ),
            color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-900/20'
        },
        'Social Science': {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#f0fdf4"/>
                    <circle cx="18" cy="18" r="9" stroke="#22c55e" strokeWidth="1.3" fill="none"/>
                    <ellipse cx="18" cy="18" rx="9" ry="3.5" stroke="#22c55e" strokeWidth="0.8" opacity="0.5"/>
                    <line x1="18" y1="9" x2="18" y2="27" stroke="#22c55e" strokeWidth="0.8" opacity="0.5"/>
                </svg>
            ),
            color: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/20'
        },
    };

    const getSubjectIcon = (subject: string) => {
        return subjectIcons[subject] || {
            icon: (
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                    <rect width="36" height="36" rx="10" fill="#f9fafb"/>
                    <rect x="10" y="8" width="16" height="20" rx="3" stroke="#6b7280" strokeWidth="1.3" fill="#fff"/>
                    <path d="M14 14h8M14 18h5M14 22h6" stroke="#6b7280" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
                </svg>
            ),
            color: '#6b7280', bg: 'bg-gray-50 dark:bg-gray-800'
        };
    };

    // Coming soon feature config with SVG icons
    const comingSoonFeatures = [
        {
            title: 'Timed Challenges', desc: 'Beat the clock on practice questions',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#eff6ff"/>
                    <circle cx="20" cy="22" r="10" stroke="#3b82f6" strokeWidth="1.5" fill="#3b82f6" fillOpacity="0.06"/>
                    <path d="M20 16v6l4 3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 10h6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
            ), color: '#3b82f6'
        },
        {
            title: 'Weak Topic Analysis', desc: 'AI identifies your weakest subjects',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#f0fdf4"/>
                    <rect x="10" y="24" width="4" height="6" rx="1" fill="#22c55e" opacity="0.4"/>
                    <rect x="16" y="18" width="4" height="12" rx="1" fill="#22c55e" opacity="0.6"/>
                    <rect x="22" y="14" width="4" height="16" rx="1" fill="#22c55e" opacity="0.8"/>
                    <rect x="28" y="10" width="4" height="20" rx="1" fill="#22c55e"/>
                </svg>
            ), color: '#22c55e'
        },
        {
            title: 'Practice Streaks', desc: 'Build daily practice habits',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#fef3c7"/>
                    <path d="M20 8c0 4-4 6-4 10a6 6 0 0012 0c0-4-4-6-4-10" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5"/>
                    <path d="M20 15c0 2-2 3-2 5a3 3 0 006 0c0-2-2-3-2-5" fill="#f59e0b" opacity="0.4"/>
                </svg>
            ), color: '#f59e0b'
        },
        {
            title: 'Quiz Battle', desc: 'Challenge classmates in real-time',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#faf5ff"/>
                    <rect x="12" y="14" width="16" height="12" rx="3" stroke="#8b5cf6" strokeWidth="1.5" fill="#8b5cf6" fillOpacity="0.06"/>
                    <circle cx="17" cy="20" r="1.5" fill="#8b5cf6" opacity="0.5"/>
                    <circle cx="23" cy="20" r="1.5" fill="#8b5cf6" opacity="0.5"/>
                    <path d="M14 28l-2-2M26 28l2-2" stroke="#8b5cf6" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
            ), color: '#8b5cf6'
        },
        {
            title: 'Spaced Repetition', desc: 'Smart scheduling for long-term memory',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#fef2f2"/>
                    <circle cx="20" cy="20" r="10" stroke="#ef4444" strokeWidth="1.5" fill="#ef4444" fillOpacity="0.06"/>
                    <circle cx="20" cy="20" r="5" stroke="#ef4444" strokeWidth="1" opacity="0.4"/>
                    <circle cx="20" cy="20" r="2" fill="#ef4444" opacity="0.5"/>
                    <path d="M20 10v3M20 27v3M10 20h3M27 20h3" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
                </svg>
            ), color: '#ef4444'
        },
        {
            title: 'Custom Practice Sets', desc: 'Create your own practice quizzes',
            icon: (
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <rect width="40" height="40" rx="12" fill="#ecfdf5"/>
                    <rect x="11" y="10" width="18" height="20" rx="3" stroke="#10b981" strokeWidth="1.5" fill="#10b981" fillOpacity="0.06"/>
                    <path d="M15 16h10M15 20h6M15 24h8" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M26 13l3-3 3 3-3 3-3-3z" fill="#10b981" opacity="0.3" stroke="#10b981" strokeWidth="0.8"/>
                </svg>
            ), color: '#10b981'
        },
    ];

    // Main Practice Mode view
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                        <rect x="4" y="4" width="40" height="40" rx="12" fill="#fef2f2"/>
                        <rect x="8" y="8" width="32" height="32" rx="8" fill="#fee2e2"/>
                        <circle cx="24" cy="24" r="8" stroke="#ef4444" strokeWidth="2" fill="#ef4444" fillOpacity="0.1"/>
                        <circle cx="24" cy="24" r="3" fill="#ef4444" opacity="0.4"/>
                        <circle cx="24" cy="24" r="1" fill="#ef4444"/>
                        <path d="M24 12v4M24 32v4M12 24h4M32 24h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Practice Mode
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            Level up your skills
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                        Review your mistakes and master every question
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
                {/* Pending */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5 sm:p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                                    <circle cx="10" cy="10" r="8" stroke="#ef4444" strokeWidth="1.5" fill="#ef4444" fillOpacity="0.1"/>
                                    <path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-none">{mistakeItems.length}</p>
                                <p className="text-[11px] text-gray-400 mt-1">Pending</p>
                            </div>
                        </div>
                        {/* Sparkline */}
                        <svg className="w-16 h-8 hidden sm:block" viewBox="0 0 64 32" fill="none">
                            <path d="M2 24C8 20 14 28 20 18C26 8 32 22 38 16C44 10 50 20 56 14L62 10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
                            <path d="M2 24C8 20 14 28 20 18C26 8 32 22 38 16C44 10 50 20 56 14L62 10L62 32L2 32Z" fill="#ef4444" opacity="0.06"/>
                        </svg>
                    </div>
                </div>
                {/* Mastered */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5 sm:p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                                    <circle cx="10" cy="10" r="8" stroke="#10b981" strokeWidth="1.5" fill="#10b981" fillOpacity="0.1"/>
                                    <path d="M6.5 10l2.5 2.5 5-5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-none">{masteredCount}</p>
                                <p className="text-[11px] text-gray-400 mt-1">Mastered</p>
                            </div>
                        </div>
                        <svg className="w-16 h-8 hidden sm:block" viewBox="0 0 64 32" fill="none">
                            <path d="M2 28C10 22 18 16 26 18C34 20 42 10 50 8L62 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
                            <path d="M2 28C10 22 18 16 26 18C34 20 42 10 50 8L62 4L62 32L2 32Z" fill="#10b981" opacity="0.06"/>
                        </svg>
                    </div>
                </div>
                {/* Total */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5 sm:p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                                    <circle cx="10" cy="10" r="8" stroke="#3b82f6" strokeWidth="1.5" fill="#3b82f6" fillOpacity="0.1"/>
                                    <circle cx="10" cy="10" r="4" stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.4"/>
                                    <circle cx="10" cy="10" r="1.5" fill="#3b82f6"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-none">{mistakeItems.length + masteredCount}</p>
                                <p className="text-[11px] text-gray-400 mt-1">Total</p>
                            </div>
                        </div>
                        <svg className="w-16 h-8 hidden sm:block" viewBox="0 0 64 32" fill="none">
                            <path d="M2 20C10 16 18 24 26 14C34 4 42 18 50 12L62 8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
                            <path d="M2 20C10 16 18 24 26 14C34 4 42 18 50 12L62 8L62 32L2 32Z" fill="#3b82f6" opacity="0.06"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Mistake Bucket CTA */}
            {mistakeItems.length > 0 ? (
                <div className="space-y-4 mb-6">
                    {/* Yesterday's mistakes prompt */}
                    {yesterdayMistakes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all"
                            onClick={() => startReview(yesterdayMistakes)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-lg">Clear yesterday&apos;s mistakes! 🧹</h4>
                                    <p className="text-amber-100 text-sm mt-1">
                                        You have {yesterdayMistakes.length} mistake{yesterdayMistakes.length > 1 ? 's' : ''} from yesterday. Tap to review!
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Review all mistakes — gradient CTA card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="relative overflow-hidden bg-gradient-to-r from-[#1650EB] via-[#4f5bd5] to-[#7c3aed] rounded-[28px] p-5 sm:p-6 text-white shadow-xl shadow-[#1650EB]/20 cursor-pointer hover:shadow-2xl hover:scale-[1.005] transition-all"
                        onClick={() => startReview(mistakeItems)}
                    >
                        {/* Wave pattern overlay */}
                        <div className="absolute inset-0 opacity-10">
                            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                                <path d="M0 100C100 50 200 150 300 100S500 50 600 100S800 150 800 100V200H0Z" fill="white"/>
                                <path d="M0 120C100 80 200 160 300 120S500 80 600 120S800 160 800 120V200H0Z" fill="white" opacity="0.5"/>
                            </svg>
                        </div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
                                    <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
                                        <rect x="4" y="4" width="24" height="18" rx="3" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.3"/>
                                        <rect x="6" y="6" width="14" height="10" rx="2" fill="white" fillOpacity="0.15"/>
                                        <path d="M10 20h12M12 24h8" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg sm:text-xl flex items-center gap-1.5">
                                        Review All Mistakes
                                        <Sparkles className="w-4 h-4 text-yellow-300" />
                                    </h4>
                                    <p className="text-blue-200 text-sm mt-0.5">
                                        {mistakeItems.length} question{mistakeItems.length > 1 ? 's' : ''} in your bucket — get each right once to clear it!
                                    </p>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10 hover:bg-white/25 transition-colors">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Subject breakdown cards */}
                    {Object.keys(subjectGroups).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(subjectGroups).map(([subject, count], idx) => {
                                const cfg = getSubjectIcon(subject);
                                const total = mistakeItems.length + masteredCount;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                return (
                                    <motion.button
                                        key={subject}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        onClick={() => startReview(mistakeItems.filter(item => item.subject === subject))}
                                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5 hover:border-[#1650EB]/30 dark:hover:border-[#1650EB]/30 transition-all text-left group shadow-sm hover:shadow-md relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 flex-shrink-0 relative">
                                                    {/* Badge count */}
                                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10">
                                                        {count}
                                                    </div>
                                                    {cfg.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#1650EB] transition-colors">{subject}</p>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">{count} mistake{count > 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-gray-300 dark:text-gray-600 -rotate-90 group-hover:text-[#1650EB] transition-colors flex-shrink-0" />
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                                            />
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center mb-6 shadow-sm">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bucket is empty! 🎉</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {masteredCount > 0
                            ? `You've mastered ${masteredCount} question${masteredCount > 1 ? 's' : ''}! Take more tests to add new mistakes to practice.`
                            : 'Take a test to start building your practice bucket. Wrong answers will appear here for review!'}
                    </p>
                </div>
            )}

            {/* Coming Soon Features */}
            <div className="mb-2">
                <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-4 flex items-center gap-1.5">
                    COMING SOON <Sparkles className="w-3 h-3 text-gray-300" />
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {comingSoonFeatures.map((feature) => (
                        <div
                            key={feature.title}
                            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{feature.title}</h5>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{feature.desc}</p>
                                    </div>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-300 dark:text-gray-600 -rotate-90 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ==================== DAILY QUIZ CHALLENGE CARD ====================
interface DailyQuizCardProps {
    questions: Question[];
    completed: boolean;
    loading: boolean;
    user: AppUser;
    streak: number;
    longestStreak: number;
    existingSession: TestSession | null;
    onComplete: (score: number, total: number) => void;
}

function DailyQuizCard({ questions, completed, loading, user, streak, longestStreak, existingSession, onComplete }: DailyQuizCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [finished, setFinished] = useState(completed);
    const [resultStreak, setResultStreak] = useState(streak);
    const [resultLongest, setResultLongest] = useState(longestStreak);
    const [submitting, setSubmitting] = useState(false);
    const [streakMessage, setStreakMessage] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(existingSession?.id || null);
    const [isFailed, setIsFailed] = useState(existingSession?.status === 'failed');
    const sessionIdRef = useRef<string | null>(existingSession?.id || null);

    // Auto-resume from existing in-progress session
    useEffect(() => {
        if (existingSession && existingSession.status === 'in_progress' && !isPlaying && !finished) {
            console.log('[Quizy] Resuming daily challenge from session:', existingSession.id, 'question:', existingSession.currentQuestion);
            setSessionId(existingSession.id);
            sessionIdRef.current = existingSession.id;
            setCurrentQ(existingSession.currentQuestion);
            setCorrectCount(existingSession.score);
            setIsPlaying(true);
        } else if (existingSession?.status === 'failed') {
            setIsFailed(true);
        }
    }, [existingSession]);

    // ── Loading state ──
    if (loading) {
        return (
            <div className="mb-6 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/30 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 mb-2" />
                        <div className="h-3 bg-gray-200/70 dark:bg-gray-700/70 rounded-lg w-56" />
                    </div>
                </div>
            </div>
        );
    }

    // ── No questions available ──
    if (questions.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gray-100 dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800"
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl flex items-center justify-center text-2xl">📝</div>
                    <div>
                        <h3 className="font-bold text-gray-700 dark:text-gray-300">Daily Challenge</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No questions available yet — once your teacher creates tests, your daily quiz will appear here!</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-xl font-bold text-gray-400">
                            🔥 {streak}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const handleSelect = (optionIndex: number) => {
        if (showAnswer) return;
        setSelected(optionIndex);
        setShowAnswer(true);

        const isCorrect = optionIndex === questions[currentQ].correctOption;
        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        if (isCorrect) {
            setCorrectCount(newCorrectCount);
        }

        // Auto-save progress to Firestore session (fire-and-forget)
        const sid = sessionIdRef.current;
        if (sid) {
            const updatedAnswers = new Array(questions.length).fill(null);
            // Mark current as answered
            for (let i = 0; i <= currentQ; i++) {
                updatedAnswers[i] = i === currentQ ? optionIndex : i;
            }
            updateSessionProgress(sid, {
                currentQuestion: Math.min(currentQ + 1, questions.length - 1),
                answers: updatedAnswers,
                score: newCorrectCount,
            }).catch(err => console.error('[Quizy] Daily session save failed:', err));
        }

        // Auto-advance after 1.5s
        setTimeout(() => {
            if (currentQ < questions.length - 1) {
                setCurrentQ(prev => prev + 1);
                setSelected(null);
                setShowAnswer(false);
            } else {
                // Quiz done — submit
                handleFinish(newCorrectCount);
            }
        }, 1200);
    };

    const handleFinish = async (finalScore: number) => {
        setSubmitting(true);
        try {
            const result = await submitDailyQuiz(user, finalScore, questions.length);
            setResultStreak(result.currentStreak);
            setResultLongest(result.longestStreak);
            setStreakMessage(result.message);
        } catch (err) {
            console.error('[Quizy] Daily quiz submit error:', err);
        }
        // Mark session as completed
        const sid = sessionIdRef.current;
        if (sid) {
            completeTestSession(sid, finalScore).catch(err =>
                console.error('[Quizy] Daily session complete failed:', err)
            );
        }
        setSubmitting(false);
        setFinished(true);
        onComplete(finalScore, questions.length);
    };

    // ── Already completed today ──
    if (finished && !isPlaying) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 text-white"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">✅</div>
                        <div>
                            <h3 className="font-bold text-lg">Daily Challenge Complete!</h3>
                            <p className="text-white/80 text-sm">Come back tomorrow for a new one</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-2xl font-bold">
                            🔥 {resultStreak}
                        </div>
                        <p className="text-white/70 text-xs">day streak</p>
                    </div>
                </div>
                {streakMessage && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-sm text-white/90 bg-white/10 rounded-lg px-3 py-2 text-center"
                    >
                        {streakMessage}
                    </motion.p>
                )}
            </motion.div>
        );
    }

    // ── Quiz in progress ──
    if (isPlaying) {
        const q = questions[currentQ];
        const progress = ((currentQ) / questions.length) * 100;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden"
            >
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
                    <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Question {currentQ + 1} of {questions.length}
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {correctCount}/{currentQ + (showAnswer ? 1 : 0)} correct
                        </span>
                    </div>

                    {/* Question */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQ}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                        >
                            <p className="text-base font-semibold text-gray-900 dark:text-white mb-4 leading-relaxed">
                                {q.text}
                            </p>

                            {/* Options */}
                            <div className="space-y-2.5">
                                {q.options.map((opt, idx) => {
                                    const isCorrectOption = idx === q.correctOption;
                                    const isSelected = selected === idx;
                                    let optionStyle = 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800';
                                    if (showAnswer) {
                                        if (isCorrectOption) {
                                            optionStyle = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400';
                                        } else if (isSelected && !isCorrectOption) {
                                            optionStyle = 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 ring-1 ring-red-400';
                                        } else {
                                            optionStyle = 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 opacity-50';
                                        }
                                    } else if (isSelected) {
                                        optionStyle = 'bg-[#1650EB]/10 border-[#1650EB] ring-1 ring-[#1650EB]';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelect(idx)}
                                            disabled={showAnswer}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 ${optionStyle}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                    showAnswer && isCorrectOption
                                                        ? 'bg-emerald-500 text-white'
                                                        : showAnswer && isSelected && !isCorrectOption
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {showAnswer && isCorrectOption ? '✓' : showAnswer && isSelected && !isCorrectOption ? '✗' : String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{opt}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {showAnswer && q.explanation && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                                >
                                    <p className="text-xs text-blue-700 dark:text-blue-400">
                                        💡 {q.explanation}
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {submitting && (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Saving your result...
                    </div>
                )}
            </motion.div>
        );
    }

    // ── Failed state (challenge failed today) ──
    if (isFailed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-red-500/90 to-rose-600 rounded-2xl p-5 text-white"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🔒</div>
                        <div>
                            <h3 className="font-bold text-lg">Challenge Failed Today</h3>
                            <p className="text-white/80 text-sm">Come back tomorrow for a new challenge!</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-2xl font-bold">
                            🔥 {streak}
                        </div>
                        <p className="text-white/70 text-xs">day streak</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ── Card state (not started) ──
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-5 text-white cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 transition-shadow"
            onClick={async () => {
                // Create a session before starting
                if (!sessionIdRef.current) {
                    try {
                        const dailyTestId = getDailyChallengeTestId(user.studentClass || 0);
                        const session = await createTestSession({
                            userId: user.uid,
                            testId: dailyTestId,
                            sessionType: 'daily_challenge',
                            totalQuestions: questions.length,
                        });
                        setSessionId(session.id);
                        sessionIdRef.current = session.id;
                        console.log('[Quizy] Created daily challenge session:', session.id);
                    } catch (err) {
                        console.error('[Quizy] Failed to create daily session:', err);
                    }
                }
                setIsPlaying(true);
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">⚡</div>
                    <div>
                        <h3 className="font-bold text-lg">Daily Challenge</h3>
                        <p className="text-white/80 text-sm">{questions.length} quick questions • Tap to play!</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-bold">
                        🔥 {streak}
                    </div>
                    <p className="text-white/70 text-xs">
                        {streak === 0 ? 'Start streak!' : `${streak} day${streak > 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>
            {longestStreak > 0 && streak < longestStreak && (
                <p className="mt-3 text-xs text-white/70 bg-white/10 rounded-lg px-3 py-1.5 text-center">
                    🏆 Best streak: {longestStreak} days — can you beat it?
                </p>
            )}
        </motion.div>
    );
}
