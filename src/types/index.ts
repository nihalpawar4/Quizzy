/**
 * TypeScript Type Definitions
 */

// User Types
export interface User {
    uid: string;
    email: string;
    name: string;
    role: 'student' | 'teacher';
    studentClass?: number; // 5-10, only for students
    createdAt: Date;
    // Profile picture
    photoURL?: string | null;
    // Streak tracking
    currentStreak?: number; // Current consecutive days
    longestStreak?: number; // All-time longest streak
    lastStreakDate?: string; // ISO date string of last streak claim (YYYY-MM-DD)
    // Account status
    isRestricted?: boolean; // If true, student cannot login
    // Privacy settings (for teachers)
    hideContactInfo?: boolean; // If true, hide email from students
    // Pending class change (awaiting teacher approval)
    pendingClassChange?: number; // Requested class number
    // Game coins
    coins?: number; // Virtual currency earned from games
    // Experience points
    xp?: number; // Total XP earned across all activities
}

// Class change request (requires teacher approval)
export interface ClassChangeRequest {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    currentClass: number;
    requestedClass: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string; // teacher uid
    resolvedByName?: string;
}

// Evaluation Types
export type EvaluationMode = 'auto' | 'manual' | 'hybrid';
export type EvaluationStatus = 'pending' | 'under_review' | 'evaluated' | 'published';
export type ResultReleaseType = 'immediate' | 'scheduled';

export interface QuestionEvaluation {
    questionId: string;
    questionText?: string;
    obtainedMarks: number;
    maxMarks: number;
    feedback?: string;
    status: 'correct' | 'partially_correct' | 'incorrect' | 'not_evaluated';
}

// Test Types
export interface Test {
    id: string;
    title: string;
    subject: string;
    targetClass: number; // 5-10
    createdBy: string; // teacher uid
    createdAt: Date;
    questionCount?: number;
    duration?: number; // in minutes, optional
    isActive: boolean;
    scheduledStartTime?: Date; // Optional scheduled start time for the test
    // Marking system
    marksPerQuestion?: number; // Marks for correct answer (default 1)
    negativeMarking?: boolean; // Enable negative marking
    negativeMarksPerQuestion?: number; // Marks deducted for wrong answer (default 0.25)
    // Anti-cheat settings
    enableAntiCheat?: boolean; // Enable anti-cheat mechanisms
    showInstructions?: boolean; // Show instructions screen before test starts
    // Difficulty level
    difficultyLevel?: string; // Easy, Moderate, Difficult, HOTS, Mixed
    // Combined subject test
    isCombinedSubject?: boolean; // If true, this is a combined subject test
    combinedSubjects?: string[]; // List of subjects included in the combined test
    // Schedule control
    isScheduleEnabled?: boolean; // Enable/disable the scheduled start time
    // Test expiry
    expiresAt?: Date; // Datetime after which test auto-expires and becomes inaccessible
    // PDF Test
    isPdfTest?: boolean; // If true, this test is a PDF upload (no interactive questions)
    pdfUrl?: string; // Base64 data URL of the uploaded PDF file
    pdfFileName?: string; // Original filename of the uploaded PDF
    // PDF view tracking: map of studentId -> { name, viewedAt }
    pdfViewedBy?: { [studentId: string]: { name: string; viewedAt: Date } };
    // Evaluation mode
    evaluationMode?: EvaluationMode; // auto, manual, or hybrid
    resultReleaseType?: ResultReleaseType; // immediate or scheduled
    resultReleaseDate?: Date; // Scheduled date/time for result release
    expectedResultDays?: number; // Days after submission for expected result (default 5)
    // Weekly Test (teacher-uploaded override for auto-generated weekly tests)
    isWeeklyTest?: boolean; // If true, this test is a weekly test
    weeklyTestNumber?: number; // Weekly Test 1, 2, 3...
}

// Question Types - supports multiple formats
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'one_word' | 'short_answer' | 'match';

export interface Question {
    id: string;
    testId: string;
    type: QuestionType; // Type of question
    text: string;
    options: string[]; // For MCQ, True/False
    correctOption: number; // 0-indexed, for MCQ
    correctAnswer?: string; // For fill_blank, short_answer
    explanation?: string; // Explanation for the correct answer
    matchPairs?: { left: string; right: string }[]; // For match type
    order?: number;
    points?: number; // Points for this question
}

