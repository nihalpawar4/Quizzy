'use client';

/**
 * Emoji Picker Component
 * WhatsApp-style - properly positioned and sized
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
}

// Emoji data - organized by category icon
const EMOJI_CATEGORIES: { icon: string; emojis: string[] }[] = [
    {
        icon: '😀',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤔', '😐', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '😴', '🤤']
    },
    {
        icon: '👋',
        emojis: ['👋', '🤚', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤝', '🙏', '💪']
    },
    {
        icon: '❤️',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💋', '💌', '🌹', '🌸', '🌺', '🌻', '🌷']
    },
    {
        icon: '🎉',
        emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮', '🎲', '🎯', '🎵', '🎶', '🎤', '🎧', '🎸', '🎹']
    },
    {
        icon: '✅',
        emojis: ['✅', '❌', '❓', '❗', '💯', '🔥', '✨', '⭐', '💫', '⚡', '💥', '💢', '💤', '💬', '🔔', '📢', '💡', '🔍', '📱', '💻']
    },
    {
        icon: '🐶',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦋', '🐌', '🌍']
    }
];

export default function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const currentEmojis = EMOJI_CATEGORIES[activeIndex]?.emojis || [];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* Picker - Fixed position at bottom of screen on mobile, above button on desktop */}
            <div className="fixed sm:absolute bottom-16 sm:bottom-full left-0 right-0 sm:left-auto sm:right-auto mb-0 sm:mb-2 mx-2 sm:mx-0 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 w-[calc(100%-16px)] sm:w-72">
                {/* Header */}
                <div className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Emojis</span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="flex justify-around p-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`w-8 h-8 text-lg flex items-center justify-center rounded-lg transition-all ${activeIndex === idx
                                    ? 'bg-[#1650EB]/10 scale-110'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>

                {/* Emoji Grid */}
                <div className="p-2 h-48 overflow-y-auto">
                    <div className="grid grid-cols-7 gap-0.5">
                        {currentEmojis.map((emoji, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(emoji)}
                                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors active:scale-90"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
