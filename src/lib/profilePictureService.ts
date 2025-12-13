/**
 * Profile Picture Service
 * Handles uploading and managing user profile pictures
 * Uses base64 encoding stored directly in Firestore (no Firebase Storage billing needed!)
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';

/**
 * Convert image file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Resize image to reduce storage size
 */
function resizeImage(base64: string, maxWidth: number = 200, maxHeight: number = 200): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Use JPEG for smaller size, quality 0.8
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

/**
 * Upload profile picture and update user document
 * Stores as base64 directly in Firestore (free, no Storage billing!)
 */
export async function uploadProfilePicture(
    userId: string,
    file: File
): Promise<string> {
    // Validate file
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    // Max 2MB before compression
    if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image must be less than 2MB');
    }

    // Convert to base64
    const base64 = await fileToBase64(file);

    // Resize to reduce storage (200x200 max)
    const resizedBase64 = await resizeImage(base64, 200, 200);

    // Check final size (Firestore has 1MB document limit, but we want much smaller)
    if (resizedBase64.length > 100000) {
        // Try smaller size
        const smallerBase64 = await resizeImage(base64, 150, 150);
        if (smallerBase64.length > 100000) {
            throw new Error('Image is too large. Please use a smaller image.');
        }
        // Update user document with the photo URL (base64 string)
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            photoURL: smallerBase64,
            updatedAt: new Date()
        });
        return smallerBase64;
    }

    // Update user document with the photo URL (base64 string)
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        photoURL: resizedBase64,
        updatedAt: new Date()
    });

    return resizedBase64;
}

/**
 * Delete profile picture
 */
export async function deleteProfilePicture(userId: string): Promise<void> {
    // Update user document to remove photo URL
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        photoURL: null,
        updatedAt: new Date()
    });
}

/**
 * Get profile picture URL for a user
 */
export function getProfilePictureURL(user: { photoURL?: string | null; name: string }): string | null {
    return user.photoURL || null;
}
