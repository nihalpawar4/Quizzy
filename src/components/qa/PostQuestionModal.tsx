'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle, BookOpen, Tag, Plus, User } from 'lucide-react';
import { submitQuestion } from '@/lib/qaService';

const SUBJECT_TAGS = [
  'Mathematics', 'Science', 'English', 'Hindi',
  'Social Studies', 'Computer Science', 'General Knowledge', 'Other',
];

interface PostQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; name: string; role: 'student' | 'teacher'; studentClass?: number } | null;
}

export default function PostQuestionModal({ isOpen, onClose, user }: PostQuestionModalProps) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setDescription(''); setTags([]); setCustomTag(''); setDisplayName('');
    setError(''); setSubmitted(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) { setError('Please describe your question.'); return; }

    setIsSubmitting(true);
    try {
      await submitQuestion({
        description: description.trim(),
        tags,
        userId: user?.uid,
        userName: user ? user.name : (displayName.trim() || undefined),
        userRole: user?.role,
        userClass: user?.studentClass,
      });
      setSubmitted(true);
      setTimeout(() => handleClose(), 2500);
    } catch (err) {
      console.error('Error submitting question:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignedIn = !!user;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="qa-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="qa-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-20 px-5 py-4 bg-gradient-to-r from-[#0a1628] via-[#1650EB] to-[#0a1628] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Post a Question</h2>
                    <p className="text-blue-200/70 text-[11px]">
                      {isSignedIn && user.role === 'teacher'
                        ? 'Posted immediately.'
                        : 'Requires teacher approval.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <p className="font-semibold text-[#020218] dark:text-white text-center">Question Submitted!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      {isSignedIn && user.role === 'teacher' ? 'Now live.' : 'A teacher will review it.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Description */}
                    <div>
                      <label className="label">Your Question <span className="text-red-500">*</span></label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your doubt in detail..."
                        maxLength={2000} rows={4} className="input resize-none" required />
                      <span className="text-xs text-gray-400 mt-1 block text-right">{description.length}/2000</span>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Tags <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {SUBJECT_TAGS.map((tag) => (
                          <button key={tag} type="button" onClick={() => toggleTag(tag)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                              tags.includes(tag)
                                ? 'bg-[#1650EB] text-white border-[#1650EB]'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1650EB]/50'
                            }`}>
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                          placeholder="Custom tag..." maxLength={30}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none" />
                        <button type="button" onClick={addCustomTag} disabled={!customTag.trim() || tags.length >= 5}
                          className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-[#1650EB]/10 transition-colors disabled:opacity-40">
                          <Plus className="w-4 h-4 text-[#1650EB]" />
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map((t) => (
                            <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#1650EB]/10 text-[#1650EB] dark:bg-[#1650EB]/20 dark:text-[#6095DB] rounded-full">
                              {t}
                              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button type="submit" disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1243c7] disabled:opacity-50 transition-colors">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isSubmitting ? 'Submitting...' : 'Submit Question'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
