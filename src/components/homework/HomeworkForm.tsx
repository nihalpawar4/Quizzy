'use client';

/**
 * HomeworkForm Component
 * Form for teachers to upload/create homework assignments
 * By Nihal Pawar
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Send,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    FileText,
    GraduationCap,
    Sparkles
} from 'lucide-react';
import { createHomework } from '@/services/homeworkService';
import { sendHomeworkNotification } from '@/services/notificationService';
import { createNotification } from '@/lib/services';
import { CLASS_OPTIONS, SUBJECTS } from '@/lib/constants';
import type { HomeworkFormData } from '@/types/homework';

interface HomeworkFormProps {
    teacherId: string;
    teacherName: string;
    onSuccess?: () => void;
    onClose?: () => void;
}

export default function HomeworkForm({ teacherId, teacherName, onSuccess, onClose }: HomeworkFormProps) {
    const [formData, setFormData] = useState<HomeworkFormData>({
        title: '',
        description: '',
        classNumber: 5,
        subject: SUBJECTS[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError('Please enter a homework title');
            return;
        }
        if (!formData.description.trim()) {
            setError('Please enter a description');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Save homework to Firestore
            await createHomework(formData, teacherId, teacherName);

            // 2. Create a notification in Firestore (for in-app notification panel)
            await createNotification({
                type: 'announcement',
                title: '📚 New Homework Uploaded',
                message: `${formData.title} - ${formData.subject}`,
                targetClass: formData.classNumber,
                createdBy: teacherId,
                createdByName: teacherName
            });

            // 3. Trigger push notifications to students
            await sendHomeworkNotification(
                formData.title,
                formData.subject,
                formData.classNumber
            );

            setSuccess(true);

            // Reset form after delay
            setTimeout(() => {
                setFormData({
                    title: '',
                    description: '',
                    classNumber: 5,
                    subject: SUBJECTS[0],
                });
                setSuccess(false);
                onSuccess?.();
            }, 2000);
        } catch (err) {
            console.error('Error creating homework:', err);
            setError('Failed to create homework. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
        >
            {/* Header */}
            <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjcCkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">Upload Homework</h2>
                            <p className="text-xs sm:text-sm text-white/80">Students will be notified instantly</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* Success State */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-8 text-center"
                    >
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            Homework Uploaded Successfully! 🎉
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Students of Class {formData.classNumber} have been notified
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <Sparkles className="w-4 h-4" />
                            <span>Push notification sent</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Form */}
            {!success && (
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                            >
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                <button
                                    type="button"
                                    onClick={() => setError(null)}
                                    className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-red-500" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Title */}
                    <div>
                        <label htmlFor="hw-title" className="label">
                            <BookOpen className="w-4 h-4 inline mr-2" />
                            Homework Title
                        </label>
                        <input
                            id="hw-title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Chapter 5 - Quadratic Equations"
                            className="input"
                            maxLength={200}
                        />
                    </div>

                    {/* Class & Subject Row */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="hw-class" className="label">
                                <GraduationCap className="w-4 h-4 inline mr-2" />
                                Class
                            </label>
                            <select
                                id="hw-class"
                                value={formData.classNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, classNumber: parseInt(e.target.value) }))}
                                className="input"
                            >
                                {CLASS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="hw-subject" className="label">Subject</label>
                            <select
                                id="hw-subject"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                className="input"
                            >
                                {SUBJECTS.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="hw-description" className="label">Description</label>
                        <textarea
                            id="hw-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe the homework assignment in detail..."
                            className="input min-h-[120px] resize-y"
                            maxLength={2000}
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                            {formData.description.length}/2000
                        </p>
                    </div>

                    {/* Due Date (optional) */}
                    <div>
                        <label htmlFor="hw-due-date" className="label">
                            Due Date <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            id="hw-due-date"
                            type="datetime-local"
                            value={formData.dueDate || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                            className="input"
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                Instant Notification
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                All students of Class {formData.classNumber} will receive a push notification
                                when you upload this homework.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn btn-primary text-sm sm:text-base py-3 sm:py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Uploading Homework...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Upload Homework & Notify Students</span>
                                <span className="sm:hidden">Upload & Notify</span>
                            </>
                        )}
                    </button>
                </form>
            )}
        </motion.div>
    );
}
