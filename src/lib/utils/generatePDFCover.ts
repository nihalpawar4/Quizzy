/**
 * PDF Cover Page Generator
 * Creates a branded cover page and prepends it to the test PDF
 * Uses pdf-lib for PDF manipulation
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CoverPageInfo {
    testTitle: string;
    subject: string;
    targetClass: number;
    teacherName: string;
    createdAt: Date;
    duration?: number; // minutes
    marksPerQuestion?: number;
    questionCount?: number;
    totalMarks?: number;
    difficultyLevel?: string;
    pdfFileName?: string;
}

/**
 * Generate a cover page and merge with existing PDF
 * Returns a Blob of the final PDF
 */
export async function generatePDFWithCover(
    pdfDataUrl: string,
    info: CoverPageInfo
): Promise<Blob> {
    // Create the cover page document
    const coverDoc = await PDFDocument.create();
    const page = coverDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    const helveticaBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await coverDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryBlue = rgb(0.086, 0.314, 0.922);    // #1650EB
    const darkText = rgb(0.1, 0.1, 0.15);
    const grayText = rgb(0.35, 0.35, 0.4);
    const lightGray = rgb(0.92, 0.92, 0.95);
    const white = rgb(1, 1, 1);

    // ═══════════════════════════════════════════
    // TOP BANNER - Blue gradient header
    // ═══════════════════════════════════════════
    const bannerHeight = 120;
    page.drawRectangle({
        x: 0,
        y: height - bannerHeight,
        width: width,
        height: bannerHeight,
        color: primaryBlue,
    });

    // Decorative circle in top right
    page.drawCircle({
        x: width - 60,
        y: height - 40,
        size: 35,
        color: rgb(0.15, 0.4, 0.95),
    });

    page.drawCircle({
        x: width - 30,
        y: height - 80,
        size: 20,
        color: rgb(0.12, 0.35, 0.93),
    });

    // "QUIZY" branding
    page.drawText('QUIZY', {
        x: 50,
        y: height - 55,
        size: 32,
        font: helveticaBold,
        color: white,
    });

    // Tagline
    page.drawText('Master Your Exams', {
        x: 50,
        y: height - 80,
        size: 14,
        font: helvetica,
        color: rgb(0.8, 0.85, 1),
    });

    // "TEST PAPER" label
    page.drawText('TEST PAPER', {
        x: 50,
        y: height - 105,
        size: 12,
        font: helveticaBold,
        color: rgb(0.7, 0.78, 1),
    });

    // ═══════════════════════════════════════════
    // TEST TITLE SECTION
    // ═══════════════════════════════════════════
    let yPos = height - bannerHeight - 50;

    // Title background
    page.drawRectangle({
        x: 30,
        y: yPos - 15,
        width: width - 60,
        height: 55,
        color: lightGray,
        borderColor: rgb(0.85, 0.85, 0.9),
        borderWidth: 1,
    });

    // Truncate title if too long
    const displayTitle = info.testTitle.length > 50
        ? info.testTitle.substring(0, 47) + '...'
        : info.testTitle;

    page.drawText(displayTitle, {
        x: 50,
        y: yPos + 10,
        size: 22,
        font: helveticaBold,
        color: darkText,
    });

    // ═══════════════════════════════════════════
    // INFO TABLE
    // ═══════════════════════════════════════════
    yPos -= 80;
    const labelX = 60;
    const valueX = 230;
    const rowHeight = 38;
    const tableWidth = width - 80;

    // Draw table background
    const infoRows = [
        { label: 'Subject', value: info.subject },
        { label: 'Class', value: `Class ${info.targetClass}` },
        { label: 'Created By', value: info.teacherName },
        { label: 'Date', value: formatDate(info.createdAt) },
        { label: 'Time', value: formatTime(info.createdAt) },
    ];

    // Add optional fields
    if (info.duration) {
        infoRows.push({ label: 'Time Allocated', value: `${info.duration} minutes` });
    }
    if (info.totalMarks || (info.marksPerQuestion && info.questionCount)) {
        const total = info.totalMarks || ((info.marksPerQuestion || 1) * (info.questionCount || 0));
        if (total > 0) {
            infoRows.push({ label: 'Maximum Marks', value: `${total}` });
        }
    }
    if (info.marksPerQuestion) {
        infoRows.push({ label: 'Marks Per Question', value: `${info.marksPerQuestion}` });
    }
    if (info.difficultyLevel) {
        infoRows.push({ label: 'Difficulty Level', value: info.difficultyLevel });
    }

    // Draw table header
    page.drawRectangle({
        x: 40,
        y: yPos - 5,
        width: tableWidth,
        height: rowHeight,
        color: primaryBlue,
    });

    page.drawText('FIELD', {
        x: labelX,
        y: yPos + 8,
        size: 11,
        font: helveticaBold,
        color: white,
    });

    page.drawText('DETAILS', {
        x: valueX,
        y: yPos + 8,
        size: 11,
        font: helveticaBold,
        color: white,
    });

    yPos -= rowHeight;

    // Draw rows
    infoRows.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? white : lightGray;

        page.drawRectangle({
            x: 40,
            y: yPos - 5,
            width: tableWidth,
            height: rowHeight,
            color: bgColor,
            borderColor: rgb(0.88, 0.88, 0.92),
            borderWidth: 0.5,
        });

        page.drawText(row.label, {
            x: labelX,
            y: yPos + 8,
            size: 11,
            font: helveticaBold,
            color: grayText,
        });

        page.drawText(row.value, {
            x: valueX,
            y: yPos + 8,
            size: 12,
            font: helvetica,
            color: darkText,
        });

        yPos -= rowHeight;
    });

    // Table border
    const tableHeight = (infoRows.length + 1) * rowHeight;
    page.drawRectangle({
        x: 40,
        y: yPos + rowHeight - 5,
        width: tableWidth,
        height: tableHeight,
        borderColor: rgb(0.8, 0.8, 0.85),
        borderWidth: 1,
    });

    // ═══════════════════════════════════════════
    // INSTRUCTIONS BOX
    // ═══════════════════════════════════════════
    yPos -= 40;

    page.drawRectangle({
        x: 40,
        y: yPos - 75,
        width: tableWidth,
        height: 100,
        color: rgb(0.96, 0.97, 1),
        borderColor: primaryBlue,
        borderWidth: 1,
    });

    page.drawText('INSTRUCTIONS', {
        x: 55,
        y: yPos + 5,
        size: 11,
        font: helveticaBold,
        color: primaryBlue,
    });

    const instructions = [
        '• Read all questions carefully before answering.',
        '• Write your name and roll number on the answer sheet.',
        '• Attempt all questions unless stated otherwise.',
        info.duration ? `• Total time allowed: ${info.duration} minutes.` : '• Complete the test within the allocated time.',
    ];

    instructions.forEach((instr, i) => {
        page.drawText(instr, {
            x: 55,
            y: yPos - 15 - (i * 16),
            size: 10,
            font: helvetica,
            color: grayText,
        });
    });

    // ═══════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════
    page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 45,
        color: rgb(0.97, 0.97, 0.98),
    });

    page.drawText('Generated by Quizy - Master Your Exams | quizy-app.vercel.app', {
        x: 50,
        y: 20,
        size: 9,
        font: helvetica,
        color: grayText,
    });

    page.drawText(`Downloaded: ${formatDate(new Date())} at ${formatTime(new Date())}`, {
        x: 50,
        y: 8,
        size: 8,
        font: helvetica,
        color: rgb(0.55, 0.55, 0.6),
    });

    // ═══════════════════════════════════════════
    // MERGE: Cover Page + Original PDF
    // ═══════════════════════════════════════════
    try {
        // Convert base64 data URL to bytes
        const base64Data = pdfDataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const pdfBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            pdfBytes[i] = binaryString.charCodeAt(i);
        }

        // Load the original PDF
        const originalDoc = await PDFDocument.load(pdfBytes);
        const coverBytes = await coverDoc.save();
        const mergedDoc = await PDFDocument.load(coverBytes);

        // Copy all pages from original to merged
        const originalPages = await mergedDoc.copyPages(originalDoc, originalDoc.getPageIndices());
        originalPages.forEach(p => mergedDoc.addPage(p));

        const mergedBytes = await mergedDoc.save();
        return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    } catch {
        // If merge fails, return just the cover page
        console.warn('Could not merge PDFs, returning cover page only');
        const coverBytes = await coverDoc.save();
        return new Blob([coverBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    }
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}
