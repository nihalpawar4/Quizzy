'use client';

/**
 * New Chat Modal Component
 * Select a user to start a new chat
 */

import React, { useEffect, useState } from 'react';
import { X, Search, MessageCircle, User, Users, Loader2 } from 'lucide-react';
import OnlineStatus from './OnlineStatus';
import type { UserPresence } from '@/types';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserRole: 'student' | 'teacher';
    availableTeachers: { uid: string; name: string; email: string; hideContactInfo?: boolean }[];
    availableStudents: { uid: string; name: string; email: string; studentClass: number }[];
    presenceMap: { [userId: string]: UserPresence };
    onStartChat: (participantId: string, participantName: string, participantClass?: number) => void;
    onLoadUsers: () => Promise<void>;
}

export default function NewChatModal({
    isOpen,
    onClose,
    currentUserRole,
    availableTeachers,
    availableStudents,
    presenceMap,
    onStartChat,
    onLoadUsers
}: NewChatModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState<number | null>(null);
    const [isStarting, setIsStarting] = useState<string | null>(null);

    // Load users when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSearchQuery('');
            setSelectedClass(null);
            onLoadUsers().finally(() => setIsLoading(false));
        }
    }, [isOpen, onLoadUsers]);

    // Get available users based on role
    const availableUsers = currentUserRole === 'student' ? availableTeachers : availableStudents;

    // Filter users
    const filteredUsers = availableUsers.filter(user => {
        // For students searching teachers with privacy enabled, always show them in search
        const displayName = currentUserRole === 'student' && 'hideContactInfo' in user && user.hideContactInfo
            ? 'Your Teacher'
            : user.name;

        const displayEmail = currentUserRole === 'student' && 'hideContactInfo' in user && user.hideContactInfo
            ? ''
            : user.email;

        const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            displayEmail.toLowerCase().includes(searchQuery.toLowerCase());

        if (currentUserRole === 'teacher' && selectedClass) {
            return matchesSearch && 'studentClass' in user && user.studentClass === selectedClass;
        }

        return matchesSearch;
    });

    // Get unique classes for filter
    const availableClasses = currentUserRole === 'teacher'
        ? [...new Set(availableStudents.map(s => s.studentClass))].sort()
        : [];

    // Handle start chat
    const handleStartChat = async (userId: string, userName: string, studentClass?: number) => {
        setIsStarting(userId);
        try {
            await onStartChat(userId, userName, studentClass);
        } finally {
            setIsStarting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#1650EB] to-[#6095DB]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        New Chat
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search and Filter */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${currentUserRole === 'student' ? 'teachers' : 'students'}...`}
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-[#1650EB] focus:ring-2 focus:ring-[#1650EB]/20 transition-all duration-200"
                        />
                    </div>

                    {/* Class Filter (for teachers) */}
                    {currentUserRole === 'teacher' && availableClasses.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedClass(null)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${selectedClass === null
                                    ? 'bg-[#1650EB] text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                All Classes
                            </button>
                            {availableClasses.map(cls => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${selectedClass === cls
                                        ? 'bg-[#1650EB] text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Class {cls}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-[#1650EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading users...</p>
                            </div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#1650EB]/10 flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-[#1650EB]" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-semibold mb-2">
                                No {currentUserRole === 'student' ? 'teachers' : 'students'} found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {searchQuery
                                    ? 'Try a different search term'
                                    : `No ${currentUserRole === 'student' ? 'teachers' : 'students'} available to chat with`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredUsers.map(user => {
                                const presence = presenceMap[user.uid];
                                const studentClass = 'studentClass' in user ? (user as { studentClass: number }).studentClass : undefined;
                                const isStartingThis = isStarting === user.uid;

                                // Check if this is a teacher with privacy enabled
                                const isTeacherWithPrivacy = currentUserRole === 'student' && 'hideContactInfo' in user && user.hideContactInfo;
                                const displayName = isTeacherWithPrivacy ? 'Your Teacher' : user.name;
                                const displayEmail = isTeacherWithPrivacy ? 'Contact info hidden' : user.email;

                                return (
                                    <button
                                        key={user.uid}
                                        onClick={() => handleStartChat(user.uid, user.name, studentClass)}
                                        disabled={isStarting !== null}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left disabled:opacity-50"
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center text-white font-bold text-lg">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5">
                                                <OnlineStatus
                                                    isOnline={presence?.isOnline || false}
                                                    size="small"
                                                />
                                            </div>
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {displayName}
                                                </h3>
                                                {studentClass !== undefined && (
                                                    <span className="px-2 py-0.5 bg-[#1650EB]/10 text-[#1650EB] dark:text-[#6095DB] text-[10px] rounded-full flex-shrink-0">
                                                        Class {studentClass}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm truncate ${isTeacherWithPrivacy ? 'text-gray-400 italic' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {displayEmail}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {presence?.isOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>

                                        {/* Loading or Icon */}
                                        {isStartingThis ? (
                                            <Loader2 className="w-5 h-5 text-[#1650EB] animate-spin flex-shrink-0" />
                                        ) : (
                                            <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
