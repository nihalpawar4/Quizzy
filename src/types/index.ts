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
    // Streak tracking
    currentStreak?: number; // Current consecutive days
    longestStreak?: number; // All-time longest streak
    lastStreakDate?: string; // ISO date string of last streak claim (YYYY-MM-DD)
    // Account status
    isRestricted?: boolean; // If true, student cannot login
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
export type NotificationType = 'test' | 'note' | 'announcement';

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
