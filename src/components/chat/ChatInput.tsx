'use client';

/**
 * Chat Input Component
 * Clean chat input with emoji picker and send button
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { CHAT_CONSTANTS } from '@/types';
import EmojiPicker from './EmojiPicker';

interface ChatInputProps {
    onSend: (message: string) => Promise<void>;
    onTyping: () => void;
    onStopTyping: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function ChatInput({
    onSend,
    onTyping,
    onStopTyping,
    disabled = false,
    placeholder = "Type a message..."
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    // Handle typing
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH) return;
        setMessage(value);
        onTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(onStopTyping, CHAT_CONSTANTS.TYPING_TIMEOUT_MS);
    };

    // Handle emoji selection
    const handleEmojiSelect = (emoji: string) => {
        setMessage(prev => prev + emoji);
        textareaRef.current?.focus();
    };

    // Handle send
    const handleSend = async () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || disabled) return;

        setMessage('');
        setShowEmojiPicker(false);
        onStopTyping();
        textareaRef.current?.focus();

        onSend(trimmedMessage).catch(console.error);
    };

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-white/80 dark:bg-[#0c1025]/80 backdrop-blur-xl px-3 py-2 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-end gap-2">
                {/* Emoji Button */}
                <div className="relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-full transition-all ${showEmojiPicker
                                ? 'text-[#1650EB] bg-[#1650EB]/10'
                                : 'text-gray-400 hover:text-[#1650EB] hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                    >
                        <Smile className="w-6 h-6" />
                    </button>
                    <EmojiPicker
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        onSelect={handleEmojiSelect}
                    />
                </div>

                {/* Input */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 px-4 py-2.5 rounded-2xl resize-none outline-none text-sm focus:ring-2 focus:ring-[#1650EB]/20 border border-transparent focus:border-[#1650EB]/30 dark:focus:border-[#1650EB]/30 transition-all"
                        style={{ minHeight: '42px', maxHeight: '120px' }}
                    />
                </div>

                {/* Send Button */}
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className={`p-2.5 rounded-full flex-shrink-0 transition-all ${message.trim()
                            ? 'bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white shadow-lg shadow-[#1650EB]/20 hover:shadow-xl active:scale-95'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                        }`}
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
