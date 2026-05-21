'use client';

/**
 * Message Bubble Component
 * WhatsApp-style message display with premium design, tails, and selection mode
 * Long-press on mobile / right-click on desktop to show actions
 */

import React, { useState, useRef, useCallback } from 'react';
import type { Message } from '@/types';
import { formatMessageTime } from '@/lib/chatServices';
import MessageStatusIcon from './MessageStatusIcon';
import { Copy, Trash2, Reply, Forward, X, CheckSquare } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showAvatar?: boolean;
    showTail?: boolean;
    senderInitial?: string;
    isNew?: boolean;
    onReply?: (message: Message) => void;
    onDelete?: (messageId: string) => void;
    onDeleteForEveryone?: (messageId: string) => void;
    onForward?: (message: Message) => void;
    // Selection mode props
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (messageId: string) => void;
    onEnterSelectionMode?: (messageId: string) => void;
}

export default function MessageBubble({
    message,
    isOwn,
    showAvatar = false,
    showTail = false,
    senderInitial,
    isNew = false,
    onReply,
    onDelete,
    onDeleteForEveryone,
    onForward,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    onEnterSelectionMode,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);

    // Long press handlers for mobile
    const handleTouchStart = useCallback(() => {
        longPressTimerRef.current = setTimeout(() => {
            if (isSelectionMode) return;
            setShowActions(true);
            // Haptic feedback on supported devices
            if (navigator.vibrate) navigator.vibrate(30);
        }, 500);
    }, [isSelectionMode]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // Right click for desktop
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        if (isSelectionMode) return;
        e.preventDefault();
        setShowActions(true);
    }, [isSelectionMode]);

    // Click handler - in selection mode, toggle select
    const handleClick = useCallback(() => {
        if (isSelectionMode) {
            onToggleSelect?.(message.id);
        }
    }, [isSelectionMode, message.id, onToggleSelect]);

    // Copy message text
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(message.text).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 1500);
        });
        setShowActions(false);
    }, [message.text]);

    // Delete message for me
    const handleDelete = useCallback(() => {
        if (showDeleteConfirm) {
            onDelete?.(message.id);
            setShowDeleteConfirm(false);
            setShowActions(false);
        } else {
            setShowDeleteConfirm(true);
        }
    }, [message.id, onDelete, showDeleteConfirm]);

    // Delete message for everyone (only for own messages)
    const handleDeleteForEveryone = useCallback(() => {
        onDeleteForEveryone?.(message.id);
        setShowActions(false);
    }, [message.id, onDeleteForEveryone]);

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

    // Enter selection mode
    const handleSelect = useCallback(() => {
        onEnterSelectionMode?.(message.id);
        setShowActions(false);
    }, [message.id, onEnterSelectionMode]);

    return (
        <>
            <div
                ref={bubbleRef}
                className={`
                    flex items-end gap-2 group relative px-1 py-0.5 rounded-lg transition-colors duration-150
                    ${isOwn ? 'flex-row-reverse' : 'flex-row'}
                    ${isNew ? 'animate-slideInMessage' : ''}
                    ${isSelected ? 'msg-selected' : ''}
                    ${isSelectionMode ? 'cursor-pointer' : ''}
                `}
                onTouchStart={isSelectionMode ? undefined : handleTouchStart}
                onTouchEnd={isSelectionMode ? undefined : handleTouchEnd}
                onTouchCancel={isSelectionMode ? undefined : handleTouchEnd}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
            >
                {/* Selection checkbox */}
                {isSelectionMode && (
                    <div className="flex items-center flex-shrink-0 animate-checkboxPop">
                        <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                            ${isSelected
                                ? 'bg-[#1650EB] border-[#1650EB] scale-110'
                                : 'border-gray-400 dark:border-gray-600'
                            }
                        `}>
                            {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            )}
                        </div>
                    </div>
                )}

                {/* Avatar (only for received messages with tail) */}
                {showAvatar && !isOwn && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-md mb-0.5">
                        {senderInitial || message.senderName.charAt(0).toUpperCase()}
                    </div>
                )}
                {/* Spacer for alignment when no avatar */}
                {!showAvatar && !isOwn && !isSelectionMode && (
                    <div className="w-7 flex-shrink-0" />
                )}

                {/* Message Content */}
                <div
                    className={`
                        max-w-[75%] md:max-w-[60%]
                        ${isOwn
                            ? `msg-bubble-own ${showTail ? 'msg-bubble-tail' : ''} bg-gradient-to-br from-[#1650EB] to-[#4A7FE0] ${showTail ? 'rounded-2xl rounded-br-[4px]' : 'rounded-2xl rounded-br-sm'}`
                            : `msg-bubble-other ${showTail ? 'msg-bubble-tail' : ''} bg-white dark:bg-gray-800 ${showTail ? 'rounded-2xl rounded-bl-[4px]' : 'rounded-2xl rounded-bl-sm'} border border-gray-100 dark:border-gray-700`
                        }
                        px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200
                        ${showActions ? 'ring-2 ring-[#1650EB]/40' : ''}
                    `}
                >
                    {/* Reply preview if replying to another message */}
                    {message.replyTo && (
                        <div className={`
                            mb-1.5 px-2.5 py-1.5 rounded-lg text-xs border-l-[3px]
                            ${isOwn
                                ? 'bg-white/15 border-l-white/50 text-white/85'
                                : 'bg-[#1650EB]/5 dark:bg-[#1650EB]/10 border-l-[#1650EB] text-gray-600 dark:text-gray-300'
                            }
                        `}>
                            <p className={`font-semibold text-[10px] mb-0.5 ${isOwn ? 'text-white/90' : 'text-[#1650EB]'}`}>
                                {message.replyTo.senderName}
                            </p>
                            <p className="truncate">{message.replyTo.text}</p>
                        </div>
                    )}

                    {/* Message Text */}
                    <p className={`text-[14.5px] break-words whitespace-pre-wrap leading-[1.45] ${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        {message.text}
                    </p>

                    {/* Time and Status — WhatsApp-style inline bottom-right */}
                    <div className={`
                        flex items-center gap-1 mt-0.5 float-right ml-3 -mb-0.5
                        ${isOwn ? 'justify-end' : 'justify-start'}
                    `}>
                        <span className={`text-[10px] leading-none ${isOwn ? 'text-white/55' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatMessageTime(message.timestamp)}
                        </span>

                        {/* Status icon only for own messages */}
                        {isOwn && (
                            <MessageStatusIcon status={message.status} size="small" />
                        )}
                    </div>
                    {/* Clear float */}
                    <div className="clear-both" />

                    {/* Copy feedback toast */}
                    {copyFeedback && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-full shadow-lg animate-fadeIn whitespace-nowrap z-50">
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

                            {/* Select for multi-select */}
                            <button
                                onClick={handleSelect}
                                className="w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm active:bg-gray-100 dark:active:bg-gray-700"
                            >
                                <CheckSquare className="w-4 h-4 text-purple-500" />
                                Select
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-800" />

                            <button
                                onClick={handleDelete}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 transition-colors text-sm active:bg-red-100 dark:active:bg-red-900/30 ${
                                    showDeleteConfirm
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Trash2 className="w-4 h-4 text-orange-500" />
                                {showDeleteConfirm ? 'Tap again to confirm' : 'Delete for me'}
                            </button>

                            {/* Delete for everyone — only shown for own messages */}
                            {isOwn && (
                                <button
                                    onClick={handleDeleteForEveryone}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 md:py-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm active:bg-red-100 dark:active:bg-red-900/30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete for everyone
                                </button>
                            )}

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
        <div className="flex items-center justify-center my-3">
            <div className="bg-white/90 dark:bg-gray-800/90 px-4 py-1 rounded-lg backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
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
        <div className="flex items-center justify-center my-2">
            <div className="bg-[#1650EB]/8 dark:bg-[#1650EB]/15 px-4 py-1 rounded-lg">
                <span className="text-[11px] text-[#1650EB] dark:text-[#6095DB] font-medium">
                    {text}
                </span>
            </div>
        </div>
    );
}
