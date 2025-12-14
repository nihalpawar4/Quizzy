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
    ArrowLeft,
    Mail,
    Ban,
    ShieldCheck,
    ShieldX,
    Shield,
    Timer,
    CalendarClock,
    FileText,
    BookMarked,
    Save,
    Bell,
    Megaphone,
    Coins,
    Gift,
    Award,
    Star,
    Sparkles,
    ToggleLeft,
    ToggleRight,
    MessageCircle
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
    updateTestStatus,
    restrictStudent,
    enableStudent,
    deleteStudent,
    updateTest,
    updateTestQuestions,
    getQuestionsByTestId,
    createNote,
    deleteNote,
    updateNoteStatus,
    createAnnouncement,
    createTestNotification,
    createNoteNotification,
    subscribeToTeacherAnnouncements,
    deleteNotification,
    deleteRelatedAnnouncements
} from '@/lib/services';
import {
    getAllWallets,
    grantBonusCoins,
    awardBadge,
    awardCustomBadge,
    createPremiumTest,
    getAllPremiumTests,
    updatePremiumTest,
    deletePremiumTest,
    getAllTransactions,
    getBadgeInfo,
    getAppSettings,
    toggleCreditEconomy,
    deleteAllTransactions,
    deleteAllStudentTransactions,
    deleteStudentWalletAndData,
    getCreditEconomyStats,
    cleanupAllDuplicateWelcomeBonuses,
    type AppSettings
} from '@/lib/creditServices';
import { downloadCSV, downloadAnalyticsCSV } from '@/lib/utils/downloadCSV';
import { parseCSV, parseJSON, type ParsedQuestion } from '@/lib/utils/parseQuestions';
import type { Test, TestResult, User, SubjectNote, CreditWallet, PremiumTest, CreditTransaction, BadgeType, Question, Notification } from '@/types';
import { CREDIT_CONSTANTS } from '@/types';
import { CLASS_OPTIONS, SUBJECTS, COLLECTIONS } from '@/lib/constants';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useChat } from '@/contexts/ChatContext';

type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'one_word' | 'short_answer' | 'mixed';

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
    { value: 'mixed', label: 'Comprehensive', description: 'All types via JSON (AI-friendly)', icon: '🎯' },
];

