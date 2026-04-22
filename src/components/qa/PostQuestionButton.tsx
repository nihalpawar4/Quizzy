'use client';

import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export default function PostQuestionButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-24 right-6 z-50 w-13 h-13 rounded-full flex items-center justify-center
        bg-gradient-to-br from-[#1650EB] to-[#6095DB]
        shadow-lg border border-white/20 backdrop-blur-sm
        transition-shadow duration-300"
      aria-label="Post a question"
      id="post-question-btn"
      style={{
        width: 52, height: 52,
        boxShadow: '0 0 24px rgba(22,80,235,0.35), 0 4px 16px rgba(22,80,235,0.25)',
      }}
    >
      <HelpCircle className="w-6 h-6 text-white" />
    </motion.button>
  );
}
