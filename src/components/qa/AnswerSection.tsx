'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Loader2, ThumbsUp, ThumbsDown, GraduationCap, Clock, User,
  Copy, Trash2, Reply, Check,
} from 'lucide-react';
import type { ApprovedQuestion, Answer } from '@/lib/qaService';
import {
  submitAnswer, toggleAnswerLike, toggleAnswerDislike,
  toggleQuestionLike, toggleQuestionDislike,
} from '@/lib/qaService';
import { deleteDoc, doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

interface AnswerSectionProps {
  question: ApprovedQuestion;
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; name: string; role: 'student' | 'teacher' } | null;
}

export default function AnswerSection({ question, isOpen, onClose, user }: AnswerSectionProps) {
  const [q, setQ] = useState(question);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // answer userName being replied to
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const voterId = getVoterId(user?.uid);

  // Real-time listener for answers
  useEffect(() => {
    if (!isOpen) return;

    const q2 = query(
      collection(db, 'approved_questions', question.id, 'answers'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q2, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      })) as Answer[];
      setAnswers(data);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to answers:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, question.id]);

  const handleReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const text = replyingTo ? `@${replyingTo} ${replyText.trim()}` : replyText.trim();
      await submitAnswer({
        questionId: question.id,
        text,
        userId: user?.uid,
        userName: user?.name,
        userRole: user?.role,
      });
      setReplyText('');
      setReplyingTo(null);
      setQ((prev) => ({ ...prev, answerCount: prev.answerCount + 1 }));
    } catch (err) { console.error('Error submitting answer:', err); }
    finally { setSubmitting(false); }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('Delete this reply?')) return;
    try {
      await deleteDoc(doc(db, 'approved_questions', question.id, 'answers', answerId));
      setAnswers((prev) => prev.filter((a) => a.id !== answerId));
      setQ((prev) => ({ ...prev, answerCount: Math.max(0, prev.answerCount - 1) }));
    } catch (err) { console.error('Error deleting answer:', err); }
  };

  const handleReplyTo = (userName: string) => {
    setReplyingTo(userName);
    setReplyText('');
  };

  // Question voting
  const handleQLike = async () => {
    const liked = q.likedBy.includes(voterId);
    const disliked = q.dislikedBy.includes(voterId);
    setQ((p) => ({
      ...p, likes: liked ? p.likes - 1 : p.likes + 1,
      dislikes: disliked ? p.dislikes - 1 : p.dislikes,
      likedBy: liked ? p.likedBy.filter((i) => i !== voterId) : [...p.likedBy, voterId],
      dislikedBy: p.dislikedBy.filter((i) => i !== voterId),
    }));
    try { await toggleQuestionLike(q.id, voterId); } catch (err) { console.error(err); }
  };

  const handleQDislike = async () => {
    const disliked = q.dislikedBy.includes(voterId);
    const liked = q.likedBy.includes(voterId);
    setQ((p) => ({
      ...p, dislikes: disliked ? p.dislikes - 1 : p.dislikes + 1,
      likes: liked ? p.likes - 1 : p.likes,
      dislikedBy: disliked ? p.dislikedBy.filter((i) => i !== voterId) : [...p.dislikedBy, voterId],
      likedBy: p.likedBy.filter((i) => i !== voterId),
    }));
    try { await toggleQuestionDislike(q.id, voterId); } catch (err) { console.error(err); }
  };

  // Answer voting
  const handleALike = async (a: Answer, idx: number) => {
    const liked = a.likedBy.includes(voterId);
    const disliked = a.dislikedBy.includes(voterId);
    setAnswers((prev) => prev.map((ans, i) => i !== idx ? ans : {
      ...ans, likes: liked ? ans.likes - 1 : ans.likes + 1,
      dislikes: disliked ? ans.dislikes - 1 : ans.dislikes,
      likedBy: liked ? ans.likedBy.filter((x) => x !== voterId) : [...ans.likedBy, voterId],
      dislikedBy: ans.dislikedBy.filter((x) => x !== voterId),
    }));
    try { await toggleAnswerLike(question.id, a.id, voterId); } catch (err) { console.error(err); }
  };

  const handleADislike = async (a: Answer, idx: number) => {
    const disliked = a.dislikedBy.includes(voterId);
    const liked = a.likedBy.includes(voterId);
    setAnswers((prev) => prev.map((ans, i) => i !== idx ? ans : {
      ...ans, dislikes: disliked ? ans.dislikes - 1 : ans.dislikes + 1,
      likes: liked ? ans.likes - 1 : ans.likes,
      dislikedBy: disliked ? ans.dislikedBy.filter((x) => x !== voterId) : [...ans.dislikedBy, voterId],
      likedBy: ans.likedBy.filter((x) => x !== voterId),
    }));
    try { await toggleAnswerDislike(question.id, a.id, voterId); } catch (err) { console.error(err); }
  };

  const qLiked = q.likedBy.includes(voterId);
  const qDisliked = q.dislikedBy.includes(voterId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="answer-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />

          <motion.div
            key="answer-modal"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-[#0a1628] via-[#1650EB] to-[#0a1628] flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      q.userRole === 'teacher' ? 'bg-white/20 text-white' : 'bg-white/15 text-white/90'}`}>
                      {q.userRole === 'teacher' ? <GraduationCap className="w-3 h-3" /> : q.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-white/80 font-medium truncate">{q.userName}</span>
                    {q.userRole === 'teacher' && <span className="px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider bg-white/15 text-white rounded flex-shrink-0">Teacher</span>}
                    <span className="flex items-center gap-0.5 text-[9px] text-white/40 flex-shrink-0"><Clock className="w-2 h-2" /> {timeAgo(q.createdAt)}</span>
                  </div>
                  {q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {q.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 text-[8px] font-medium bg-white/10 text-white/80 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                <p className="text-sm text-[#020218] dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{q.description}</p>

                <div className="flex items-center gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={handleQLike}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${qLiked ? 'text-[#1650EB]' : 'text-gray-400 hover:text-[#1650EB]'}`}>
                    <ThumbsUp className="w-3.5 h-3.5" /> {q.likes}
                  </button>
                  <button type="button" onClick={handleQDislike}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${qDisliked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                    <ThumbsDown className="w-3.5 h-3.5" /> {q.dislikes}
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">{q.answerCount} {q.answerCount === 1 ? 'answer' : 'answers'}</span>
                </div>

                {/* Answers */}
                <div>
                  <h4 className="text-sm font-semibold text-[#020218] dark:text-white mb-3">Answers</h4>
                  {loading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#1650EB] animate-spin" /></div>
                  ) : answers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No answers yet. Be the first!</p>
                  ) : (
                    <div className="space-y-3">
                      {answers.map((a, idx) => {
                        const aLiked = a.likedBy.includes(voterId);
                        const aDisliked = a.dislikedBy.includes(voterId);
                        const isOwn = user && a.userId === user.uid;
                        return (
                          <div key={a.id} className="flex gap-2.5 group">
                            {/* Avatar */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                              a.userRole === 'teacher' ? 'bg-[#1650EB]/15 text-[#1650EB] dark:bg-[#1650EB]/25 dark:text-[#6095DB]'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                              {a.userRole === 'teacher' ? <GraduationCap className="w-3 h-3" /> : a.userName.charAt(0).toUpperCase()}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-xs font-semibold text-[#020218] dark:text-white">{a.userName}</span>
                                {a.userRole === 'teacher' && <span className="px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider bg-[#1650EB]/10 text-[#1650EB] dark:bg-[#1650EB]/20 dark:text-[#6095DB] rounded">Teacher</span>}
                                <span className="text-[9px] text-gray-400">{timeAgo(a.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words mb-1.5">{a.text}</p>
                              {/* Actions row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button type="button" onClick={() => handleALike(a, idx)}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${aLiked ? 'text-[#1650EB]' : 'text-gray-400 hover:text-[#1650EB]'}`}>
                                  <ThumbsUp className="w-3 h-3" /> {a.likes || ''}
                                </button>
                                <button type="button" onClick={() => handleADislike(a, idx)}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${aDisliked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                                  <ThumbsDown className="w-3 h-3" /> {a.dislikes || ''}
                                </button>
                                <button type="button" onClick={() => handleReplyTo(a.userName)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#1650EB] transition-colors">
                                  <Reply className="w-3 h-3" /> Reply
                                </button>
                                <button type="button" onClick={() => handleCopy(a.text, a.id)}
                                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                  {copiedId === a.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  {copiedId === a.id ? 'Copied' : 'Copy'}
                                </button>
                                {isOwn && (
                                  <button type="button" onClick={() => handleDeleteAnswer(a.id)}
                                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Reply input */}
              <div className="flex-shrink-0 px-3 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                {/* Reply-to indicator */}
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[11px] text-[#1650EB] dark:text-[#6095DB]">Replying to @{replyingTo}</span>
                    <button type="button" onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1650EB]/10 dark:bg-[#1650EB]/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-[#1650EB] dark:text-[#6095DB]" />
                  </div>
                  <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    placeholder={replyingTo ? `Reply to @${replyingTo}...` : (user ? 'Write your answer...' : 'Reply anonymously...')}
                    maxLength={1500}
                    className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none" />
                  <button type="button" onClick={handleReply} disabled={!replyText.trim() || submitting}
                    className="w-8 h-8 flex items-center justify-center bg-[#1650EB] text-white rounded-full hover:bg-[#1243c7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
