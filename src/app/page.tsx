'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Trophy,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Heart,
  MessageCircle,
  Send,
  X,
  User,
  Loader2,
  CheckCircle,
  Sun,
  Moon,
  Clock,
  Zap,
  Bell,
  Star,
  Shield,
  Award
} from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PostQuestionButton, PostQuestionModal, QuestionList } from '@/components/qa';


// FAQ Data - Updated with all features
const faqData = [
  {
    question: "What is Quizy?",
    answer: "Quizy is a modern academic testing platform designed for students of Classes 5-10. It provides interactive tests, instant feedback, real-time chat with teachers, and progress tracking."
  },
  {
    question: "How do I start taking tests?",
    answer: "Simply create a free student account, select your class level, and you'll see all available tests for your grade. Click 'Start Test' on any test to begin practicing! Your scores are saved automatically."
  },
  {
    question: "Is Quizy free to use?",
    answer: "Yes! Quizy is completely free for students and teachers. All features including tests, chat, profile pictures, and analytics are available at no cost."
  },
  {
    question: "What are the chat features?",
    answer: "Quizy includes WhatsApp-like real-time messaging! Students can chat with teachers, share emojis, see online status, get typing indicators, and message read receipts (single/double ticks). You can also customize chat backgrounds!"
  },
  {
    question: "Can I add a profile picture?",
    answer: "Yes! Go to Profile Settings and upload your photo. Your picture will appear in the chat, dashboard, and everywhere in the app. It updates in real-time for everyone!"
  },

  {
    question: "Can I retake tests?",
    answer: "Currently, each test can be taken once to maintain result integrity. However, new tests are added regularly by teachers, giving you plenty of opportunities to practice."
  },
  {
    question: "How are teachers verified?",
    answer: "Teachers need to register with an authorized email or admin code to access the Teacher Portal. This ensures only verified educators can create and manage tests."
  },
  {
    question: "What subjects are available?",
    answer: "We offer tests in Mathematics, Science, English, Hindi, Social Studies, Computer Science, and General Knowledge. Teachers can create tests for any subject!"
  },
  {
    question: "Can teachers track student progress?",
    answer: "Absolutely! Teachers have access to detailed analytics showing student performance, test completion rates, class rankings, and can export data as CSV for analysis."
  },
  {
    question: "Do I get notifications?",
    answer: "Yes! You'll receive real-time notifications for new messages, test results, and important updates. The app badge shows unread counts so you never miss anything."
  },
  {
    question: "Is there dark mode?",
    answer: "Yes! Quizy supports Light, Dark, and System themes. Change your preference anytime from Profile Settings - your eyes will thank you during late-night study sessions!"
  }
];


const ENROLLMENT_DEADLINE = new Date('2026-06-10T23:59:59+05:30').getTime();

