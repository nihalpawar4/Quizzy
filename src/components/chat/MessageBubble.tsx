'use client';

/**
 * Message Bubble Component
 * Individual message display with status and time
 */

import React from 'react';
import type { Message } from '@/types';
import { formatMessageTime } from '@/lib/chatServices';
import MessageStatusIcon from './MessageStatusIcon';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showAvatar?: boolean;
    senderInitial?: string;
}

export default function MessageBubble({
    message,
    isOwn,
    showAvatar = false,
    senderInitial
}: MessageBubbleProps) {
    return (
        <div
            className={`
                flex items-end gap-2 animate-fadeIn
                ${isOwn ? 'flex-row-reverse' : 'flex-row'}
            `}
        >
            {/* Avatar (only for received messages) */}
            {showAvatar && !isOwn && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                    {senderInitial || message.senderName.charAt(0).toUpperCase()}
                </div>
            )}

            {/* Message Content */}
            <div className={`
                max-w-[75%] md:max-w-[60%]
                ${isOwn
                    ? 'bg-gradient-to-r from-[#1650EB] to-[#6095DB] rounded-2xl rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm border border-gray-200 dark:border-gray-700'
                }
                px-4 py-2.5 shadow-md
            `}>
                {/* Message Text */}
                <p className={`text-sm md:text-base break-words whitespace-pre-wrap ${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                    {message.text}
                </p>

                {/* Time and Status */}
                <div className={`
                    flex items-center gap-1.5 mt-1
                    ${isOwn ? 'justify-end' : 'justify-start'}
                `}>
                    <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatMessageTime(message.timestamp)}
                    </span>

                    {/* Status icon only for own messages */}
                    {isOwn && (
                        <MessageStatusIcon status={message.status} size="small" />
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Date Separator Component
 */
export function DateSeparator({ date }: { date: string }) {
    return (
        <div className="flex items-center justify-center my-4">
            <div className="bg-gray-200 dark:bg-gray-800 px-4 py-1.5 rounded-full">
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
