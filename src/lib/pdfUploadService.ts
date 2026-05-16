/**
 * PDF Upload Service
 * Handles converting PDF files to base64 for storage in Firestore
 * Max file size ~750KB (Firestore 1MB document limit minus overhead)
 */

const MAX_PDF_SIZE = 750 * 1024; // 750KB - safe limit for Firestore (1MB doc limit, base64 adds ~33%)

/**
 * Convert a PDF file to base64 data URL for Firestore storage
 * @param file - The PDF file to convert
 * @returns Base64 data URL string
 */
export function convertPDFToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = () => {
            reject(new Error('Failed to read PDF file.'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Validate a PDF file before upload
 * @param file - The PDF file to validate
 * @returns Error message or null if valid
 */
export function validatePDF(file: File): string | null {
    if (file.type !== 'application/pdf') {
        return 'Only PDF files are allowed.';
    }

    if (file.size > MAX_PDF_SIZE) {
        return `PDF must be under ${getMaxPDFSizeMB()}MB. Your file: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Try compressing it at smallpdf.com`;
    }

    return null;
}

/**
 * Get the maximum allowed file size in MB
 */
export function getMaxPDFSizeMB(): number {
    return Math.round((MAX_PDF_SIZE / (1024 * 1024)) * 10) / 10; // 0.7 MB
}

/**
 * Get max size in KB for display
 */
export function getMaxPDFSizeKB(): number {
    return MAX_PDF_SIZE / 1024; // 750 KB
}