// ==================== ENROLLMENT COUNTDOWN TIMER ====================
function CountdownTimer({ onClose, onHeightChange }: { onClose: () => void; onHeightChange: (h: number) => void }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Measure actual height and report to parent
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height);
      }
    });
    observer.observe(el);
    // Initial measurement
    onHeightChange(el.offsetHeight);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const update = () => {
      const distance = ENROLLMENT_DEADLINE - Date.now();
      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onClose(); // Auto-close when deadline passes
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={barRef} className="fixed top-0 left-0 right-0 z-[60]">
      <div className="relative bg-gradient-to-r from-[#0a1628] via-[#1650EB] to-[#0a1628] py-2.5 px-4 overflow-hidden">
        {/* CSS-based shimmer */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ animation: 'countdown-shimmer 3s linear infinite' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-between">
          {/* Left spacer for centering */}
          <div className="w-8 flex-shrink-0" />

          {/* Center content */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" style={{ animation: 'wiggle 2s ease-in-out infinite' }} />
              <span className="text-[11px] sm:text-sm font-bold text-white tracking-wide whitespace-nowrap">
                🎓 ADMISSIONS CLOSING SOON — ENROLL NOW!
              </span>
            </div>

            {/* Horizontal countdown: number + label side by side */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[
                { value: timeLeft.days, label: 'DAYS' },
                { value: timeLeft.hours, label: 'HRS' },
                { value: timeLeft.minutes, label: 'MIN' },
                { value: timeLeft.seconds, label: 'SEC' },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 bg-white/15 border border-white/20 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5">
                    <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-blue-200 tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <span className="text-white/70 font-bold text-sm" style={{ animation: 'blink 1s ease-in-out infinite' }}>:</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* X button — always visible with its own space */}
          <button
            onClick={onClose}
            className="w-8 flex-shrink-0 flex items-center justify-center p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close countdown"
          >
            <X className="w-4 h-4 text-white/70 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMISSION OPEN POPUP ====================
function EnrollmentPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Don't show popup if enrollment deadline has passed
    if (Date.now() >= ENROLLMENT_DEADLINE) return;

    // Show popup for first 3 page visits (tracked in localStorage)
    const visitCountStr = localStorage.getItem('admission_popup_visits_v2') || '0';
    const visitCount = parseInt(visitCountStr, 10);
    if (visitCount < 3) {
      localStorage.setItem('admission_popup_visits_v2', String(visitCount + 1));
      const showTimer = setTimeout(() => setIsOpen(true), 2500);
      return () => clearTimeout(showTimer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  // Auto-dismiss after 1 minute
  useEffect(() => {
    if (isOpen) {
      const autoDismiss = setTimeout(() => handleClose(), 60000);
      return () => clearTimeout(autoDismiss);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              {/* Animated gradient header */}
              <div
                className="relative px-6 pt-7 pb-5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1650EB 50%, #0a1628 100%)' }}
              >
                {/* Shimmer overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  style={{ animation: 'countdown-shimmer 3s linear infinite' }}
                />
                {/* Close button on header */}
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-full transition-colors z-10"
                  aria-label="Close popup"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Pulsing admission badge */}
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 border border-white/25 rounded-full mb-4"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                  </span>
                  <span className="text-[11px] font-bold text-white tracking-widest uppercase">
                    Admissions Open
                  </span>
                </motion.div>

                {/* Title */}
                <h2 className="typo-display text-2xl sm:text-3xl text-white mb-1.5 leading-tight">
                  Experts Academy
                  <span className="block text-blue-200">of Excellence</span>
                </h2>
                <p className="text-blue-200/80 text-sm font-medium">
                  2026–27 Academic Session • Limited Seats
                </p>
              </div>

              <div className="p-6 pt-5">
                {/* Highlight chips row */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { icon: BookOpen, label: 'All Subjects' },
                    { icon: Shield, label: 'CBSE / ICSE' },
                    { icon: Award, label: 'Expert Faculty' },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1650EB]/8 dark:bg-[#1650EB]/15 border border-[#1650EB]/15 dark:border-[#1650EB]/25 rounded-full"
                    >
                      <chip.icon className="w-3.5 h-3.5 text-[#1650EB] dark:text-[#6095DB]" />
                      <span className="text-xs font-semibold text-[#1650EB] dark:text-[#6095DB]">{chip.label}</span>
                    </div>
                  ))}
                </div>

                {/* Class range */}
                <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <GraduationCap className="w-4 h-4 text-[#1650EB] flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Class 5 to 10 • CBSE & ICSE Boards</span>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                    { icon: Star, text: 'Personal Attention' },
                    { icon: GraduationCap, text: 'Expert Tutoring' },
                    { icon: Zap, text: 'Interactive Tests' },
                    { icon: Trophy, text: 'Track Progress' },
                  ].map((feat) => (
                    <div
                      key={feat.text}
                      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
                    >
                      <feat.icon className="w-4 h-4 text-[#1650EB] flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{feat.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <a
                  href="/auth/register?role=student"
                  className="group flex items-center justify-center gap-2 w-full py-3.5 bg-[#1650EB] hover:bg-[#1243c7] text-white rounded-xl font-bold text-base shadow-lg shadow-[#1650EB]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <GraduationCap className="w-5 h-5" />
                  Enroll Now — It&apos;s Free!
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>

                <button
                  onClick={handleClose}
                  className="w-full mt-2.5 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Maybe Later
                </button>

                {/* Timer reminder */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-400">
                    Admissions close June 10, 2026 • Don&apos;t miss out!
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden hover:border-[#1650EB]/30 transition-colors"
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-gray-900 hover:bg-[#1650EB]/5 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="typo-subheading text-[#020218] dark:text-white">{question}</span>
        <ChevronDown className={`w-5 h-5 text-[#1650EB] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="typo-body p-5 pt-0 text-[#6D6D6D] dark:text-gray-400 bg-white dark:bg-gray-900">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



// ==================== AI CHATBOT (Powered by Gemini + RAG) ====================
import ChatWidget from "@/ai-chatbot/components/ChatWidget";


// ==================== TYPING ANIMATION ====================
const typingPhrases = [
  'Best Tutors Available',
  'Expert Guided Practice',
  'Smart Learning Path',
  'Top Results Guaranteed',
  'Personalized Study Plans',
  'Interactive Mock Tests',
];

function TypingAnimation() {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const phrase = typingPhrases[currentPhrase];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      // Typing
      if (displayText.length < phrase.length) {
        timeout = setTimeout(() => {
          setDisplayText(phrase.slice(0, displayText.length + 1));
        }, 80 + Math.random() * 40);
      } else {
        // Pause at full phrase
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 40);
      } else {
        // Move to next phrase (intentional state machine transition)
        setIsDeleting(false); // eslint-disable-line react-hooks/set-state-in-effect
        setCurrentPhrase((prev) => (prev + 1) % typingPhrases.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhrase]);

  return (
    <span className="typo-arsenal text-sm sm:text-base text-[#1650EB] dark:text-[#6095DB]">
      {displayText}
      <span
        className="inline-block w-[2px] h-[1em] bg-[#1650EB] dark:bg-[#6095DB] ml-0.5 align-middle"
        style={{ animation: 'blink 1s step-end infinite' }}
      />
    </span>
  );
}

// ==================== PEN UNDERLINE ANIMATION ====================
// Simple curved underline below "Master Your Exams" with pen nib following

function PenUnderline() {
  return (
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto h-[30px] -mt-1 mb-2">
      <motion.svg
        viewBox="0 0 400 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Curved underline path */}
        <motion.path
          d="M 10 20 Q 100 5, 200 18 Q 300 30, 390 12"
          stroke="url(#penUnderlineGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.8 }}
        />
        {/* Pen nib following the path */}
        <motion.g
          initial={{ x: 10, y: 20, opacity: 0 }}
          whileInView={{
            x: [10, 100, 200, 300, 390],
            y: [20, 10, 18, 26, 12],
            opacity: [0, 1, 1, 1, 0],
          }}
          viewport={{ once: true }}
          transition={{
            duration: 0.7,
            ease: "easeOut",
            delay: 0.8,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {/* Nib triangle */}
          <path d="M -1.5 -6 L 0 2 L 1.5 -6 Z" fill="#6095DB" transform="rotate(25)" />
          {/* Glow dot at tip */}
          <circle cx={0} cy={0} r={3} fill="#1650EB" opacity={0.5} />
        </motion.g>
        <defs>
          <linearGradient id="penUnderlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1650EB" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#1650EB" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#6095DB" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6095DB" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showCountdown, setShowCountdown] = useState(() => {
    // Don't show countdown if deadline has already passed
    return Date.now() < ENROLLMENT_DEADLINE;
  });
  const [countdownHeight, setCountdownHeight] = useState(0);

  const handleCountdownHeight = useCallback((h: number) => {
    setCountdownHeight(h);
  }, []);

  const handleCountdownClose = useCallback(() => {
    setShowCountdown(false);
    setCountdownHeight(0);
  }, []);
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading } = useAuth();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Enrollment Countdown Timer */}
      {showCountdown && <CountdownTimer onClose={handleCountdownClose} onHeightChange={handleCountdownHeight} />}

      {/* Enrollment Popup */}
      <EnrollmentPopup />

      {/* Minimal Navigation - smoothly adjusts when countdown is dismissed */}
      <nav
        className="fixed left-0 right-0 z-50 px-6 py-4 bg-white/90 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800/50 transition-[top] duration-300 ease-in-out"
        style={{ top: countdownHeight }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-[#1650EB] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="typo-brand text-2xl text-[#020218] dark:text-white">Quizy</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {/* Theme Toggle Button */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-[#6D6D6D] dark:text-gray-400 hover:bg-[#1650EB]/10 dark:hover:bg-[#1650EB]/20 hover:text-[#1650EB] dark:hover:text-[#6095DB] transition-colors"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {resolvedTheme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <Link
              href="#faq"
              className="hidden sm:block text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#020218] dark:hover:text-white transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}
            >
              FAQ
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#1650EB] text-white rounded-lg text-sm hover:bg-[#1243c7] transition-colors shadow-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#020218] dark:hover:text-white transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 bg-[#1650EB] text-white rounded-lg text-sm hover:bg-[#1243c7] transition-colors shadow-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}
                >
                  Get Started
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden transition-[padding-top] duration-300 ease-in-out"
        style={{ paddingTop: countdownHeight + 80 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6095DB]/30 dark:bg-[#1650EB]/20 rounded-full blur-3xl"
            style={{ willChange: 'transform, opacity' }}
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#1650EB]/25 dark:bg-[#6095DB]/15 rounded-full blur-3xl"
            style={{ willChange: 'transform, opacity' }}
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 50, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#6095DB]/20 dark:bg-[#1650EB]/10 rounded-full blur-3xl"
            style={{ willChange: 'transform' }}
          />

          {/* Floating Particles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-[#1650EB]/50 dark:bg-[#6095DB]/40 rounded-full"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Experts Academy Top Label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <span className="typo-arsenal text-[#1650EB] dark:text-[#6095DB]">
              {"// EXPERTS_ACADEMY_OF_EXCELLENCE"}
            </span>
          </motion.div>

          {/* Badge Line — Classes • Subjects • Boards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6095DB]/10 dark:bg-[#6095DB]/20 border border-[#6095DB]/30 dark:border-[#6095DB]/50 rounded-full mb-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
            </motion.div>
            <span className="typo-arsenal text-[#1650EB] dark:text-[#6095DB]">
              Classes 5–10 • All Subjects • CBSE/ICSE Boards
            </span>
          </motion.div>

          {/* Main Headline — 3 lines: "Master Your Exams" / "with excellent tutors" / typing */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl lg:text-7xl text-[#020218] dark:text-white mb-3 text-center"
            style={{ lineHeight: 1.1 }}
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="typo-serif-display"
            >
              Master Your{' '}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
            >
              <span className="typo-display text-[#1650EB]">
                Exams
              </span>
            </motion.span>
          </motion.h1>

          {/* Pen underline animation — draws curved line under heading */}
          <PenUnderline />

          {/* Line 2: "with excellent tutors" */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="typo-serif-display text-xl sm:text-2xl lg:text-3xl text-[#6D6D6D] dark:text-gray-400 mb-3 text-center"
          >
            with excellent tutors
          </motion.p>

          {/* Line 3: Typing animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mb-8 h-7 sm:h-8 flex items-center justify-center"
          >
            <TypingAnimation />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="typo-body text-lg sm:text-xl text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-10"
          >
            Practice smarter, not harder. Take interactive tests, track your progress,
            and achieve academic excellence with our distraction-free platform.
          </motion.p>

          {/* CTA Buttons — slightly smaller, matching typography */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/auth/register?role=student"
              className="group relative flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:shadow-xl hover:shadow-[#1650EB]/35 hover:bg-[#1243c7] transition-all duration-300 hover:-translate-y-1 overflow-hidden" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative z-10 flex items-center gap-2">
                Start Learning
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/auth/login?role=teacher"
              className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-[#020218] dark:text-gray-300 rounded-xl text-base border-2 border-gray-200 dark:border-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] hover:bg-[#1650EB]/5 dark:hover:bg-gray-700 transition-all" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}
            >
              Teacher Portal
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 flex items-center justify-center gap-2 text-[#6D6D6D] dark:text-gray-400"
          >
            <Heart className="w-4 h-4 text-[#1650EB]" />
            <span className="typo-accent text-[11px]">Trusted by students across India</span>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20"
        >
          {[
            {
              icon: BookOpen,
              title: 'Subject Tests',
              description: 'Practice tests for all major subjects tailored to your class level with instant results.',
            },
            {
              icon: MessageCircle,
              title: 'Real-Time Chat',
              description: 'WhatsApp-like messaging with teachers - emojis, read receipts, typing indicators!',
            },
            {
              icon: Trophy,
              title: 'Analytics',
              description: 'Detailed performance analytics, class rankings, and exportable reports for teachers.',
            },
            {
              icon: User,
              title: 'Profile Pictures',
              description: 'Upload your photo and see it everywhere - in chat, dashboard, and with classmates!',
            },
            {
              icon: GraduationCap,
              title: 'Track Progress',
              description: 'Monitor your growth with detailed analytics and performance reports.',
            },
            {
              icon: Sparkles,
              title: 'Dark/Light Theme',
              description: 'Study comfortably any time with beautiful dark mode support across the app.',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#1650EB]/50 dark:hover:border-[#1650EB]/50 hover:shadow-lg hover:shadow-[#1650EB]/10 dark:hover:shadow-none transition-all duration-300"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-xl flex items-center justify-center mb-4"
              >
                <feature.icon className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" />
              </motion.div>
              <h3 className="typo-subheading text-lg text-[#020218] dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Student Testimonials Section */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl text-[#020218] dark:text-white mb-4">
              <span className="typo-serif-display">What Our</span>{' '}
              <span className="typo-display text-[#1650EB]">Students Say</span>
            </h2>
            <p className="typo-body text-[#6D6D6D] dark:text-gray-400">
              Real feedback from students who love learning with Quizy
            </p>
          </motion.div>
        </div>

        {/* Infinite Scrolling Marquee */}
        <div className="relative">
          {/* Gradient masks on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-slate-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-slate-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />

          <div
            className="flex gap-6"
            style={{
              animation: 'marqueeScroll 30s linear infinite',
              width: 'max-content',
            }}
          >
            {/* Duplicate cards twice for seamless loop */}
            {[...Array(2)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-6 flex-shrink-0">
                {[
                  {
                    name: 'Sanjoli',
                    class: 'Class 9',
                    text: 'Quizy has completely changed how I prepare for exams. The instant feedback on tests helps me understand my mistakes right away!',
                    rating: 5,
                    emoji: '🎯',
                  },
                  {
                    name: 'Harsh',
                    class: 'Class 10',
                    text: 'The chat feature with teachers is amazing! I can ask doubts anytime and get quick responses. My scores have improved a lot.',
                    rating: 5,
                    emoji: '🚀',
                  },
                  {
                    name: 'Pradeep',
                    class: 'Class 8',
                    text: 'I love the dark mode and the clean interface. Studying at night is so much easier now. The analytics show me exactly where to improve.',
                    rating: 5,
                    emoji: '📊',
                  },
                  {
                    name: 'Shreyansh',
                    class: 'Class 7',
                    text: 'The timed tests feel like real exams which helps me manage time better. Plus the progress tracking keeps me motivated every day!',
                    rating: 4,
                    emoji: '⏱️',
                  },
                  {
                    name: 'Nikita',
                    class: 'Class 9',
                    text: 'Best study platform ever! The subject-wise tests and detailed report cards help me focus on weak areas. Highly recommend to all students.',
                    rating: 5,
                    emoji: '⭐',
                  },
                ].map((testimonial) => (
                  <div
                    key={`${setIndex}-${testimonial.name}`}
                    className="w-80 flex-shrink-0 p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#1650EB]/30 dark:hover:border-[#1650EB]/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="typo-subheading text-sm text-[#020218] dark:text-white">{testimonial.name}</p>
                        <p className="typo-body text-xs text-[#6D6D6D] dark:text-gray-400">{testimonial.class}</p>
                      </div>
                      <span className="text-2xl">{testimonial.emoji}</span>
                    </div>
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}
                        />
                      ))}
                    </div>
                    {/* Quote */}
                    <p className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400 leading-relaxed">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl text-[#020218] dark:text-white mb-4">
              <span className="typo-serif-display">Frequently Asked</span>{' '}
              <span className="typo-display text-[#1650EB]">Questions</span>
            </h2>
            <p className="typo-body text-[#6D6D6D] dark:text-gray-400">
              Got questions? We&apos;ve got answers!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {faqData.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Community Questions Section */}
      <QuestionList user={user} />

      {/* Footer */}
      <footer className="relative overflow-hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-4 sm:mx-8 mt-8 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #111133 50%, #0d0d2b 100%)' }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-8 sm:px-12 py-12 gap-8">
            <div className="flex-1">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl text-white mb-3" style={{ lineHeight: 1.15 }}>
                <span className="typo-serif-display">Experience superior</span>
                <br />
                <span className="typo-display">learning</span>
              </h3>
              <p className="typo-body text-gray-400 text-sm sm:text-base mb-6 max-w-md">
                Interactive tests, real-time progress tracking, and expert guidance.
              </p>
              <Link
                href="/auth/register?role=student"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#020218] rounded-full text-sm hover:bg-gray-100 transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Decorative SVG — glowing nodes & flowing lines */}
            <div className="flex-1 flex justify-center md:justify-end">
              <svg viewBox="0 0 300 200" className="w-64 sm:w-80 h-auto opacity-70" fill="none">
                {/* Flowing curved lines */}
                <motion.path
                  d="M 20 160 Q 80 100, 150 120 T 280 80"
                  stroke="#1650EB"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.4}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.path
                  d="M 40 180 Q 120 80, 200 110 T 290 50"
                  stroke="#6095DB"
                  strokeWidth={1}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.3}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.path
                  d="M 60 140 C 100 60, 180 90, 260 40"
                  stroke="#1650EB"
                  strokeWidth={1}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.25}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.5 }}
                />
                {/* Glowing connection nodes */}
                {[
                  { cx: 80, cy: 130, r: 4, delay: 0.4 },
                  { cx: 150, cy: 115, r: 5, delay: 0.6 },
                  { cx: 220, cy: 90, r: 4, delay: 0.8 },
                  { cx: 280, cy: 70, r: 3, delay: 1.0 },
                  { cx: 120, cy: 95, r: 3, delay: 0.5 },
                  { cx: 200, cy: 60, r: 3, delay: 0.7 },
                  { cx: 260, cy: 45, r: 4, delay: 0.9 },
                ].map((node, i) => (
                  <motion.circle
                    key={i}
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill="#1650EB"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: [0, 0.8, 0.5] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: node.delay, ease: "backOut" }}
                  />
                ))}
                {/* Outer glow rings on key nodes */}
                {[
                  { cx: 150, cy: 115, delay: 0.7 },
                  { cx: 260, cy: 45, delay: 1.0 },
                ].map((ring, i) => (
                  <motion.circle
                    key={`ring-${i}`}
                    cx={ring.cx}
                    cy={ring.cy}
                    r={12}
                    stroke="#1650EB"
                    strokeWidth={1}
                    fill="none"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 0.2 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: ring.delay }}
                  />
                ))}
                {/* Dotted arc decoration */}
                <motion.path
                  d="M 100 170 A 120 120 0 0 1 270 60"
                  stroke="#6095DB"
                  strokeWidth={0.8}
                  strokeDasharray="3 6"
                  fill="none"
                  opacity={0.2}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
                />
              </svg>
            </div>
          </div>
          {/* Gradient overlay on banner edges */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1650EB]/5 via-transparent to-[#6095DB]/10 pointer-events-none" />
        </motion.div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10"
          >
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#1650EB] rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="typo-brand text-2xl text-[#020218] dark:text-white">Quizy</span>
              </div>
              <p className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400 mb-4">
                Interactive learning platform for students of Classes 5-10, built with care by Nihal Pawar.
              </p>
              <div className="flex items-center gap-2 text-[#6D6D6D] dark:text-gray-400">
                <Heart className="w-3.5 h-3.5 text-[#1650EB] fill-[#1650EB]" />
                <span className="text-xs">Made with love in India</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="typo-accent text-xs text-[#020218] dark:text-gray-300 mb-4">Quick Links</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Features', href: '/features' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'Get Started', href: '/auth/register' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For */}
            <div>
              <h4 className="typo-accent text-xs text-[#020218] dark:text-gray-300 mb-4">For</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Students', href: '/for/students' },
                  { label: 'Teachers', href: '/for/teachers' },
                  { label: 'Parents', href: '/for/parents' },
                  { label: 'Schools', href: '/for/schools' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="typo-accent text-xs text-[#020218] dark:text-gray-300 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Cookie Policy', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Bottom bar */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © 2025 Quizy. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-[#6D6D6D] dark:text-gray-400">
              <span className="text-xs">Built by</span>
              <span className="text-xs text-[#020218] dark:text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.015em' }}>Nihal Pawar</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Post Question Button */}
      <PostQuestionButton onClick={() => setIsQuestionModalOpen(true)} />

      {/* Question Submission Modal */}
      <PostQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        user={user}
      />

      {/* AI Chatbot — Powered by Gemini + RAG */}
      <ChatWidget user={user} />
    </div>
  );
}
