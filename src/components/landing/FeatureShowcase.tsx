'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Zap,
  FileText,
  Trophy,
  BookOpen,
} from 'lucide-react';

// ── Tab Configuration ────────────────────────────────────────────────
const tabs = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    image: '/images/preview/dashboard.png',
    headline: 'Your Command Center',
    description: 'Get a bird\'s-eye view of tests, results, streaks, and performance — all in one beautiful dashboard.',
  },
  {
    id: 'my-reports',
    label: 'My Reports',
    icon: FileText,
    image: '/images/preview/myreports.png',
    headline: 'Detailed Analytics',
    description: 'Track your test scores, view detailed reports, and monitor your academic growth over time.',
  },
  {
    id: 'practice-mode',
    label: 'Practice Mode',
    icon: Zap,
    image: '/images/preview/study-notes.png',
    headline: 'Learn From Mistakes',
    description: 'Revisit your weak areas with smart practice sessions powered by your mistake history.',
  },
  {
    id: 'realtime-chat',
    label: 'Real-Time Chat',
    icon: Trophy,
    image: '/images/preview/realtimechat.png',
    headline: 'Connect Instantly',
    description: 'WhatsApp-like messaging with teachers — emojis, read receipts, typing indicators, and more.',
  },
  {
    id: 'study-notes',
    label: 'Study Notes',
    icon: BookOpen,
    image: '/images/preview/practice-mode.png',
    headline: 'Notes & Resources',
    description: 'Access teacher-curated study materials, notes, and resources organized by subject and chapter.',
  },
];

// ── Animated Cursor ──────────────────────────────────────────────────
function AnimatedCursor({ activeTab }: { activeTab: number }) {
  const positions = [
    { x: '22%', y: '35%' },
    { x: '45%', y: '28%' },
    { x: '65%', y: '42%' },
    { x: '35%', y: '55%' },
    { x: '55%', y: '50%' },
  ];

  const pos = positions[activeTab] || positions[0];

  return (
    <motion.div
      className="absolute z-30 pointer-events-none hidden lg:block"
      animate={{ left: pos.x, top: pos.y }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }}
    >
      {/* Cursor SVG */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill="white"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      </svg>
      {/* Click ripple */}
      <motion.div
        key={activeTab}
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute top-0 left-0 w-6 h-6 rounded-full bg-white/40"
      />
    </motion.div>
  );
}

// ── Browser Chrome ───────────────────────────────────────────────────
function BrowserChrome({ children, activeTabLabel }: { children: React.ReactNode; activeTabLabel: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/50 border border-gray-200/60 dark:border-gray-700/50 bg-white dark:bg-gray-900">
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/50">
        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        {/* Address bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-gray-700/80 rounded-lg border border-gray-200/60 dark:border-gray-600/60 max-w-sm w-full">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a5 5 0 0 0-5 5v.5A2.5 2.5 0 0 0 5.5 8h5A2.5 2.5 0 0 0 13 5.5V5a5 5 0 0 0-5-5z" opacity="0.3" />
              <path d="M4 6.5V5a4 4 0 1 1 8 0v1.5H4z" />
            </svg>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
              quizy.app/{activeTabLabel.toLowerCase().replace(/\s+/g, '-')}
            </span>
          </div>
        </div>

        {/* Right spacer */}
        <div className="w-[52px]" />
      </div>

      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preload all images on mount for instant transitions
  useEffect(() => {
    tabs.forEach(tab => {
      const img = new window.Image();
      img.src = tab.image;
    });
  }, []);

  // Auto-play tabs every 4 seconds
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveTab(prev => (prev + 1) % tabs.length);
    }, 4000);
  }, []);

  useEffect(() => {
    if (isAutoPlaying) {
      startAutoPlay();
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, startAutoPlay]);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    setIsAutoPlaying(false);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const currentTab = tabs[activeTab];

  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#1650EB]/5 dark:bg-[#1650EB]/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#1650EB]/8 dark:bg-[#1650EB]/15 border border-[#1650EB]/20 dark:border-[#1650EB]/30 rounded-full"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1650EB] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1650EB]" />
            </span>
            <span className="text-xs font-semibold text-[#1650EB] dark:text-[#6095DB] tracking-wide uppercase">
              Product Tour
            </span>
          </motion.div>
        </motion.div>

        {/* Browser Mockup + Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Glow behind browser */}
          <div className="absolute -inset-4 bg-gradient-to-b from-[#1650EB]/10 via-[#1650EB]/5 to-transparent dark:from-[#1650EB]/15 dark:via-[#1650EB]/8 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative">
            <BrowserChrome activeTabLabel={currentTab.label}>
              {/* Screenshot container */}
              <div className="relative aspect-[16/10] bg-white dark:bg-gray-950 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentTab.image}
                      alt={currentTab.label}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Animated cursor simulation */}
                <AnimatedCursor activeTab={activeTab} />

                {/* Floating highlight indicator */}
                <motion.div
                  key={`highlight-${activeTab}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
                    <currentTab.icon className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{currentTab.headline}</span>
                  </div>
                </motion.div>
              </div>
            </BrowserChrome>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {tabs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleTabClick(index)}
                  className="relative"
                  aria-label={`Go to ${tabs[index].label}`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    activeTab === index
                      ? 'bg-[#1650EB] scale-125'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`} />
                  {activeTab === index && isAutoPlaying && (
                    <motion.div
                      className="absolute -inset-1 rounded-full border-2 border-[#1650EB]/40"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hide scrollbar utility */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
