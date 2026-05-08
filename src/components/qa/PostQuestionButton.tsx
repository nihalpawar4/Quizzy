'use client';

import { motion } from 'framer-motion';
import { MessageCircleQuestion } from 'lucide-react';

export default function PostQuestionButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 18 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="post-question-fab"
      aria-label="Post a question"
      id="post-question-btn"
    >
      <div className="post-question-fab-inner">
        <MessageCircleQuestion className="w-[22px] h-[22px] text-white" strokeWidth={2} />
      </div>
    </motion.button>
  );
}
