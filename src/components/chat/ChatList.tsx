'use client';

/**
 * Chat List Component
 * Shows all conversations with last message preview
 */

import React from 'react';
import { MessageCircle, Search, Plus, Trash2 } from 'lucide-react';
import type { Chat, UserPresence } from '@/types';
import { formatLastSeen } from '@/lib/chatServices';
import OnlineStatus from './OnlineStatus';

interface ChatListProps {
    chats: Chat[];
    currentUserId: string;
    currentUserRole: 'student' | 'teacher';
    currentChatId?: string;
    presenceMap: { [userId: string]: UserPresence };
    onSelectChat: (chat: Chat) => void;
    onDeleteChat: (chatId: string) => void;
    onNewChat: () => void;
    isLoading?: boolean;
}

export default function ChatList({
    chats,
    currentUserId,
    currentUserRole,
    currentChatId,
    presenceMap,
    onSelectChat,
    onDeleteChat,
    onNewChat,
    isLoading = false
}: ChatListProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

    // Get the other participant in the chat
    const getOtherParticipant = (chat: Chat) => {
        if (currentUserRole === 'student') {
            return { name: chat.teacherName, id: chat.teacherId };
        }
        return { name: chat.studentName, id: chat.studentId, class: chat.studentClass };
    };

    // Filter chats by search
    const filteredChats = chats.filter(chat => {
        const participant = getOtherParticipant(chat);
        return participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Handle delete confirmation
    const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (deleteConfirm === chatId) {
            onDeleteChat(chatId);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(chatId);
            // Auto-reset after 3 seconds
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    // Close delete confirmation when chat changes
    React.useEffect(() => {
        setDeleteConfirm(null);
    }, [currentChatId]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-[#1650EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading chats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-[#1650EB]" />
                        Messages
                    </h2>
                    <button
                        onClick={onNewChat}
                        className="p-2 rounded-full bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white hover:shadow-lg hover:shadow-[#1650EB]/30 transition-all duration-200"
                        title="New Chat"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-[#1650EB] focus:ring-2 focus:ring-[#1650EB]/20 transition-all duration-200"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#1650EB]/10 flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-[#1650EB]" />
                        </div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">No conversations yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            {currentUserRole === 'student'
                                ? 'Start a chat with your teacher!'
                                : 'Start a chat with a student!'}
                        </p>
                        <button
                            onClick={onNewChat}
                            className="px-4 py-2 bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-[#1650EB]/30 transition-all duration-200"
                        >
                            Start New Chat
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredChats.map(chat => {
                            const participant = getOtherParticipant(chat);
                            const presence = presenceMap[participant.id];
                            const isSelected = currentChatId === chat.id;
                            const unreadCount = chat.unreadCount[currentUserId] || 0;

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => onSelectChat(chat)}
                                    className={`
                                        flex items-center gap-3 p-4 cursor-pointer transition-all duration-200
                                        ${isSelected
                                            ? 'bg-[#1650EB]/10 border-l-4 border-[#1650EB]'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-900 border-l-4 border-transparent'
                                        }
                                    `}
                                >
                                    {/* Avatar with profile picture */}
                                    <div className="relative flex-shrink-0">
                                        {chat.participantPhotoURLs?.[participant.id] ? (
                                            <img
                                                src={chat.participantPhotoURLs[participant.id]}
                                                alt={participant.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center text-white font-bold text-lg">
                                                {participant.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {/* Online indicator */}
                                        <div className="absolute -bottom-0.5 -right-0.5">
                                            <OnlineStatus
                                                isOnline={presence?.isOnline || false}
                                                size="small"
                                            />
                                        </div>
                                    </div>

                                    {/* Chat Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {participant.name}
                                            </h3>
                                            {chat.lastMessage && (
                                                <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                                                    {formatLastSeen(chat.lastMessage.timestamp)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                                {chat.lastMessage?.text || 'No messages yet'}
                                            </p>

                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                {/* Unread badge */}
                                                {unreadCount > 0 && (
                                                    <span className="min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}

                                                {/* Delete button */}
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, chat.id)}
                                                    className={`
                                                        p-1.5 rounded-full transition-all duration-200
                                                        ${deleteConfirm === chat.id
                                                            ? 'bg-red-500 text-white'
                                                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        }
                                                    `}
                                                    title={deleteConfirm === chat.id ? 'Click again to confirm' : 'Delete chat'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Class badge for teachers viewing students */}
                                        {currentUserRole === 'teacher' && 'class' in participant && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#1650EB]/10 text-[#1650EB] dark:text-[#6095DB] text-[10px] rounded-full">
                                                Class {participant.class}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
