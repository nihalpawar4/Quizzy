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
    // Credit Economy collections
    WALLETS: 'wallets',
    TRANSACTIONS: 'transactions',
    BADGES: 'badges',
    USER_BADGES: 'userBadges',
    PREMIUM_TESTS: 'premiumTests',
    APP_SETTINGS: 'appSettings',
} as const;

