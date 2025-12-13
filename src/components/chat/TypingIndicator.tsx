'use client';

/**
 * Typing Indicator Component
 * Shows animated dots when someone is typing
 */

import React from 'react';

interface TypingIndicatorProps {
    userName?: string;
}

export default function TypingIndicator({ userName }: TypingIndicatorProps) {
    return (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-2">
            {userName && (
                <span className="font-medium text-[#1650EB] dark:text-[#6095DB]">{userName}</span>
            )}
            <span>is typing</span>
            <div className="flex gap-1 items-center">
                <span
                    className="w-1.5 h-1.5 bg-[#1650EB] rounded-full animate-bounce"
                    style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
                />
                <span
                    className="w-1.5 h-1.5 bg-[#1650EB] rounded-full animate-bounce"
                    style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
                />
                <span
                    className="w-1.5 h-1.5 bg-[#1650EB] rounded-full animate-bounce"
                    style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
                />
            </div>
        </div>
    );
}

/**
 * Inline typing indicator for chat bubbles
 */
export function TypingBubble() {
    return (
        <div className="flex items-start gap-3 animate-fadeIn">
            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex-shrink-0" />

            {/* Typing bubble */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                    <span
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms', animationDuration: '0.8s' }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '200ms', animationDuration: '0.8s' }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: '400ms', animationDuration: '0.8s' }}
                    />
                </div>
            </div>
        </div>
    );
}
