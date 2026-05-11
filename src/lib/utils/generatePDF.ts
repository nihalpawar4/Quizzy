/**
 * PDF Report Generator for Quizy App
 * 
 * Generates professional PDF reports for:
 * 1. Student test reports (My Reports tab)
 * 2. Teacher response downloads (Analytics / Detailed Results)
 */

import { jsPDF } from 'jspdf';
import type { TestResult } from '@/types';

// ===================== COLOR PALETTE =====================
const COLORS = {
    primary: [22, 80, 235] as [number, number, number],       // #1650EB
    primaryLight: [96, 149, 219] as [number, number, number],  // #6095DB
    success: [16, 185, 129] as [number, number, number],       // emerald-500
    danger: [239, 68, 68] as [number, number, number],         // red-500
    warning: [245, 158, 11] as [number, number, number],       // amber-500
    dark: [17, 24, 39] as [number, number, number],            // gray-900
    gray: [107, 114, 128] as [number, number, number],         // gray-500
    lightGray: [229, 231, 235] as [number, number, number],    // gray-200
    white: [255, 255, 255] as [number, number, number],
    bgLight: [249, 250, 251] as [number, number, number],      // gray-50
    successBg: [236, 253, 245] as [number, number, number],    // green-50
    dangerBg: [254, 242, 242] as [number, number, number],     // red-50
};

