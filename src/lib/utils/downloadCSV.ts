/**
 * CSV Download Utility
 * Converts table data to CSV format and triggers download
 */

export interface CSVData {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Converts an array of objects to CSV string
 * @param data - Array of objects to convert
 * @param headers - Optional custom headers mapping (key: display name)
 * @returns CSV formatted string
 */
export function convertToCSV(
    data: CSVData[],
    headers?: Record<string, string>
): string {
    if (data.length === 0) return '';

    // Get all unique keys from the data
    const keys = Object.keys(data[0]);

    // Create header row with custom headers if provided
    const headerRow = keys
        .map(key => headers?.[key] || key)
        .map(header => `"${header}"`)
        .join(',');

    // Create data rows
    const dataRows = data.map(row =>
        keys
            .map(key => {
                const value = row[key];
                if (value === null || value === undefined) return '""';
                // Escape quotes and wrap in quotes
                const stringValue = String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            })
            .join(',')
    );

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads data as a CSV file
 * @param data - Array of objects to download
 * @param filename - Name of the file (without extension)
 * @param headers - Optional custom headers mapping
 */
export function downloadCSV(
    data: CSVData[],
    filename: string,
    headers?: Record<string, string>
): void {
    const csvContent = convertToCSV(data, headers);

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create temporary anchor element
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    // Append, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the object URL to free memory
    URL.revokeObjectURL(url);
}

/**
 * Formats analytics data for CSV download
 * @param results - Array of result objects from Firestore
 * @returns Formatted data ready for CSV conversion
 */
export function formatAnalyticsForCSV(results: {
    studentName: string;
    studentClass?: string | number;
    testTitle: string;
    score: number;
    totalQuestions: number;
    timestamp: Date | { toDate: () => Date };
}[]): CSVData[] {
    return results.map(result => ({
        'Student Name': result.studentName,
        'Class': result.studentClass || 'N/A',
        'Test Title': result.testTitle,
        'Score': result.score,
        'Total Questions': result.totalQuestions,
        'Percentage': `${Math.round((result.score / result.totalQuestions) * 100)}%`,
        'Date Taken': result.timestamp instanceof Date
            ? result.timestamp.toLocaleDateString()
            : result.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'
    }));
}

/**
 * Downloads analytics results as CSV
 * @param results - Array of test results
 * @param filename - Name of the file (without extension)
 */
export function downloadAnalyticsCSV(results: {
    studentName: string;
    studentClass?: string | number;
    testTitle: string;
    subject?: string;
    score: number;
    totalQuestions: number;
    timestamp: Date | { toDate: () => Date };
}[], filename: string): void {
    const formattedData = results.map(result => ({
        'Student Name': result.studentName,
        'Class': `Class ${result.studentClass}` || 'N/A',
        'Test Title': result.testTitle,
        'Subject': result.subject || 'N/A',
        'Score': result.score,
        'Total Questions': result.totalQuestions,
        'Percentage': `${Math.round((result.score / result.totalQuestions) * 100)}%`,
        'Date Taken': result.timestamp instanceof Date
            ? result.timestamp.toLocaleDateString()
            : result.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'
    }));

    downloadCSV(formattedData, filename);
}

