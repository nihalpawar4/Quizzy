'use client';

/**
 * Chat List Component
 * WhatsApp-style conversation list with premium design
 * Shows all conversations with last message preview, pin support, typing indicator
 */

import React from 'react';
import { MessageCircle, Search, Plus, Trash2, Pin, PinOff, Check, CheckCheck } from 'lucide-react';
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

    // Get the other participant in the chat
    const getOtherParticipant = (chat: Chat) => {
        if (currentUserRole === 'student') {
            // If teacher has privacy enabled, show anonymous name
            const displayName = chat.teacherHidesContactInfo ? 'Your Teacher' : chat.teacherName;
            return { name: displayName, id: chat.teacherId };
        }
        return { name: chat.studentName, id: chat.studentId, class: chat.studentClass };
    };

    // Filter chats by search
    const filteredChats = chats.filter(chat => {
        const participant = getOtherParticipant(chat);
        return participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort: pinned chats first, then by last message time
    const sortedChats = [...filteredChats].sort((a, b) => {
        const aPinned = a.pinnedBy?.includes(currentUserId) || false;
        const bPinned = b.pinnedBy?.includes(currentUserId) || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0; // keep original order (already sorted by updatedAt)
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

        // Show typing indicator instead of last message
        if (presence?.typing?.chatId === chat.id) {
            return null; // Will render typing indicator separately
        }

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

    // Get message status icon for last message (own messages)
    const getStatusIcon = (chat: Chat) => {
        if (!chat.lastMessage || chat.lastMessage.senderId !== currentUserId) return null;
        const status = chat.lastMessage.status;
        if (status === 'seen') return <CheckCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />;
        if (status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />;
        if (status === 'sent') return <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />;
        return null;
    };

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
                {sortedChats.length === 0 ? (
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
                    <div>
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
                                        chat-list-item flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 relative
                                        ${isSelected
                                            ? 'chat-list-active'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-900/70 border-l-3 border-transparent'
                                        }
                                    `}
                                >
                                    {/* Avatar with profile picture */}
                                    <div className="relative flex-shrink-0">
                                        {chat.participantPhotoURLs?.[participant.id] ? (
                                            <img
                                                src={chat.participantPhotoURLs[participant.id]}
                                                alt={participant.name}
                                                className={`w-[52px] h-[52px] rounded-full object-cover ${isSelected ? 'ring-2 ring-[#1650EB]/30' : ''}`}
                                            />
                                        ) : (
                                            <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center text-white font-bold text-lg ${isSelected ? 'ring-2 ring-[#1650EB]/30' : ''}`}>
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
                                            <h3 className={`font-semibold truncate text-[15px] ${unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {participant.name}
                                            </h3>
                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {isPinned && (
                                                    <Pin className="w-3 h-3 text-gray-400 rotate-45" />
                                                )}
                                                {chat.lastMessage && (
                                                    <span className={`text-[11px] ${unreadCount > 0 ? 'text-[#1650EB] font-semibold' : 'text-gray-500 dark:text-gray-500'}`}>
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
                                                    <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {lastMsgPreview}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {/* Unread badge */}
                                                {unreadCount > 0 && (
                                                    <span className="min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}

                                                {/* Actions — visible on hover (desktop) or always on mobile */}
                                                <div className="chat-actions flex items-center gap-0.5">
                                                    {/* Pin/Unpin button */}
                                                    <button
                                                        onClick={(e) => handlePinToggle(e, chat)}
                                                        className={`
                                                            p-1.5 rounded-full transition-all duration-200
                                                            ${isPinned
                                                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                            }
                                                        `}
                                                        title={isPinned ? 'Unpin chat' : 'Pin chat'}
                                                    >
                                                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                                    </button>

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
                                        </div>

                                        {/* Class badge for teachers viewing students */}
                                        {currentUserRole === 'teacher' && 'class' in participant && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#1650EB]/10 text-[#1650EB] dark:text-[#6095DB] text-[10px] rounded-full font-medium">
                                                Class {participant.class}
                                            </span>
                                        )}
                                    </div>

                                    {/* Separator line */}
                                    <div className="absolute bottom-0 left-[76px] right-0 h-px bg-gray-100 dark:bg-gray-800/60" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
