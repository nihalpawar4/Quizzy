/**
 * Application Constants
 */

// Admin emails that have teacher access
export const ADMIN_EMAILS: string[] = [
    'admin@quizy.com',
    'teacher@quizy.com',
    'pawarnihal44@gmail.com',
    // Add more admin emails here
];

// Class options for students
export const CLASS_OPTIONS = [
    { value: 5, label: 'Class 5' },
    { value: 6, label: 'Class 6' },
    { value: 7, label: 'Class 7' },
    { value: 8, label: 'Class 8' },
    { value: 9, label: 'Class 9' },
    { value: 10, label: 'Class 10' },
];

// Subject options for tests
export const SUBJECTS = [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'General Knowledge',
    'Combined',
] as const;

// Difficulty levels for tests
export const DIFFICULTY_LEVELS = [
    'Easy',
    'Moderate',
    'Difficult',
    'HOTS',
    'Mixed',
] as const;

// Combined subject options (when subject is 'Combined')
export const COMBINED_SUBJECT_OPTIONS = [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'General Knowledge',
    'EVS',
    'Geography',
    'History',
    'Civics',
    'Physics',
    'Chemistry',
    'Biology',
] as const;

// Admin code for teacher registration (alternative to email list)
export const ADMIN_CODE = 'QUIZY_ADMIN_2024';

// User roles
export type UserRole = 'student' | 'teacher';

// Firestore collection names
export const COLLECTIONS = {
    USERS: 'users',
    TESTS: 'tests',
    QUESTIONS: 'questions',
    RESULTS: 'results',
    NOTES: 'notes',
    NOTIFICATIONS: 'notifications',
    // Homework collection
    HOMEWORKS: 'homeworks',
    // Chat collections
    CHATS: 'chats',
    MESSAGES: 'messages',
    PRESENCE: 'presence',
    CHAT_NOTIFICATIONS: 'chatNotifications',
    // WebRTC Call collections
    CALLS: 'calls',
    // Class change requests (teacher approval)
    CLASS_CHANGE_REQUESTS: 'classChangeRequests',
    // Practice Mode - Mistake Bucket
    MISTAKE_BUCKET: 'mistakeBucket',
    // Daily Quiz Challenge
    DAILY_QUIZ_RESULTS: 'dailyQuizResults',
    // Games Zone
    GAME_STATS: 'gameStats',
    // Evaluation Drafts (auto-save during evaluation)
    EVALUATION_DRAFTS: 'evaluationDrafts',
    // Test Sessions (anti-cheat: persistent test progress)
    TEST_SESSIONS: 'testSessions',
    // Weekly Test Results
    WEEKLY_TEST_RESULTS: 'weeklyTestResults',
} as const;

// Evaluation mode options for test creation
export const EVALUATION_MODES = [
    { value: 'auto' as const, label: 'Auto Evaluation', description: 'MCQ, True/False, Fill in Blank checked automatically', icon: '⚡' },
    { value: 'manual' as const, label: 'Manual Evaluation', description: 'Teacher checks all questions manually', icon: '✍️' },
    { value: 'hybrid' as const, label: 'Hybrid Evaluation', description: 'Objective auto-checked, subjective requires teacher review', icon: '🔄' },
];

// Question types that can be auto-graded
export const OBJECTIVE_QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank'] as const;
// Question types that require manual grading
export const SUBJECTIVE_QUESTION_TYPES = ['short_answer', 'one_word'] as const;

// Evaluation status labels and colors
export const EVALUATION_STATUS_CONFIG = {
    pending: { label: 'Pending Evaluation', color: 'amber', icon: '⏳' },
    under_review: { label: 'Under Review', color: 'blue', icon: '🔍' },
    evaluated: { label: 'Evaluated', color: 'green', icon: '✅' },
    published: { label: 'Published', color: 'emerald', icon: '📊' },
} as const;

