/**
 * Weekly Report Services
 * Functions for fetching and computing weekly student reports
 */

import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';
import type { User, TestResult } from '@/types';
import type {
    DailyStats,
    WeeklyReportData,
    WeeklyReportStats,
    DailyBreakdownRow,
    TopicPerformance,
} from '@/types/weeklyReport';

/**
 * Get the last 7 days date range (including today)
 * Returns dates in IST timezone
 */
export function getLast7DaysRange(): { start: Date; end: Date; dates: string[] } {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    // End of today in IST
    const endDate = new Date(istNow);
    endDate.setHours(23, 59, 59, 999);

    // Start of 7 days ago
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Generate date strings for all 7 days
    const dates: string[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        dates.push(formatDateString(current));
        current.setDate(current.getDate() + 1);
    }

    return { start: startDate, end: endDate, dates };
}

/**
 * Format a date as YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get day name from date string
 */
function getDayName(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format date for display (e.g., "Jan 15")
 */
function formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get student results for the last 7 days
 */
export async function getStudentResultsForWeek(
    studentId: string,
    startDate: Date,
    endDate: Date
): Promise<TestResult[]> {
    const resultsRef = collection(db, COLLECTIONS.RESULTS);

    const q = query(
        resultsRef,
        where('studentId', '==', studentId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            startTime: data.startTime?.toDate ? data.startTime.toDate() : undefined,
            endTime: data.endTime?.toDate ? data.endTime.toDate() : undefined,
        } as TestResult;
    });
}

/**
 * Aggregate results by day
 */
function aggregateByDay(
    results: TestResult[],
    dates: string[]
): Map<string, DailyStats> {
    const dailyMap = new Map<string, DailyStats>();

    // Initialize all days with zero values
    dates.forEach(date => {
        dailyMap.set(date, {
            date,
            quizzes: 0,
            questions: 0,
            correct: 0,
            wrong: 0,
            skipped: 0,
            timeSeconds: 0,
            scoreTotal: 0,
            scorePossible: 0,
        });
    });

    // Aggregate results
    results.forEach(result => {
        const dateStr = formatDateString(result.timestamp);
        const existing = dailyMap.get(dateStr);

        if (existing) {
            existing.quizzes += 1;
            existing.questions += result.totalQuestions;
            existing.correct += result.score;
            existing.wrong += result.totalQuestions - result.score;
            existing.timeSeconds += result.timeTakenSeconds || 0;
            existing.scoreTotal += result.score;
            existing.scorePossible += result.totalQuestions;
        }
    });

    return dailyMap;
}

/**
 * Aggregate results by topic/subject
 */
function aggregateByTopic(results: TestResult[]): TopicPerformance[] {
    const topicMap = new Map<string, TopicPerformance>();

    results.forEach(result => {
        // Use subject as topic for now (can be improved if topic field exists)
        const topic = result.subject || 'General';
        const existing = topicMap.get(topic);

        if (existing) {
            existing.attempts += 1;
            existing.totalQuestions += result.totalQuestions;
            existing.correct += result.score;
        } else {
            topicMap.set(topic, {
                topic,
                subject: result.subject,
                attempts: 1,
                totalQuestions: result.totalQuestions,
                correct: result.score,
                accuracy: 0, // Calculate later
            });
        }
    });

    // Calculate accuracy for each topic
    topicMap.forEach(perf => {
        perf.accuracy = perf.totalQuestions > 0
            ? Math.round((perf.correct / perf.totalQuestions) * 100)
            : 0;
    });

    return Array.from(topicMap.values());
}

/**
 * Calculate weekly stats from daily data
 */
