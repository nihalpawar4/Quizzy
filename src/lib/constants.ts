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
    // Daily Surprise Rewards
    DAILY_REWARDS: 'dailyRewards',
    // Premium Purchases
    PREMIUM_PURCHASES: 'premiumPurchases',
} as const;

// Premium XP cost (default / Basic tier)
export const PREMIUM_XP_COST = 499;

// Premium tier types
export type PremiumTier = 'basic' | 'pro' | 'promax';

// Premium subscription tiers
export const PREMIUM_TIERS: {
    id: PremiumTier;
    name: string;
    tagline: string;
    price: number;
    discount: number;
    discountedPrice: number;
    iconType: 'bolt' | 'crown' | 'gem';
    color: string;
    gradient: string;
    glow: string;
    features: string[];
    highlighted?: boolean;
    duration: string;
}[] = [
    {
        id: 'basic',
        name: 'Basic',
        tagline: 'Get started with essentials',
        price: 499,
        discount: 200,
        discountedPrice: 299,
        iconType: 'bolt',
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        glow: 'rgba(59,130,246,0.35)',
        duration: '30 days',
        features: [
            'Bubble Themes (3 styles)',
            'Basic Profile Frame',
            '1 Premium Badge',
            'Ad-Free Experience',
            'Basic Analytics Dashboard',
            'Priority Test Access',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        tagline: 'Most popular for serious learners',
        price: 999,
        discount: 200,
        discountedPrice: 799,
        iconType: 'crown',
        color: '#8B5CF6',
        gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        glow: 'rgba(139,92,246,0.35)',
        highlighted: true,
        duration: '30 days',
        features: [
            'All Bubble Themes (5 styles)',
            'All Profile Frames',
            'All Premium Badges',
            'Ad-Free Experience',
            'Advanced Analytics & Insights',
            '1.5x XP Multiplier',
            'Streak Shield (3/month)',
            'Priority Test Access',
            'Weekly Challenge Access',
            'Custom Quiz Creation',
        ],
    },
    {
        id: 'promax',
        name: 'Pro Max',
        tagline: 'Ultimate learning powerhouse',
        price: 1999,
        discount: 200,
        discountedPrice: 1799,
        iconType: 'gem',
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B, #D97706, #F97316)',
        glow: 'rgba(245,158,11,0.4)',
        duration: '30 days',
        features: [
            'All Bubble Themes + Exclusive',
            'All Profile Frames + Animated',
            'All Premium Badges + Diamond',
            'Ad-Free Experience',
            'Full Analytics Suite',
            '2x XP Multiplier',
            'Unlimited Streak Shields',
            'Priority Test Access',
            'All Weekly Challenges',
            'Unlimited Custom Quizzes',
            'AI-Powered Study Insights',
            'Exclusive Leaderboard Rank',
            'Early Feature Access',
            'Bonus Rewards Every Week',
        ],
    },
];

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

