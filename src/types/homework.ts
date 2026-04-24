/**
 * Homework Type Definitions
 * By Nihal Pawar
 */

export interface Homework {
    id: string;
    title: string;
    description: string;
    classLevel: string; // e.g., "Class 9"
    classNumber: number; // e.g., 9 (for querying)
    subject: string;
    createdBy: string; // teacherId
    createdByName?: string; // teacher name
    createdAt: Date;
    dueDate?: Date; // optional due date
    isActive: boolean;
}

export interface HomeworkFormData {
    title: string;
    description: string;
    classNumber: number;
    subject: string;
    dueDate?: string; // ISO string from form input
}