// ===================== HELPERS =====================
function setColor(doc: jsPDF, color: [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(doc: jsPDF, color: [number, number, number]) {
    doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(doc: jsPDF, color: [number, number, number]) {
    doc.setDrawColor(color[0], color[1], color[2]);
}

function addPageIfNeeded(doc: jsPDF, y: number, requiredHeight: number = 40): number {
    if (y + requiredHeight > 280) {
        doc.addPage();
        return 20;
    }
    return y;
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fillColor: [number, number, number]) {
    setFillColor(doc, fillColor);
    doc.roundedRect(x, y, w, h, r, r, 'F');
}

function formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ===================== STUDENT REPORT PDF =====================
/**
 * Generate a beautiful PDF report for a student's test result.
 * Called from the student dashboard "My Reports" tab.
 */
export function generateStudentReportPDF(result: TestResult): void {
    if (!result.detailedAnswers || result.detailedAnswers.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ---- Header Banner ----
    setFillColor(doc, COLORS.primary);
    doc.rect(0, 0, pageWidth, 44, 'F');

    // Decorative circle
    setFillColor(doc, [255, 255, 255]);
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.circle(pageWidth - 15, 10, 25, 'F');
    doc.circle(20, 40, 18, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    setColor(doc, COLORS.white);
    doc.text('QUIZY', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, [200, 215, 255]);
    doc.text('Test Performance Report', margin, 26);

    // Date on right
    doc.setFontSize(9);
    setColor(doc, [180, 200, 255]);
    doc.text(formatDate(result.timestamp), pageWidth - margin, 18, { align: 'right' });

    y = 54;

    // ---- Test Info Card ----
    drawRoundedRect(doc, margin, y, contentWidth, 32, 3, COLORS.bgLight);
    setDrawColor(doc, COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.dark);
    doc.text(result.testTitle, margin + 8, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, COLORS.gray);
    doc.text(`Subject: ${result.subject}`, margin + 8, y + 22);

    // Score badge on right
    const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
    const scoreColor = scorePercent >= 70 ? COLORS.success : scorePercent >= 40 ? COLORS.warning : COLORS.danger;
    const scoreBadgeWidth = 42;
    const scoreBadgeX = pageWidth - margin - scoreBadgeWidth - 5;

    drawRoundedRect(doc, scoreBadgeX, y + 5, scoreBadgeWidth, 22, 3, scoreColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(doc, COLORS.white);
    doc.text(`${scorePercent}%`, scoreBadgeX + scoreBadgeWidth / 2, y + 19, { align: 'center' });

    y += 42;

    // ---- Score Summary Row ----
    const cardW = (contentWidth - 8) / 3;

    // Correct
    drawRoundedRect(doc, margin, y, cardW, 20, 2, COLORS.successBg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.success);
    doc.text(`${result.score}`, margin + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Correct', margin + cardW / 2, y + 16, { align: 'center' });

    // Incorrect
    const incorrectCount = result.totalQuestions - result.score;
    drawRoundedRect(doc, margin + cardW + 4, y, cardW, 20, 2, COLORS.dangerBg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.danger);
    doc.text(`${incorrectCount}`, margin + cardW + 4 + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Incorrect', margin + cardW + 4 + cardW / 2, y + 16, { align: 'center' });

    // Total
    drawRoundedRect(doc, margin + (cardW + 4) * 2, y, cardW, 20, 2, COLORS.bgLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.primary);
    doc.text(`${result.totalQuestions}`, margin + (cardW + 4) * 2 + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, COLORS.gray);
    doc.text('Total', margin + (cardW + 4) * 2 + cardW / 2, y + 16, { align: 'center' });

    y += 28;

    // ---- Detailed Answers Section ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setColor(doc, COLORS.dark);
    doc.text('Detailed Answer Breakdown', margin, y);

    // Divider line
    y += 4;
    setDrawColor(doc, COLORS.primary);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 60, y);
    y += 8;

    result.detailedAnswers.forEach((answer, index) => {
        // Estimate required height for this question
        const questionLines = doc.splitTextToSize(`Q${index + 1}: ${answer.questionText}`, contentWidth - 20);
        const estimatedHeight = 24 + questionLines.length * 5;
        y = addPageIfNeeded(doc, y, estimatedHeight);

        const bgColor = answer.isCorrect ? COLORS.successBg : COLORS.dangerBg;
        const borderColor = answer.isCorrect ? COLORS.success : COLORS.danger;

        const blockHeight = 18 + questionLines.length * 5 + (answer.isCorrect ? 0 : 6);

        // Card background
        drawRoundedRect(doc, margin, y, contentWidth, blockHeight, 2, bgColor);

        // Left color strip
        setFillColor(doc, borderColor);
        doc.rect(margin, y, 2.5, blockHeight, 'F');

        // Status icon
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        setColor(doc, answer.isCorrect ? COLORS.success : COLORS.danger);
        doc.text(answer.isCorrect ? '✓' : '✗', margin + 7, y + 6);

        // Question text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        setColor(doc, COLORS.dark);
        doc.text(questionLines, margin + 13, y + 6);

        let ansY = y + 6 + questionLines.length * 5 + 2;

        // Your answer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        setColor(doc, COLORS.gray);
        doc.text('Your Answer: ', margin + 13, ansY);
        doc.setFont('helvetica', 'bold');
        setColor(doc, answer.isCorrect ? COLORS.success : COLORS.danger);
        doc.text(answer.userAnswer || 'Not answered', margin + 37, ansY);

        // Correct answer (only for wrong answers)
        if (!answer.isCorrect) {
            ansY += 6;
            doc.setFont('helvetica', 'normal');
            setColor(doc, COLORS.gray);
            doc.text('Correct Answer: ', margin + 13, ansY);
            doc.setFont('helvetica', 'bold');
            setColor(doc, COLORS.success);
            doc.text(answer.correctAnswer, margin + 41, ansY);
        }

        y += blockHeight + 4;
    });

    // ---- Footer ----
    y = addPageIfNeeded(doc, y, 20);
    y += 6;
    setDrawColor(doc, COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(doc, COLORS.gray);
    doc.text('Generated by Quizy — Your Smart Learning Platform', pageWidth / 2, y, { align: 'center' });

    // Save
    const safeTitle = result.testTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date(result.timestamp).toISOString().split('T')[0];
    doc.save(`Quizy_Report_${safeTitle}_${dateStr}.pdf`);
}

// ===================== TEACHER: DOWNLOAD ALL RESPONSES PDF =====================
/**
 * Generate a PDF with all student responses for a specific test (detailed analytics view).
 * Called from the teacher dashboard detailed analytics modal.
 */
export function generateTeacherResponsesPDF(
    testTitle: string,
    subject: string,
    targetClass: number,
    results: TestResult[]
): void {
    if (results.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ---- Header Banner ----
    setFillColor(doc, COLORS.primary);
    doc.rect(0, 0, pageWidth, 44, 'F');

    // Decorative circles
    setFillColor(doc, [255, 255, 255]);
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.circle(pageWidth - 15, 10, 25, 'F');
    doc.circle(20, 40, 18, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    setColor(doc, COLORS.white);
    doc.text('QUIZY', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, [200, 215, 255]);
    doc.text('Student Responses Report', margin, 26);

    // Date
    doc.setFontSize(9);
    setColor(doc, [180, 200, 255]);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin, 18, { align: 'right' });

    y = 54;

    // ---- Test Info Card ----
    drawRoundedRect(doc, margin, y, contentWidth, 28, 3, COLORS.bgLight);
    setDrawColor(doc, COLORS.lightGray);
    doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.dark);
    doc.text(testTitle, margin + 8, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, COLORS.gray);
    doc.text(`${subject} • Class ${targetClass} • ${results.length} submissions`, margin + 8, y + 21);

    // Average badge
    const avgScore = Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length);
    const avgColor = avgScore >= 70 ? COLORS.success : avgScore >= 40 ? COLORS.warning : COLORS.danger;
    const avgBadgeW = 42;
    const avgBadgeX = pageWidth - margin - avgBadgeW - 5;
    drawRoundedRect(doc, avgBadgeX, y + 4, avgBadgeW, 20, 3, avgColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, COLORS.white);
    doc.text(`Avg ${avgScore}%`, avgBadgeX + avgBadgeW / 2, y + 17, { align: 'center' });

    y += 38;

    // ---- Summary Table ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(doc, COLORS.dark);
    doc.text('Summary', margin, y);
    y += 6;

    // Table header
    drawRoundedRect(doc, margin, y, contentWidth, 10, 1, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(doc, COLORS.white);
    doc.text('#', margin + 4, y + 7);
    doc.text('Student Name', margin + 12, y + 7);
    doc.text('Class', margin + 80, y + 7);
    doc.text('Score', margin + 100, y + 7);
    doc.text('Percentage', margin + 125, y + 7);
    doc.text('Date', margin + 155, y + 7);
    y += 12;

    // Table rows
    results.forEach((result, idx) => {
        y = addPageIfNeeded(doc, y, 10);

        const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
        drawRoundedRect(doc, margin, y, contentWidth, 9, 0, rowBg);

        const percent = Math.round((result.score / result.totalQuestions) * 100);
        const pColor = percent >= 70 ? COLORS.success : percent >= 40 ? COLORS.warning : COLORS.danger;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(doc, COLORS.gray);
        doc.text(`${idx + 1}`, margin + 4, y + 6);

        setColor(doc, COLORS.dark);
        doc.text(result.studentName.substring(0, 25), margin + 12, y + 6);

        setColor(doc, COLORS.gray);
        doc.text(`${result.studentClass}`, margin + 83, y + 6);

        doc.text(`${result.score}/${result.totalQuestions}`, margin + 100, y + 6);

        doc.setFont('helvetica', 'bold');
        setColor(doc, pColor);
        doc.text(`${percent}%`, margin + 130, y + 6);

        doc.setFont('helvetica', 'normal');
        setColor(doc, COLORS.gray);
        doc.text(
            new Date(result.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            margin + 155, y + 6
        );

        y += 10;
    });

    y += 8;

    // ---- Detailed Responses Per Student ----
    results.forEach((result, studentIdx) => {
        y = addPageIfNeeded(doc, y, 50);

        // Student header
        const percent = Math.round((result.score / result.totalQuestions) * 100);
        const scoreColor = percent >= 70 ? COLORS.success : percent >= 40 ? COLORS.warning : COLORS.danger;

        drawRoundedRect(doc, margin, y, contentWidth, 14, 2, COLORS.bgLight);
        setDrawColor(doc, scoreColor);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 14);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(doc, COLORS.dark);
        doc.text(`${studentIdx + 1}. ${result.studentName}`, margin + 6, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(doc, COLORS.gray);
        doc.text(`Class ${result.studentClass} • ${result.score}/${result.totalQuestions}`, margin + 6, y + 12);

        // Score badge
        drawRoundedRect(doc, pageWidth - margin - 28, y + 2, 24, 10, 2, scoreColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        setColor(doc, COLORS.white);
        doc.text(`${percent}%`, pageWidth - margin - 16, y + 9, { align: 'center' });

        y += 18;

        // Detailed answers
        if (result.detailedAnswers && result.detailedAnswers.length > 0) {
            result.detailedAnswers.forEach((answer, qIdx) => {
                const qLines = doc.splitTextToSize(`Q${qIdx + 1}: ${answer.questionText}`, contentWidth - 18);
                const blockH = 14 + qLines.length * 4 + (answer.isCorrect ? 0 : 5);
                y = addPageIfNeeded(doc, y, blockH + 4);

                const bgColor = answer.isCorrect ? COLORS.successBg : COLORS.dangerBg;
                drawRoundedRect(doc, margin + 4, y, contentWidth - 8, blockH, 1.5, bgColor);

                // Question
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                setColor(doc, COLORS.dark);
                doc.text(qLines, margin + 8, y + 5);

                let ansY = y + 5 + qLines.length * 4 + 1;

                // Student answer
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                setColor(doc, COLORS.gray);
                doc.text('Answer: ', margin + 8, ansY);
                doc.setFont('helvetica', 'bold');
                setColor(doc, answer.isCorrect ? COLORS.success : COLORS.danger);
                doc.text(`${answer.userAnswer || '(No answer)'}  ${answer.isCorrect ? '✓' : '✗'}`, margin + 23, ansY);

                if (!answer.isCorrect) {
                    ansY += 5;
                    doc.setFont('helvetica', 'normal');
                    setColor(doc, COLORS.gray);
                    doc.text('Correct: ', margin + 8, ansY);
                    doc.setFont('helvetica', 'bold');
                    setColor(doc, COLORS.success);
                    doc.text(answer.correctAnswer, margin + 23, ansY);
                }

                y += blockH + 3;
            });
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            setColor(doc, COLORS.gray);
            doc.text('Detailed answers not available for this submission.', margin + 8, y);
            y += 8;
        }

        y += 6;
    });

    // ---- Footer ----
    y = addPageIfNeeded(doc, y, 16);
    y += 4;
    setDrawColor(doc, COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(doc, COLORS.gray);
    doc.text('Generated by Quizy — Teacher Analytics Dashboard', pageWidth / 2, y, { align: 'center' });

    // Save
    const safeTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Quizy_Responses_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ===================== TEACHER: DOWNLOAD FILTERED RESULTS PDF =====================
/**
 * Generate a PDF of filtered analytics results (from the Analytics tab table).
 * This is a table-format PDF as an alternative to CSV.
 */
export function generateAnalyticsResultsPDF(results: TestResult[]): void {
    if (results.length === 0) return;

    const doc = new jsPDF('l', 'mm', 'a4'); // landscape for table
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ---- Header ----
    setFillColor(doc, COLORS.primary);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setColor(doc, COLORS.white);
    doc.text('QUIZY — Analytics Results', margin, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, [200, 215, 255]);
    doc.text(
        `${results.length} results • Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        margin, 24
    );

    y = 38;

    // ---- Table Header ----
    drawRoundedRect(doc, margin, y, contentWidth, 10, 1, COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(doc, COLORS.white);

    const cols = [
        { label: '#', x: margin + 4 },
        { label: 'Student', x: margin + 14 },
        { label: 'Email', x: margin + 65 },
        { label: 'Class', x: margin + 130 },
        { label: 'Test', x: margin + 148 },
        { label: 'Subject', x: margin + 210 },
        { label: 'Score', x: margin + 235 },
        { label: '%', x: margin + 254 },
    ];

    cols.forEach(c => doc.text(c.label, c.x, y + 7));
    y += 12;

    // ---- Table Rows ----
    results.forEach((result, idx) => {
        y = addPageIfNeeded(doc, y, 10);

        const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
        drawRoundedRect(doc, margin, y, contentWidth, 9, 0, rowBg);

        const percent = Math.round((result.score / result.totalQuestions) * 100);
        const pColor = percent >= 70 ? COLORS.success : percent >= 40 ? COLORS.warning : COLORS.danger;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        setColor(doc, COLORS.gray);
        doc.text(`${idx + 1}`, cols[0].x, y + 6);

        setColor(doc, COLORS.dark);
        doc.text(result.studentName.substring(0, 22), cols[1].x, y + 6);

        setColor(doc, COLORS.gray);
        doc.text(result.studentEmail.substring(0, 28), cols[2].x, y + 6);
        doc.text(`${result.studentClass}`, cols[3].x, y + 6);

        setColor(doc, COLORS.dark);
        doc.text(result.testTitle.substring(0, 25), cols[4].x, y + 6);

        setColor(doc, COLORS.gray);
        doc.text(result.subject.substring(0, 12), cols[5].x, y + 6);
        doc.text(`${result.score}/${result.totalQuestions}`, cols[6].x, y + 6);

        doc.setFont('helvetica', 'bold');
        setColor(doc, pColor);
        doc.text(`${percent}%`, cols[7].x, y + 6);

        y += 10;
    });

    // ---- Footer ----
    y = addPageIfNeeded(doc, y, 14);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    setColor(doc, COLORS.gray);
    doc.text('Generated by Quizy — Teacher Analytics Dashboard', pageWidth / 2, y, { align: 'center' });

    doc.save(`Quizy_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
}
