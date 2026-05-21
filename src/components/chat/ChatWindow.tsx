'use client';

/**
 * Chat Window Component
 * Main chat interface with messages and input - WhatsApp-like features
 * Call buttons in hamburger menu, smart last-seen, multi-select mode
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, MoreVertical, Trash2, X, Palette, Check, Search, Volume2, VolumeX, Star, Copy, Info, Phone, Video, Reply, CheckSquare } from 'lucide-react';
import type { Chat, Message, UserPresence } from '@/types';
import { groupMessagesByDate, formatLastSeenFull } from '@/lib/chatServices';
import OnlineStatus from './OnlineStatus';
import MessageBubble, { DateSeparator, SystemMessage } from './MessageBubble';
import ChatInput from './ChatInput';
import { TypingBubble } from './TypingIndicator';
import { useCall } from '@/contexts/CallContext';

interface ChatWindowProps {
    chat: Chat;
    messages: Message[];
    currentUserId: string;
    currentUserRole: 'student' | 'teacher';
    presence: UserPresence | null;
    isTyping: boolean;
    isSending: boolean;
    onSendMessage: (text: string, replyTo?: { id: string; text: string; senderName: string }) => Promise<void>;
    onTyping: () => void;
    onStopTyping: () => void;
    onBack: () => void;
    onClearHistory: () => void;
    replyingTo?: Message | null;
    onSetReplyingTo?: (message: Message | null) => void;
    onDeleteMessage?: (messageId: string) => void;
}

// Solid background color options - many more solid colors
const BACKGROUND_COLORS = [
    // Neutrals
    { name: 'White', value: 'bg-white dark:bg-gray-950', hex: '#ffffff' },
    { name: 'Gray', value: 'bg-gray-100 dark:bg-gray-900', hex: '#f3f4f6' },
    { name: 'Slate', value: 'bg-slate-200 dark:bg-slate-800', hex: '#e2e8f0' },
    // Blues
    { name: 'Sky Blue', value: 'bg-sky-100 dark:bg-sky-900', hex: '#e0f2fe' },
    { name: 'Blue', value: 'bg-blue-100 dark:bg-blue-900', hex: '#dbeafe' },
    { name: 'Indigo', value: 'bg-indigo-100 dark:bg-indigo-900', hex: '#e0e7ff' },
    // Greens
    { name: 'Mint', value: 'bg-emerald-100 dark:bg-emerald-900', hex: '#d1fae5' },
    { name: 'Green', value: 'bg-green-100 dark:bg-green-900', hex: '#dcfce7' },
    { name: 'Teal', value: 'bg-teal-100 dark:bg-teal-900', hex: '#ccfbf1' },
    // Warm colors
    { name: 'Peach', value: 'bg-orange-100 dark:bg-orange-900', hex: '#ffedd5' },
    { name: 'Pink', value: 'bg-pink-100 dark:bg-pink-900', hex: '#fce7f3' },
    { name: 'Rose', value: 'bg-rose-100 dark:bg-rose-900', hex: '#ffe4e6' },
    // Purple
    { name: 'Lavender', value: 'bg-purple-100 dark:bg-purple-900', hex: '#f3e8ff' },
    { name: 'Violet', value: 'bg-violet-100 dark:bg-violet-900', hex: '#ede9fe' },
    // Yellow/Beige
    { name: 'Cream', value: 'bg-amber-50 dark:bg-amber-950', hex: '#fffbeb' },
    { name: 'Yellow', value: 'bg-yellow-100 dark:bg-yellow-900', hex: '#fef9c3' },
];

export default function ChatWindow({
    chat,
    messages,
    currentUserId,
    currentUserRole,
    presence,
    isTyping,
    isSending: _isSending,
    onSendMessage,
    onTyping,
    onStopTyping,
    onBack,
    onClearHistory,
    replyingTo,
    onSetReplyingTo,
    onDeleteMessage,
}: ChatWindowProps) {
    void _isSending; // Part of interface contract, used by parent
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showBgPicker, setShowBgPicker] = useState(false);
    const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0].value);
    const [isMuted, setIsMuted] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const [showSearchMessages, setShowSearchMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [customBgColor, setCustomBgColor] = useState<string | null>(null);
    const [isInitiatingCall, setIsInitiatingCall] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
    const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
    const prevMessageCountRef = useRef(messages.length);

    // Multi-select state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

    // Track new messages for animation
    useEffect(() => {
        if (messages.length > prevMessageCountRef.current) {
            const newIds = new Set<string>();
            for (let i = prevMessageCountRef.current; i < messages.length; i++) {
                newIds.add(messages[i].id);
            }
            setNewMessageIds(newIds);
            // Clear new flags after animation
            setTimeout(() => setNewMessageIds(new Set()), 600);
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    // Handle reply
    const handleReply = useCallback((msg: Message) => {
        onSetReplyingTo?.(msg);
    }, [onSetReplyingTo]);

    // Handle delete
    const handleDeleteMessage = useCallback((messageId: string) => {
        onDeleteMessage?.(messageId);
    }, [onDeleteMessage]);

    // Handle forward
    const handleForward = useCallback((msg: Message) => {
        setForwardMessage(msg);
        setShowForwardModal(true);
    }, []);

    // Handle send with reply
    const handleSendMessage = useCallback(async (text: string) => {
        const reply = replyingTo ? {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName,
        } : undefined;
        await onSendMessage(text, reply);
    }, [onSendMessage, replyingTo]);

    // Multi-select handlers
    const handleEnterSelectionMode = useCallback((messageId: string) => {
        setIsSelectionMode(true);
        setSelectedMessageIds(new Set([messageId]));
    }, []);

    const handleToggleSelect = useCallback((messageId: string) => {
        setSelectedMessageIds(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }
            // Exit selection mode if nothing selected
            if (next.size === 0) {
                setIsSelectionMode(false);
            }
            return next;
        });
    }, []);

    const handleDeleteSelected = useCallback(() => {
        selectedMessageIds.forEach(id => {
            onDeleteMessage?.(id);
        });
        setSelectedMessageIds(new Set());
        setIsSelectionMode(false);
    }, [selectedMessageIds, onDeleteMessage]);

    const handleCancelSelection = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }, []);

    // Call hook
    const { initiateCall, isInCall } = useCall();

    // Get the other participant
    const participant = currentUserRole === 'student'
        ? {
            name: chat.teacherHidesContactInfo ? 'Your Teacher' : chat.teacherName,
            id: chat.teacherId
        }
        : { name: chat.studentName, id: chat.studentId, class: chat.studentClass };

    // Group messages by date
    const groupedMessages = groupMessagesByDate(messages);

    // Filter messages by search query
    const filteredMessages = searchQuery
        ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // Load saved preferences
    useEffect(() => {
        const savedBg = localStorage.getItem(`chatBg_${chat.id}`);
        const savedMuted = localStorage.getItem(`chatMuted_${chat.id}`);
        const savedStarred = localStorage.getItem(`chatStarred_${chat.id}`);
        const savedCustomColor = localStorage.getItem(`chatBgCustomColor_${chat.id}`);

        if (savedBg) {
            setBgColor(savedBg);
            if (savedBg.startsWith('custom-') && savedCustomColor) {
                setCustomBgColor(savedCustomColor);
            }
        }
        if (savedMuted) setIsMuted(savedMuted === 'true');
        if (savedStarred) setIsStarred(savedStarred === 'true');
    }, [chat.id]);

    // Close menu when chat changes
    useEffect(() => {
        setShowMenu(false);
        setShowClearConfirm(false);
        setShowBgPicker(false);
        setShowSearchMessages(false);
        setSearchQuery('');
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }, [chat.id]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current && !showSearchMessages) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, showSearchMessages]);

    // Handle clear history
    const handleClearHistory = () => {
        onClearHistory();
        setShowClearConfirm(false);
        setShowMenu(false);
    };

    // Handle background change
    const handleBgChange = (color: string) => {
        setBgColor(color);
        localStorage.setItem(`chatBg_${chat.id}`, color);
        setShowBgPicker(false);
    };

    // Handle mute toggle
    const handleMuteToggle = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        localStorage.setItem(`chatMuted_${chat.id}`, String(newMuted));
        setShowMenu(false);
    };

    // Handle star toggle
    const handleStarToggle = () => {
        const newStarred = !isStarred;
        setIsStarred(newStarred);
        localStorage.setItem(`chatStarred_${chat.id}`, String(newStarred));
        setShowMenu(false);
    };

    // Copy chat ID
    const handleCopyChatId = () => {
        navigator.clipboard.writeText(chat.id);
        setShowMenu(false);
    };

    // Initiate call from menu
    const handleCall = async (type: 'audio' | 'video') => {
        if (isInCall || isInitiatingCall) return;
        setShowMenu(false);
        setIsInitiatingCall(true);
        try {
            await initiateCall(
                participant.id,
                participant.name,
                chat.participantPhotoURLs?.[participant.id],
                chat.id,
                type
            );
        } catch (error) {
            console.error(`Failed to initiate ${type} call:`, error);
            alert(`Failed to start call. Please check your ${type === 'video' ? 'camera/' : ''}microphone permissions.`);
        } finally {
            setIsInitiatingCall(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white dark:bg-gray-950">
            {/* Selection Mode Toolbar */}
            {isSelectionMode ? (
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-slideDownToolbar">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancelSelection}
                            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {selectedMessageIds.size} selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedMessageIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedMessageIds.size})
                        </button>
                    </div>
                </div>
            ) : (
                /* Header - Fixed at top */
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-[#1650EB] to-[#6095DB]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Back Button - Always visible */}
                        <button
                            onClick={onBack}
                            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        {/* Avatar with click to view info */}
                        <button
                            onClick={() => setShowContactInfo(true)}
                            className="relative flex-shrink-0"
                        >
                            {chat.participantPhotoURLs?.[participant.id] ? (
                                <img
                                    src={chat.participantPhotoURLs[participant.id]}
                                    alt={participant.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                    {participant.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5">
                                <OnlineStatus
                                    isOnline={presence?.isOnline || false}
                                    size="small"
                                />
                            </div>
                        </button>

                        {/* Name and Status — no class badge here */}
                        <button onClick={() => setShowContactInfo(true)} className="text-left min-w-0 flex-1">
                            <h3 className="font-semibold text-white flex items-center gap-2 truncate">
                                {participant.name}
                                {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                                {isMuted && <VolumeX className="w-3 h-3 text-white/60 flex-shrink-0" />}
                            </h3>
                            <p className="text-xs text-white/70 truncate">
                                {isTyping
                                    ? <span className="text-green-300">typing...</span>
                                    : presence?.isOnline
                                        ? 'Online'
                                        : presence?.lastSeen
                                            ? formatLastSeenFull(presence.lastSeen)
                                            : 'Offline'
                                }
                            </p>
                        </button>
                    </div>

                    {/* Actions — only search and hamburger menu */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Search in chat */}
                        <button
                            onClick={() => setShowSearchMessages(!showSearchMessages)}
                            className={`p-2 rounded-full transition-all duration-200 ${showSearchMessages ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* More Menu (Hamburger) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden">
                                        {/* Voice Call */}
                                        <button
                                            onClick={() => handleCall('audio')}
                                            disabled={isInCall || isInitiatingCall}
                                            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-sm ${
                                                isInCall || isInitiatingCall
                                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <Phone className="w-4 h-4 text-green-500" />
                                            Voice Call
                                        </button>

                                        {/* Video Call */}
                                        <button
                                            onClick={() => handleCall('video')}
                                            disabled={isInCall || isInitiatingCall}
                                            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-sm border-b border-gray-100 dark:border-gray-800 ${
                                                isInCall || isInitiatingCall
                                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <Video className="w-4 h-4 text-blue-500" />
                                            Video Call
                                        </button>

                                        {/* Contact Info */}
                                        <button
                                            onClick={() => { setShowContactInfo(true); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm"
                                        >
                                            <Info className="w-4 h-4" />
                                            Contact Info
                                        </button>

                                        {/* Select Messages */}
                                        <button
                                            onClick={() => { setIsSelectionMode(true); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm"
                                        >
                                            <CheckSquare className="w-4 h-4 text-purple-500" />
                                            Select Messages
                                        </button>

                                        {/* Star/Unstar */}
                                        <button
                                            onClick={handleStarToggle}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm"
                                        >
                                            <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                            {isStarred ? 'Unstar Chat' : 'Star Chat'}
                                        </button>

                                        {/* Mute/Unmute */}
                                        <button
                                            onClick={handleMuteToggle}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm"
                                        >
                                            {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                            {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                                        </button>

                                        {/* Background Color */}
                                        <button
                                            onClick={() => setShowBgPicker(!showBgPicker)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm border-t border-gray-100 dark:border-gray-800"
                                        >
                                            <Palette className="w-4 h-4" />
                                            Wallpaper
                                        </button>

                                        {/* Background Color Picker */}
                                        {showBgPicker && (
                                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 max-h-48 overflow-y-auto">
                                                <p className="text-xs text-gray-500 mb-2">Choose background color</p>
                                                <div className="grid grid-cols-8 gap-1.5">
                                                    {BACKGROUND_COLORS.map((color) => (
                                                        <button
                                                            key={color.name}
                                                            onClick={() => handleBgChange(color.value)}
                                                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${bgColor === color.value
                                                                ? 'border-[#1650EB] ring-2 ring-[#1650EB]/30'
                                                                : 'border-gray-300 dark:border-gray-600 hover:scale-110'
                                                                }`}
                                                            style={{ backgroundColor: color.hex }}
                                                            title={color.name}
                                                        >
                                                            {bgColor === color.value && <Check className="w-3 h-3 text-[#1650EB]" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Custom color input */}
                                                <div className="mt-3 flex items-center gap-2">
                                                    <label className="text-xs text-gray-500">Custom:</label>
                                                    <input
                                                        type="color"
                                                        onChange={(e) => {
                                                            const customBg = `custom-${e.target.value}`;
                                                            setBgColor(customBg);
                                                            setCustomBgColor(e.target.value);
                                                            localStorage.setItem(`chatBg_${chat.id}`, customBg);
                                                            localStorage.setItem(`chatBgCustomColor_${chat.id}`, e.target.value);
                                                        }}
                                                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
                                                        title="Pick custom color"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Copy Chat ID */}
                                        <button
                                            onClick={handleCopyChatId}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-sm border-t border-gray-100 dark:border-gray-800"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy Chat ID
                                        </button>

                                        {/* Clear Chat */}
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 text-sm border-t border-gray-100 dark:border-gray-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Chat
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            {showSearchMessages && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search messages..."
                            autoFocus
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-[#1650EB] focus:ring-2 focus:ring-[#1650EB]/20"
                        />
                        {searchQuery && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                {filteredMessages.length} found
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Area - Scrollable */}
            <div
                className={`flex-1 min-h-0 overflow-y-auto p-4 space-y-1 ${bgColor.startsWith('custom-') ? '' : bgColor}`}
                style={bgColor.startsWith('custom-') && customBgColor ? { backgroundColor: customBgColor } : undefined}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-full bg-[#1650EB]/10 dark:bg-[#1650EB]/20 flex items-center justify-center mb-4">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Start the conversation!</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                            Send a message to {participant.name} to begin chatting.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Chat started message */}
                        <SystemMessage text={`Chat with ${participant.name} started`} />

                        {/* Messages grouped by date */}
                        {groupedMessages.map(({ date, messages: dateMessages }) => (
                            <div key={date}>
                                <DateSeparator date={date} />
                                <div className="space-y-0.5">
                                    {dateMessages.map((message, index) => {
                                        const isOwn = message.senderId === currentUserId;
                                        const showAvatar = !isOwn && (
                                            index === 0 ||
                                            dateMessages[index - 1]?.senderId !== message.senderId
                                        );
                                        // Show tail for the first message in a consecutive group from same sender
                                        const showTail = index === 0 || dateMessages[index - 1]?.senderId !== message.senderId;

                                        // Highlight if searching
                                        const isHighlighted = searchQuery && message.text.toLowerCase().includes(searchQuery.toLowerCase());
                                        const isNewMsg = newMessageIds.has(message.id);

                                        return (
                                            <div key={message.id} className={isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-1 -m-1' : ''}>
                                                <MessageBubble
                                                    message={message}
                                                    isOwn={isOwn}
                                                    showAvatar={showAvatar}
                                                    showTail={showTail}
                                                    senderInitial={participant.name.charAt(0)}
                                                    isNew={isNewMsg}
                                                    onReply={handleReply}
                                                    onDelete={handleDeleteMessage}
                                                    onForward={handleForward}
                                                    isSelectionMode={isSelectionMode}
                                                    isSelected={selectedMessageIds.has(message.id)}
                                                    onToggleSelect={handleToggleSelect}
                                                    onEnterSelectionMode={handleEnterSelectionMode}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && <TypingBubble />}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Reply Bar */}
            {replyingTo && !isSelectionMode && (
                <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3 animate-fadeIn">
                    <div className="w-1 h-10 bg-[#1650EB] rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1650EB]">
                            <Reply className="w-3 h-3 inline mr-1" />
                            Replying to {replyingTo.senderName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {replyingTo.text}
                        </p>
                    </div>
                    <button
                        onClick={() => onSetReplyingTo?.(null)}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input - Fixed at bottom (hidden in selection mode) */}
            {!isSelectionMode && (
                <div className="flex-shrink-0">
                    <ChatInput
                        onSend={handleSendMessage}
                        onTyping={onTyping}
                        onStopTyping={onStopTyping}
                        disabled={false}
                        placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : `Message ${participant.name}...`}
                    />
                </div>
            )}

            {/* Clear History Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clear Chat History</h3>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                            This will delete all messages in this chat for you. This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearHistory}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all duration-200"
                            >
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Info Modal */}
            {showContactInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#1650EB] to-[#6095DB] p-6 text-center relative">
                            <button
                                onClick={() => setShowContactInfo(false)}
                                className="absolute top-4 right-4 p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {chat.participantPhotoURLs?.[participant.id] ? (
                                <img
                                    src={chat.participantPhotoURLs[participant.id]}
                                    alt={participant.name}
                                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white/20"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-3xl mx-auto border-4 border-white/20">
                                    {participant.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mt-4">{participant.name}</h3>
                            <p className="text-white/70 text-sm">
                                {currentUserRole === 'teacher' && 'class' in participant ? `Class ${participant.class} Student` : 'Teacher'}
                            </p>
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Status</span>
                                <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <OnlineStatus isOnline={presence?.isOnline || false} size="small" />
                                    {presence?.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            {/* Last Seen */}
                            {!presence?.isOnline && presence?.lastSeen && (
                                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-sm text-gray-500">Last Seen</span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {formatLastSeenFull(presence.lastSeen).replace('Last seen ', '')}
                                    </span>
                                </div>
                            )}
                            {/* Class — shown here for teacher viewing student */}
                            {currentUserRole === 'teacher' && 'class' in participant && (
                                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-sm text-gray-500">Class</span>
                                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                                        Class {participant.class}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Messages</span>
                                <span className="text-sm text-gray-900 dark:text-white">{messages.length}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-500">Chat Started</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {new Date(chat.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            {/* Privacy Notice for Students viewing Teacher Info */}
                            {currentUserRole === 'student' && chat.teacherHidesContactInfo && (
                                <div className="py-3 px-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Contact information is hidden for privacy
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setShowContactInfo(false)}
                                className="w-full px-4 py-2.5 bg-[#1650EB] text-white rounded-xl text-sm font-medium hover:bg-[#1243c7] transition-all duration-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
