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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsByStudent, hasStudentTakenTest, markNotificationAsViewed, deleteNotification, submitPdfTestDownload, markPdfTestViewed } from '@/lib/services';
import { subscribeToMistakes, subscribeToMasteredMistakes, recordAttempt } from '@/services/mistakeBucketService';
import { generateStudentReportPDF } from '@/lib/utils/generatePDF';

import type { Test, TestResult, SubjectNote, Notification, MistakeBucketItem, Question, User as AppUser } from '@/types';
import type { Homework } from '@/types/homework';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { subscribeToHomework, getStudentHomeworkCompletions } from '@/services/homeworkService';
import { requestAndStoreFCMToken } from '@/lib/messaging';
import HomeworkList from '@/components/homework/HomeworkList';
import { getDailyQuizQuestions, hasCompletedDailyQuiz, submitDailyQuiz, getDailyQuizHistory } from '@/services/dailyQuizService';

import { useChat } from '@/contexts/ChatContext';
import { saveLastRoute } from '@/lib/routePersistence';
import { generatePDFWithCover } from '@/lib/utils/generatePDFCover';
import { getUserProfile } from '@/lib/services';

import MotivationalLoader from '@/components/ui/MotivationalLoader';
import StudentSidebar from '@/components/ui/StudentSidebar';

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


    // PDF Test viewer state
    const [selectedPdfTest, setSelectedPdfTest] = useState<Test | null>(null);

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

    // Load Daily Quiz Challenge data
    useEffect(() => {
        if (!user?.uid || !user?.studentClass) return;
        setDailyQuizLoading(true);
        Promise.all([
            getDailyQuizQuestions(user.studentClass),
            hasCompletedDailyQuiz(user.uid),
        ]).then(([questions, completed]) => {
            setDailyQuizQuestions(questions);
            setDailyQuizCompleted(completed);
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

    // Compute average score for stats
    const scorableResults = results.filter(r => !r.isPdfTest && r.totalQuestions > 0);
    const pdfEvaluatedResults = results.filter(r => r.isPdfTest && r.pdfEvaluated && r.pdfMaxMarks && r.pdfMaxMarks > 0);
    const totalScorable = scorableResults.length + pdfEvaluatedResults.length;
    const averageScore = totalScorable > 0
        ? Math.round(
            (
                scorableResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) +
                pdfEvaluatedResults.reduce((acc, r) => acc + ((r.pdfMarksAwarded || 0) / (r.pdfMaxMarks || 1)) * 100, 0)
            ) / totalScorable
        )
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-16 pb-24 lg:pb-8">
                {/* Welcome Section - Only shown on Tests tab */}
                {activeTab === 'tests' && (
                <div className="mb-5"
                >
                    {/* Welcome Section - Simple & Light */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Greeting */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">
                                    {!currentTime ? '👋' : currentTime.getHours() < 12 ? '🌅' : currentTime.getHours() < 17 ? '☀️' : '🌙'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    {!currentTime ? 'Welcome' : currentTime.getHours() < 12 ? 'Good Morning' : currentTime.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {results.length === 0 ? (
                                    <>Welcome, <span className="text-[#1650EB]">{user.name}</span>! 🎉</>
                                ) : (
                                    <>Welcome back, <span className="text-[#1650EB]">{user.name}</span>! 👋</>
                                )}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                {results.length === 0 ? "Let's start with your first test!" : `Class ${user.studentClass} Student`}
                            </p>
                        </div>
                    </div>
                </div>
                )}


                {/* Daily Quiz Challenge — shown on Tests tab ONLY if not completed */}
                {activeTab === 'tests' && !dailyQuizCompleted && (
                    <DailyQuizCard
                        questions={dailyQuizQuestions}
                        completed={dailyQuizCompleted}
                        loading={dailyQuizLoading}
                        user={user}
                        streak={user.currentStreak || 0}
                        longestStreak={user.longestStreak || 0}
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            📚 Available Tests for Class {user.studentClass}
                        </h3>

                        <div className="mb-5 relative">
                            {/* Button Row: Filters + Daily Challenge side by side */}
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={() => {
                                        setShowFilters(!showFilters);
                                        setShowDailyHistory(false);
                                        if (!showFilters) setFilterTouched(new Set());
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        showFilters || filterSubject !== 'All' || filterType !== 'All' || filterStatus !== 'All'
                                            ? 'bg-[#1650EB] text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        showDailyHistory
                                            ? 'bg-amber-500 text-white shadow-md'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                    }`}
                                >
                                    🔥 Daily Challenge
                                    {dailyHistory.length > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${showDailyHistory ? 'bg-white/25 text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'}`}>
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
                                            className="absolute left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 shadow-xl"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTests.map((test, index) => {
                                    const hasTaken = takenTests.has(test.id);
                                    const result = results.find(r => r.testId === test.id);
                                    const isScheduled = test.scheduledStartTime && new Date(test.scheduledStartTime) > new Date();
                                    const isExpired = !hasTaken && test.expiresAt && new Date(test.expiresAt) < new Date();
                                    const countdown = countdowns[test.id];

                                    return (
                                        <div
                                            key={test.id}
                                            className={`group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border ${hasTaken ? 'border-green-200 dark:border-green-800' : isExpired ? 'border-red-200 dark:border-red-800 opacity-75' : isScheduled ? 'border-orange-200 dark:border-orange-800' : test.isPdfTest ? 'border-rose-200 dark:border-rose-800' : 'border-gray-200 dark:border-gray-800'} hover:shadow-lg transition-shadow duration-200`}
                                        >
                                            {/* Gradient Header */}
                                            <div className={`h-24 relative ${hasTaken ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500' :
                                                isExpired ? 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600' :
                                                    isScheduled ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500' :
                                                        test.isPdfTest ? 'bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500' :
                                                            'bg-gradient-to-br from-[#1650EB] via-[#3b7dd8] to-[#6095DB]'
                                                }`}>
                                                {/* Decorative Elements */}
                                                <div className="absolute inset-0 overflow-hidden">
                                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
                                                    <div className="absolute -bottom-8 -left-4 w-32 h-32 bg-white/5 rounded-full" />
                                                </div>
                                                {/* Subject Badge */}
                                                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                                                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                                        {test.isCombinedSubject ? '📚 Combined' : test.subject}
                                                    </span>
                                                    {test.difficultyLevel && (
                                                        <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                                            {test.difficultyLevel}
                                                        </span>
                                                    )}
                                                    {test.isPdfTest && (
                                                        <span className="inline-block px-2 py-1 bg-white/30 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                                            📋 PDF
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Progress Circle (for completed tests) */}
                                                {hasTaken && result && (() => {
                                                    const isPdf = result.isPdfTest;
                                                    const scorePercent = isPdf
                                                        ? (result.pdfEvaluated && result.pdfMaxMarks ? Math.round(((result.pdfMarksAwarded || 0) / result.pdfMaxMarks) * 100) : null)
                                                        : (result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : null);
                                                    if (scorePercent === null) return null;
                                                    return (
                                                        <div className="absolute top-3 right-3">
                                                            <div className="relative w-14 h-14">
                                                                <svg className="w-14 h-14 transform -rotate-90">
                                                                    <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
                                                                    <circle
                                                                        cx="28" cy="28" r="24"
                                                                        stroke="white" strokeWidth="4" fill="none"
                                                                        strokeLinecap="round"
                                                                        strokeDasharray={`${(scorePercent / 100) * 150.8} 150.8`}
                                                                    />
                                                                </svg>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-white text-sm font-bold">{scorePercent}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                            </div>

                                            {/* Card Content */}
                                            <div className="p-5">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#1650EB] transition-colors">{test.title}</h4>
                                                {test.isCombinedSubject && test.combinedSubjects && test.combinedSubjects.length > 0 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                        {test.combinedSubjects.join(' • ')}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                    {test.isPdfTest ? (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-4 h-4" />
                                                            PDF Test Paper
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="flex items-center gap-1">
                                                                <BookOpen className="w-4 h-4" />
                                                                {test.questionCount || '?'} Questions
                                                            </span>
                                                            {test.duration && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-4 h-4" />
                                                                    {test.duration} min
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Countdown Timer for Scheduled Tests */}
                                                {isScheduled && countdown && (
                                                    <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" />
                                                                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Starts in:</span>
                                                            </div>
                                                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400 font-mono">
                                                                {countdown}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Expiry Info for tests with expiry */}
                                                {test.expiresAt && !hasTaken && !isExpired && (
                                                    <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Hourglass className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
                                                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Expires:</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                                                {new Date(test.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PDF Test Actions */}
                                                {test.isPdfTest ? (() => {
                                                    const pdfResult = results.find(r => r.testId === test.id && r.isPdfTest);
                                                    const hasDownloaded = hasTaken && pdfResult;

                                                    if (hasDownloaded && pdfResult?.pdfEvaluated) {
                                                        // Evaluated by teacher — show marks
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                                                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                                    <div className="flex-1">
                                                                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                                                            Marks: {pdfResult.pdfMarksAwarded}/{pdfResult.pdfMaxMarks}
                                                                        </span>
                                                                        {pdfResult.pdfTeacherRemarks && (
                                                                            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                                                                                &quot;{pdfResult.pdfTeacherRemarks}&quot;
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => downloadPdfTest(test)}
                                                                    className="flex items-center justify-center gap-2 w-full py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Re-download PDF
                                                                </button>
                                                            </div>
                                                        );
                                                    } else if (hasDownloaded) {
                                                        // Downloaded but not yet evaluated
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                                                        Completed • Awaiting marks
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => downloadPdfTest(test)}
                                                                    className="flex items-center justify-center gap-2 w-full py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Re-download PDF
                                                                </button>
                                                            </div>
                                                        );
                                                    } else {
                                                        // Not downloaded yet — show actions
                                                        return (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setSelectedPdfTest(test)}
                                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-pink-700 transition-all"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" /> View PDF
                                                                </button>
                                                                {test.pdfUrl && (
                                                                    <button
                                                                        onClick={() => downloadPdfTest(test)}
                                                                        className="flex items-center justify-center gap-2 py-3 px-4 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                                        title="Download PDF"
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                })() : hasTaken && result ? (
                                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                                                        <Trophy className="w-5 h-5" />
                                                        <span className="text-sm font-medium">Completed • {result.score}/{result.totalQuestions} correct</span>
                                                    </div>
                                                ) : isExpired ? (
                                                    <div className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-medium cursor-not-allowed border border-red-200 dark:border-red-800">
                                                        <Hourglass className="w-4 h-4" />
                                                        ⏰ Expired – Unattempted
                                                    </div>
                                                ) : isScheduled ? (
                                                    <div className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-medium cursor-not-allowed">
                                                        <Timer className="w-4 h-4" />
                                                        Waiting for test to start
                                                    </div>
                                                ) : (
                                                    <Link href={`/test/${test.id}`} className="flex items-center justify-center gap-2 w-full py-3 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                                        Start Test <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                )}
                                            </div>
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                📊 My Test Reports
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reports available instantly for 24 hours</p>
                        </div>
                        {results.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No test reports yet. Complete a test to see your detailed analysis!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {results.map((result, index) => {
                                    const reportAvailable = isReportAvailable(result);
                                    const reportExpired = isReportExpired(result);
                                    const scorePercent = result.isPdfTest
                                        ? (result.pdfEvaluated && result.pdfMaxMarks ? Math.round(((result.pdfMarksAwarded || 0) / result.pdfMaxMarks) * 100) : 0)
                                        : (result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0);
                                    return (
                                        <motion.div
                                            key={result.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${reportExpired ? 'border-gray-300 dark:border-gray-700 opacity-60' : 'border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-block px-3 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">{result.subject}</span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${scorePercent >= 70 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : scorePercent >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                                                            {scorePercent >= 70 ? <CheckCircle className="w-3 h-3" /> : scorePercent >= 40 ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                            {scorePercent}%
                                                        </span>
                                                        {reportExpired && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                                Expired
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{result.testTitle}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {result.isPdfTest
                                                            ? (result.pdfEvaluated
                                                                ? `Marks: ${result.pdfMarksAwarded}/${result.pdfMaxMarks}`
                                                                : 'Awaiting evaluation')
                                                            : `Score: ${result.score}/${result.totalQuestions}`
                                                        } • {new Date(result.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {reportExpired ? (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl">
                                                            <Clock className="w-4 h-4" />
                                                            <span className="text-sm">Report Expired</span>
                                                        </div>
                                                    ) : reportAvailable ? (
                                                        <>
                                                            <button
                                                                onClick={() => downloadReport(result)}
                                                                className="flex items-center gap-2 px-3 py-2 border border-[#1650EB] text-[#1650EB] dark:text-[#6095DB] dark:border-[#6095DB] rounded-xl font-medium hover:bg-[#1650EB]/10 transition-colors"
                                                                title="Download PDF Report"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedReport(result)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                                            >
                                                                <FileText className="w-4 h-4" /> View Report
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                                                            <Clock className="w-4 h-4" />
                                                            <span className="text-sm">{getTimeRemaining(result)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Recent Results Summary */}
                        {results.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Recent Results</h3>
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                                {results.slice(0, 5).map((result) => (
                                                    <tr key={result.id}>
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{result.testTitle}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{result.subject}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {(() => {
                                                                const pct = result.isPdfTest
                                                                    ? (result.pdfEvaluated && result.pdfMaxMarks ? ((result.pdfMarksAwarded || 0) / result.pdfMaxMarks) : 0)
                                                                    : (result.totalQuestions > 0 ? result.score / result.totalQuestions : 0);
                                                                const label = result.isPdfTest
                                                                    ? (result.pdfEvaluated ? `${result.pdfMarksAwarded}/${result.pdfMaxMarks}` : 'Pending')
                                                                    : `${result.score}/${result.totalQuestions}`;
                                                                return (
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pct >= 0.7
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                        : pct >= 0.4
                                                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                        }`}>
                                                                        {label} ({Math.round(pct * 100)}%)
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                            {result.timestamp.toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats Summary */}
                        {results.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Your Stats</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="px-4 py-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-center">
                                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{results.length}</p>
                                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">Tests Taken</p>
                                    </div>
                                    <div className="px-4 py-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-center">
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{averageScore}%</p>
                                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Avg Score</p>
                                    </div>
                                    <div className="px-4 py-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl text-center">
                                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{tests.length}</p>
                                        <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">Active Tests</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}


                {/* Study Notes Tab */}
                {activeTab === 'notes' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            📚 Study Notes for Class {user.studentClass}
                        </h3>
                        {notes.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No study notes available for your class yet.</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Check back later for new materials from your teachers!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {notes.map((note, index) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow ${!readNoteIds.has(note.id) ? 'ring-2 ring-green-500' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">
                                                        {note.subject}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${note.contentType === 'json' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                                        {note.contentType.toUpperCase()}
                                                    </span>
                                                    {!readNoteIds.has(note.id) && (
                                                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full animate-pulse">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{note.title}</h4>
                                                {note.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{note.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            Added: {note.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleMarkNoteAsRead(note.id);
                                                setSelectedNote(note);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            {readNoteIds.has(note.id) ? 'View Notes' : 'Read Notes'}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Homework Tab */}
                {activeTab === 'homework' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            📝 Homework for Class {user.studentClass}
                        </h3>
                        <HomeworkList homeworks={homeworks} loading={homeworkLoading} studentId={user?.uid} studentName={user?.name} />
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
                                        {selectedReport.subject} • {selectedReport.isPdfTest
                                            ? (selectedReport.pdfEvaluated ? `Marks: ${selectedReport.pdfMarksAwarded}/${selectedReport.pdfMaxMarks} (${Math.round(((selectedReport.pdfMarksAwarded || 0) / (selectedReport.pdfMaxMarks || 1)) * 100)}%)` : 'Awaiting evaluation')
                                            : `Score: ${selectedReport.score}/${selectedReport.totalQuestions} (${selectedReport.totalQuestions > 0 ? Math.round((selectedReport.score / selectedReport.totalQuestions) * 100) : 0}%)`}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedReport.detailedAnswers && selectedReport.detailedAnswers.length > 0 ? (
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
                                ) : (
                                    <div className="text-center py-12">
                                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400">Detailed answer breakdown is not available for this test.</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                            {selectedReport.isPdfTest
                                                ? (selectedReport.pdfEvaluated ? `Your marks: ${selectedReport.pdfMarksAwarded}/${selectedReport.pdfMaxMarks} (${Math.round(((selectedReport.pdfMarksAwarded || 0) / (selectedReport.pdfMaxMarks || 1)) * 100)}%)` : 'Awaiting teacher evaluation')
                                                : `Your score: ${selectedReport.score}/${selectedReport.totalQuestions} (${selectedReport.totalQuestions > 0 ? Math.round((selectedReport.score / selectedReport.totalQuestions) * 100) : 0}%)`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedReport.score} Correct</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedReport.totalQuestions - selectedReport.score} Incorrect</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadReport(selectedReport)}
                                        className="flex items-center gap-2 px-4 py-2 border border-[#1650EB] text-[#1650EB] dark:text-[#6095DB] dark:border-[#6095DB] rounded-xl font-medium hover:bg-[#1650EB]/10 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Download PDF</span>
                                    </button>
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

    // Main Practice Mode view
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    🎯 Practice Mode
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Review your mistakes and master every question
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mistakeItems.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{masteredCount}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Mastered</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mistakeItems.length + masteredCount}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mistake Bucket CTA */}
            {mistakeItems.length > 0 ? (
                <div className="space-y-4 mb-8">
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

                    {/* Review all mistakes */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-r from-[#1650EB] to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-[#1650EB]/20 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all"
                        onClick={() => startReview(mistakeItems)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-lg">Review All Mistakes 📚</h4>
                                <p className="text-blue-200 text-sm mt-1">
                                    {mistakeItems.length} question{mistakeItems.length > 1 ? 's' : ''} in your bucket — get each right once to clear it!
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Subject breakdown */}
                    {Object.keys(subjectGroups).length > 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(subjectGroups).map(([subject, count]) => (
                                <button
                                    key={subject}
                                    onClick={() => startReview(mistakeItems.filter(item => item.subject === subject))}
                                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 hover:border-[#1650EB] dark:hover:border-[#1650EB] transition-all text-left group"
                                >
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#1650EB] dark:group-hover:text-[#6095DB] transition-colors">{subject}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{count} mistake{count > 1 ? 's' : ''}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                <h4 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Coming Soon</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { emoji: '⏱️', title: 'Timed Challenges', desc: 'Beat the clock on practice questions' },
                        { emoji: '📊', title: 'Weak Topic Analysis', desc: 'AI identifies your weakest subjects' },
                        { emoji: '🏆', title: 'Practice Streaks', desc: 'Build daily practice habits' },
                        { emoji: '🎮', title: 'Quiz Battle', desc: 'Challenge classmates in real-time' },
                        { emoji: '🧠', title: 'Spaced Repetition', desc: 'Smart scheduling for long-term memory' },
                        { emoji: '📝', title: 'Custom Practice Sets', desc: 'Create your own practice quizzes' },
                    ].map((feature) => (
                        <div
                            key={feature.title}
                            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 opacity-70 hover:opacity-100 transition-opacity"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{feature.emoji}</span>
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{feature.title}</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{feature.desc}</p>
                                </div>
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
    onComplete: (score: number, total: number) => void;
}

function DailyQuizCard({ questions, completed, loading, user, streak, longestStreak, onComplete }: DailyQuizCardProps) {
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

    // ── Loading state ──
    if (loading) {
        return (
            <div className="mb-6 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-800/30 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-300/30 dark:bg-amber-700/30 rounded-xl" />
                    <div className="flex-1">
                        <div className="h-5 bg-amber-300/30 dark:bg-amber-700/30 rounded-lg w-40 mb-2" />
                        <div className="h-3 bg-amber-300/20 dark:bg-amber-700/20 rounded-lg w-56" />
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
        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
        }

        // Auto-advance after 1.5s
        setTimeout(() => {
            if (currentQ < questions.length - 1) {
                setCurrentQ(prev => prev + 1);
                setSelected(null);
                setShowAnswer(false);
            } else {
                // Quiz done — submit
                handleFinish(correctCount + (isCorrect ? 1 : 0));
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
                className="mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-500/20"
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

    // ── Card state (not started) ──
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setIsPlaying(true)}
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
