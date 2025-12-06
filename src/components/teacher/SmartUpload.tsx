'use client';

/**
 * Smart Upload Component
 * Supports CSV and JSON bulk upload for test questions
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileText,
    Code,
    CheckCircle,
    AlertCircle,
    X,
    Download,
    Copy,
    Loader2
} from 'lucide-react';
import { parseCSV, parseJSON, getSampleCSV, getSampleJSON, ParseResult } from '@/lib/utils/parseQuestions';
import { uploadQuestions } from '@/lib/services';

interface SmartUploadProps {
    testId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

type UploadMethod = 'csv' | 'json';

export default function SmartUpload({ testId, onSuccess, onCancel }: SmartUploadProps) {
    const [method, setMethod] = useState<UploadMethod>('csv');
    const [inputText, setInputText] = useState('');
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Handle text input change and auto-parse
    const handleInputChange = useCallback((value: string) => {
        setInputText(value);
        setParseResult(null);
        setUploadError(null);
    }, []);

    // Parse the input
    const handleParse = useCallback(() => {
        if (!inputText.trim()) {
            setUploadError('Please enter some content to parse');
            return;
        }

        const result = method === 'csv' ? parseCSV(inputText) : parseJSON(inputText);
        setParseResult(result);

        if (result.success && result.questions.length > 0) {
            setShowPreview(true);
        }
    }, [inputText, method]);

    // Upload questions to Firestore
    const handleUpload = async () => {
        if (!parseResult?.questions.length) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            await uploadQuestions(testId, parseResult.questions);
            onSuccess();
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError('Failed to upload questions. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // Copy sample to clipboard
    const copySample = () => {
        const sample = method === 'csv' ? getSampleCSV() : getSampleJSON();
        navigator.clipboard.writeText(sample);
    };

    // Load sample into textarea
    const loadSample = () => {
        setInputText(method === 'csv' ? getSampleCSV() : getSampleJSON());
        setParseResult(null);
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setInputText(content);
            setParseResult(null);
        };
        reader.readAsText(file);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onCancel()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Smart Question Upload
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Method Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => { setMethod('csv'); setParseResult(null); setShowPreview(false); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${method === 'csv'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <FileText size={18} />
                            CSV Import
                        </button>
                        <button
                            onClick={() => { setMethod('json'); setParseResult(null); setShowPreview(false); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${method === 'json'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Code size={18} />
                            JSON Paste
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {method === 'csv' ? (
                                <>
                                    <strong>CSV Format:</strong> Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D)
                                </>
                            ) : (
                                <>
                                    <strong>JSON Format:</strong> Array of objects with question, options (array), and correctAnswer (0-3 or A-D)
                                </>
                            )}
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={loadSample}
                                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                <Download size={14} />
                                Load Sample
                            </button>
                            <button
                                onClick={copySample}
                                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                <Copy size={14} />
                                Copy Sample
                            </button>
                        </div>
                    </div>

                    {/* File Upload for CSV */}
                    {method === 'csv' && (
                        <div className="mb-4">
                            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                                <Upload size={20} className="text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Click to upload a CSV file or paste content below
                                </span>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}

                    {/* Text Input */}
                    <textarea
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={method === 'csv'
                            ? 'Paste your CSV content here...'
                            : 'Paste your JSON array here...'
                        }
                        className="w-full h-48 p-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />

                    {/* Parse Button */}
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleParse}
                            disabled={!inputText.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Parse Questions
                        </button>
                    </div>

                    {/* Error Display */}
                    <AnimatePresence>
                        {(uploadError || (parseResult && parseResult.errors.length > 0)) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                            >
                                <div className="flex items-start gap-2">
                                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        {uploadError && (
                                            <p className="text-sm text-red-700 dark:text-red-400">{uploadError}</p>
                                        )}
                                        {parseResult?.errors.map((error, i) => (
                                            <p key={i} className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Preview */}
                    <AnimatePresence>
                        {showPreview && parseResult?.success && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="mt-4"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle size={18} className="text-green-500" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                        Successfully parsed {parseResult.questions.length} questions
                                    </span>
                                </div>

                                {/* Question Preview */}
                                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                                    {parseResult.questions.map((q, index) => (
                                        <div
                                            key={index}
                                            className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                {index + 1}. {q.text}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {q.options.map((opt, optIndex) => (
                                                    <div
                                                        key={optIndex}
                                                        className={`text-xs p-2 rounded-lg ${optIndex === q.correctOption
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        {String.fromCharCode(65 + optIndex)}. {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Upload Button */}
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Upload {parseResult.questions.length} Questions
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
