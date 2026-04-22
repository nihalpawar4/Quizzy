'use client';

import { useState, useEffect } from 'react';
import { Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteApprovedQuestion } from '@/lib/qaService';
import type { ApprovedQuestion } from '@/lib/qaService';
import QuestionCard from './QuestionCard';
import AnswerSection from './AnswerSection';

interface QuestionListProps {
  user: { uid: string; name: string; role: 'student' | 'teacher'; studentClass?: number } | null;
}

export default function QuestionList({ user }: QuestionListProps) {
  const [questions, setQuestions] = useState<ApprovedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailQuestion, setDetailQuestion] = useState<ApprovedQuestion | null>(null);

  // Real-time listener for approved questions
  useEffect(() => {
    const q = query(
      collection(db, 'approved_questions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
        approvedAt: d.data().approvedAt?.toDate?.() || new Date(),
      })) as ApprovedQuestion[];
      setQuestions(data);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to questions:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (questionId: string) => {
    if (!confirm('Delete this question permanently?')) return;
    try {
      await deleteApprovedQuestion(questionId);
      // Real-time listener will auto-remove it
    } catch (err) { console.error('Delete error:', err); }
  };

  const isTeacher = user?.role === 'teacher';

  return (
    <section id="community-qa" className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl text-[#020218] dark:text-white mb-3">
            <span style={{ fontFamily: 'var(--font-serif)' }}>Community</span>{' '}
            <span className="text-[#1650EB]" style={{ fontFamily: 'var(--font-display)' }}>Questions</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-body)' }}>
            Ask questions, share knowledge, and learn together
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-[#1650EB] animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-[#020218] dark:text-white mb-1">No Questions Yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Be the first to ask!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {questions.map((q) => (
              <div key={q.id} className="relative">
                <QuestionCard
                  question={q}
                  userId={user?.uid}
                  onOpenDetail={setDetailQuestion}
                />
                {/* Teacher delete overlay */}
                {isTeacher && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                    className="absolute top-3 right-3 p-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-600 transition-colors shadow-sm z-10"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {detailQuestion && (
        <AnswerSection
          question={detailQuestion}
          isOpen={!!detailQuestion}
          onClose={() => setDetailQuestion(null)}
          user={user}
        />
      )}
    </section>
  );
}
