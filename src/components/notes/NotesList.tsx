'use client';

/**
 * NotesList Component — Premium 2026 EdTech Design
 * Accordion cards, glassmorphism, analytics strip, subject filters
 * Apple Liquid Glass + Linear + Notion inspired
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, ArrowRight, Clock, Paperclip, User, MoreVertical, BookOpen } from 'lucide-react';
import type { SubjectNote } from '@/types';

interface NotesListProps {
    notes: SubjectNote[];
    readNoteIds: Set<string>;
    onReadNote: (noteId: string) => void;
    onOpenNote: (note: SubjectNote) => void;
}

// Subject config with SVG illustrations and colors
const SUBJECT_CONFIG: Record<string, { icon: React.ReactNode; color: string; lightBg: string; chipBg: string; chipText: string; chipBorder: string }> = {
    'Science': {
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <rect width="48" height="48" rx="14" fill="#ecfdf5"/>
                <g opacity="0.9">
                    <circle cx="24" cy="18" r="5" fill="#10b981" opacity="0.2"/>
                    <path d="M20 30c0-3 2-5 4-8 2 3 4 5 4 8a4 4 0 01-8 0z" fill="#10b981" opacity="0.3"/>
                    <circle cx="24" cy="20" r="8" stroke="#10b981" strokeWidth="1.5" fill="none"/>
                    <line x1="24" y1="12" x2="24" y2="28" stroke="#10b981" strokeWidth="1.2"/>
                    <line x1="16" y1="20" x2="32" y2="20" stroke="#10b981" strokeWidth="1.2"/>
                    <circle cx="24" cy="20" r="3" fill="#10b981" opacity="0.4"/>
                    <path d="M18 32h12M20 36h8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
            </svg>
        ),
        color: '#10b981', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
        chipBg: 'bg-emerald-50 dark:bg-emerald-900/20', chipText: 'text-emerald-600 dark:text-emerald-400', chipBorder: 'border-emerald-200 dark:border-emerald-800'
    },
    'Mathematics': {
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <rect width="48" height="48" rx="14" fill="#eff6ff"/>
                <g opacity="0.9">
                    <rect x="12" y="12" width="24" height="24" rx="4" stroke="#3b82f6" strokeWidth="1.5" fill="#3b82f6" fillOpacity="0.08"/>
                    <text x="18" y="22" fill="#3b82f6" fontSize="8" fontWeight="bold">÷</text>
                    <text x="26" y="22" fill="#3b82f6" fontSize="8" fontWeight="bold">×</text>
                    <text x="18" y="33" fill="#3b82f6" fontSize="8" fontWeight="bold">+</text>
                    <text x="26" y="33" fill="#3b82f6" fontSize="8" fontWeight="bold">−</text>
                    <line x1="24" y1="14" x2="24" y2="34" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
                    <line x1="14" y1="26" x2="34" y2="26" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
                </g>
            </svg>
        ),
        color: '#3b82f6', lightBg: 'bg-blue-50 dark:bg-blue-900/20',
        chipBg: 'bg-blue-50 dark:bg-blue-900/20', chipText: 'text-blue-600 dark:text-blue-400', chipBorder: 'border-blue-200 dark:border-blue-800'
    },
    'Social Science': {
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <rect width="48" height="48" rx="14" fill="#f0fdf4"/>
                <circle cx="24" cy="24" r="10" stroke="#22c55e" strokeWidth="1.5" fill="#22c55e" fillOpacity="0.08"/>
                <ellipse cx="24" cy="24" rx="10" ry="4" stroke="#22c55e" strokeWidth="1" opacity="0.5"/>
                <ellipse cx="24" cy="24" rx="4" ry="10" stroke="#22c55e" strokeWidth="1" opacity="0.5"/>
                <line x1="14" y1="24" x2="34" y2="24" stroke="#22c55e" strokeWidth="0.8" opacity="0.4"/>
                <circle cx="24" cy="24" r="2" fill="#22c55e" opacity="0.4"/>
            </svg>
        ),
        color: '#22c55e', lightBg: 'bg-green-50 dark:bg-green-900/20',
        chipBg: 'bg-green-50 dark:bg-green-900/20', chipText: 'text-green-600 dark:text-green-400', chipBorder: 'border-green-200 dark:border-green-800'
    },
    'Hindi': {
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <rect width="48" height="48" rx="14" fill="#fef2f2"/>
                <rect x="12" y="14" width="24" height="20" rx="3" stroke="#ef4444" strokeWidth="1.5" fill="#ef4444" fillOpacity="0.06"/>
                <text x="24" y="30" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="serif">अ</text>
                <line x1="14" y1="18" x2="34" y2="18" stroke="#ef4444" strokeWidth="1.2" opacity="0.3"/>
            </svg>
        ),
        color: '#ef4444', lightBg: 'bg-red-50 dark:bg-red-900/20',
        chipBg: 'bg-red-50 dark:bg-red-900/20', chipText: 'text-red-600 dark:text-red-400', chipBorder: 'border-red-200 dark:border-red-800'
    },
    'English': {
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                <rect width="48" height="48" rx="14" fill="#faf5ff"/>
                <rect x="12" y="14" width="24" height="20" rx="3" stroke="#8b5cf6" strokeWidth="1.5" fill="#8b5cf6" fillOpacity="0.06"/>
                <text x="24" y="30" textAnchor="middle" fill="#8b5cf6" fontSize="14" fontWeight="bold">A</text>
                <line x1="14" y1="18" x2="34" y2="18" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.3"/>
            </svg>
        ),
        color: '#8b5cf6', lightBg: 'bg-purple-50 dark:bg-purple-900/20',
        chipBg: 'bg-purple-50 dark:bg-purple-900/20', chipText: 'text-purple-600 dark:text-purple-400', chipBorder: 'border-purple-200 dark:border-purple-800'
    },
};

const DEFAULT_SUBJECT_CONFIG = {
    icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
            <rect width="48" height="48" rx="14" fill="#f9fafb"/>
            <rect x="14" y="12" width="20" height="24" rx="3" stroke="#6b7280" strokeWidth="1.5" fill="#6b7280" fillOpacity="0.06"/>
            <path d="M19 19h10M19 24h7M19 29h9" stroke="#6b7280" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
    ),
    color: '#6b7280', lightBg: 'bg-gray-50 dark:bg-gray-800',
    chipBg: 'bg-gray-50 dark:bg-gray-800', chipText: 'text-gray-600 dark:text-gray-400', chipBorder: 'border-gray-200 dark:border-gray-700'
};

export default function NotesList({ notes, readNoteIds, onReadNote, onOpenNote }: NotesListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubject, setActiveSubject] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Auto-expand first note on mount
    React.useEffect(() => {
        if (notes.length > 0 && expandedId === null) {
            setExpandedId(notes[0].id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notes.length]);

    // Get unique subjects from notes
    const subjects = useMemo(() => {
        const subs = new Set(notes.map(n => n.subject));
        return ['All', ...Array.from(subs)];
    }, [notes]);

    // Filter notes
    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = !searchQuery || 
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.subject.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubject = activeSubject === 'All' || note.subject === activeSubject;
            return matchesSearch && matchesSubject;
        });
    }, [notes, searchQuery, activeSubject]);

    // Analytics
    const stats = useMemo(() => {
        const total = notes.length;
        const newCount = notes.filter(n => !readNoteIds.has(n.id)).length;
        const readCount = notes.filter(n => readNoteIds.has(n.id)).length;
        const saved = 0; // placeholder for future saved functionality
        return { total, newCount, readCount, saved };
    }, [notes, readNoteIds]);

    // Estimate reading time based on content length
    const estimateReadingTime = (note: SubjectNote): string => {
        const len = note.content?.length || 0;
        const mins = Math.max(2, Math.ceil(len / 800));
        return `${mins} min read`;
    };

    // Get content type label
    const getTypeLabel = (note: SubjectNote) => {
        if (note.contentType === 'json') return 'Rich Text';
        if (note.contentType === 'pdf') return 'PDF';
        return 'Text';
    };

    const getSubjectConfig = (subject: string) => SUBJECT_CONFIG[subject] || DEFAULT_SUBJECT_CONFIG;

    // Subject chip icon
    const getChipIcon = (subject: string) => {
        switch (subject) {
            case 'All': return (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="#1650EB"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="#1650EB" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="#1650EB" opacity="0.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="#1650EB" opacity="0.2"/></svg>
            );
            case 'Science': return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M6 2v5L3 12a1.5 1.5 0 001.3 2.2h7.4A1.5 1.5 0 0013 12L10 7V2" stroke="#10b981" strokeWidth="1.3"/><line x1="5" y1="2" x2="11" y2="2" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round"/></svg>;
            case 'Mathematics': return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#3b82f6" strokeWidth="1.3"/><text x="8" y="11" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">π</text></svg>;
            case 'Social Science': return <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#22c55e" strokeWidth="1.3"/><ellipse cx="8" cy="8" rx="6" ry="2.5" stroke="#22c55e" strokeWidth="0.8"/><line x1="8" y1="2" x2="8" y2="14" stroke="#22c55e" strokeWidth="0.8"/></svg>;
            case 'Hindi': return <text className="text-red-500 font-bold text-sm">अ</text>;
            case 'English': return <text className="text-purple-500 font-bold text-sm">A</text>;
            default: return <BookOpen className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes, subjects..."
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#1650EB] focus:ring-2 focus:ring-[#1650EB]/10 transition-all shadow-sm"
                    />
                </div>
                <button className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-500 hover:text-[#1650EB] hover:border-[#1650EB]/30 transition-all shadow-sm">
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Subject Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {subjects.map(subject => {
                    const isActive = activeSubject === subject;
                    return (
                        <button
                            key={subject}
                            onClick={() => setActiveSubject(subject)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                                isActive
                                    ? 'bg-[#1650EB]/10 text-[#1650EB] border-[#1650EB]/20 shadow-sm'
                                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                        >
                            <span className="flex items-center justify-center w-4 h-4">{getChipIcon(subject)}</span>
                            {subject}
                        </button>
                    );
                })}
                {/* Scroll indicator */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400">
                    <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </div>
            </div>

            {/* Analytics Strip */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 shadow-sm">
                <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800">
                    {/* Total Notes */}
                    <div className="flex items-center gap-2.5 px-2 first:pl-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 18 18" fill="none">
                                <rect x="3" y="2" width="12" height="14" rx="2" stroke="#3b82f6" strokeWidth="1.5" fill="#3b82f6" fillOpacity="0.08"/>
                                <path d="M6 6h6M6 9h4M6 12h5" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.total}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Total Notes</p>
                        </div>
                    </div>
                    {/* New */}
                    <div className="flex items-center gap-2.5 px-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 18 18" fill="none">
                                <path d="M9 2l2 4 4.5.5-3.2 3.2.8 4.5L9 12l-4.1 2.2.8-4.5L2.5 6.5 7 6l2-4z" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.3"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.newCount}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">New</p>
                        </div>
                    </div>
                    {/* Read */}
                    <div className="flex items-center gap-2.5 px-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="6" stroke="#10b981" strokeWidth="1.3" fill="#10b981" fillOpacity="0.08"/>
                                <circle cx="9" cy="9" r="3" fill="#10b981" opacity="0.3"/>
                                <circle cx="9" cy="9" r="1.2" fill="#10b981"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.readCount}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Read</p>
                        </div>
                    </div>
                    {/* Saved */}
                    <div className="flex items-center gap-2.5 px-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4.5 h-4.5" viewBox="0 0 18 18" fill="none">
                                <path d="M4 3h10a1 1 0 011 1v12l-6-3-6 3V4a1 1 0 011-1z" stroke="#f97316" strokeWidth="1.3" fill="#f97316" fillOpacity="0.1"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.saved}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Saved</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No notes found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredNotes.map((note, index) => {
                        const isRead = readNoteIds.has(note.id);
                        const isExpanded = expandedId === note.id;
                        const config = getSubjectConfig(note.subject);
                        const typeLabel = getTypeLabel(note);
                        const readingTime = estimateReadingTime(note);

                        return (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.03 * index }}
                                className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm ${
                                    isExpanded
                                        ? 'border-[#1650EB]/30 ring-1 ring-[#1650EB]/10 shadow-md shadow-[#1650EB]/5'
                                        : !isRead
                                            ? 'border-green-200 dark:border-green-800/40'
                                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                }`}
                            >
                                {/* Collapsed Header — always visible */}
                                <div
                                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : note.id)}
                                >
                                    {/* Subject Illustration */}
                                    <div className="w-[52px] h-[52px] flex-shrink-0">
                                        {config.icon}
                                    </div>

                                    {/* Title + Meta */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[15px] text-gray-900 dark:text-white truncate uppercase tracking-wide">
                                            {note.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {/* Subject pill */}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.chipBg} ${config.chipText} ${config.chipBorder}`}>
                                                {note.subject}
                                            </span>
                                            {/* Type */}
                                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                                📝 {typeLabel}
                                            </span>
                                            {/* Date */}
                                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                                📅 {note.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge + Chevron */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!isRead ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                New
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Read
                                            </span>
                                        )}
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4">
                                                {/* Description */}
                                                {note.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 pl-[4px]">
                                                        {note.description}
                                                    </p>
                                                )}
                                                {!note.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 pl-[4px]">
                                                        This chapter introduces the fundamental concepts of the topic. It covers definitions, key terminologies, examples and important points...
                                                    </p>
                                                )}

                                                {/* Meta row + CTA */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        {/* Teacher */}
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block leading-none">Teacher</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-medium text-[12px]">Teacher</span>
                                                            </div>
                                                        </div>
                                                        {/* Reading time */}
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block leading-none">Est. time</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-medium text-[12px]">{readingTime}</span>
                                                            </div>
                                                        </div>
                                                        {/* Attachments */}
                                                        <div className="flex items-center gap-1.5">
                                                            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block leading-none">Attachments</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-medium text-[12px]">
                                                                    {note.contentType === 'pdf' ? '1 file' : '0 files'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CTA Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onReadNote(note.id);
                                                            onOpenNote(note);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1650EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1243c7] transition-all shadow-md shadow-[#1650EB]/15 active:scale-[0.97]"
                                                    >
                                                        Read Note <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Three dots menu for collapsed notes */}
                                {!isExpanded && (
                                    <div className="flex justify-end px-4 pb-2 -mt-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReadNote(note.id);
                                                onOpenNote(note);
                                            }}
                                            className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