export default function TeacherDashboard() {
    const { user, loading: authLoading, signOut } = useAuth();
    const { totalUnreadCount } = useChat();
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

    // Student management state
    const [studentActionLoading, setStudentActionLoading] = useState<string | null>(null); // uid of student being processed
    const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<string | null>(null); // uid of student to delete

    // Tab state
    const [activeTab, setActiveTab] = useState<'tests' | 'analytics' | 'notes' | 'credits'>('tests');

    // Profile dropdown state
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    // Auto-close profile dropdown after 3 seconds
    useEffect(() => {
        if (showProfileDropdown) {
            const timer = setTimeout(() => {
                setShowProfileDropdown(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showProfileDropdown]);

    // Create test states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1); // Step 1: Details, Step 2: Question Type, Step 3: Upload
    const [newTest, setNewTest] = useState<{
        title: string;
        subject: typeof SUBJECTS[number];
        targetClass: number;
        duration: number;
        questionType: QuestionType;
        scheduledStartTime: string; // ISO string or empty
        marksPerQuestion: number;
        negativeMarking: boolean;
        negativeMarksPerQuestion: number;
        enableAntiCheat: boolean;
        showInstructions: boolean;
        // Credit economy fields
        coinCost: number;
        isPremium: boolean;
        isMandatory: boolean;
    }>({
        title: '',
        subject: SUBJECTS[0],
        targetClass: 5,
        duration: 30,
        questionType: 'mcq',
        scheduledStartTime: '',
        marksPerQuestion: 1,
        negativeMarking: false,
        negativeMarksPerQuestion: 0.25,
        enableAntiCheat: false,
        showInstructions: true,
        coinCost: 0,
        isPremium: false,
        isMandatory: false
    });

    // Proctoring report modal state
    const [selectedProctoringResult, setSelectedProctoringResult] = useState<TestResult | null>(null);
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
    const [currentQuestion, setCurrentQuestion] = useState<{
        text: string;
        options: string[];
        correctOption: number;
        type: QuestionType;
        correctAnswer: string;
    }>({
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        type: 'mcq',
        correctAnswer: ''
    });

    // Edit test states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTest, setEditingTest] = useState<Test | null>(null);
    const [editTestData, setEditTestData] = useState<{
        title: string;
        subject: typeof SUBJECTS[number];
        targetClass: number;
        duration: number;
        isActive: boolean;
        scheduledStartTime: string;
    }>({
        title: '',
        subject: SUBJECTS[0],
        targetClass: 5,
        duration: 30,
        isActive: true,
        scheduledStartTime: ''
    });
    const [editQuestions, setEditQuestions] = useState<ParsedQuestion[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editSuccess, setEditSuccess] = useState(false);
    const [loadingEditQuestions, setLoadingEditQuestions] = useState(false);

    // Notes states
    const [notes, setNotes] = useState<SubjectNote[]>([]);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [newNote, setNewNote] = useState<{
        title: string;
        subject: typeof SUBJECTS[number];
        targetClass: number;
        description: string;
        contentType: 'json' | 'pdf' | 'text';
        content: string;
    }>({
        title: '',
        subject: SUBJECTS[0],
        targetClass: 5,
        description: '',
        contentType: 'json',
        content: ''
    });
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [noteSuccess, setNoteSuccess] = useState(false);
    const [noteError, setNoteError] = useState<string | null>(null);

    // Announcement states
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState<{
        title: string;
        message: string;
        targetClass: number | 'all';
    }>({
        title: '',
        message: '',
        targetClass: 'all'
    });
    const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
    const [announcementSuccess, setAnnouncementSuccess] = useState(false);

    // Announcement management states (for viewing and deleting)
    const [announcements, setAnnouncements] = useState<Notification[]>([]);
    const [showManageAnnouncementsModal, setShowManageAnnouncementsModal] = useState(false);
    const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
    const [selectedAnnouncementForDelete, setSelectedAnnouncementForDelete] = useState<Notification | null>(null);

    // ==================== CREDIT ECONOMY STATES ====================
    const [wallets, setWallets] = useState<CreditWallet[]>([]);
    const [premiumTests, setPremiumTests] = useState<PremiumTest[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([]);
    const [creditDataLoading, setCreditDataLoading] = useState(false);

    // Bonus coins modal
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [selectedStudentForBonus, setSelectedStudentForBonus] = useState<User | null>(null);
    const [bonusAmount, setBonusAmount] = useState(10);
    const [bonusReason, setBonusReason] = useState('');
    const [isSendingBonus, setIsSendingBonus] = useState(false);

    // Award badge modal
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [selectedStudentForBadge, setSelectedStudentForBadge] = useState<User | null>(null);
    const [selectedBadgeType, setSelectedBadgeType] = useState<BadgeType>('custom');
    const [customBadgeName, setCustomBadgeName] = useState('');
    const [customBadgeIcon, setCustomBadgeIcon] = useState('🏆');
    const [badgeReason, setBadgeReason] = useState('');
    const [isAwardingBadge, setIsAwardingBadge] = useState(false);

    // Premium test creation
    const [showPremiumTestModal, setShowPremiumTestModal] = useState(false);
    const [newPremiumTest, setNewPremiumTest] = useState<{
        title: string;
        subject: typeof SUBJECTS[number];
        targetClass: number;
        description: string;
        coinCost: number;
        duration: number;
        questionCount: number;
        isMandatory: boolean;
    }>({
        title: '',
        subject: SUBJECTS[0],
        targetClass: 5,
        description: '',
        coinCost: 10,
        duration: 30,
        questionCount: 10,
        isMandatory: false
    });
    const [isCreatingPremiumTest, setIsCreatingPremiumTest] = useState(false);
    const [premiumTestJson, setPremiumTestJson] = useState('');
    const [premiumParsedQuestions, setPremiumParsedQuestions] = useState<Question[]>([]);
    const [premiumParseError, setPremiumParseError] = useState('');
    const [premiumCreateStep, setPremiumCreateStep] = useState<1 | 2>(1);

    // Credit economy toggle states
    const [creditEconomyEnabled, setCreditEconomyEnabled] = useState(true);
    const [isTogglingCredit, setIsTogglingCredit] = useState(false);
    const [isDeletingTransactions, setIsDeletingTransactions] = useState(false);
    const [showDeleteTransactionsConfirm, setShowDeleteTransactionsConfirm] = useState(false);

    // Credit economy stats
    const [creditStats, setCreditStats] = useState({ studentsWithGlow: 0, totalCoinsSpent: 0, premiumTestsCount: 0 });
    const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);

    const loadStudents = useCallback(async () => {
        try {
            const studentsData = await getAllStudents();
            setStudents(studentsData);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }, []);

    // Load credit economy data
    const loadCreditData = useCallback(async () => {
        setCreditDataLoading(true);
        try {
            const [walletsData, premiumTestsData, transactionsData, statsData] = await Promise.all([
                getAllWallets(),
                getAllPremiumTests(),
                getAllTransactions(50),
                getCreditEconomyStats()
            ]);
            setWallets(walletsData);
            setPremiumTests(premiumTestsData);
            setRecentTransactions(transactionsData);
            setCreditStats({
                studentsWithGlow: statsData.studentsWithGlow,
                totalCoinsSpent: statsData.totalCoinsSpent,
                premiumTestsCount: statsData.premiumTestsCount
            });
        } catch (error) {
            console.error('Error loading credit data:', error);
        } finally {
            setCreditDataLoading(false);
        }
    }, []);

    // Handle credit economy toggle
    const handleToggleCreditEconomy = async () => {
        if (!user) return;
        setIsTogglingCredit(true);
        try {
            const newState = !creditEconomyEnabled;
            await toggleCreditEconomy(newState, user.uid);
            setCreditEconomyEnabled(newState);
        } catch (error) {
            console.error('Error toggling credit economy:', error);
            alert('Failed to toggle credit economy. Please try again.');
        } finally {
            setIsTogglingCredit(false);
        }
    };

    // Handle delete all transactions
    const handleDeleteAllTransactions = async () => {
        setIsDeletingTransactions(true);
        try {
            const deleted = await deleteAllTransactions();
            alert(`Successfully deleted ${deleted} transactions.`);
            setShowDeleteTransactionsConfirm(false);
            // Reload transactions
            const txData = await getAllTransactions(50);
            setRecentTransactions(txData);
        } catch (error) {
            console.error('Error deleting transactions:', error);
            alert('Failed to delete transactions. Please try again.');
        } finally {
            setIsDeletingTransactions(false);
        }
    };

    // Handle cleanup of duplicate welcome bonus transactions
    const handleCleanupDuplicates = async () => {
        try {
            const result = await cleanupAllDuplicateWelcomeBonuses();
            if (result.cleaned === 0) {
                alert('✅ No duplicate welcome bonus transactions found!');
            } else {
                alert(`🧹 Cleaned ${result.cleaned} duplicate transaction(s) from ${result.studentsAffected} student(s).`);
            }
            // Reload transactions
            const txData = await getAllTransactions(50);
            setRecentTransactions(txData);
        } catch (error) {
            console.error('Error cleaning duplicates:', error);
            alert('Failed to clean up duplicates. Please try again.');
        }
    };

    // Handle delete wallet and all related data
    const handleDeleteWallet = async (studentId: string, studentName: string) => {
        if (!confirm(`Delete wallet and all credit economy data for ${studentName}? This action cannot be undone.`)) {
            return;
        }

        setDeletingWalletId(studentId);
        try {
            const result = await deleteStudentWalletAndData(studentId);
            alert(`Deleted: Wallet (${result.wallet ? 'yes' : 'no'}), ${result.transactions} transactions, ${result.badges} badges`);
            // Reload credit data
            loadCreditData();
        } catch (error) {
            console.error('Error deleting wallet:', error);
            alert('Failed to delete wallet. Please try again.');
        } finally {
            setDeletingWalletId(null);
        }
    };


    // Handle granting bonus coins
    const handleGrantBonus = async () => {
        if (!selectedStudentForBonus || !user || bonusAmount <= 0 || !bonusReason.trim()) {
            return;
        }

        setIsSendingBonus(true);
        try {
            const result = await grantBonusCoins(
                selectedStudentForBonus.uid,
                bonusAmount,
                bonusReason,
                user.uid,
                user.name
            );

            if (result.success) {
                alert(result.message);
                setShowBonusModal(false);
                setSelectedStudentForBonus(null);
                setBonusAmount(10);
                setBonusReason('');
                loadCreditData(); // Refresh data
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error granting bonus:', error);
            alert('Failed to grant bonus coins.');
        } finally {
            setIsSendingBonus(false);
        }
    };

    // Handle awarding badge
    const handleAwardBadge = async () => {
        if (!selectedStudentForBadge || !user || !badgeReason.trim()) {
            return;
        }

        setIsAwardingBadge(true);
        try {
            if (selectedBadgeType === 'custom' && customBadgeName.trim()) {
                await awardCustomBadge(
                    selectedStudentForBadge.uid,
                    selectedStudentForBadge.name,
                    customBadgeName,
                    customBadgeIcon,
                    badgeReason,
                    user.uid,
                    user.name
                );
            } else {
                await awardBadge(
                    selectedStudentForBadge.uid,
                    selectedStudentForBadge.name,
                    selectedBadgeType,
                    badgeReason,
                    user.uid,
                    user.name
                );
            }

            alert(`Badge awarded to ${selectedStudentForBadge.name}!`);
            setShowBadgeModal(false);
            setSelectedStudentForBadge(null);
            setSelectedBadgeType('custom');
            setCustomBadgeName('');
            setBadgeReason('');
        } catch (error) {
            console.error('Error awarding badge:', error);
            alert('Failed to award badge.');
        } finally {
            setIsAwardingBadge(false);
        }
    };

    // Parse premium test JSON
    const handleParsePremiumJson = () => {
        setPremiumParseError('');
        if (!premiumTestJson.trim()) {
            setPremiumParseError('Please paste your JSON questions');
            return;
        }

        try {
            const parsed = JSON.parse(premiumTestJson);
            const questions: Question[] = [];

            // Handle array of questions or object with questions array
            const questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

            if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
                setPremiumParseError('No questions found in JSON. Please provide an array of questions.');
                return;
            }

            questionsArray.forEach((q: { question?: string; text?: string; options?: string[]; correctOption?: number; answer?: number | string; correct?: number | string; type?: string; correctAnswer?: string }, index: number) => {
                const questionText = q.question || q.text || '';
                if (!questionText) {
                    throw new Error(`Question ${index + 1} is missing text`);
                }

                const options = q.options || [];
                let correctOption = 0;
                let correctAnswer = '';

                if (q.correctOption !== undefined) {
                    correctOption = q.correctOption;
                } else if (q.answer !== undefined) {
                    correctOption = typeof q.answer === 'number' ? q.answer : parseInt(q.answer as string) || 0;
                } else if (q.correct !== undefined) {
                    correctOption = typeof q.correct === 'number' ? q.correct : parseInt(q.correct as string) || 0;
                }

                if (q.correctAnswer) {
                    correctAnswer = q.correctAnswer;
                }

                questions.push({
                    id: `premium-q-${index}`,
                    testId: '',
                    text: questionText,
                    options: options,
                    correctOption: correctOption,
                    correctAnswer: correctAnswer,
                    type: (q.type as Question['type']) || 'mcq'
                });
            });

            setPremiumParsedQuestions(questions);
            setNewPremiumTest(prev => ({ ...prev, questionCount: questions.length }));
            setPremiumCreateStep(2);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            setPremiumParseError(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Reset premium test form
    const resetPremiumTestForm = () => {
        setNewPremiumTest({
            title: '',
            subject: SUBJECTS[0],
            targetClass: 5,
            description: '',
            coinCost: 10,
            duration: 30,
            questionCount: 10,
            isMandatory: false
        });
        setPremiumTestJson('');
        setPremiumParsedQuestions([]);
        setPremiumParseError('');
        setPremiumCreateStep(1);
    };

    // Handle creating premium test with questions
    const handleCreatePremiumTest = async () => {
        if (!user || !newPremiumTest.title.trim() || premiumParsedQuestions.length === 0) {
            setPremiumParseError('Please provide a title and questions');
            return;
        }

        setIsCreatingPremiumTest(true);
        try {
            // 1. Create the actual test in TESTS collection
            const testId = await createTest({
                title: newPremiumTest.title,
                subject: newPremiumTest.subject,
                targetClass: newPremiumTest.targetClass,
                duration: newPremiumTest.duration,
                createdBy: user.uid,
                isActive: true,
                questionCount: premiumParsedQuestions.length,
                marksPerQuestion: 1,
                negativeMarking: false,
                negativeMarksPerQuestion: 0,
                enableAntiCheat: true,
                showInstructions: true,
                coinCost: newPremiumTest.coinCost,
                isPremium: true,
                isMandatory: newPremiumTest.isMandatory
            });

            // 2. Upload questions to the test
            await uploadQuestions(testId, premiumParsedQuestions as unknown as ParsedQuestion[]);

            // 3. Create premium test entry for student dashboard
            await createPremiumTest({
                testId: testId, // Link to actual test
                title: newPremiumTest.title,
                subject: newPremiumTest.subject,
                targetClass: newPremiumTest.targetClass,
                description: newPremiumTest.description,
                coinCost: newPremiumTest.coinCost,
                questionCount: premiumParsedQuestions.length,
                duration: newPremiumTest.duration,
                isActive: true,
                isMandatory: newPremiumTest.isMandatory,
                createdBy: user.uid,
                createdByName: user.name
            });

            alert('🎉 Premium test created successfully with ' + premiumParsedQuestions.length + ' questions!');
            setShowPremiumTestModal(false);
            resetPremiumTestForm();
            loadCreditData();
        } catch (error) {
            console.error('Error creating premium test:', error);
            alert('Failed to create premium test. Please try again.');
        } finally {
            setIsCreatingPremiumTest(false);
        }
    };

    // Delete premium test
    const handleDeletePremiumTest = async (testId: string) => {
        if (!confirm('Are you sure you want to delete this premium test? This action cannot be undone.')) return;

        try {
            await deletePremiumTest(testId);
            loadCreditData(); // Refresh data
            alert('Premium test deleted successfully!');
        } catch (error) {
            console.error('Error deleting premium test:', error);
            alert('Failed to delete premium test.');
        }
    };

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
            // Load students once (they don't change often)
            loadStudents();
            loadCreditData(); // Load credit economy data
            // Load app settings
            getAppSettings().then(settings => {
                setCreditEconomyEnabled(settings.creditEconomyEnabled);
            });
        }
    }, [user, authLoading, router, loadStudents, loadCreditData]);

    // Real-time listener for app settings
    useEffect(() => {
        const settingsRef = doc(db, COLLECTIONS.APP_SETTINGS, 'main');
        const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setCreditEconomyEnabled(data.creditEconomyEnabled ?? true);
            }
        });
        return () => unsubscribe();
    }, []);

    // Real-time listener for tests
    useEffect(() => {
        if (!user) return;

        const testsRef = collection(db, COLLECTIONS.TESTS);
        const q = query(testsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allTests: Test[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allTests.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    scheduledStartTime: data.scheduledStartTime?.toDate() || undefined
                } as Test);
            });
            setTests(allTests);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Real-time listener for results (analytics)
    useEffect(() => {
        if (!user) return;

        const resultsRef = collection(db, COLLECTIONS.RESULTS);
        const q = query(resultsRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allResults: TestResult[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                allResults.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : undefined),
                    endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : undefined)
                } as TestResult);
            });
            setResults(allResults);
        });

        return () => unsubscribe();
    }, [user]);

    // Real-time listener for notes
    useEffect(() => {
        if (!user) return;

        const notesRef = collection(db, COLLECTIONS.NOTES);
        const q = query(notesRef, orderBy('createdAt', 'desc'));

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
    }, [user]);

    // Real-time listener for premium tests (teacher dashboard)
    useEffect(() => {
        if (!user) return;

        const premiumTestsRef = collection(db, COLLECTIONS.PREMIUM_TESTS);
        const q = query(premiumTestsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tests: PremiumTest[] = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                tests.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                } as PremiumTest);
            });
            setPremiumTests(tests);
        });

        return () => unsubscribe();
    }, [user]);

    // Real-time listener for teacher's announcements
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = subscribeToTeacherAnnouncements(user.uid, (announcementsList) => {
            setAnnouncements(announcementsList);
        });

        return () => unsubscribe();
    }, [user?.uid]);

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

        // Build options based on question type from Step 2 selection
        const questionType = newTest.questionType;
        let options: string[] = [];
        let correctAnswer: string | undefined = undefined;

        if (questionType === 'mcq') {
            options = currentQuestion.options.filter(o => o.trim());
            if (options.length < 2) {
                setParseError('MCQ questions need at least 2 options');
                return;
            }
        } else if (questionType === 'true_false') {
            options = ['True', 'False'];
        } else {
            // Text-based questions (fill_blank, one_word, short_answer)
            if (!currentQuestion.correctAnswer.trim()) {
                setParseError('Please provide the correct answer');
                return;
            }
            options = [currentQuestion.correctAnswer.trim()];
            correctAnswer = currentQuestion.correctAnswer.trim();
        }

        const newQuestion: ParsedQuestion = {
            text: currentQuestion.text,
            options,
            correctOption: questionType === 'true_false'
                ? (currentQuestion.correctAnswer.toLowerCase() === 'false' ? 1 : 0)
                : currentQuestion.correctOption,
            type: questionType as ParsedQuestion['type'],
            correctAnswer
        };

        setManualQuestions([...manualQuestions, newQuestion]);
        setCurrentQuestion({
            text: '',
            options: ['', '', '', ''],
            correctOption: 0,
            type: questionType as ParsedQuestion['type'], // Keep matching the test type
            correctAnswer: ''
        });
        setParseError(null);
    };

    // Create test
    const handleCreateTest = async () => {
        // For mixed type, always use parsedQuestions; for manual mode use manualQuestions
        const questions = newTest.questionType === 'mixed'
            ? parsedQuestions
            : (uploadMethod === 'manual' ? manualQuestions : parsedQuestions);

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
                questionCount: questions.length,
                marksPerQuestion: newTest.marksPerQuestion,
                negativeMarking: newTest.negativeMarking,
                negativeMarksPerQuestion: newTest.negativeMarksPerQuestion,
                enableAntiCheat: newTest.enableAntiCheat,
                showInstructions: newTest.showInstructions,
                // Credit economy fields
                coinCost: newTest.coinCost,
                isPremium: newTest.isPremium,
                isMandatory: newTest.isMandatory,
                ...(newTest.scheduledStartTime ? { scheduledStartTime: new Date(newTest.scheduledStartTime) } : {})
            });

            await uploadQuestions(testId, questions);

            // If this is a premium test, also create a premium test entry for student dashboard
            if (newTest.isPremium) {
                await createPremiumTest({
                    testId: testId, // Link to the actual test
                    title: newTest.title,
                    subject: newTest.subject,
                    targetClass: newTest.targetClass,
                    description: `Premium test: ${newTest.title}`,
                    coinCost: newTest.coinCost,
                    questionCount: questions.length,
                    duration: newTest.duration,
                    isActive: true,
                    isMandatory: newTest.isMandatory,
                    createdBy: user!.uid,
                    createdByName: user!.name
                });
            }

            setCreateSuccess(true);
            // Data updates automatically via real-time listener

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
        setNewTest({
            title: '',
            subject: SUBJECTS[0],
            targetClass: 5,
            duration: 30,
            questionType: 'mcq',
            scheduledStartTime: '',
            marksPerQuestion: 1,
            negativeMarking: false,
            negativeMarksPerQuestion: 0.25,
            enableAntiCheat: false,
            showInstructions: true,
            coinCost: 0,
            isPremium: false,
            isMandatory: false
        });
        setCsvFile(null);
        setJsonInput('');
        setParsedQuestions([]);
        setManualQuestions([]);
        setParseError(null);
        setUploadMethod('csv');
        setCreateStep(1);
        setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOption: 0, type: 'mcq', correctAnswer: '' });
    };

    // Delete test
    const handleDeleteTest = async (testId: string) => {
        if (!confirm('Are you sure you want to delete this test?')) return;
        try {
            await deleteTest(testId);
            // Data updates automatically via real-time listener
        } catch (error) {
            console.error('Error deleting test:', error);
        }
    };

    // Toggle test status
    const handleToggleStatus = async (testId: string, currentStatus: boolean) => {
        try {
            await updateTestStatus(testId, !currentStatus);
            // Data updates automatically via real-time listener
        } catch (error) {
            console.error('Error updating test status:', error);
        }
    };

    // Delete a result/submission
    const handleDeleteResult = async (resultId: string) => {
        if (!confirm('Are you sure you want to delete this submission? This cannot be undone.')) return;
        try {
            await deleteResult(resultId);
            // Data updates automatically via real-time listener
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

    // Restrict a student account
    const handleRestrictStudent = async (uid: string) => {
        setStudentActionLoading(uid);
        try {
            await restrictStudent(uid);
            await loadStudents(); // Refresh students list
        } catch (error) {
            console.error('Error restricting student:', error);
        } finally {
            setStudentActionLoading(null);
        }
    };

    // Enable a restricted student account
    const handleEnableStudent = async (uid: string) => {
        setStudentActionLoading(uid);
        try {
            await enableStudent(uid);
            await loadStudents(); // Refresh students list
        } catch (error) {
            console.error('Error enabling student:', error);
        } finally {
            setStudentActionLoading(null);
        }
    };

    // Delete a student account permanently
    const handleDeleteStudent = async (uid: string) => {
        setStudentActionLoading(uid);
        try {
            // First delete credit economy data
            await deleteStudentWalletAndData(uid);
            // Then delete the student account
            await deleteStudent(uid);
            setConfirmDeleteStudent(null);
            await loadStudents(); // Refresh students list
            loadCreditData(); // Refresh credit data
        } catch (error) {
            console.error('Error deleting student:', error);
        } finally {
            setStudentActionLoading(null);
        }
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

    // Open edit modal for a test
    const openEditModal = async (test: Test) => {
        setEditingTest(test);
        setEditTestData({
            title: test.title,
            subject: test.subject as typeof SUBJECTS[number],
            targetClass: test.targetClass,
            duration: test.duration || 30,
            isActive: test.isActive,
            scheduledStartTime: test.scheduledStartTime ? new Date(test.scheduledStartTime).toISOString().slice(0, 16) : ''
        });
        setShowEditModal(true);
        setLoadingEditQuestions(true);

        try {
            const questions = await getQuestionsByTestId(test.id);
            const parsedQuestions: ParsedQuestion[] = questions.map(q => ({
                text: q.text,
                options: q.options,
                correctOption: q.correctOption,
                type: q.type as ParsedQuestion['type'],
                correctAnswer: q.correctAnswer
            }));
            setEditQuestions(parsedQuestions);
        } catch (error) {
            console.error('Error loading questions:', error);
            setEditQuestions([]);
        } finally {
            setLoadingEditQuestions(false);
        }
    };

    // Close edit modal
    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingTest(null);
        setEditTestData({
            title: '',
            subject: SUBJECTS[0],
            targetClass: 5,
            duration: 30,
            isActive: true,
            scheduledStartTime: ''
        });
        setEditQuestions([]);
        setEditSuccess(false);
    };

    // Handle edit test submission
    const handleEditTest = async () => {
        if (!editingTest || !editTestData.title.trim()) {
            setParseError('Please provide a test title');
            return;
        }

        setIsEditing(true);
        try {
            // Update test details
            await updateTest(editingTest.id, {
                title: editTestData.title,
                subject: editTestData.subject,
                targetClass: editTestData.targetClass,
                duration: editTestData.duration,
                isActive: editTestData.isActive,
                ...(editTestData.scheduledStartTime ? { scheduledStartTime: new Date(editTestData.scheduledStartTime) } : {})
            });

            // If questions were modified, update them
            if (editQuestions.length > 0) {
                await updateTestQuestions(editingTest.id, editQuestions);
            }

            setEditSuccess(true);
            setTimeout(() => {
                closeEditModal();
            }, 2000);
        } catch (error) {
            console.error('Error updating test:', error);
            setParseError('Failed to update test. Please try again.');
        } finally {
            setIsEditing(false);
        }
    };

    // Remove a question from edit list
    const removeEditQuestion = (index: number) => {
        setEditQuestions(editQuestions.filter((_, i) => i !== index));
    };

    // Create new note
    const handleCreateNote = async () => {
        if (!newNote.title.trim() || !newNote.content.trim()) {
            setNoteError('Please provide a title and content');
            return;
        }

        // Validate JSON if content type is json
        if (newNote.contentType === 'json') {
            try {
                JSON.parse(newNote.content);
            } catch {
                setNoteError('Invalid JSON format. Please check your content.');
                return;
            }
        }

        setIsCreatingNote(true);
        setNoteError(null);

        try {
            await createNote({
                title: newNote.title,
                subject: newNote.subject,
                targetClass: newNote.targetClass,
                description: newNote.description,
                contentType: newNote.contentType,
                content: newNote.content,
                createdBy: user!.uid,
                isActive: true
            });

            setNoteSuccess(true);
            setTimeout(() => {
                setShowNotesModal(false);
                setNoteSuccess(false);
                resetNoteForm();
            }, 2000);
        } catch (error) {
            console.error('Error creating note:', error);
            setNoteError('Failed to create note. Please try again.');
        } finally {
            setIsCreatingNote(false);
        }
    };

    // Delete note
    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        try {
            await deleteNote(noteId);
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    // Toggle note status
    const handleToggleNoteStatus = async (noteId: string, currentStatus: boolean) => {
        try {
            await updateNoteStatus(noteId, !currentStatus);
        } catch (error) {
            console.error('Error updating note status:', error);
        }
    };

    // Create announcement
    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
            return;
        }

        setIsCreatingAnnouncement(true);

        try {
            if (newAnnouncement.targetClass === 'all') {
                // Create announcements for all classes (5-10)
                for (let classNum = 5; classNum <= 10; classNum++) {
                    await createAnnouncement({
                        title: newAnnouncement.title,
                        message: newAnnouncement.message,
                        targetClass: classNum,
                        createdBy: user!.uid,
                        createdByName: user?.name || 'Teacher'
                    });
                }
            } else {
                await createAnnouncement({
                    title: newAnnouncement.title,
                    message: newAnnouncement.message,
                    targetClass: newAnnouncement.targetClass as number,
                    createdBy: user!.uid,
                    createdByName: user?.name || 'Teacher'
                });
            }

            setAnnouncementSuccess(true);
            setTimeout(() => {
                setShowAnnouncementModal(false);
                setAnnouncementSuccess(false);
                setNewAnnouncement({ title: '', message: '', targetClass: 'all' });
            }, 2000);
        } catch (error) {
            console.error('Error creating announcement:', error);
        } finally {
            setIsCreatingAnnouncement(false);
        }
    };

    // Delete single announcement
    const handleDeleteAnnouncement = async (announcementId: string) => {
        setDeletingAnnouncementId(announcementId);
        try {
            await deleteNotification(announcementId);
            // Real-time listener will update the state automatically
        } catch (error) {
            console.error('Error deleting announcement:', error);
            alert('Failed to delete announcement. Please try again.');
        } finally {
            setDeletingAnnouncementId(null);
        }
    };

    // Delete all related announcements (when sent to all classes)
    const handleDeleteRelatedAnnouncements = async (announcement: Notification) => {
        setDeletingAnnouncementId(announcement.id);
        try {
            const deletedCount = await deleteRelatedAnnouncements(announcement);
            setSelectedAnnouncementForDelete(null);
            if (deletedCount > 1) {
                alert(`Successfully deleted ${deletedCount} announcements across all classes.`);
            }
            // Real-time listener will update the state automatically
        } catch (error) {
            console.error('Error deleting related announcements:', error);
            alert('Failed to delete announcements. Please try again.');
        } finally {
            setDeletingAnnouncementId(null);
        }
    };

    // Reset note form
    const resetNoteForm = () => {
        setNewNote({
            title: '',
            subject: SUBJECTS[0],
            targetClass: 5,
            description: '',
            contentType: 'json',
            content: ''
        });
        setNoteError(null);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin" />
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
            case 'mixed':
                return `[
  {
    "type": "mcq",
    "question": "What is the capital of India?",
    "options": ["Mumbai", "Delhi", "Chennai", "Kolkata"],
    "correct": 1
  },
  {
    "type": "true_false",
    "question": "The Earth revolves around the Sun.",
    "answer": "True"
  },
  {
    "type": "fill_blank",
    "question": "The chemical formula for water is ___.",
    "answer": "H2O"
  },
  {
    "type": "one_word",
    "question": "What is the largest planet in our solar system?",
    "answer": "Jupiter"
  },
  {
    "type": "short_answer",
    "question": "Explain the process of photosynthesis in 2-3 sentences.",
    "answer": "Photosynthesis is the process by which plants make food. They use sunlight, water, and carbon dioxide to produce glucose and oxygen."
  }
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
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1650EB] to-[#1650EB] rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white">Quizy</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Teacher Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/chat"
                            className="relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#1650EB]/10 to-[#6095DB]/10 hover:from-[#1650EB]/20 hover:to-[#6095DB]/20 transition-colors group"
                            title="Chat with Students"
                        >
                            <div className="relative">
                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="hidden md:inline text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">Chat</span>
                        </Link>

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                                title="Profile Menu"
                            >
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                                </div>
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.name}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-[#1650EB] transition-all"
                                    />
                                ) : (
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:ring-2 group-hover:ring-[#1650EB] transition-all">
                                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                    </div>
                                )
                                }
                                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden lg:block" />
                            </button>

                            {/* Profile Dropdown */}
                            <AnimatePresence>
                                {showProfileDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-20 sm:top-full sm:mt-2 sm:w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[60]"
                                    >
                                        <div className="p-2">
                                            <Link
                                                href="/profile"
                                                onClick={() => setShowProfileDropdown(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                                            >
                                                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[#1650EB]" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">Profile Settings</span>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setShowProfileDropdown(false);
                                                    handleSignOut();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                                            >
                                                <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-red-600">Logout</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header >

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">
                            {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
                        </span>
                        <p className="text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">
                            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
                        </p>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome, {user.name}! 👋
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your tests, view student performance, and create engaging assessments.
                    </p>
                </motion.div>

                {/* Tabs - Moved below greeting */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
                    <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {[
                            { id: 'tests', label: 'My Tests', icon: BookOpen },
                            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                            { id: 'notes', label: 'Subject Notes', icon: BookMarked },
                            ...(creditEconomyEnabled ? [{ id: 'credits', label: 'Credit Economy', icon: Coins }] : []),
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? tab.id === 'credits'
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm'
                                        : 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'notes' && notes.length > 0 && (
                                    <span className="bg-[#1650EB]/20 text-[#1650EB] dark:bg-[#6095DB]/20 dark:text-[#6095DB] text-xs px-1.5 py-0.5 rounded-full">
                                        {notes.length}
                                    </span>
                                )}
                                {tab.id === 'credits' && wallets.length > 0 && (
                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs px-1.5 py-0.5 rounded-full">
                                        {wallets.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats Cards - Clickable */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => { setActiveTab('tests'); setShowTestsModal(true); }}
                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all hover:shadow-lg hover:scale-[1.02] text-left group ${activeTab === 'tests' ? 'border-[#1650EB] dark:border-[#6095DB] ring-2 ring-[#1650EB]/20' : 'border-gray-200 dark:border-gray-800'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTests}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
                            </div>
                        </div>
                        <p className="text-xs text-[#1650EB] dark:text-[#6095DB] mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all tests →</p>
                    </button>
                    <button
                        onClick={() => { setActiveTab('credits'); setShowStudentsModal(true); }}
                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all hover:shadow-lg hover:scale-[1.02] text-left group ${activeTab === 'credits' ? 'border-green-500 dark:border-green-400 ring-2 ring-green-500/20' : 'border-gray-200 dark:border-gray-800'}`}
                    >
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
                    <button
                        onClick={() => { setActiveTab('analytics'); setShowSubmissionsModal(true); }}
                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all hover:shadow-lg hover:scale-[1.02] text-left group ${activeTab === 'analytics' ? 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/20' : 'border-gray-200 dark:border-gray-800'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6 text-[#1650EB] dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{results.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
                            </div>
                        </div>
                        <p className="text-xs text-[#1650EB] dark:text-purple-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all submissions →</p>
                    </button>
                    <button
                        onClick={() => { setActiveTab('analytics'); setShowScoreModal(true); }}
                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all hover:shadow-lg hover:scale-[1.02] text-left group border-gray-200 dark:border-gray-800`}
                    >
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

                {/* Tests Tab */}
                {activeTab === 'tests' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Create Test Button */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Tests</h3>
                            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                                {announcements.length > 0 && (
                                    <button
                                        onClick={() => setShowManageAnnouncementsModal(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Megaphone className="w-4 h-4" />
                                        <span className="hidden xs:inline">Manage</span>
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                                            {announcements.length}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowAnnouncementModal(true)}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                                >
                                    <Megaphone className="w-4 h-4" />
                                    <span>Announce</span>
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1650EB] text-white rounded-lg text-sm font-medium hover:bg-[#1243c7] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Test</span>
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400 mb-4">No tests created yet.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
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
                                    const isScheduled = test.scheduledStartTime && new Date(test.scheduledStartTime) > new Date();

                                    return (
                                        <motion.div
                                            key={test.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${isScheduled ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full">
                                                            {test.subject}
                                                        </span>
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                                            Class {test.targetClass}
                                                        </span>
                                                        {isScheduled && (
                                                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full flex items-center gap-1">
                                                                <Timer className="w-3 h-3" />
                                                                Scheduled
                                                            </span>
                                                        )}
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

                                            {/* Scheduled Start Time Info */}
                                            {isScheduled && (
                                                <div className="mb-4 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-xs">
                                                        <CalendarClock className="w-3.5 h-3.5" />
                                                        <span>Starts: {new Date(test.scheduledStartTime!).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            )}

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
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-[#6095DB]/30 dark:border-indigo-800 text-[#1650EB] dark:text-[#6095DB] rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Analytics
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(test)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTest(test.id)}
                                                    className="flex items-center justify-center gap-2 py-2 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                            >
                                <option value="all">All Classes</option>
                                {CLASS_OPTIONS.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
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
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marks</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proctoring</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {filteredResults.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    No results found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredResults.slice(0, 50).map((result) => {
                                                const formatDuration = (seconds?: number) => {
                                                    if (!seconds) return '-';
                                                    const hours = Math.floor(seconds / 3600);
                                                    const mins = Math.floor((seconds % 3600) / 60);
                                                    const secs = seconds % 60;
                                                    if (hours > 0) return `${hours}h ${mins}m`;
                                                    return `${mins}m ${secs}s`;
                                                };

                                                const hasAntiCheatData = result.antiCheatEnabled && (
                                                    (result.tabSwitchCount || 0) > 0 ||
                                                    (result.copyAttempts || 0) > 0 ||
                                                    (result.rightClickAttempts || 0) > 0 ||
                                                    (result.fullscreenExits || 0) > 0
                                                );

                                                return (
                                                    <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{result.studentName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{result.studentEmail}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            Class {result.studentClass}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm text-gray-900 dark:text-white">{result.testTitle}</p>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{result.subject}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(result.score / result.totalQuestions) >= 0.7
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : (result.score / result.totalQuestions) >= 0.4
                                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                }`}>
                                                                {result.score}/{result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {result.marksObtained !== undefined ? (
                                                                <div className="text-sm">
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {result.marksObtained.toFixed(1)}/{result.totalMarks}
                                                                    </p>
                                                                    {(result.negativeMarksApplied || 0) > 0 && (
                                                                        <p className="text-xs text-red-500">
                                                                            -{result.negativeMarksApplied?.toFixed(2)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm">
                                                                <p className="font-medium text-gray-900 dark:text-white">
                                                                    {formatDuration(result.timeTakenSeconds)}
                                                                </p>
                                                                {result.startTime && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {new Date(result.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {new Date(result.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {result.antiCheatEnabled ? (
                                                                <button
                                                                    onClick={() => setSelectedProctoringResult(result)}
                                                                    className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    title="Click for detailed report"
                                                                >
                                                                    {hasAntiCheatData ? (
                                                                        <>
                                                                            <span className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded">
                                                                                <ShieldX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                                            </span>
                                                                            <span className="text-xs text-amber-600 underline">View</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                                                                                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                                            </span>
                                                                            <span className="text-xs text-green-600 underline">View</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">Off</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => handleDeleteResult(result.id)}
                                                                className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Delete submission"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
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

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Header with Create Button */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subject Notes</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Upload study materials for students in JSON or text format</p>
                            </div>
                            <button
                                onClick={() => setShowNotesModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Notes
                            </button>
                        </div>

                        {notes.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                                <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400 mb-4">No notes uploaded yet.</p>
                                <button
                                    onClick={() => setShowNotesModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Upload Your First Notes
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {notes.map((note) => (
                                    <motion.div
                                        key={note.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${note.isActive ? 'border-gray-200 dark:border-gray-800' : 'border-red-200 dark:border-red-800 opacity-60'}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs font-medium rounded-full">
                                                        {note.subject}
                                                    </span>
                                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                                        Class {note.targetClass}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${note.contentType === 'json' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : note.contentType === 'pdf' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                                        {note.contentType.toUpperCase()}
                                                    </span>
                                                </div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{note.title}</h4>
                                                {note.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{note.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleToggleNoteStatus(note.id, note.isActive)}
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${note.isActive
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                {note.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>

                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            Created: {note.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(note.content);
                                                    alert('Content copied to clipboard!');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="flex items-center justify-center gap-2 py-2 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Credit Economy Tab */}
                {activeTab === 'credits' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-start gap-2">
                                    <Coins className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Credit Economy
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Manage student coins, award badges, and create premium tests
                                        </p>
                                    </div>
                                </div>
                                {/* Credit Economy Toggle */}
                                <button
                                    onClick={handleToggleCreditEconomy}
                                    disabled={isTogglingCredit}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${creditEconomyEnabled
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}
                                    title={creditEconomyEnabled ? 'Credit Economy: ON - Click to disable' : 'Credit Economy: OFF - Click to enable'}
                                >
                                    {isTogglingCredit ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : creditEconomyEnabled ? (
                                        <>
                                            <ToggleRight className="w-5 h-5" />
                                            <span className="hidden sm:inline">Enabled</span>
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="w-5 h-5" />
                                            <span className="hidden sm:inline">Disabled</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-4">
                                <button
                                    onClick={() => {
                                        resetPremiumTestForm();
                                        setShowPremiumTestModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-lg text-sm font-medium hover:from-amber-500 hover:to-yellow-600 transition-colors"
                                >
                                    <Star className="w-4 h-4" />
                                    <span>Create Premium Test</span>
                                </button>
                                <button
                                    onClick={loadCreditData}
                                    disabled={creditDataLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {creditDataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl p-6 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{wallets.reduce((acc, w) => acc + w.balance, 0)}</p>
                                        <p className="text-white/80 text-sm">Total Coins in Circulation</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{wallets.filter(w => w.hasGlowStatus).length}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Students with Glow</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                                        <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{premiumTests.length}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Premium Tests</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                                        <Gift className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{wallets.reduce((acc, w) => acc + w.totalSpent, 0)}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Coins Spent</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Premium Tests Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500" /> Premium Tests
                            </h4>
                            {premiumTests.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No premium tests created yet</p>
                                    <button
                                        onClick={() => setShowPremiumTestModal(true)}
                                        className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-500 hover:to-yellow-600 transition-colors"
                                    >
                                        Create First Premium Test
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {premiumTests.map((test) => (
                                        <div key={test.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h5 className="font-medium text-gray-900 dark:text-white">{test.title}</h5>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{test.subject} • Class {test.targetClass}</p>
                                                </div>
                                                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                                    <Coins className="w-3 h-3" /> {test.isMandatory ? 'FREE' : test.coinCost}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                <span>{test.questionCount} questions</span>
                                                <span>{test.totalAttempts} attempts</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${test.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                                    {test.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                <button
                                                    onClick={async () => {
                                                        await updatePremiumTest(test.id, { isActive: !test.isActive });
                                                        loadCreditData();
                                                    }}
                                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${test.isActive ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'}`}
                                                >
                                                    {test.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePremiumTest(test.id)}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Student Wallets Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Student Wallets
                            </h4>
                            {wallets.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <Coins className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No student wallets yet. Wallets are created when students log in.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weekly Spent</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                            {wallets.map((wallet) => {
                                                const student = students.find(s => s.uid === wallet.studentId);
                                                return (
                                                    <tr key={wallet.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${wallet.hasGlowStatus ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                                    {wallet.hasGlowStatus ? <Sparkles className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-gray-500" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{wallet.studentName}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Class {wallet.studentClass}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="font-bold text-amber-600 dark:text-amber-400">{wallet.balance}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600 dark:text-gray-400">{wallet.weeklySpent}/40</span>
                                                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-amber-500"
                                                                        style={{ width: `${Math.min(100, (wallet.weeklySpent / 40) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {wallet.hasGlowStatus ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-medium rounded-full">
                                                                    <Sparkles className="w-3 h-3" /> Glowing
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">Normal</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedStudentForBonus(student || null);
                                                                        setShowBonusModal(true);
                                                                    }}
                                                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                                    title="Grant Bonus Coins"
                                                                >
                                                                    <Gift className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedStudentForBadge(student || null);
                                                                        setShowBadgeModal(true);
                                                                    }}
                                                                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                                    title="Award Badge"
                                                                >
                                                                    <Award className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteWallet(wallet.studentId, wallet.studentName)}
                                                                    disabled={deletingWalletId === wallet.studentId}
                                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Delete Wallet & Data"
                                                                >
                                                                    {deletingWalletId === wallet.studentId ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Recent Transactions
                                </h4>
                                {recentTransactions.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCleanupDuplicates}
                                            className="text-xs px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                                            title="Remove duplicate welcome bonus transactions"
                                        >
                                            Fix Duplicates
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteTransactionsConfirm(true)}
                                            className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}
                            </div>
                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {recentTransactions.slice(0, 20).map((tx) => (
                                        <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'allowance' ? 'bg-green-100 dark:bg-green-900/50' :
                                                tx.type === 'bonus' ? 'bg-amber-100 dark:bg-amber-900/50' :
                                                    tx.type === 'test_attempt' ? 'bg-blue-100 dark:bg-blue-900/50' :
                                                        'bg-purple-100 dark:bg-purple-900/50'
                                                }`}>
                                                {tx.type === 'allowance' ? <Gift className="w-4 h-4 text-green-600" /> :
                                                    tx.type === 'bonus' ? <Sparkles className="w-4 h-4 text-amber-600" /> :
                                                        tx.type === 'test_attempt' ? <Target className="w-4 h-4 text-blue-600" /> :
                                                            <Star className="w-4 h-4 text-purple-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.studentName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.description}</p>
                                            </div>
                                            <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    ))}
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
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${createStep >= step ? 'bg-[#1650EB] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                                        {step}
                                                    </div>
                                                    <span className={`text-sm hidden sm:block ${createStep >= step ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                                        {step === 1 ? 'Details' : step === 2 ? 'Question Type' : 'Upload'}
                                                    </span>
                                                    {step < 3 && <div className={`w-8 h-0.5 ${createStep > step ? 'bg-[#1650EB]' : 'bg-gray-200 dark:bg-gray-700'}`} />}
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
                                                        <input type="text" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} placeholder="e.g., Chapter 5 Quiz" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label>
                                                        <select value={newTest.subject} onChange={(e) => setNewTest({ ...newTest, subject: e.target.value as typeof SUBJECTS[number] })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none">
                                                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Class *</label>
                                                        <select value={newTest.targetClass} onChange={(e) => setNewTest({ ...newTest, targetClass: Number(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none">
                                                            {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                                                        <input type="number" value={newTest.duration} onChange={(e) => setNewTest({ ...newTest, duration: Number(e.target.value) })} min={5} max={180} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none" />
                                                    </div>
                                                </div>

                                                {/* Scheduled Start Time Section */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                                            <CalendarClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">Schedule Test Start Time (Optional)</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Set a specific time when students can start taking this test</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                <Timer className="w-4 h-4 inline mr-1" />
                                                                Scheduled Start Date & Time
                                                            </label>
                                                            <input
                                                                type="datetime-local"
                                                                value={newTest.scheduledStartTime}
                                                                onChange={(e) => setNewTest({ ...newTest, scheduledStartTime: e.target.value })}
                                                                min={new Date().toISOString().slice(0, 16)}
                                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                            />
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Leave empty to make test available immediately
                                                            </p>
                                                        </div>
                                                        {newTest.scheduledStartTime && (
                                                            <div className="flex items-center">
                                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 w-full">
                                                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                                                                        <Timer className="w-4 h-4" />
                                                                        <span className="font-medium">Students will see countdown</span>
                                                                    </div>
                                                                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                                                                        Test starts: {new Date(newTest.scheduledStartTime).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Credit Economy Settings Section */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                                            <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">Credit Economy Settings</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Set coin cost for taking this test (counts toward student glow rewards)</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                <Coins className="w-4 h-4 inline mr-1" />
                                                                Coin Cost
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newTest.coinCost}
                                                                onChange={(e) => setNewTest({ ...newTest, coinCost: Number(e.target.value) })}
                                                                min={0}
                                                                max={100}
                                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                            />
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Set to 0 for free tests
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewTest({ ...newTest, isMandatory: !newTest.isMandatory, coinCost: newTest.isMandatory ? newTest.coinCost : 0 })}
                                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-full ${newTest.isMandatory ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                                                            >
                                                                <div className={`w-5 h-5 rounded flex items-center justify-center ${newTest.isMandatory ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                                    {newTest.isMandatory && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">Free / Mandatory</p>
                                                                    <p className="text-xs text-gray-500">No coin cost</p>
                                                                </div>
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewTest({ ...newTest, isPremium: !newTest.isPremium })}
                                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-full ${newTest.isPremium ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                                                            >
                                                                <div className={`w-5 h-5 rounded flex items-center justify-center ${newTest.isPremium ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                                    {newTest.isPremium && <Star className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">Premium Test</p>
                                                                    <p className="text-xs text-gray-500">Show premium badge</p>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {newTest.coinCost > 0 && !newTest.isMandatory && (
                                                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                                                <Coins className="w-4 h-4" />
                                                                <span className="font-medium">Students will spend {newTest.coinCost} coins to take this test</span>
                                                            </div>
                                                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                                                This spending will count toward their weekly glow status goal of 40 coins.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Marking Settings Section */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                                            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">Marking Settings</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Configure points and negative marking</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Marks per Correct Answer
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newTest.marksPerQuestion}
                                                                onChange={(e) => setNewTest({ ...newTest, marksPerQuestion: Number(e.target.value) })}
                                                                min={1}
                                                                max={10}
                                                                step={0.5}
                                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Enable Negative Marking
                                                            </label>
                                                            <button
                                                                onClick={() => setNewTest({ ...newTest, negativeMarking: !newTest.negativeMarking })}
                                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${newTest.negativeMarking
                                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                                                                    }`}
                                                            >
                                                                <span className={newTest.negativeMarking ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                                                                    {newTest.negativeMarking ? 'Yes - Enabled' : 'No - Disabled'}
                                                                </span>
                                                                <div className={`w-10 h-6 rounded-full transition-colors ${newTest.negativeMarking ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${newTest.negativeMarking ? 'translate-x-4.5 ml-4' : 'ml-0.5'}`} />
                                                                </div>
                                                            </button>
                                                        </div>
                                                        {newTest.negativeMarking && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                    Negative Marks per Wrong Answer
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={newTest.negativeMarksPerQuestion}
                                                                    onChange={(e) => setNewTest({ ...newTest, negativeMarksPerQuestion: Number(e.target.value) })}
                                                                    min={0}
                                                                    max={newTest.marksPerQuestion}
                                                                    step={0.25}
                                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {newTest.negativeMarking && (
                                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                            <p className="text-sm text-red-700 dark:text-red-400">
                                                                ⚠️ Students will lose <strong>{newTest.negativeMarksPerQuestion}</strong> marks for each wrong answer
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Anti-Cheat Settings Section */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">Anti-Cheat Settings</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Enable proctoring features for secure testing</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setNewTest({ ...newTest, enableAntiCheat: !newTest.enableAntiCheat })}
                                                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${newTest.enableAntiCheat
                                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Shield className={`w-6 h-6 ${newTest.enableAntiCheat ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                                                            <div className="text-left">
                                                                <p className={`font-medium ${newTest.enableAntiCheat ? 'text-purple-700 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                    {newTest.enableAntiCheat ? 'Proctoring Enabled' : 'Proctoring Disabled'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {newTest.enableAntiCheat ? 'Fullscreen mode, tab switch & copy detection enabled' : 'Standard test mode without proctoring'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`w-10 h-6 rounded-full transition-colors ${newTest.enableAntiCheat ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${newTest.enableAntiCheat ? 'translate-x-4.5 ml-4' : 'ml-0.5'}`} />
                                                        </div>
                                                    </button>
                                                    {newTest.enableAntiCheat && (
                                                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                                                <p className="text-xs text-purple-700 dark:text-purple-400">🖥️ Fullscreen</p>
                                                            </div>
                                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                                                <p className="text-xs text-purple-700 dark:text-purple-400">🚫 No Copy/Paste</p>
                                                            </div>
                                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                                                <p className="text-xs text-purple-700 dark:text-purple-400">👁️ Tab Detection</p>
                                                            </div>
                                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                                                <p className="text-xs text-purple-700 dark:text-purple-400">📊 Reports</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Instructions Screen Toggle */}
                                                    <div className="mt-4">
                                                        <button
                                                            onClick={() => setNewTest({ ...newTest, showInstructions: !newTest.showInstructions })}
                                                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${newTest.showInstructions
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl">{newTest.showInstructions ? '📋' : '⚡'}</span>
                                                                <div className="text-left">
                                                                    <p className={`font-medium ${newTest.showInstructions ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                        {newTest.showInstructions ? 'Show Instructions Screen' : 'Skip Instructions'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {newTest.showInstructions
                                                                            ? 'Students must read & agree to rules before starting'
                                                                            : 'Test starts immediately without instructions'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-10 h-6 rounded-full transition-colors ${newTest.showInstructions ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${newTest.showInstructions ? 'translate-x-4.5 ml-4' : 'ml-0.5'}`} />
                                                            </div>
                                                        </button>
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
                                                        <button key={type.value} onClick={() => setNewTest({ ...newTest, questionType: type.value })} className={`p-6 rounded-2xl border-2 transition-all text-left ${newTest.questionType === type.value ? 'border-[#1650EB] bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
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
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {newTest.questionType === 'mixed'
                                                                ? 'Paste JSON with mixed question types (MCQ, True/False, Fill Blank, etc.)'
                                                                : `Upload or enter your ${newTest.questionType.replace('_', ' ')} questions`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* AI Tip for Mixed/Comprehensive */}
                                                {newTest.questionType === 'mixed' && (
                                                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-2xl">🤖</span>
                                                            <div>
                                                                <p className="font-medium text-purple-900 dark:text-purple-200">AI Tip: Generate Questions Instantly!</p>
                                                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                                                    Copy the sample JSON format below and ask ChatGPT or any AI:
                                                                    <span className="italic">"Generate 20 questions on [topic] for class [X] in this JSON format with mixed types"</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Upload Method Selection - Hide for mixed type (JSON only) */}
                                                {newTest.questionType !== 'mixed' ? (
                                                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                                                        {[{ id: 'csv', label: 'CSV Upload', icon: FileSpreadsheet }, { id: 'json', label: 'JSON Paste', icon: FileJson }, { id: 'manual', label: 'Manual Entry', icon: Edit }].map((method) => (
                                                            <button key={method.id} onClick={() => setUploadMethod(method.id as typeof uploadMethod)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${uploadMethod === method.id ? 'bg-white dark:bg-gray-900 text-[#1650EB] dark:text-[#6095DB] shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                                                <method.icon className="w-4 h-4" />
                                                                {method.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-xl w-fit text-[#1650EB] dark:text-[#6095DB] font-medium">
                                                        <FileJson className="w-4 h-4" />
                                                        JSON Format Required for Mixed Types
                                                    </div>
                                                )}

                                                {/* CSV Upload - Not available for mixed type */}
                                                {uploadMethod === 'csv' && newTest.questionType !== 'mixed' && (
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
                                                            <label htmlFor="csv-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors cursor-pointer">
                                                                <Upload className="w-4 h-4" /> Select CSV File
                                                            </label>
                                                        </div>
                                                        {csvFile && <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{csvFile.name} uploaded</p>}
                                                    </div>
                                                )}

                                                {/* JSON Paste - Always show for mixed type */}
                                                {(uploadMethod === 'json' || newTest.questionType === 'mixed') && (
                                                    <div className="space-y-4">
                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample JSON Format:</p>
                                                                <button
                                                                    onClick={() => { navigator.clipboard.writeText(sampleJSON); }}
                                                                    className="text-xs text-[#1650EB] hover:underline"
                                                                >
                                                                    Copy Sample
                                                                </button>
                                                            </div>
                                                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">{sampleJSON}</pre>
                                                        </div>
                                                        <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Paste your JSON here..." rows={8} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-[#1650EB] outline-none" />
                                                        <button onClick={handleJSONParse} className="flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
                                                            <FileJson className="w-4 h-4" /> Parse JSON
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Manual Entry - Not available for mixed type */}
                                                {uploadMethod === 'manual' && newTest.questionType !== 'mixed' && (
                                                    <div className="space-y-4">
                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Text</label>
                                                                <input type="text" value={currentQuestion.text} onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} placeholder={newTest.questionType === 'fill_blank' ? "Enter question with _____ for blank..." : "Enter your question..."} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none" />
                                                            </div>

                                                            {/* MCQ Options */}
                                                            {newTest.questionType === 'mcq' && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options (select correct answer)</label>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {currentQuestion.options.map((opt, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2">
                                                                                <input type="radio" name="correctOption" checked={currentQuestion.correctOption === idx} onChange={() => setCurrentQuestion({ ...currentQuestion, correctOption: idx })} className="w-4 h-4 text-[#1650EB]" />
                                                                                <input type="text" value={opt} onChange={(e) => { const newOptions = [...currentQuestion.options]; newOptions[idx] = e.target.value; setCurrentQuestion({ ...currentQuestion, options: newOptions }); }} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#1650EB] outline-none" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* True/False Options */}
                                                            {newTest.questionType === 'true_false' && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Correct Answer</label>
                                                                    <div className="flex gap-4">
                                                                        {['True', 'False'].map((opt) => (
                                                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${currentQuestion.correctAnswer === opt ? 'border-[#1650EB] bg-[#1650EB]/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                                                                <input type="radio" name="tfOption" checked={currentQuestion.correctAnswer === opt} onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: opt })} className="w-4 h-4 text-[#1650EB]" />
                                                                                <span className={`font-medium ${currentQuestion.correctAnswer === opt ? 'text-[#1650EB]' : 'text-gray-700 dark:text-gray-300'}`}>{opt}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Text-based answers (Fill Blank, One Word, Short Answer) */}
                                                            {(newTest.questionType === 'fill_blank' || newTest.questionType === 'one_word' || newTest.questionType === 'short_answer') && (
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                        Correct Answer
                                                                        <span className="text-gray-400 font-normal ml-2">
                                                                            ({newTest.questionType === 'one_word' ? 'single word' : newTest.questionType === 'fill_blank' ? 'word/phrase to fill' : '2-3 sentences'})
                                                                        </span>
                                                                    </label>
                                                                    {newTest.questionType === 'short_answer' ? (
                                                                        <textarea
                                                                            value={currentQuestion.correctAnswer}
                                                                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                                                            placeholder="Enter the correct answer..."
                                                                            rows={3}
                                                                            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none resize-none"
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type="text"
                                                                            value={currentQuestion.correctAnswer}
                                                                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                                                                            placeholder="Enter the correct answer..."
                                                                            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}

                                                            <button onClick={addManualQuestion} disabled={!currentQuestion.text.trim()} className="flex items-center gap-2 px-4 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                                <Plus className="w-4 h-4" /> Add Question
                                                            </button>
                                                        </div>

                                                        {/* Added Questions List */}
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
                                                {parsedQuestions.length > 0 && (uploadMethod !== 'manual' || newTest.questionType === 'mixed') && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                                        <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{parsedQuestions.length} questions parsed successfully!</p>
                                                        {newTest.questionType === 'mixed' && (
                                                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Contains {parsedQuestions.filter(q => q.type === 'mcq').length} MCQ, {parsedQuestions.filter(q => q.type === 'true_false').length} True/False, {parsedQuestions.filter(q => q.type === 'fill_blank').length} Fill Blank, {parsedQuestions.filter(q => q.type === 'one_word').length} One Word, {parsedQuestions.filter(q => q.type === 'short_answer').length} Short Answer</p>
                                                        )}
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
                                            <button onClick={() => setCreateStep((createStep + 1) as 1 | 2 | 3)} disabled={createStep === 1 && !newTest.title.trim()} className="flex items-center gap-2 px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                Next <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={handleCreateTest} disabled={isCreating || (newTest.questionType === 'mixed' ? parsedQuestions.length === 0 : (uploadMethod === 'manual' ? manualQuestions.length === 0 : parsedQuestions.length === 0))} className="flex items-center gap-2 px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                                        <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
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
                                                        <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                                                            <UserIcon className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
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
                                <button onClick={() => setShowDetailedAnalytics(false)} className="px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] transition-colors">
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
                                    <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-[#1650EB]" />
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
                                                                <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs rounded-full">{test.subject}</span>
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
                                            const isLoading = studentActionLoading === student.uid;
                                            const showDeleteConfirm = confirmDeleteStudent === student.uid;
                                            return (
                                                <div key={student.uid} className={`p-4 rounded-xl border ${student.isRestricted ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-transparent'}`}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${student.isRestricted ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                                                                {student.isRestricted ? (
                                                                    <ShieldX className="w-6 h-6 text-red-600" />
                                                                ) : (
                                                                    <UserIcon className="w-6 h-6 text-green-600" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                                                                    {student.isRestricted && (
                                                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">Restricted</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <Mail className="w-4 h-4" />
                                                                    <span>{student.email}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <span className="text-xs text-gray-400">Class {student.studentClass || 'N/A'}</span>
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className="text-xs text-gray-400">{studentResults.length} tests</span>
                                                                    {avgScore !== null && (
                                                                        <>
                                                                            <span className="text-xs text-gray-400">•</span>
                                                                            <span className={`text-xs font-medium ${avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>Avg: {avgScore}%</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Action Buttons */}
                                                        {showDeleteConfirm ? (
                                                            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/50 px-3 py-2 rounded-xl">
                                                                <span className="text-sm text-red-700 dark:text-red-300">Delete permanently?</span>
                                                                <button
                                                                    onClick={() => handleDeleteStudent(student.uid)}
                                                                    disabled={isLoading}
                                                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                                                >
                                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteStudent(null)}
                                                                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300"
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                {student.isRestricted ? (
                                                                    <button
                                                                        onClick={() => handleEnableStudent(student.uid)}
                                                                        disabled={isLoading}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors disabled:opacity-50"
                                                                        title="Enable student account"
                                                                    >
                                                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                                        Enable
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleRestrictStudent(student.uid)}
                                                                        disabled={isLoading}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors disabled:opacity-50"
                                                                        title="Restrict student account"
                                                                    >
                                                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                                        Restrict
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setConfirmDeleteStudent(student.uid)}
                                                                    disabled={isLoading}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                                                                    title="Delete student permanently"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
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
                                        <Trophy className="w-5 h-5 text-[#1650EB]" />
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
                                                        <td className="py-3 px-4"><span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB]/50 text-xs rounded-full">{result.subject}</span></td>
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

            {/* Edit Test Modal */}
            <AnimatePresence>
                {showEditModal && editingTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={closeEditModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {editSuccess ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Test Updated!</h3>
                                    <p className="text-gray-600 dark:text-gray-400">Your changes have been saved successfully.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                                                    <Edit className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Test</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Modify test details and questions</p>
                                                </div>
                                            </div>
                                            <button onClick={closeEditModal} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-6">
                                        {/* Test Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Title *</label>
                                                <input
                                                    type="text"
                                                    value={editTestData.title}
                                                    onChange={(e) => setEditTestData({ ...editTestData, title: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                                                <select
                                                    value={editTestData.subject}
                                                    onChange={(e) => setEditTestData({ ...editTestData, subject: e.target.value as typeof SUBJECTS[number] })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                >
                                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Class</label>
                                                <select
                                                    value={editTestData.targetClass}
                                                    onChange={(e) => setEditTestData({ ...editTestData, targetClass: Number(e.target.value) })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                >
                                                    {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                                                <input
                                                    type="number"
                                                    value={editTestData.duration}
                                                    onChange={(e) => setEditTestData({ ...editTestData, duration: Number(e.target.value) })}
                                                    min={5}
                                                    max={180}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Scheduled Start Time */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scheduled Start Time (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={editTestData.scheduledStartTime}
                                                onChange={(e) => setEditTestData({ ...editTestData, scheduledStartTime: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                            />
                                        </div>

                                        {/* Status Toggle */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setEditTestData({ ...editTestData, isActive: !editTestData.isActive })}
                                                className={`px-4 py-2 rounded-xl font-medium ${editTestData.isActive
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                {editTestData.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {editTestData.isActive ? 'Students can see and take this test' : 'Test is hidden from students'}
                                            </span>
                                        </div>

                                        {/* Questions Preview */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Questions ({editQuestions.length})</h4>
                                            {loadingEditQuestions ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="w-6 h-6 text-[#1650EB] animate-spin" />
                                                </div>
                                            ) : editQuestions.length === 0 ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No questions found for this test.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {editQuestions.map((q, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                            <span className="text-sm text-gray-900 dark:text-white truncate flex-1 mr-2">
                                                                {idx + 1}. {q.text}
                                                            </span>
                                                            <button
                                                                onClick={() => removeEditQuestion(idx)}
                                                                className="p-1 text-red-500 hover:text-red-700"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                                        <button
                                            onClick={closeEditModal}
                                            className="px-6 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEditTest}
                                            disabled={isEditing || !editTestData.title.trim()}
                                            className="flex items-center gap-2 px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isEditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Notes Modal */}
            <AnimatePresence>
                {showNotesModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => { setShowNotesModal(false); resetNoteForm(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {noteSuccess ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Notes Created!</h3>
                                    <p className="text-gray-600 dark:text-gray-400">Your notes are now available for students.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#1650EB]/10 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                                                    <BookMarked className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Subject Notes</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Upload study materials for students</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setShowNotesModal(false); resetNoteForm(); }} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-6">
                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                                                <input
                                                    type="text"
                                                    value={newNote.title}
                                                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                                    placeholder="e.g., Chapter 5 - Photosynthesis Notes"
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label>
                                                <select
                                                    value={newNote.subject}
                                                    onChange={(e) => setNewNote({ ...newNote, subject: e.target.value as typeof SUBJECTS[number] })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                >
                                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Class *</label>
                                                <select
                                                    value={newNote.targetClass}
                                                    onChange={(e) => setNewNote({ ...newNote, targetClass: Number(e.target.value) })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                                >
                                                    {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                                            <input
                                                type="text"
                                                value={newNote.description}
                                                onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                                                placeholder="Brief description of the notes"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1650EB] outline-none"
                                            />
                                        </div>

                                        {/* Content Type Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Type *</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'json', label: 'JSON Format', icon: FileJson },
                                                    { id: 'text', label: 'Plain Text', icon: FileText },
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setNewNote({ ...newNote, contentType: type.id as 'json' | 'text' })}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${newNote.contentType === type.id
                                                            ? 'bg-[#1650EB] text-white'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        <type.icon className="w-4 h-4" />
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sample JSON Format */}
                                        {newNote.contentType === 'json' && (
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample JSON Format:</p>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`{
  "title": "Chapter Notes",
  "topics": [
    {
      "name": "Introduction",
      "content": "This is the introduction section...",
      "keyPoints": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "name": "Main Concepts",
      "content": "Main concepts explained here...",
      "formulas": ["E = mc²", "F = ma"]
    }
  ],
  "summary": "Brief summary of the chapter",
  "importantTerms": {
    "Term1": "Definition 1",
    "Term2": "Definition 2"
  }
}`)}
                                                        className="text-xs text-[#1650EB] hover:underline"
                                                    >
                                                        Copy Sample
                                                    </button>
                                                </div>
                                                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">{`{
  "title": "Chapter Notes",
  "topics": [...],
  "summary": "...",
  "importantTerms": {...}
}`}</pre>
                                            </div>
                                        )}

                                        {/* Content Input */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content *</label>
                                            <textarea
                                                value={newNote.content}
                                                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                                placeholder={newNote.contentType === 'json' ? 'Paste your JSON notes here...' : 'Enter your notes text here...'}
                                                rows={10}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-[#1650EB] outline-none"
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {noteError && (
                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                                <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {noteError}
                                                </p>
                                            </div>
                                        )}

                                        {/* Info about PDF upload */}
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                                <strong>💡 Tip for PDFs:</strong> For PDF notes, you can upload your PDF to a cloud storage (like Google Drive or Dropbox), get a shareable link, and paste it in the content field with content type as "Text". Students can then click the link to view the PDF.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                                        <button
                                            onClick={() => { setShowNotesModal(false); resetNoteForm(); }}
                                            className="px-6 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateNote}
                                            disabled={isCreatingNote || !newNote.title.trim() || !newNote.content.trim()}
                                            className="flex items-center gap-2 px-6 py-2 bg-[#1650EB] text-white rounded-xl font-medium hover:bg-[#1243c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isCreatingNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><CheckCircle className="w-4 h-4" /> Create Notes</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Proctoring Report Modal */}
            <AnimatePresence>
                {selectedProctoringResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedProctoringResult(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ||
                                            (selectedProctoringResult.copyAttempts || 0) > 0 ||
                                            (selectedProctoringResult.rightClickAttempts || 0) > 0 ||
                                            (selectedProctoringResult.fullscreenExits || 0) > 0
                                            ? 'bg-amber-100 dark:bg-amber-900/30'
                                            : 'bg-green-100 dark:bg-green-900/30'
                                            }`}>
                                            {(selectedProctoringResult.tabSwitchCount || 0) > 0 ||
                                                (selectedProctoringResult.copyAttempts || 0) > 0 ? (
                                                <ShieldX className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Proctoring Report</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProctoringResult.studentName}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedProctoringResult(null)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Test Info */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedProctoringResult.testTitle}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProctoringResult.subject} • Class {selectedProctoringResult.studentClass}</p>
                                </div>

                                {/* Timing Information */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Timing Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Started At</p>
                                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                                {selectedProctoringResult.startTime
                                                    ? new Date(selectedProctoringResult.startTime).toLocaleString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Submitted At</p>
                                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                                {selectedProctoringResult.endTime
                                                    ? new Date(selectedProctoringResult.endTime).toLocaleString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Total Duration</p>
                                            <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300">
                                                {selectedProctoringResult.timeTakenSeconds
                                                    ? `${Math.floor(selectedProctoringResult.timeTakenSeconds / 60)}m ${selectedProctoringResult.timeTakenSeconds % 60}s`
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Proctoring Violations */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Proctoring Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`rounded-lg p-3 ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                            <p className={`text-xs mb-1 ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>Tab Switches</p>
                                            <p className={`text-2xl font-bold ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {selectedProctoringResult.tabSwitchCount || 0}
                                            </p>
                                        </div>
                                        <div className={`rounded-lg p-3 ${(selectedProctoringResult.copyAttempts || 0) > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                            <p className={`text-xs mb-1 ${(selectedProctoringResult.copyAttempts || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>Copy/Paste Attempts</p>
                                            <p className={`text-2xl font-bold ${(selectedProctoringResult.copyAttempts || 0) > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {selectedProctoringResult.copyAttempts || 0}
                                            </p>
                                        </div>
                                        <div className={`rounded-lg p-3 ${(selectedProctoringResult.rightClickAttempts || 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                            <p className={`text-xs mb-1 ${(selectedProctoringResult.rightClickAttempts || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>Right-Click Attempts</p>
                                            <p className={`text-2xl font-bold ${(selectedProctoringResult.rightClickAttempts || 0) > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {selectedProctoringResult.rightClickAttempts || 0}
                                            </p>
                                        </div>
                                        <div className={`rounded-lg p-3 ${(selectedProctoringResult.fullscreenExits || 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                            <p className={`text-xs mb-1 ${(selectedProctoringResult.fullscreenExits || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>Fullscreen Exits</p>
                                            <p className={`text-2xl font-bold ${(selectedProctoringResult.fullscreenExits || 0) > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {selectedProctoringResult.fullscreenExits || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className={`p-4 rounded-xl text-center ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ||
                                    (selectedProctoringResult.copyAttempts || 0) > 0
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : (selectedProctoringResult.rightClickAttempts || 0) > 0 ||
                                        (selectedProctoringResult.fullscreenExits || 0) > 0
                                        ? 'bg-amber-100 dark:bg-amber-900/30'
                                        : 'bg-green-100 dark:bg-green-900/30'
                                    }`}>
                                    <p className={`text-sm font-medium ${(selectedProctoringResult.tabSwitchCount || 0) > 0 ||
                                        (selectedProctoringResult.copyAttempts || 0) > 0
                                        ? 'text-red-700 dark:text-red-400'
                                        : (selectedProctoringResult.rightClickAttempts || 0) > 0 ||
                                            (selectedProctoringResult.fullscreenExits || 0) > 0
                                            ? 'text-amber-700 dark:text-amber-400'
                                            : 'text-green-700 dark:text-green-400'
                                        }`}>
                                        {(selectedProctoringResult.tabSwitchCount || 0) > 0 ||
                                            (selectedProctoringResult.copyAttempts || 0) > 0
                                            ? '⚠️ Suspicious Activity Detected'
                                            : (selectedProctoringResult.rightClickAttempts || 0) > 0 ||
                                                (selectedProctoringResult.fullscreenExits || 0) > 0
                                                ? '⚡ Minor Violations Detected'
                                                : '✅ No Violations - Clean Test'}
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                                <button
                                    onClick={() => setSelectedProctoringResult(null)}
                                    className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Announcement Modal */}
            <AnimatePresence>
                {showAnnouncementModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !isCreatingAnnouncement && setShowAnnouncementModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {announcementSuccess ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Announcement Sent!</h3>
                                    <p className="text-gray-600 dark:text-gray-400">Students will receive this notification in real-time.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                                <Megaphone className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send Announcement</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Notify students in real-time</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Target Class
                                            </label>
                                            <select
                                                value={newAnnouncement.targetClass}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetClass: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            >
                                                <option value="all">All Classes (5-10)</option>
                                                {CLASS_OPTIONS.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={newAnnouncement.title}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                                placeholder="e.g., 📢 Important Update"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Message
                                            </label>
                                            <textarea
                                                value={newAnnouncement.message}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                                                placeholder="Write your announcement message here..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowAnnouncementModal(false)}
                                            disabled={isCreatingAnnouncement}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateAnnouncement}
                                            disabled={isCreatingAnnouncement || !newAnnouncement.title.trim() || !newAnnouncement.message.trim()}
                                            className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isCreatingAnnouncement ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                            ) : (
                                                <><Megaphone className="w-4 h-4" /> Send Now</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Announcements Modal */}
            <AnimatePresence>
                {showManageAnnouncementsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowManageAnnouncementsModal(false);
                            setSelectedAnnouncementForDelete(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                            <Megaphone className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Announcements</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} sent</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowManageAnnouncementsModal(false);
                                            setSelectedAnnouncementForDelete(null);
                                        }}
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {announcements.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">No announcements yet</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create an announcement to notify students</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Group announcements by title+message (to show related ones together) */}
                                        {announcements.map((announcement) => {
                                            // Check if this is part of a multi-class announcement
                                            const relatedAnnouncements = announcements.filter(a =>
                                                a.title === announcement.title &&
                                                a.message === announcement.message &&
                                                Math.abs(a.createdAt.getTime() - announcement.createdAt.getTime()) < 60000
                                            );
                                            const isMultiClass = relatedAnnouncements.length > 1;

                                            return (
                                                <div
                                                    key={announcement.id}
                                                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                                {announcement.title}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                                {announcement.message}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    Class {announcement.targetClass}
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    {new Date(announcement.createdAt).toLocaleDateString('en-IN', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                                {announcement.viewedBy && Object.keys(announcement.viewedBy).length > 0 && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                                            <Eye className="w-3 h-3" />
                                                                            {Object.keys(announcement.viewedBy).length} viewed
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {/* Delete options */}
                                                            {selectedAnnouncementForDelete?.id === announcement.id ? (
                                                                <div className="flex flex-col gap-2 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                                                                        {isMultiClass ? 'Delete announcement from:' : 'Confirm delete:'}
                                                                    </p>
                                                                    {isMultiClass && (
                                                                        <button
                                                                            onClick={() => handleDeleteRelatedAnnouncements(announcement)}
                                                                            disabled={deletingAnnouncementId === announcement.id}
                                                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {deletingAnnouncementId === announcement.id ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="w-3 h-3" />
                                                                            )}
                                                                            All classes ({relatedAnnouncements.length})
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                                        disabled={deletingAnnouncementId === announcement.id}
                                                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                                    >
                                                                        {deletingAnnouncementId === announcement.id && !isMultiClass ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-3 h-3" />
                                                                        )}
                                                                        {isMultiClass ? `Only Class ${announcement.targetClass}` : 'Delete'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedAnnouncementForDelete(null)}
                                                                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setSelectedAnnouncementForDelete(announcement)}
                                                                    className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    <span className="text-sm">Delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        💡 Deleting an announcement removes it from all students' notifications instantly
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowManageAnnouncementsModal(false);
                                            setSelectedAnnouncementForDelete(null);
                                        }}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grant Bonus Coins Modal */}
            <AnimatePresence>
                {showBonusModal && selectedStudentForBonus && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBonusModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center">
                                        <Gift className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Grant Bonus Coins</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">To {selectedStudentForBonus.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Amount
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {[5, 10, 25, 50].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setBonusAmount(amount)}
                                                className={`flex-1 py-2 rounded-xl font-medium transition-colors ${bonusAmount === amount
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {amount}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="number"
                                        value={bonusAmount}
                                        onChange={(e) => setBonusAmount(Math.max(1, parseInt(e.target.value) || 0))}
                                        min="1"
                                        className="mt-3 w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Or enter custom amount..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Reason
                                    </label>
                                    <textarea
                                        value={bonusReason}
                                        onChange={(e) => setBonusReason(e.target.value)}
                                        placeholder="Why are you giving this bonus? e.g., Great performance, extra effort..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowBonusModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGrantBonus}
                                    disabled={isSendingBonus || bonusAmount <= 0 || !bonusReason.trim()}
                                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSendingBonus ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Coins className="w-4 h-4" /> Send {bonusAmount} Coins</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Award Badge Modal */}
            <AnimatePresence>
                {showBadgeModal && selectedStudentForBadge && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBadgeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Award Badge</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">To {selectedStudentForBadge.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Custom Badge Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customBadgeName}
                                        onChange={(e) => setCustomBadgeName(e.target.value)}
                                        placeholder="e.g., Star Performer, Quiz Champion..."
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Badge Icon
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['🏆', '⭐', '🎯', '🔥', '💎', '👑', '🌟', '🎖️', '🥇', '✨'].map((icon) => (
                                            <button
                                                key={icon}
                                                onClick={() => setCustomBadgeIcon(icon)}
                                                className={`w-10 h-10 text-xl rounded-xl transition-all ${customBadgeIcon === icon
                                                    ? 'bg-purple-500 ring-2 ring-purple-300 scale-110'
                                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Reason for Award
                                    </label>
                                    <textarea
                                        value={badgeReason}
                                        onChange={(e) => setBadgeReason(e.target.value)}
                                        placeholder="Why is this student receiving this badge?"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowBadgeModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAwardBadge}
                                    disabled={isAwardingBadge || !customBadgeName.trim() || !badgeReason.trim()}
                                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-xl font-medium hover:from-purple-500 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isAwardingBadge ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Awarding...</>
                                    ) : (
                                        <><Award className="w-4 h-4" /> Award Badge</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Premium Test Modal - 2 Step Process */}
            <AnimatePresence>
                {showPremiumTestModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowPremiumTestModal(false); resetPremiumTestForm(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-amber-400 to-yellow-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Star className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-white">
                                        <h3 className="text-xl font-bold">Create Premium Test</h3>
                                        <p className="text-amber-100">Step {premiumCreateStep} of 2 - {premiumCreateStep === 1 ? 'Upload Questions (JSON)' : 'Test Details'}</p>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="mt-4 flex gap-2">
                                    <div className={`h-1 flex-1 rounded-full ${premiumCreateStep >= 1 ? 'bg-white' : 'bg-white/30'}`} />
                                    <div className={`h-1 flex-1 rounded-full ${premiumCreateStep >= 2 ? 'bg-white' : 'bg-white/30'}`} />
                                </div>
                            </div>

                            {/* Step 1: JSON Input */}
                            {premiumCreateStep === 1 && (
                                <div className="p-6 space-y-4">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                        <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">📝 JSON Format Guide</h4>
                                        <pre className="text-xs text-amber-700 dark:text-amber-400 overflow-x-auto bg-white dark:bg-gray-800 p-3 rounded-lg">
                                            {`[
  {
    "question": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctOption": 1,
    "type": "mcq"
  },
  {
    "question": "The sun rises in the east.",
    "options": ["True", "False"],
    "correctOption": 0,
    "type": "true_false"
  }
]`}
                                        </pre>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Paste Your Questions JSON
                                        </label>
                                        <textarea
                                            value={premiumTestJson}
                                            onChange={(e) => { setPremiumTestJson(e.target.value); setPremiumParseError(''); }}
                                            placeholder='[{"question":"Your question here","options":["A","B","C","D"],"correctOption":0}]'
                                            rows={10}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none font-mono text-sm"
                                        />
                                    </div>

                                    {premiumParseError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                            <p className="text-sm text-red-600 dark:text-red-400">{premiumParseError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Test Details */}
                            {premiumCreateStep === 2 && (
                                <div className="p-6 space-y-4">
                                    {/* Questions Parsed Success */}
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
                                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-green-700 dark:text-green-300">
                                                ✓ {premiumParsedQuestions.length} questions parsed successfully!
                                            </p>
                                            <p className="text-sm text-green-600 dark:text-green-400">Now fill in the test details below</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Test Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={newPremiumTest.title}
                                            onChange={(e) => setNewPremiumTest({ ...newPremiumTest, title: e.target.value })}
                                            placeholder="e.g., Advanced Math Challenge 🔥"
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Subject
                                            </label>
                                            <select
                                                value={newPremiumTest.subject}
                                                onChange={(e) => setNewPremiumTest({ ...newPremiumTest, subject: e.target.value as typeof SUBJECTS[number] })}
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            >
                                                {SUBJECTS.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Target Class
                                            </label>
                                            <select
                                                value={newPremiumTest.targetClass}
                                                onChange={(e) => setNewPremiumTest({ ...newPremiumTest, targetClass: Number(e.target.value) })}
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            >
                                                {CLASS_OPTIONS.map((c) => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={newPremiumTest.description}
                                            onChange={(e) => setNewPremiumTest({ ...newPremiumTest, description: e.target.value })}
                                            placeholder="Brief description of this premium test..."
                                            rows={2}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                💰 Coin Cost
                                            </label>
                                            <input
                                                type="number"
                                                value={newPremiumTest.coinCost}
                                                onChange={(e) => setNewPremiumTest({ ...newPremiumTest, coinCost: parseInt(e.target.value) || 0 })}
                                                min="0"
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                ⏱️ Duration (min)
                                            </label>
                                            <input
                                                type="number"
                                                value={newPremiumTest.duration}
                                                onChange={(e) => setNewPremiumTest({ ...newPremiumTest, duration: parseInt(e.target.value) || 0 })}
                                                min="1"
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="premiumIsMandatory"
                                            checked={newPremiumTest.isMandatory}
                                            onChange={(e) => setNewPremiumTest({ ...newPremiumTest, isMandatory: e.target.checked })}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <label htmlFor="premiumIsMandatory" className="text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Mark as Mandatory (Free)</span>
                                            <br />
                                            <span className="text-gray-500 dark:text-gray-400">Students won't need to spend coins</span>
                                        </label>
                                    </div>

                                    {premiumParseError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                            <p className="text-sm text-red-600 dark:text-red-400">{premiumParseError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-3">
                                <button
                                    onClick={() => { setShowPremiumTestModal(false); resetPremiumTestForm(); }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>

                                <div className="flex gap-3">
                                    {premiumCreateStep === 2 && (
                                        <button
                                            onClick={() => setPremiumCreateStep(1)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back
                                        </button>
                                    )}

                                    {premiumCreateStep === 1 ? (
                                        <button
                                            onClick={handleParsePremiumJson}
                                            disabled={!premiumTestJson.trim()}
                                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Parse & Continue <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleCreatePremiumTest}
                                            disabled={isCreatingPremiumTest || !newPremiumTest.title.trim()}
                                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isCreatingPremiumTest ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                                            ) : (
                                                <><Star className="w-4 h-4" /> Create Premium Test</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete All Transactions Confirmation Modal */}
            <AnimatePresence>
                {showDeleteTransactionsConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteTransactionsConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                    Delete All Transactions?
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    This will permanently delete all transaction history for all students. This action cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setShowDeleteTransactionsConfirm(false)}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAllTransactions}
                                        disabled={isDeletingTransactions}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isDeletingTransactions ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                                        ) : (
                                            <><Trash2 className="w-4 h-4" /> Delete All</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
