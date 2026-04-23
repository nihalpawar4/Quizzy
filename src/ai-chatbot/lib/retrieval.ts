/**
 * AI Chatbot — Firestore Data Retrieval (READ-ONLY)
 * Fetches tests, questions, and results for RAG context
 * Completely isolated — imports only from firebase config
 */

import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, orderBy, limit, where,
  type DocumentData,
} from 'firebase/firestore';

// ==================== TYPES ====================

export interface FirestoreContext {
  tests: DocumentData[];
  questions: DocumentData[];
  results: DocumentData[];
  timestamp: number;
}

// ==================== DATA FETCHERS ====================

/** Fetch all active tests */
async function fetchTests(): Promise<DocumentData[]> {
  try {
    const q = query(
      collection(db, 'tests'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[AI Chat] Error fetching tests:', err);
    return [];
  }
}

/** Fetch questions for context (latest 200) */
async function fetchQuestions(): Promise<DocumentData[]> {
  try {
    const q = query(
      collection(db, 'questions'),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[AI Chat] Error fetching questions:', err);
    return [];
  }
}

/** Fetch recent results (latest 100) */
async function fetchResults(): Promise<DocumentData[]> {
  try {
    const q = query(
      collection(db, 'results'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[AI Chat] Error fetching results:', err);
    return [];
  }
}

/** Fetch results for a specific student */
export async function fetchStudentResults(studentId: string): Promise<DocumentData[]> {
  try {
    const q = query(
      collection(db, 'results'),
      where('studentId', '==', studentId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[AI Chat] Error fetching student results:', err);
    return [];
  }
}

// ==================== CONTEXT BUILDER ====================

/** Build a text-based context string from Firestore data for the LLM */
export function buildContextString(data: FirestoreContext): string {
  const sections: string[] = [];

  // Tests section
  if (data.tests.length > 0) {
    const testsInfo = data.tests.map((t) => {
      const status = t.isActive ? 'Active' : 'Inactive';
      const duration = t.duration ? `${t.duration} min` : 'No time limit';
      const scheduled = t.scheduledStartTime ? `Scheduled: ${new Date(t.scheduledStartTime.seconds * 1000).toLocaleString()}` : '';
      return `- "${t.title}" | Subject: ${t.subject} | Class: ${t.targetClass} | ${status} | ${duration} | Questions: ${t.questionCount || '?'} ${scheduled}`.trim();
    }).join('\n');
    sections.push(`=== AVAILABLE TESTS (${data.tests.length}) ===\n${testsInfo}`);
  }

  // Questions section (summarized)
  if (data.questions.length > 0) {
    // Group by testId
    const byTest: Record<string, DocumentData[]> = {};
    data.questions.forEach((q) => {
      const tid = q.testId || 'unknown';
      if (!byTest[tid]) byTest[tid] = [];
      byTest[tid].push(q);
    });

    const qInfo = Object.entries(byTest).map(([testId, qs]) => {
      const sample = qs.slice(0, 3).map((q) => `  • ${q.text?.substring(0, 80)}...`).join('\n');
      return `Test ${testId}: ${qs.length} questions\n${sample}`;
    }).join('\n');
    sections.push(`=== QUESTIONS (${data.questions.length} total) ===\n${qInfo}`);
  }

  // Results section (aggregated)
  if (data.results.length > 0) {
    // Aggregate by student
    const studentScores: Record<string, { name: string; scores: number[]; total: number[] }> = {};
    data.results.forEach((r) => {
      const sid = r.studentId || 'unknown';
      if (!studentScores[sid]) {
        studentScores[sid] = { name: r.studentName || 'Unknown', scores: [], total: [] };
      }
      studentScores[sid].scores.push(r.score || 0);
      studentScores[sid].total.push(r.totalQuestions || 1);
    });

    const rInfo = Object.values(studentScores).slice(0, 20).map((s) => {
      const avgPct = Math.round(
        s.scores.reduce((a, v, i) => a + (v / s.total[i]) * 100, 0) / s.scores.length
      );
      return `- ${s.name}: ${s.scores.length} tests taken, avg ${avgPct}%`;
    }).join('\n');
    sections.push(`=== RECENT RESULTS (${data.results.length} entries) ===\n${rInfo}`);
  }

  return sections.join('\n\n') || 'No data available from the platform yet.';
}

// ==================== MAIN RETRIEVAL ====================

/** Fetch all Firestore data and build context */
export async function retrieveContext(studentId?: string): Promise<string> {
  const [tests, questions, results] = await Promise.all([
    fetchTests(),
    fetchQuestions(),
    studentId ? fetchStudentResults(studentId) : fetchResults(),
  ]);

  const data: FirestoreContext = {
    tests,
    questions,
    results,
    timestamp: Date.now(),
  };

  return buildContextString(data);
}
