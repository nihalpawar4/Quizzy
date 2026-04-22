'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Clock, GraduationCap } from 'lucide-react';
import type { ApprovedQuestion } from '@/lib/qaService';
import { toggleQuestionLike, toggleQuestionDislike } from '@/lib/qaService';

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Get or create a persistent anonymous ID for voting
function getVoterId(userId?: string): string {
  if (userId) return userId;
  if (typeof window === 'undefined') return 'anon';
  let id = localStorage.getItem('quizy_voter_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('quizy_voter_id', id);
  }
  return id;
}

interface QuestionCardProps {
  question: ApprovedQuestion;
  userId?: string;
  onOpenDetail: (q: ApprovedQuestion) => void;
}

export default function QuestionCard({ question, userId, onOpenDetail }: QuestionCardProps) {
  const [q, setQ] = useState(question);
  const voterId = getVoterId(userId);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const liked = q.likedBy.includes(voterId);
    const disliked = q.dislikedBy.includes(voterId);
    setQ((prev) => ({
      ...prev,
      likes: liked ? prev.likes - 1 : prev.likes + 1,
      dislikes: disliked ? prev.dislikes - 1 : prev.dislikes,
      likedBy: liked ? prev.likedBy.filter((id) => id !== voterId) : [...prev.likedBy, voterId],
      dislikedBy: prev.dislikedBy.filter((id) => id !== voterId),
    }));
    try { await toggleQuestionLike(q.id, voterId); } catch (err) { console.error(err); }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const disliked = q.dislikedBy.includes(voterId);
    const liked = q.likedBy.includes(voterId);
    setQ((prev) => ({
      ...prev,
      dislikes: disliked ? prev.dislikes - 1 : prev.dislikes + 1,
      likes: liked ? prev.likes - 1 : prev.likes,
      dislikedBy: disliked ? prev.dislikedBy.filter((id) => id !== voterId) : [...prev.dislikedBy, voterId],
      likedBy: prev.likedBy.filter((id) => id !== voterId),
    }));
    try { await toggleQuestionDislike(q.id, voterId); } catch (err) { console.error(err); }
  };

  const hasLiked = q.likedBy.includes(voterId);
  const hasDisliked = q.dislikedBy.includes(voterId);

  return (
    <div
      onClick={() => onOpenDetail(q)}
      className="cursor-pointer bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1650EB]/30 dark:hover:border-[#1650EB]/30 transition-colors p-4 sm:p-5"
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          q.userRole === 'teacher'
            ? 'bg-[#1650EB] text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}>
          {q.userRole === 'teacher' ? <GraduationCap className="w-3.5 h-3.5" /> : q.userName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-[#020218] dark:text-white truncate">{q.userName}</span>
        {q.userRole === 'teacher' && (
          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#1650EB]/10 text-[#1650EB] dark:bg-[#1650EB]/20 dark:text-[#6095DB] rounded flex-shrink-0">Teacher</span>
        )}
        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 ml-auto flex-shrink-0">
          <Clock className="w-2.5 h-2.5" /> {timeAgo(q.createdAt)}
        </span>
      </div>

      {/* Tags */}
      {q.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {q.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-[#020218] dark:text-gray-300 line-clamp-3 whitespace-pre-wrap break-words mb-3">{q.description}</p>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={handleLike}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${hasLiked ? 'text-[#1650EB]' : 'text-gray-400 hover:text-[#1650EB]'}`}>
          <ThumbsUp className="w-3.5 h-3.5" /> {q.likes || 0}
        </button>
        <button type="button" onClick={handleDislike}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${hasDisliked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
          <ThumbsDown className="w-3.5 h-3.5" /> {q.dislikes || 0}
        </button>
        <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <MessageCircle className="w-3.5 h-3.5" /> {q.answerCount}
        </span>
      </div>
    </div>
  );
}
