/**
 * Weekly Report Types for Teacher Dashboard
 * Used for generating student weekly performance reports
 */

// Daily stats for a student (stored in users/{studentId}/dailyStats/{yyyy-MM-dd})
export interface DailyStats {
    date: string; // yyyy-MM-dd format
    quizzes: number;
    questions: number;
    correct: number;
    wrong: number;
    skipped: number;
    timeSeconds: number;
    scoreTotal: number; // Sum of all scores
    scorePossible: number; // Sum of all possible scores
}

// Topic performance data
export interface TopicPerformance {
    topic: string;
    subject: string;
    attempts: number;
    totalQuestions: number;
    correct: number;
    accuracy: number; // percentage
}

// Weekly report summary stats
export interface WeeklyReportStats {
    totalQuizzes: number;
    avgScore: number; // percentage
    accuracy: number; // percentage (correct / total questions)
    totalTimeMinutes: number;
    questionsSolved: number;
    activeDays: number; // out of 7
    bestDay: {
        date: string;
        score: number;
    } | null;
    worstDay: {
        date: string;
        score: number;
    } | null;
}

// Daily breakdown row for the table
export interface DailyBreakdownRow {
    date: string;
    dayName: string;
    quizzes: number;
    scorePercent: number;
    accuracy: number;
    timeMinutes: number;
    questions: number;
    isActive: boolean;
}

// Complete weekly report data
export interface WeeklyReportData {
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentClass?: number;
    parentEmail?: string;
    weekStart: Date;
    weekEnd: Date;
    stats: WeeklyReportStats;
    dailyBreakdown: DailyBreakdownRow[];
    topTopics: TopicPerformance[];
    weakTopics: TopicPerformance[];
    mostPracticedTopic: TopicPerformance | null;
    chartData: {
        dates: string[];
        scores: number[];
        quizzesPerDay: number[];
        timePerDay: number[];
    };
}

// Quiz attempt (from results collection)
export interface QuizAttempt {
    id: string;
    testId: string;
    testTitle: string;
    subject: string;
    score: number;
    totalQuestions: number;
    timestamp: Date;
    timeTakenSeconds?: number;
    // We'll derive topic from subject for now
}
