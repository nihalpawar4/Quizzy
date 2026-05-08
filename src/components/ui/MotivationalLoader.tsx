'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Motivational messages shown during loading states.
 * Rotates randomly to keep the experience fresh and engaging.
 */
const MOTIVATIONAL_MESSAGES = [
  'Preparing something awesome for you...',
  'Learning never stops 🚀',
  'One question closer to mastery.',
  'Great things take a moment.',
  'Building your experience...',
  'Small steps. Big success.',
  'Your future is loading...',
  'Every doubt solved makes you stronger.',
  'Stay curious. Keep growing.',
  'Progress begins with one question.',
  'Smart work beats excuses.',
  'One lesson closer to your dream.',
  'Consistency creates champions.',
  'Focus today. Shine tomorrow.',
  'Keep learning. Keep leveling up.',
  'Knowledge is your superpower 💡',
  'Almost there...',
  'You\'re doing great! 🌟',
  'Every expert was once a beginner.',
  'Dream big. Start small. Act now.',
];

function getRandomMessage(exclude?: string): string {
  const filtered = exclude
    ? MOTIVATIONAL_MESSAGES.filter((m) => m !== exclude)
    : MOTIVATIONAL_MESSAGES;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

interface MotivationalLoaderProps {
  /** Size of the spinner icon — 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Optional static subtitle (shown below the motivational text) */
  subtitle?: string;
  /** Background class override */
  className?: string;
}

const sizeMap = {
  sm: { icon: 'w-6 h-6', text: 'text-xs', gap: 'gap-2' },
  md: { icon: 'w-8 h-8', text: 'text-sm', gap: 'gap-3' },
  lg: { icon: 'w-10 h-10', text: 'text-sm', gap: 'gap-4' },
};

export default function MotivationalLoader({
  size = 'lg',
  subtitle,
  className = '',
}: MotivationalLoaderProps) {
  const [message, setMessage] = useState(() => getRandomMessage());

  useEffect(() => {
    const interval = setInterval(() => {
      setMessage((prev) => getRandomMessage(prev));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const s = sizeMap[size];

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.gap} ${className}`}
    >
      {/* Spinner with subtle gradient ring */}
      <div className="relative">
        <Loader2
          className={`${s.icon} text-[#1650EB] animate-spin`}
        />
        {/* Soft ambient glow */}
        <div className="absolute inset-0 rounded-full bg-[#1650EB]/10 blur-lg scale-150 pointer-events-none" />
      </div>

      {/* Rotating motivational message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`${s.text} text-gray-500 dark:text-gray-400 text-center max-w-xs font-medium`}
          style={{ fontFamily: 'var(--font-display, system-ui)', letterSpacing: '-0.01em' }}
        >
          {message}
        </motion.p>
      </AnimatePresence>

      {/* Optional static subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          {subtitle}
        </p>
      )}
    </div>
  );
}
