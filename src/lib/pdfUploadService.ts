/**
 * PDF Upload Service
 * Handles uploading PDF test papers to Firebase Storage
 * Supports files up to 50MB
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Upload a PDF file to Firebase Storage
 * @param file - The PDF file to upload
 * @param testTitle - Title of the test (used for naming)
 * @param userId - ID of the uploading teacher
 * @returns Download URL of the uploaded PDF
 */
export async function uploadTestPDF(
    file: File,
    testTitle: string,
    userId: string
): Promise<string> {
    // Validate file type
    if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed.');
    }

    // Validate file size (50MB max)
    if (file.size > MAX_PDF_SIZE) {
        throw new Error(`PDF file must be less than 50MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
    }

    // Create a unique path: test-pdfs/{userId}/{timestamp}_{sanitized-title}.pdf
    const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const timestamp = Date.now();
    const storagePath = `test-pdfs/${userId}/${timestamp}_${sanitizedTitle}.pdf`;

    const storageRef = ref(storage, storagePath);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
            uploadedBy: userId,
            testTitle: testTitle,
            originalName: file.name,
        },
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

/**
 * Delete a PDF from Firebase Storage
 * @param pdfUrl - The download URL of the PDF to delete
 */
export async function deleteTestPDF(pdfUrl: string): Promise<void> {
    try {
        // Extract the storage path from the download URL
        const storageRef = ref(storage, pdfUrl);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting PDF from storage:', error);
        // Don't throw - PDF deletion is non-critical
    }
}

/**
 * Get the maximum allowed file size in MB
 */
export function getMaxPDFSizeMB(): number {
    return MAX_PDF_SIZE / (1024 * 1024);
}
