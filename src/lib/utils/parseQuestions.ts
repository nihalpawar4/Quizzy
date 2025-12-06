/**
 * Question Parsing Utilities
 * Parse CSV and JSON formats into question objects for Firestore
 */

// Question types supported
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'one_word' | 'short_answer';

export interface ParsedQuestion {
    text: string;
    options: string[];
    correctOption: number; // 0-indexed (0 = A, 1 = B, 2 = C, 3 = D) - for MCQ/True-False
    type: QuestionType; // Type of question
    correctAnswer?: string; // For text-based questions (fill_blank, one_word, short_answer)
}

export interface ParseResult {
    success: boolean;
    questions: ParsedQuestion[];
    errors: string[];
}

/**
 * Parse CSV text into question objects
 * Expected format: Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer
 * CorrectAnswer can be: A, B, C, D (case insensitive) or 0, 1, 2, 3
 * 
 * @param csvText - Raw CSV text
 * @returns ParseResult with questions and any errors
 */
export function parseCSV(csvText: string): ParseResult {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    // Split into lines and filter empty ones
    const lines = csvText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        return { success: false, questions: [], errors: ['CSV is empty'] };
    }

    // Check if first line is a header and skip it
    const firstLine = lines[0].toLowerCase();
    const startIndex = firstLine.includes('question') || firstLine.includes('option') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];

        // Parse CSV line (handling quoted values)
        const values = parseCSVLine(line);

        if (values.length < 6) {
            errors.push(`Line ${lineNumber}: Expected 6 columns (Question, A, B, C, D, Answer), got ${values.length}`);
            continue;
        }

        const [questionText, optA, optB, optC, optD, correctAnswer] = values.map(v => v.trim());

        if (!questionText) {
            errors.push(`Line ${lineNumber}: Question text is empty`);
            continue;
        }

        // Parse correct answer
        const correctOption = parseCorrectAnswer(correctAnswer);
        if (correctOption === -1) {
            errors.push(`Line ${lineNumber}: Invalid correct answer "${correctAnswer}". Use A, B, C, D or 0, 1, 2, 3`);
            continue;
        }

        questions.push({
            text: questionText,
            options: [optA, optB, optC, optD],
            correctOption,
            type: 'mcq' // CSV format defaults to MCQ
        });
    }

    return {
        success: questions.length > 0,
        questions,
        errors
    };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last value
    values.push(current);

    return values;
}

/**
 * Parse correct answer from various formats
 * @returns 0-indexed option number or -1 if invalid
 */
function parseCorrectAnswer(answer: string): number {
    const normalized = answer.toUpperCase().trim();

    // Letter format (A, B, C, D)
    const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    if (normalized in letterMap) {
        return letterMap[normalized];
    }

    // Numeric format (0, 1, 2, 3 or 1, 2, 3, 4)
    const num = parseInt(normalized);
    if (!isNaN(num)) {
        if (num >= 0 && num <= 3) return num;
        if (num >= 1 && num <= 4) return num - 1; // Support 1-indexed
    }

    return -1;
}

/**
 * Parse JSON text into question objects
 * Supports multiple formats:
 * 1. Array of questions: [{ question, options, correctAnswer }, ...]
 * 2. Object with questions array: { questions: [...] }
 * 
 * @param jsonText - Raw JSON text
 * @returns ParseResult with questions and any errors
 */
