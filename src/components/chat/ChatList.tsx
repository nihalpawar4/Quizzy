'use client';

/**
 * Chat List Component — Premium 2026 Redesign
 * Floating glass sidebar with filter chips, conversation cards, and premium design
 * Linear/Arc/Discord inspired
 */

import React from 'react';
import { Search, Plus, Trash2, Pin, PinOff, Check, CheckCheck, SlidersHorizontal } from 'lucide-react';
import type { Chat, UserPresence } from '@/types';
import { formatChatListTime } from '@/lib/chatServices';
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
    onPinChat?: (chatId: string) => void;
    onUnpinChat?: (chatId: string) => void;
    isLoading?: boolean;
}

type FilterType = 'All' | 'Unread' | 'Pinned' | 'Archive';

export default function ChatList({
    chats,
    currentUserId,
    currentUserRole,
    currentChatId,
    presenceMap,
    onSelectChat,
    onDeleteChat,
    onNewChat,
    onPinChat,
    onUnpinChat,
    isLoading = false
}: ChatListProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
    const [activeFilter, setActiveFilter] = React.useState<FilterType>('All');

    // Get the other participant in the chat
    const getOtherParticipant = (chat: Chat) => {
        if (currentUserRole === 'student') {
            const displayName = chat.teacherHidesContactInfo ? 'Your Teacher' : chat.teacherName;
            return { name: displayName, id: chat.teacherId };
        }
        return { name: chat.studentName, id: chat.studentId, class: chat.studentClass };
    };

    // Filter chats by search and active filter
    const filteredChats = chats.filter(chat => {
        const participant = getOtherParticipant(chat);
        const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        switch (activeFilter) {
            case 'Unread':
                return (chat.unreadCount[currentUserId] || 0) > 0;
            case 'Pinned':
                return chat.pinnedBy?.includes(currentUserId) || false;
            case 'Archive':
                return false; // placeholder
            default:
                return true;
        }
    });

    // Sort: pinned chats first, then by last message time
    const sortedChats = [...filteredChats].sort((a, b) => {
        const aPinned = a.pinnedBy?.includes(currentUserId) || false;
        const bPinned = b.pinnedBy?.includes(currentUserId) || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
    });

    // Handle delete confirmation
    const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (deleteConfirm === chatId) {
            onDeleteChat(chatId);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(chatId);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    // Handle pin toggle
    const handlePinToggle = (e: React.MouseEvent, chat: Chat) => {
        e.stopPropagation();
        const isPinned = chat.pinnedBy?.includes(currentUserId);
        if (isPinned) {
            onUnpinChat?.(chat.id);
        } else {
            onPinChat?.(chat.id);
        }
    };

    // Close delete confirmation when chat changes
    React.useEffect(() => {
        setDeleteConfirm(null);
    }, [currentChatId]);

    // Get last message preview text
    const getLastMessagePreview = (chat: Chat) => {
        if (!chat.lastMessage) return 'No messages yet';
        const participant = getOtherParticipant(chat);
        const presence = presenceMap[participant.id];
        if (presence?.typing?.chatId === chat.id) return null;
        const isMine = chat.lastMessage.senderId === currentUserId;
        const prefix = isMine ? 'You: ' : '';
        return `${prefix}${chat.lastMessage.text}`;
    };

    // Check if other user is typing in this chat
    const isOtherTyping = (chat: Chat) => {
        const participant = getOtherParticipant(chat);
        const presence = presenceMap[participant.id];
        return presence?.typing?.chatId === chat.id;
    };

    // Get message status icon for last message
    const getStatusIcon = (chat: Chat) => {
        if (!chat.lastMessage || chat.lastMessage.senderId !== currentUserId) return null;
        const status = chat.lastMessage.status;
        if (status === 'seen') return <CheckCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
        if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
        if (status === 'sent') return <Check className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
        return null;
    };

    const filterChips: FilterType[] = ['All', 'Unread', 'Pinned', 'Archive'];

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50/80 dark:bg-[#0c1025]/80 backdrop-blur-xl">
                <div className="text-center">
                    <div className="w-10 h-10 border-[3px] border-[#1650EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading chats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50/90 dark:bg-[#0c1025]/90 backdrop-blur-xl">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        {/* Animated chat bubble icon */}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center shadow-lg shadow-[#1650EB]/20">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none">
                                <path d="M4 4h12a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity="0.15" strokeLinejoin="round"/>
                                <circle cx="7.5" cy="9.5" r="1" fill="currentColor"/>
                                <circle cx="10.5" cy="9.5" r="1" fill="currentColor"/>
                                <circle cx="13.5" cy="9.5" r="1" fill="currentColor"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Messages
                        </h2>
                    </div>
                    <button
                        onClick={onNewChat}
                        className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white flex items-center justify-center hover:shadow-lg hover:shadow-[#1650EB]/25 transition-all duration-300 hover:scale-105 active:scale-95"
                        title="New Chat"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Glass Search Bar */}
                <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full bg-white/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#6095DB] dark:focus:border-[#1650EB] focus:ring-2 focus:ring-[#1650EB]/10 dark:focus:ring-[#1650EB]/20 transition-all duration-300 backdrop-blur-sm"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-500 hover:text-[#1650EB] transition-colors">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2">
                    {filterChips.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                                activeFilter === filter
                                    ? 'bg-[#1650EB] text-white shadow-md shadow-[#1650EB]/20'
                                    : 'bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/10'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
                {sortedChats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1650EB]/10 to-[#6095DB]/10 dark:from-[#1650EB]/20 dark:to-blue-500/20 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-[#6095DB]" viewBox="0 0 24 24" fill="none">
                                <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
                            </svg>
                        </div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">No conversations yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            {currentUserRole === 'student'
                                ? 'Start a chat with your teacher!'
                                : 'Start a chat with a student!'}
                        </p>
                        <button
                            onClick={onNewChat}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#1650EB]/25 transition-all duration-300"
                        >
                            Start New Chat
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedChats.map(chat => {
                            const participant = getOtherParticipant(chat);
                            const presence = presenceMap[participant.id];
                            const isSelected = currentChatId === chat.id;
                            const unreadCount = chat.unreadCount[currentUserId] || 0;
                            const isPinned = chat.pinnedBy?.includes(currentUserId) || false;
                            const typing = isOtherTyping(chat);
                            const lastMsgPreview = getLastMessagePreview(chat);
                            const statusIcon = getStatusIcon(chat);

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => onSelectChat(chat)}
                                    className={`
                                        group flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-300 relative
                                        ${isSelected
                                            ? 'bg-[#1650EB]/10 dark:bg-[#1650EB]/15 border border-[#1650EB]/20 dark:border-[#1650EB]/25 shadow-sm'
                                            : 'hover:bg-white/70 dark:hover:bg-white/5 border border-transparent'
                                        }
                                    `}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {chat.participantPhotoURLs?.[participant.id] ? (
                                            <img
                                                src={chat.participantPhotoURLs[participant.id]}
                                                alt={participant.name}
                                                className={`w-[50px] h-[50px] rounded-2xl object-cover transition-all duration-300 ${
                                                    isSelected ? 'ring-2 ring-[#1650EB]/30 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#0c1025]' : ''
                                                }`}
                                            />
                                        ) : (
                                            <div className={`w-[50px] h-[50px] rounded-2xl bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center text-white font-bold text-lg transition-all duration-300 ${
                                                isSelected ? 'ring-2 ring-[#1650EB]/30 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#0c1025]' : ''
                                            }`}>
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
                                        {/* Top row: Name + Time */}
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h3 className={`font-semibold truncate text-[15px] ${
                                                unreadCount > 0
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                                {participant.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                {isPinned && (
                                                    <Pin className="w-3 h-3 text-gray-400 dark:text-gray-500 rotate-45" />
                                                )}
                                                {chat.lastMessage && (
                                                    <span className={`text-[11px] ${
                                                        unreadCount > 0
                                                            ? 'text-[#1650EB] dark:text-[#6095DB] font-semibold'
                                                            : 'text-gray-400 dark:text-gray-500'
                                                    }`}>
                                                        {formatChatListTime(chat.lastMessage.timestamp)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom row: Message preview + Badge/Actions */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                                {statusIcon}
                                                {typing ? (
                                                    <p className="text-sm text-green-500 dark:text-green-400 font-medium italic truncate">
                                                        typing...
                                                    </p>
                                                ) : (
                                                    <p className={`text-sm truncate ${
                                                        unreadCount > 0
                                                            ? 'text-gray-700 dark:text-gray-200 font-medium'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                        {lastMsgPreview}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {/* Unread badge */}
                                                {unreadCount > 0 && (
                                                    <span className="min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm shadow-[#1650EB]/20">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}

                                                {/* Actions — visible on hover */}
                                                <div className="chat-actions flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button
                                                        onClick={(e) => handlePinToggle(e, chat)}
                                                        className={`p-1.5 rounded-xl transition-all duration-200 ${
                                                            isPinned
                                                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                        }`}
                                                        title={isPinned ? 'Unpin chat' : 'Pin chat'}
                                                    >
                                                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, chat.id)}
                                                        className={`p-1.5 rounded-xl transition-all duration-200 ${
                                                            deleteConfirm === chat.id
                                                                ? 'bg-red-500 text-white'
                                                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        }`}
                                                        title={deleteConfirm === chat.id ? 'Click again to confirm' : 'Delete chat'}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Class badge for teachers viewing students */}
                                        {currentUserRole === 'teacher' && 'class' in participant && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#1650EB]/10 dark:bg-[#1650EB]/15 text-[#1243c7] dark:text-[#6095DB] text-[10px] rounded-full font-medium">
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
