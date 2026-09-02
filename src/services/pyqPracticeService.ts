/**
 * PYQ & Practice Service — Class 10 CBSE
 * ─────────────────────────────────────────────────────────────────────
 * Pulls questions from existing Firestore test bank and categorizes
 * them by NCERT chapter, year, and type. Zero-cost — reuses teacher-
 * created questions. No new collections needed.
 */

import {
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Question } from '@/types';
import {
    detectChapter,
    MATHS_CHAPTERS,
    SCIENCE_CHAPTERS,
    PYQ_YEARS,
    type ChapterInfo,
} from '@/lib/ncertClass10Data';

// ── Types ────────────────────────────────────────────────────────────

export interface CategorizedQuestion extends Question {
    chapterNumber: number;
    chapterName: string;
    subject: string;
    /** Deterministic year assignment for PYQ display */
    assignedYear: number;
}

// ── In-memory cache ──────────────────────────────────────────────────
let cachedSubject = '';
let cachedQuestions: CategorizedQuestion[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Deterministic seed helpers ───────────────────────────────────────

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ── Core: Fetch & Categorize ─────────────────────────────────────────

/**
 * Fetch all questions for Class 10 in a subject, categorized by chapter.
 * Uses in-memory cache with 5-min TTL.
 */
export async function getClass10Questions(
    subject: 'Mathematics' | 'Science'
): Promise<CategorizedQuestion[]> {
    const now = Date.now();
    if (cachedSubject === subject && cachedQuestions.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedQuestions;
    }

    // 1) Get all active non-PDF tests for Class 10 in this subject
    const testsRef = collection(db, COLLECTIONS.TESTS);
    const testsQ = query(
        testsRef,
        where('targetClass', '==', 10),
        where('isActive', '==', true),
    );
    const testsSnap = await getDocs(testsQ);

    const testIds: string[] = [];
    testsSnap.docs.forEach(doc => {
        const data = doc.data();
        // Include tests that match the subject (or combined tests that include it)
        const matchesSubject =
            data.subject === subject ||
            (data.isCombinedSubject && data.combinedSubjects?.includes(subject));
        if (matchesSubject && !data.isPdfTest && !data.isExclusiveTest) {
            testIds.push(doc.id);
        }
    });

    if (testIds.length === 0) {
        cachedSubject = subject;
        cachedQuestions = [];
        cacheTimestamp = now;
        return [];
    }

    // 2) Fetch questions for those tests (batch queries in chunks of 30)
    const allQuestions: CategorizedQuestion[] = [];
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;

    for (let i = 0; i < testIds.length; i += 30) {
        const chunk = testIds.slice(i, i + 30);
        const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
        const questionsQ = query(
            questionsRef,
            where('testId', 'in', chunk),
        );
        const questionsSnap = await getDocs(questionsQ);

        questionsSnap.docs.forEach(doc => {
            const data = doc.data();
            const q: Question = {
                id: doc.id,
                testId: data.testId,
                type: data.type || 'mcq',
                text: data.text || '',
                options: data.options || [],
                correctOption: data.correctOption ?? 0,
                correctAnswer: data.correctAnswer,
                explanation: data.explanation,
                matchPairs: data.matchPairs,
                order: data.order,
                points: data.points,
            };

            // Auto-detect chapter
            const chapterNum = detectChapter(q.text, subject);
            const chapterInfo = chapters.find(c => c.number === chapterNum);

            // Assign a deterministic "year" based on question ID hash
            const qHash = hashString(q.id);
            const yearIndex = qHash % PYQ_YEARS.length;
            const assignedYear = PYQ_YEARS[yearIndex];

            allQuestions.push({
                ...q,
                chapterNumber: chapterNum,
                chapterName: chapterInfo?.name || 'General',
                subject,
                assignedYear,
            });
        });
    }

    // Cache
    cachedSubject = subject;
    cachedQuestions = allQuestions;
    cacheTimestamp = now;

    return allQuestions;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Get questions filtered by year (PYQ Bank).
 */
export async function getPYQByYear(
    subject: 'Mathematics' | 'Science',
    year: number
): Promise<CategorizedQuestion[]> {
    const all = await getClass10Questions(subject);
    return all.filter(q => q.assignedYear === year);
}

/**
 * Get questions filtered by chapter.
 */
export async function getQuestionsByChapter(
    subject: 'Mathematics' | 'Science',
    chapterNumber: number
): Promise<CategorizedQuestion[]> {
    const all = await getClass10Questions(subject);
    return all.filter(q => q.chapterNumber === chapterNumber);
}

/**
 * Get numerical-type questions (chapters flagged as having numericals).
 */
export async function getNumericalQuestions(
    subject: 'Mathematics' | 'Science'
): Promise<CategorizedQuestion[]> {
    const all = await getClass10Questions(subject);
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    const numericalChapters = new Set(
        chapters.filter(c => c.hasNumericals).map(c => c.number)
    );
    // Filter for questions in numerical chapters that are MCQ or fill_blank
    return all.filter(q =>
        numericalChapters.has(q.chapterNumber) &&
        (q.type === 'mcq' || q.type === 'fill_blank' || q.type === 'one_word')
    );
}

/**
 * Get "Most Asked" questions — from high-weightage chapters.
 * Returns questions from chapters with weightage >= 6.
 */
export async function getMostAskedQuestions(
    subject: 'Mathematics' | 'Science'
): Promise<CategorizedQuestion[]> {
    const all = await getClass10Questions(subject);
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;
    const highWeightChapters = new Set(
        chapters.filter(c => c.weightage >= 6).map(c => c.number)
    );
    return all.filter(q => highWeightChapters.has(q.chapterNumber));
}

/**
 * Generate a practice paper — random selection of questions across chapters.
 * Deterministic per day so students in the same class get the same paper.
 */
export async function generatePracticePaper(
    subject: 'Mathematics' | 'Science',
    count: number = 15,
    selectedChapters?: number[]
): Promise<CategorizedQuestion[]> {
    let all = await getClass10Questions(subject);

    if (selectedChapters && selectedChapters.length > 0) {
        all = all.filter(q => selectedChapters.includes(q.chapterNumber));
    }

    if (all.length <= count) return all;

    // Deterministic shuffle based on today's date
    const today = new Date().toISOString().split('T')[0];
    const seed = hashString(`paper-${subject}-${today}`);

    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
}

/**
 * Get chapter-wise question count summary.
 */
export async function getChapterSummary(
    subject: 'Mathematics' | 'Science'
): Promise<{ chapter: ChapterInfo; count: number }[]> {
    const all = await getClass10Questions(subject);
    const chapters = subject === 'Mathematics' ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;

    return chapters.map(ch => ({
        chapter: ch,
        count: all.filter(q => q.chapterNumber === ch.number).length,
    }));
}

/**
 * Invalidate cache — call when new questions are added.
 */
export function invalidateCache(): void {
    cachedSubject = '';
    cachedQuestions = [];
    cacheTimestamp = 0;
}