export function parseJSON(jsonText: string): ParseResult {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        return {
            success: false,
            questions: [],
            errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`]
        };
    }

    // Determine the array to process
    let questionsArray: unknown[];
    if (Array.isArray(parsed)) {
        questionsArray = parsed;
    } else if (parsed && typeof parsed === 'object' && 'questions' in parsed) {
        const obj = parsed as { questions: unknown };
        if (Array.isArray(obj.questions)) {
            questionsArray = obj.questions;
        } else {
            return { success: false, questions: [], errors: ['JSON "questions" field is not an array'] };
        }
    } else {
        return { success: false, questions: [], errors: ['JSON must be an array or object with "questions" array'] };
    }

    // Process each question
    questionsArray.forEach((item, index) => {
        const questionNum = index + 1;

        if (!item || typeof item !== 'object') {
            errors.push(`Question ${questionNum}: Invalid format - expected an object`);
            return;
        }

        const q = item as Record<string, unknown>;

        // Extract question text (support multiple field names)
        const text = (q.question || q.text || q.questionText || '') as string;
        if (!text) {
            errors.push(`Question ${questionNum}: Missing question text`);
            return;
        }

        // Extract options (support multiple formats)
        let options: string[] = [];
        if (Array.isArray(q.options)) {
            options = q.options.map(o => String(o));
        } else if (Array.isArray(q.answers)) {
            options = q.answers.map(o => String(o));
        } else if (Array.isArray(q.choices)) {
            options = q.choices.map(o => String(o));
        } else if (q.optionA !== undefined) {
            // Support individual option fields
            options = [
                String(q.optionA || q.option_a || q.a || ''),
                String(q.optionB || q.option_b || q.b || ''),
                String(q.optionC || q.option_c || q.c || ''),
                String(q.optionD || q.option_d || q.d || '')
            ];
        }

        // Extract correct answer
        const correctValue = q.correctAnswer ?? q.correct ?? q.answer ?? q.correctOption ?? q.correct_answer;

        // For single-answer question types (fill_blank, one_word, short_answer)
        // If no options but answer exists, create single option from answer
        if (options.length === 0 && correctValue !== undefined) {
            options = [String(correctValue)];
        }

        // For True/False questions
        if (options.length === 0 && (q.type === 'true_false' || q.questionType === 'true_false')) {
            options = ['True', 'False'];
        }

        // Minimum 1 option for text-based answers, 2 for MCQ/True-False
        if (options.length < 1) {
            errors.push(`Question ${questionNum}: Must have at least 1 answer option`);
            return;
        }

        if (correctValue === undefined) {
            errors.push(`Question ${questionNum}: Missing correct answer`);
            return;
        }

        let correctOption: number;

        if (typeof correctValue === 'number') {
            // Numeric index (support both 0-indexed and 1-indexed)
            correctOption = correctValue >= 0 && correctValue <= 3 ? correctValue : correctValue - 1;
        } else if (typeof correctValue === 'string') {
            // Check if it's a letter or the actual answer text
            const letterMatch = correctValue.toUpperCase().match(/^[A-D]$/);
            if (letterMatch) {
                correctOption = parseCorrectAnswer(correctValue);
            } else if (correctValue.toLowerCase() === 'true') {
                correctOption = 0;
            } else if (correctValue.toLowerCase() === 'false') {
                correctOption = 1;
            } else {
                // Try to find the matching option, or use index 0 for single-answer types
                const foundIndex = options.findIndex(opt =>
                    opt.toLowerCase().trim() === correctValue.toLowerCase().trim()
                );
                correctOption = foundIndex >= 0 ? foundIndex : 0;
            }
        } else {
            errors.push(`Question ${questionNum}: Invalid correct answer format`);
            return;
        }

        if (correctOption < 0) {
            correctOption = 0; // Default to first option for single-answer types
        }

        if (correctOption >= options.length) {
            // For single-answer types, the answer IS the option
            correctOption = 0;
        }

        // Determine question type
        let questionType: QuestionType = 'mcq';
        if (q.type || q.questionType) {
            const rawType = String(q.type || q.questionType).toLowerCase();
            if (rawType === 'true_false' || rawType === 'truefalse' || rawType === 'tf') {
                questionType = 'true_false';
            } else if (rawType === 'fill_blank' || rawType === 'fillblank' || rawType === 'fill') {
                questionType = 'fill_blank';
            } else if (rawType === 'one_word' || rawType === 'oneword' || rawType === 'word') {
                questionType = 'one_word';
            } else if (rawType === 'short_answer' || rawType === 'shortanswer' || rawType === 'short') {
                questionType = 'short_answer';
            }
        } else if (options.length === 2 && options[0].toLowerCase() === 'true' && options[1].toLowerCase() === 'false') {
            questionType = 'true_false';
        } else if (options.length <= 1) {
            questionType = 'short_answer'; // Default for single-answer types
        }

        // For true_false type, ensure options are always ['True', 'False'] and correctOption is calculated
        if (questionType === 'true_false') {
            options = ['True', 'False'];
            // Determine correct option from answer field
            const answerStr = String(correctValue).toLowerCase().trim();
            correctOption = (answerStr === 'false' || answerStr === 'f' || answerStr === '1') ? 1 : 0;
        }

        questions.push({
            text,
            options,
            correctOption,
            type: questionType,
            correctAnswer: questionType !== 'mcq' && questionType !== 'true_false' ? String(correctValue) : undefined
        });
    });

    return {
        success: questions.length > 0,
        questions,
        errors
    };
}

/**
 * Generate a sample CSV template
 */
export function getSampleCSV(): string {
    return `Question,Option A,Option B,Option C,Option D,Correct Answer
"What is the capital of France?",Paris,London,Berlin,Madrid,A
"Which planet is closest to the Sun?",Venus,Mercury,Mars,Jupiter,B
"What is 7 × 8?",54,56,48,64,B`;
}

/**
 * Generate a sample JSON template
 */
export function getSampleJSON(): string {
    return JSON.stringify([
        {
            question: "What is the capital of France?",
            options: ["Paris", "London", "Berlin", "Madrid"],
            correctAnswer: 0
        },
        {
            question: "Which planet is closest to the Sun?",
            options: ["Venus", "Mercury", "Mars", "Jupiter"],
            correctAnswer: 1
        }
    ], null, 2);
}