// Result Types
export interface TestResult {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentClass: number;
    testId: string;
    testTitle: string;
    subject: string;
    score: number; // Number of correct answers
    totalQuestions: number;
    answers: number[]; // student's answers (0-indexed) - for MCQ
    detailedAnswers?: { // For detailed analytics
        questionId: string;
        questionText: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation?: string; // Explanation for the correct answer
    }[];
    timestamp: Date;
    // Timing data
    startTime?: Date; // When student started the test
    endTime?: Date; // When student submitted the test
    timeTakenSeconds?: number; // Total time taken in seconds
    // Marking data
    totalMarks?: number; // Maximum marks possible
    marksObtained?: number; // Actual marks after negative marking
    negativeMarksApplied?: number; // Total negative marks deducted
    // Anti-cheat data
    tabSwitchCount?: number; // Number of times tab was switched
    copyAttempts?: number; // Number of copy attempts
    rightClickAttempts?: number; // Number of right-click attempts
    fullscreenExits?: number; // Number of times fullscreen was exited
    antiCheatEnabled?: boolean; // Whether anti-cheat was enabled for this test
    // PDF test data
    isPdfTest?: boolean; // Whether this is a PDF test result
    pdfDownloadedAt?: Date; // When the student downloaded the PDF
    pdfMarksAwarded?: number; // Marks assigned by teacher for PDF test
    pdfMaxMarks?: number; // Maximum marks for PDF test
    pdfTeacherRemarks?: string; // Teacher's remarks/feedback
    pdfEvaluated?: boolean; // Whether teacher has evaluated this
    // Daily Challenge data
    isDailyChallenge?: boolean; // Whether this is a daily challenge result
    dailyChallengeDate?: string; // YYYY-MM-DD date of the daily challenge
    // Manual Evaluation data
    evaluationStatus?: EvaluationStatus; // pending, under_review, evaluated, published
    evaluationMode?: EvaluationMode; // auto, manual, hybrid (copied from test)
    teacherFeedback?: string; // Overall teacher feedback
    reviewedAt?: Date; // When teacher completed evaluation
    publishedAt?: Date; // When result was published to student
    evaluatorId?: string; // Teacher who evaluated
    evaluatorName?: string; // Teacher name who evaluated
    scheduledReleaseDate?: Date; // Scheduled result release date
    questionEvaluations?: QuestionEvaluation[]; // Per-question evaluation data
    strengthAreas?: string[]; // Topics where student performed well
    improvementAreas?: string[]; // Topics needing improvement
    rankInTest?: number; // Rank among students who took this test
}

// Mistake Bucket item for Practice Mode
export interface MistakeBucketItem {
    id: string;
    studentId: string;
    studentClass: number;
    // Question data (denormalized for fast access)
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    // Context
    testId: string;
    testTitle: string;
    subject: string;
    userWrongAnswer: string;
    // Mastery tracking
    correctStreak: number;    // 0 initially, +1 each correct, resets on wrong
    isMastered: boolean;      // true when correctStreak >= 2
    // Timestamps
    addedAt: Date;
    lastAttemptedAt?: Date;
    masteredAt?: Date;
}

// Daily Quiz Challenge result
export interface DailyQuizResult {
    id: string;
    studentId: string;
    studentName: string;
    studentClass: number;
    date: string;           // "YYYY-MM-DD" (IST)
    score: number;           // correct answers
    totalQuestions: number;  // always 5
    completedAt: Date;
}

// Weekly Test result
export interface WeeklyTestResult {
    id: string;
    studentId: string;
    studentName: string;
    studentClass: number;
    weekNumber: number;        // Weekly Test 1, 2, 3...
    weekDate: string;          // YYYY-MM-DD of the Sunday
    score: number;
    totalQuestions: number;    // always 30
    completedAt: Date;
    timeTakenSeconds?: number; // How long the student took
    detailedAnswers?: {
        questionText: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        options: string[];
    }[];
}

// Anti-cheat persistent test session
export type TestSessionStatus = 'in_progress' | 'completed' | 'failed';
export type TestSessionType = 'test' | 'daily_challenge' | 'weekly_test';

export interface TestSession {
    id: string;
    userId: string;
    testId: string;                          // testId or 'daily_YYYY-MM-DD_classN'
    sessionType: TestSessionType;
    currentQuestion: number;                 // 0-indexed
    answers: (number | string | null)[];     // mirrors the test answers array
    score: number;                           // running correct count
    totalQuestions: number;
    startedAt: Date;
    lastActiveAt: Date;
    completed: boolean;
    status: TestSessionStatus;
}

// Game Stats for Games Zone
export interface GameStats {
    id: string;
    userId: string;
    userName: string;
    gamesPlayed: number;
    wordsFound: number;
    bestTime: number; // in seconds
    bestScore: number;
    totalScore: number;
    badgesEarned: number;
    dayStreak: number;
    lastPlayedDate?: string; // YYYY-MM-DD
    updatedAt: Date;
}

// Auth Context Types
export interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, role: 'student' | 'teacher', studentClass?: number) => Promise<void>;
    signOut: () => Promise<void>;
}

// Test-taking state
export interface TestState {
    test: Test;
    questions: Question[];
    currentQuestionIndex: number;
    answers: (number | null)[];
    startTime: Date;
    isSubmitted: boolean;
}

// Analytics data for teacher dashboard
export interface AnalyticsRow {
    id: string;
    studentName: string;
    studentEmail: string;
    class: number;
    testTitle: string;
    subject: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    dateTaken: Date;
}

// Form state for creating tests
export interface CreateTestForm {
    title: string;
    subject: string;
    targetClass: number;
    duration?: number;
}

