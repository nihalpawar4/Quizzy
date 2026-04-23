/**
 * ChatWidget — Floating AI Chatbot
 * Fetches Firestore data client-side, sends to API for Gemini processing
 * 
 * Usage:
 *   import ChatWidget from '@/ai-chatbot/components/ChatWidget';
 *   <ChatWidget user={user} />
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, X, Send, Loader2, MessageCircle, Trash2, ChevronDown, Minimize2, GraduationCap,
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { retrieveContext } from '../lib/retrieval';

// ==================== TYPES ====================

interface ChatMsg {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  user?: {
    uid: string;
    name: string;
    role: 'student' | 'teacher';
    studentClass?: number;
  } | null;
}

// ==================== SUGGESTED QUESTIONS ====================

const SUGGESTIONS = [
  '📊 How am I performing overall?',
  '📝 What tests are available?',
  '🎯 Give me study tips!',
  '📚 What subjects can I study?',
  '💡 How does Quizy work?',
];

const TEACHER_SUGGESTIONS = [
  '📊 How are my students performing?',
  '📝 Which tests have been completed?',
  '🎯 Who are the top performers?',
  '📚 Give me a class overview',
  '💡 How to create a test?',
];

// ==================== COMPONENT ====================

export default function ChatWidget({ user }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [cachedContext, setCachedContext] = useState('');
  const [contextLoaded, setContextLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Fetch Firestore context when chatbot opens (only for logged-in users)
  useEffect(() => {
    if (isOpen && !contextLoaded) {
      // Only fetch Firestore data if user is authenticated (rules require auth)
      if (user) {
        retrieveContext(user.role === 'student' ? user.uid : undefined)
          .then((ctx) => {
            setCachedContext(ctx);
            setContextLoaded(true);
          })
          .catch(() => {
            setContextLoaded(true); // Still allow chatting without data
          });
      } else {
        // Anonymous — skip Firestore, chatbot still answers general questions
        setContextLoaded(true);
      }
    }
  }, [isOpen, contextLoaded, user]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context: cachedContext, // Send client-side Firestore data
          history,
          userName: user?.name,
          userRole: user?.role,
        }),
      });

      const data = await res.json();

      const botMsg: ChatMsg = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.reply || 'I\'m having trouble responding. Please try again! 🔄',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('[AI Chat] Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model',
          text: 'Oops! I\'m having trouble connecting. Please check your internet and try again. 🌐',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestions = user?.role === 'teacher' ? TEACHER_SUGGESTIONS : SUGGESTIONS;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-gradient-to-br from-[#1650EB] to-[#0a1628] text-white rounded-full shadow-lg shadow-[#1650EB]/30 flex items-center justify-center hover:shadow-xl hover:shadow-[#1650EB]/40 transition-shadow"
            aria-label="Open AI Chat"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute inset-0 rounded-full bg-[#1650EB] animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[70] w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-3rem))] flex flex-col rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[#0a1628] via-[#1650EB] to-[#0a1628] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Quizy AI</h3>
                  <p className="text-[10px] text-blue-200/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                    Powered by Nihal&apos;s AI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1650EB]/20 to-[#6095DB]/20 dark:from-[#1650EB]/10 dark:to-[#6095DB]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#1650EB]/20">
                    <GraduationCap className="w-8 h-8 text-[#1650EB] dark:text-[#6095DB]" />
                  </div>
                  <h4 className="font-semibold text-[#020218] dark:text-white mb-1 text-sm">
                    Hi{user ? `, ${user.name}` : ''}! 👋
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto leading-relaxed">
                    I&apos;m your AI assistant. Ask me about tests, scores, subjects, or get study tips!
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && messages.length === 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                    Try asking
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#1650EB]/30 hover:bg-[#1650EB]/5 dark:hover:bg-[#1650EB]/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  text={msg.text}
                  userName={msg.role === 'user' ? user?.name : undefined}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && <ChatMessage role="model" text="" isLoading />}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom */}
            {messages.length > 4 && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[#1650EB] transition-colors z-10"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Quizy AI anything..."
                  maxLength={2000}
                  disabled={isLoading}
                  className="flex-1 min-w-0 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center bg-[#1650EB] text-white rounded-xl hover:bg-[#1243c7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-1.5">
                AI responses are based on platform data • Powered by Nihal&apos;s AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
