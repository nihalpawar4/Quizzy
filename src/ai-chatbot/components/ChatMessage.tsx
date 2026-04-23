/**
 * ChatMessage — Individual message bubble component
 * Completely isolated — no dependency on existing components
 */

'use client';

import { Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
  userName?: string;
  isLoading?: boolean;
}

export default function ChatMessage({ role, text, userName, isLoading }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isBot = role === 'model';

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Parse simple markdown-like formatting
  const formatText = (raw: string) => {
    // Split by code blocks first
    const parts = raw.split(/```([\s\S]*?)```/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // Code block
        return (
          <pre key={i} className="my-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono">
            <code>{part.trim()}</code>
          </pre>
        );
      }
      // Regular text — handle bold, italic, lists
      return part.split('\n').map((line, j) => {
        // Bold
        let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // List items
        if (processed.startsWith('- ') || processed.startsWith('• ')) {
          return (
            <div key={`${i}-${j}`} className="flex gap-1.5 ml-1">
              <span className="text-[#1650EB] flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: processed.substring(2) }} />
            </div>
          );
        }
        // Numbered list
        const numMatch = processed.match(/^(\d+)\.\s/);
        if (numMatch) {
          return (
            <div key={`${i}-${j}`} className="flex gap-1.5 ml-1">
              <span className="text-[#1650EB] font-medium flex-shrink-0">{numMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: processed.substring(numMatch[0].length) }} />
            </div>
          );
        }
        // Empty line = spacing
        if (!processed.trim()) return <div key={`${i}-${j}`} className="h-2" />;
        // Regular paragraph
        return <p key={`${i}-${j}`} dangerouslySetInnerHTML={{ __html: processed }} />;
      });
    });
  };

  if (isLoading) {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] border border-gray-100 dark:border-gray-700">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-[#1650EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-[#1650EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-[#1650EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 items-start ${isBot ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isBot
          ? 'bg-gradient-to-br from-[#1650EB] to-[#6095DB]'
          : 'bg-gray-200 dark:bg-gray-700'
      }`}>
        {isBot ? (
          <Bot className="w-3.5 h-3.5 text-white" />
        ) : (
          <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`group relative max-w-[85%] ${
        isBot
          ? 'bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md border border-gray-100 dark:border-gray-700'
          : 'bg-[#1650EB] text-white rounded-2xl rounded-tr-md'
      }`}>
        <div className="px-4 py-2.5">
          {/* Sender name */}
          {isBot ? (
            <p className="text-[10px] font-semibold text-[#1650EB] dark:text-[#6095DB] mb-1">Quizy AI</p>
          ) : userName ? (
            <p className="text-[10px] font-semibold text-white/80 mb-1">{userName}</p>
          ) : null}

          {/* Message content */}
          <div className={`text-sm leading-relaxed space-y-1 ${
            isBot ? 'text-gray-700 dark:text-gray-200' : 'text-white'
          }`}>
            {formatText(text)}
          </div>
        </div>

        {/* Copy button (bot messages only) */}
        {isBot && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
