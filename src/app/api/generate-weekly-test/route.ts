/**
 * Weekly Test API Route — /api/generate-weekly-test
 * Uses Gemini to generate 30 NEW questions based on completed test concepts.
 * Falls back to shuffled existing questions if generation fails.
 */

import { NextRequest, NextResponse } from 'next/server';

// Gemini models — try newer models first
const GEMINI_MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
];

function getGeminiUrl(model: string) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

interface QuestionSummary {
    text: string;
    type: string;
    subject: string;
    options: string[];
    correctOption: number;
    explanation?: string;
}

interface GeneratedQuestion {
    text: string;
    options: string[];
    correctOption: number;
    explanation: string;
    subject: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            studentClass,
            weekNumber,
            completedQuestions,
        } = body as {
            studentClass: number;
            weekNumber: number;
            completedQuestions: QuestionSummary[];
        };

        // Validate
        if (!completedQuestions || completedQuestions.length === 0) {
            return NextResponse.json(
                { error: 'No completed questions provided.' },
                { status: 400 }
            );
        }

        // Helper: build fallback questions from existing pool (shuffle + pick 30)
        function buildFallbackQuestions(): GeneratedQuestion[] {
            const shuffled = [...completedQuestions].sort(() => Math.random() - 0.5);
            // If we have fewer than 30, cycle through them
            const pool: GeneratedQuestion[] = [];
            while (pool.length < 30 && shuffled.length > 0) {
                for (const q of shuffled) {
                    if (pool.length >= 30) break;
                    pool.push({
                        text: q.text,
                        options: q.options,
                        correctOption: q.correctOption,
                        explanation: q.explanation || '',
                        subject: q.subject || 'General',
                    });
                }
            }
            return pool;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // No API key — use fallback questions
            console.warn('[WeeklyTest API] No GEMINI_API_KEY, using fallback questions');
            const fallback = buildFallbackQuestions();
            const questions = fallback.map((q, index) => ({
                id: `weekly_q_${index}`,
                testId: `weekly_W${weekNumber}`,
                type: 'mcq' as const,
                text: q.text,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation || '',
                order: index,
                subject: q.subject || 'General',
            }));
            return NextResponse.json({ questions });
        }

        // Group questions by subject for better prompt
        const bySubject: Record<string, QuestionSummary[]> = {};
        for (const q of completedQuestions) {
            const subj = q.subject || 'General';
            if (!bySubject[subj]) bySubject[subj] = [];
            bySubject[subj].push(q);
        }

        // Build the prompt
        const subjectSummaries = Object.entries(bySubject).map(([subject, qs]) => {
            const sampleQuestions = qs.slice(0, 8).map((q, i) => {
                const optionsStr = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join(', ');
                return `  Q${i + 1}: "${q.text}" [Options: ${optionsStr}] [Correct: ${String.fromCharCode(65 + q.correctOption)}]${q.explanation ? ` [Why: ${q.explanation}]` : ''}`;
            }).join('\n');
            return `### ${subject} (${qs.length} questions studied)\n${sampleQuestions}`;
        }).join('\n\n');

        const prompt = `You are a question paper generator for Class ${studentClass} students in India.

The student has completed tests on the following topics. Here are sample questions they've already answered:

${subjectSummaries}

Now generate EXACTLY 30 NEW multiple-choice questions (MCQs) for Weekly Test ${weekNumber}.

CRITICAL RULES:
1. Questions must test the SAME concepts, topics, and difficulty level as the sample questions above
2. Questions must be COMPLETELY DIFFERENT from the samples — different wording, different numbers, different scenarios
3. Each question MUST have exactly 4 options labeled A, B, C, D
4. Exactly ONE option must be correct
5. Include a brief explanation for each correct answer
6. Distribute questions proportionally across all subjects shown above
7. Keep difficulty appropriate for Class ${studentClass}
8. Questions should be in English
9. Do NOT copy any question from the samples — create entirely new ones testing the same concepts

Respond with ONLY a valid JSON array of exactly 30 objects. No markdown, no code blocks, no extra text. Each object must have:
{
  "text": "question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOption": 0,
  "explanation": "brief explanation",
  "subject": "Subject Name"
}

Where correctOption is 0-indexed (0=A, 1=B, 2=C, 3=D).

IMPORTANT: Output ONLY the JSON array. No other text.`;

        // Call Gemini with model fallback
        let generatedQuestions: GeneratedQuestion[] | null = null;

        for (const model of GEMINI_MODELS) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const res = await fetch(`${getGeminiUrl(model)}?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [{ text: prompt }],
                                },
                            ],
                            generationConfig: {
                                temperature: 0.8,
                                topP: 0.95,
                                topK: 40,
                                maxOutputTokens: 8192,
                            },
                            safetySettings: [
                                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                            ],
                        }),
                    });

                    if (res.status === 429) {
                        if (attempt === 0) {
                            await new Promise(r => setTimeout(r, 3000));
                            continue;
                        }
                        break; // Try next model
                    }

                    if (!res.ok) {
                        console.error(`[WeeklyTest API] Model ${model} returned ${res.status}`);
                        break;
                    }

                    const data = await res.json();
                    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!rawText) {
                        console.error(`[WeeklyTest API] No text in response from ${model}`);
                        break;
                    }

                    // Parse JSON — handle markdown code blocks if present
                    let jsonStr = rawText.trim();
                    // Remove markdown code block wrapper if present
                    if (jsonStr.startsWith('```')) {
                        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
                    }

                    const parsed = JSON.parse(jsonStr);

                    if (Array.isArray(parsed) && parsed.length >= 10) {
                        // Validate each question
                        const valid = parsed.filter(
                            (q: GeneratedQuestion) =>
                                q.text &&
                                Array.isArray(q.options) &&
                                q.options.length === 4 &&
                                typeof q.correctOption === 'number' &&
                                q.correctOption >= 0 &&
                                q.correctOption <= 3
                        );

                        if (valid.length >= 10) {
                            generatedQuestions = valid.slice(0, 30);
                            break;
                        }
                    }

                    console.error(`[WeeklyTest API] Invalid JSON structure from ${model}`, parsed?.length);
                    break;
                } catch (err) {
                    console.error(`[WeeklyTest API] Error with model ${model}:`, err);
                    break;
                }
            }

            if (generatedQuestions) break;
        }

        if (!generatedQuestions || generatedQuestions.length === 0) {
            // Fallback: use shuffled existing questions
            console.warn('[WeeklyTest API] Generation failed, using fallback questions');
            generatedQuestions = buildFallbackQuestions();
        }

        // Format into Question-like objects
        const questions = generatedQuestions.map((q, index) => ({
            id: `weekly_q_${index}`,
            testId: `weekly_W${weekNumber}`,
            type: 'mcq' as const,
            text: q.text,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation || '',
            order: index,
            subject: q.subject || 'General',
        }));

        return NextResponse.json({ questions });
    } catch (err) {
        console.error('[WeeklyTest API] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}