// Subject Notes for study materials
export interface SubjectNote {
    id: string;
    title: string;
    subject: string;
    targetClass: number; // 5-10
    description?: string;
    contentType: 'json' | 'pdf' | 'text';
    content: string; // JSON string for json type, URL for pdf, or text content
    createdBy: string; // teacher uid
    createdAt: Date;
    isActive: boolean;
}

// Notification for real-time updates
export type NotificationType = 'test' | 'note' | 'announcement' | 'result';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    targetClass: number; // Which class to notify
    createdBy: string; // teacher uid
    createdByName?: string; // teacher name
    createdAt: Date;
    // For linking to content
    linkedId?: string; // testId or noteId
    subject?: string;
    // View tracking - map of studentId to timestamp when viewed
    viewedBy?: { [studentId: string]: Date };
}

// Performance history for profile display
export interface PerformanceWeek {
    weekStart: string; // ISO date
    testsCompleted: number;
    averageScore: number;
}

// ==================== REAL-TIME CHAT TYPES ====================

// Message status enum
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

// Chat conversation between student and teacher
export interface Chat {
    id: string;
    participants: string[]; // [studentId, teacherId]
    studentId: string;
    teacherId: string;
    studentName: string;
    teacherName: string;
    studentClass: number;
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: Date;
        status: MessageStatus;
    };
    unreadCount: {
        [userId: string]: number;
    };
    createdAt: Date;
    updatedAt: Date;
    // Profile photos
    participantPhotoURLs?: {
        [userId: string]: string;
    };
    // Deletion tracking
    deletedFor?: string[]; // User IDs who deleted this chat
    deletedAt?: {
        [userId: string]: Date;
    };
    // Privacy setting
    teacherHidesContactInfo?: boolean; // If true, teacher's email is hidden from student
    // Pinning
    pinnedBy?: string[]; // User IDs who pinned this chat
}

// Individual message in a chat
export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderRole: 'student' | 'teacher';
    text: string;
    timestamp: Date;
    status: MessageStatus;
    deliveredAt?: Date;
    seenAt?: Date;
    // For deletion
    deletedFor?: string[]; // User IDs who deleted this message
    // For reply
    replyTo?: {
        id: string;
        text: string;
        senderName: string;
    };
}

// User presence/online status
export interface UserPresence {
    userId: string;
    isOnline: boolean;
    lastSeen: Date;
    typing?: {
        chatId: string | null;
        timestamp: Date;
    };
    // Device info for multiple device support
    deviceId?: string;
    platform?: 'web' | 'mobile';
}

// Typing indicator data
export interface TypingStatus {
    isTyping: boolean;
    userId: string;
    userName: string;
    chatId: string;
    timestamp: Date;
}

// Chat notification for push notifications
export interface ChatNotification {
    id: string;
    type: 'new_message';
    chatId: string;
    senderId: string;
    senderName: string;
    messagePreview: string;
    recipientId: string;
    createdAt: Date;
    isRead: boolean;
}

// Chat list item for display
export interface ChatListItem {
    id: string;
    participantId: string; // The other person in the chat
    participantName: string;
    participantRole: 'student' | 'teacher';
    participantClass?: number;
    lastMessage?: string;
    lastMessageTime?: Date;
    lastMessageSenderId?: string;
    unreadCount: number;
    isOnline: boolean;
    lastSeen?: Date;
    isTyping?: boolean;
}

// Chat constants
export const CHAT_CONSTANTS = {
    MESSAGE_RETENTION_DAYS: 30, // Delete messages after 30 days
    TYPING_TIMEOUT_MS: 3000, // Typing indicator timeout
    PRESENCE_HEARTBEAT_MS: 30000, // Update presence every 30 seconds
    MAX_MESSAGE_LENGTH: 2000, // Maximum message length
    MESSAGES_PER_PAGE: 50, // Messages to load per page
} as const;



// ==================== WEBRTC CALL TYPES ====================

// Call status
export type CallStatus = 'ringing' | 'connecting' | 'connected' | 'ended' | 'rejected' | 'missed' | 'busy';

// Call type
export type CallType = 'audio' | 'video';

// Call document stored in Firestore
export interface Call {
    id: string;
    callerId: string;
    callerName: string;
    callerPhotoURL?: string;
    calleeId: string;
    calleeName: string;
    calleePhotoURL?: string;
    chatId: string; // Reference to the chat
    type: CallType;
    status: CallStatus;
    // WebRTC signaling data
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    // ICE candidates stored as subcollection or array
    callerCandidates?: RTCIceCandidateInit[];
    calleeCandidates?: RTCIceCandidateInit[];
    // Timestamps
    createdAt: Date;
    answeredAt?: Date;
    endedAt?: Date;
    // Duration in seconds (calculated when call ends)
    duration?: number;
}

// Call constants
export const CALL_CONSTANTS = {
    RING_TIMEOUT_MS: 45000, // 45 seconds before call is marked as missed
    ICE_GATHERING_TIMEOUT_MS: 5000, // Wait 5 seconds for ICE gathering
} as const;