function calculateWeeklyStats(
    dailyMap: Map<string, DailyStats>
): WeeklyReportStats {
    let totalQuizzes = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTimeSeconds = 0;
    let activeDays = 0;
    let totalScorePercent = 0;
    let daysWithScores = 0;

    let bestDay: { date: string; score: number } | null = null;
    let worstDay: { date: string; score: number } | null = null;

    dailyMap.forEach((stats, date) => {
        totalQuizzes += stats.quizzes;
        totalQuestions += stats.questions;
        totalCorrect += stats.correct;
        totalTimeSeconds += stats.timeSeconds;

        if (stats.quizzes > 0) {
            activeDays += 1;

            const dayScore = stats.scorePossible > 0
                ? Math.round((stats.scoreTotal / stats.scorePossible) * 100)
                : 0;

            totalScorePercent += dayScore;
            daysWithScores += 1;

            if (!bestDay || dayScore > bestDay.score) {
                bestDay = { date, score: dayScore };
            }
            if (!worstDay || dayScore < worstDay.score) {
                worstDay = { date, score: dayScore };
            }
        }
    });

    const avgScore = daysWithScores > 0
        ? Math.round(totalScorePercent / daysWithScores)
        : 0;

    const accuracy = totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    return {
        totalQuizzes,
        avgScore,
        accuracy,
        totalTimeMinutes: Math.round(totalTimeSeconds / 60),
        questionsSolved: totalQuestions,
        activeDays,
        bestDay,
        worstDay,
    };
}

/**
 * Build daily breakdown rows for the table
 */
function buildDailyBreakdown(
    dailyMap: Map<string, DailyStats>,
    dates: string[]
): DailyBreakdownRow[] {
    return dates.map(date => {
        const stats = dailyMap.get(date);

        if (!stats || stats.quizzes === 0) {
            return {
                date,
                dayName: getDayName(date),
                quizzes: 0,
                scorePercent: 0,
                accuracy: 0,
                timeMinutes: 0,
                questions: 0,
                isActive: false,
            };
        }

        return {
            date,
            dayName: getDayName(date),
            quizzes: stats.quizzes,
            scorePercent: stats.scorePossible > 0
                ? Math.round((stats.scoreTotal / stats.scorePossible) * 100)
                : 0,
            accuracy: stats.questions > 0
                ? Math.round((stats.correct / stats.questions) * 100)
                : 0,
            timeMinutes: Math.round(stats.timeSeconds / 60),
            questions: stats.questions,
            isActive: true,
        };
    });
}

/**
 * Build chart data from daily breakdown
 */
function buildChartData(dailyBreakdown: DailyBreakdownRow[]) {
    return {
        dates: dailyBreakdown.map(d => formatDateDisplay(d.date)),
        scores: dailyBreakdown.map(d => d.scorePercent),
        quizzesPerDay: dailyBreakdown.map(d => d.quizzes),
        timePerDay: dailyBreakdown.map(d => d.timeMinutes),
    };
}

/**
 * Get complete weekly report for a student
 */
export async function getWeeklyReport(
    student: User
): Promise<WeeklyReportData> {
    const { start, end, dates } = getLast7DaysRange();

    // Fetch results for the week
    const results = await getStudentResultsForWeek(student.uid, start, end);

    // Aggregate by day
    const dailyMap = aggregateByDay(results, dates);

    // Calculate stats
    const stats = calculateWeeklyStats(dailyMap);

    // Build daily breakdown
    const dailyBreakdown = buildDailyBreakdown(dailyMap, dates);

    // Aggregate by topic
    const allTopics = aggregateByTopic(results);

    // Sort topics by accuracy for strongest/weakest
    const sortedByAccuracy = [...allTopics].sort((a, b) => b.accuracy - a.accuracy);
    const topTopics = sortedByAccuracy.slice(0, 3);
    const weakTopics = sortedByAccuracy.length > 3
        ? sortedByAccuracy.slice(-3).reverse()
        : sortedByAccuracy.reverse().slice(0, 3);

    // Most practiced topic (by attempts)
    const sortedByAttempts = [...allTopics].sort((a, b) => b.attempts - a.attempts);
    const mostPracticedTopic = sortedByAttempts.length > 0 ? sortedByAttempts[0] : null;

    // Build chart data
    const chartData = buildChartData(dailyBreakdown);

    return {
        studentId: student.uid,
        studentName: student.name,
        studentEmail: student.email,
        studentClass: student.studentClass,
        parentEmail: undefined, // Add this field to User type if needed
        weekStart: start,
        weekEnd: end,
        stats,
        dailyBreakdown,
        topTopics,
        weakTopics,
        mostPracticedTopic,
        chartData,
    };
}

/**
 * Format week range for display
 * e.g., "Jan 13 - Jan 19, 2026"
 */
export function formatWeekRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
}
