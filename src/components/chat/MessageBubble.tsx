'use client';

/**
 * Message Bubble Component
 * Individual message display with actions: copy, delete, reply, forward
 * Long-press on mobile / right-click on desktop to show actions
 */

import React, { useState, useRef, useCallback } from 'react';
import type { Message } from '@/types';
import { formatMessageTime } from '@/lib/chatServices';
import MessageStatusIcon from './MessageStatusIcon';
import { Copy, Trash2, Reply, Forward, X } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showAvatar?: boolean;
    senderInitial?: string;
    isNew?: boolean;
    onReply?: (message: Message) => void;
    onDelete?: (messageId: string) => void;
    onForward?: (message: Message) => void;
}

export default function MessageBubble({
    message,
    isOwn,
    showAvatar = false,
    senderInitial,
    isNew = false,
    onReply,
    onDelete,
    onForward,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);

    // Long press handlers for mobile
    const handleTouchStart = useCallback(() => {
        longPressTimerRef.current = setTimeout(() => {
            setShowActions(true);
            // Haptic feedback on supported devices
            if (navigator.vibrate) navigator.vibrate(30);
        }, 500);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // Right click for desktop
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setShowActions(true);
    }, []);

    // Copy message text
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(message.text).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 1500);
        });
        setShowActions(false);
    }, [message.text]);

    // Delete message
    const handleDelete = useCallback(() => {
        if (showDeleteConfirm) {
            onDelete?.(message.id);
            setShowDeleteConfirm(false);
            setShowActions(false);
        } else {
            setShowDeleteConfirm(true);
        }
    }, [message.id, onDelete, showDeleteConfirm]);

    // Reply to message
    const handleReply = useCallback(() => {
        onReply?.(message);
        setShowActions(false);
    }, [message, onReply]);

    // Forward message
    const handleForward = useCallback(() => {
        onForward?.(message);
        setShowActions(false);
    }, [message, onForward]);

    return (
        <>
            <div
                ref={bubbleRef}
                className={`
                    flex items-end gap-2 group relative
                    ${isOwn ? 'flex-row-reverse' : 'flex-row'}
                    ${isNew ? 'animate-slideInMessage' : 'animate-fadeIn'}
                `}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={handleContextMenu}
            >
                {/* Avatar (only for received messages) */}
                {showAvatar && !isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-md">
                        {senderInitial || message.senderName.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Message Content */}
                <div
                    className={`
                        max-w-[75%] md:max-w-[60%] relative
                        ${isOwn
                            ? 'bg-gradient-to-br from-[#1650EB] to-[#4A7FE0] rounded-2xl rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 dark:border-gray-700'
                        }
                        px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200
                        ${showActions ? 'ring-2 ring-[#1650EB]/40' : ''}
                    `}
                >
                    {/* Reply preview if replying to another message */}
                    {message.replyTo && (
                        <div className={`
                            mb-2 px-3 py-1.5 rounded-lg text-xs border-l-3
                            ${isOwn
                                ? 'bg-white/10 border-l-white/40 text-white/80'
                                : 'bg-[#1650EB]/5 border-l-[#1650EB] text-gray-600 dark:text-gray-300'
                            }
                        `}>
                            <p className={`font-semibold text-[10px] ${isOwn ? 'text-white/90' : 'text-[#1650EB]'}`}>
                                {message.replyTo.senderName}
                            </p>
                            <p className="truncate">{message.replyTo.text}</p>
                        </div>
                    )}

                    {/* Message Text */}
                    <p className={`text-sm md:text-[15px] break-words whitespace-pre-wrap leading-relaxed ${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        {message.text}
                    </p>

                    {/* Time and Status */}
                    <div className={`
                        flex items-center gap-1.5 mt-1
                        ${isOwn ? 'justify-end' : 'justify-start'}
                    `}>
                        <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatMessageTime(message.timestamp)}
                        </span>

                        {/* Status icon only for own messages */}
                        {isOwn && (
                            <MessageStatusIcon status={message.status} size="small" />
                        )}
                    </div>

                    {/* Copy feedback toast */}
                    {copyFeedback && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-full shadow-lg animate-fadeIn whitespace-nowrap">
                            ✓ Copied
                        </div>
                    )}
                </div>
            </div>

            {/* Action Menu Overlay */}
            {showActions && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                        onClick={() => { setShowActions(false); setShowDeleteConfirm(false); }}
                    />

                    {/* Action Sheet */}
                    <div className={`
                        fixed bottom-0 left-0 right-0 z-50 px-3 pb-6 pt-2
                        md:absolute md:bottom-auto md:left-auto md:right-auto md:px-0 md:pb-0 md:pt-0
                        ${isOwn ? 'md:right-0' : 'md:left-10'}
                        md:top-0
                    `}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full md:w-52 animate-slideUpSheet">
                            {/* Close on mobile */}
                            <div className="md:hidden flex justify-center pt-2 pb-1">
                                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                            </div>

                            {/* Message preview */}
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 md:hidden">
                                <p className="text-xs text-gray-500 truncate">{message.text.substring(0, 60)}{message.text.length > 60 ? '...' : ''}</p>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={handleReply}
                                className="w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm active:bg-gray-100 dark:active:bg-gray-700"
                            >
                                <Reply className="w-4 h-4 text-[#1650EB]" />
                                Reply
                            </button>

                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm active:bg-gray-100 dark:active:bg-gray-700"
                            >
                                <Copy className="w-4 h-4 text-emerald-500" />
                                Copy
                            </button>

                            <button
                                onClick={handleForward}
                                className="w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm active:bg-gray-100 dark:active:bg-gray-700"
                            >
                                <Forward className="w-4 h-4 text-blue-500" />
                                Forward
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-800" />

                            <button
                                onClick={handleDelete}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 transition-colors text-sm active:bg-red-100 dark:active:bg-red-900/30 ${
                                    showDeleteConfirm
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                        : 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                            >
                                <Trash2 className="w-4 h-4" />
                                {showDeleteConfirm ? 'Tap again to delete' : 'Delete for me'}
                            </button>

                            {/* Cancel button for mobile */}
                            <div className="md:hidden border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => { setShowActions(false); setShowDeleteConfirm(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

/**
 * Date Separator Component
 */
export function DateSeparator({ date }: { date: string }) {
    return (
        <div className="flex items-center justify-center my-4">
            <div className="bg-gray-200/80 dark:bg-gray-800/80 px-4 py-1.5 rounded-full backdrop-blur-sm">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {date}
                </span>
            </div>
        </div>
    );
}

/**
 * System Message Component (for notifications like "Chat started")
 */
export function SystemMessage({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-center my-3">
            <div className="bg-[#1650EB]/10 dark:bg-[#1650EB]/20 px-4 py-1.5 rounded-full">
                <span className="text-xs text-[#1650EB] dark:text-[#6095DB]">
                    {text}
                </span>
            </div>
        </div>
    );
}
