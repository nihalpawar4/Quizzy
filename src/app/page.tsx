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

// Smart Chatbot responses - comprehensive Q&A
const getSmartResponse = (message: string): { response: string; showContact: boolean } => {
  const msg = message.toLowerCase().trim();

  // Explicit contact/help request - show contact form
  if (msg === 'contact' || msg === 'contact us' || msg === 'contact support' || msg === 'help' || msg === 'i need help' || msg === 'support') {
    return { response: "I'd be happy to connect you with our support team! Please fill out the contact form below.", showContact: true };
  }

  // Greetings
  if (msg.match(/^(hi|hello|hey|hola|good morning|good afternoon|good evening|howdy)$/i) || msg.includes('how are you')) {
    const greetings = [
      "Hello! 👋 Welcome to Quizy! I'm here to help you with anything. Ask me about tests, registration, features, or anything else!",
      "Hey there! 👋 Great to see you! How can I assist you today?",
      "Hi! 😊 I'm your Quizy assistant. Feel free to ask me anything!"
    ];
    return { response: greetings[Math.floor(Math.random() * greetings.length)], showContact: false };
  }

  // Registration related
  if (msg.includes('register') || msg.includes('sign up') || msg.includes('create account') || msg.includes('signup')) {
    return { response: "📝 To register on Quizy:\n\n1. Click 'Get Started' on the homepage\n2. Choose your role (Student or Teacher)\n3. Fill in your details\n4. Students: Select your class (5-10)\n5. Teachers: Enter your admin code or use an authorized email\n\nIt's completely free! 🎉", showContact: false };
  }

  // Login related
  if (msg.includes('login') || msg.includes('sign in') || msg.includes('log in') || msg.includes('signin')) {
    return { response: "🔐 To log in:\n\n1. Click 'Sign In' on the homepage\n2. Enter your email and password\n3. Click 'Sign In'\n\nYou'll be redirected to your dashboard automatically based on your role (student or teacher).", showContact: false };
  }

  // Password related
  if (msg.includes('password') || msg.includes('forgot') || msg.includes('reset')) {
    return { response: "🔑 To reset your password:\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your inbox for the reset link\n5. Click the link and create a new password\n\nYou can also change your password anytime from Profile Settings.", showContact: false };
  }

  // Test related
  if (msg.includes('test') || msg.includes('exam') || msg.includes('quiz') || msg.includes('take a test')) {
    return { response: "📚 About Tests on Quizy:\n\n• Tests are organized by class (5-10) and subject\n• Each test shows the number of questions and time limit\n• Click 'Start Test' to begin\n• Answer questions one by one\n• Your score is calculated instantly after completion\n• Results are saved automatically to your dashboard\n\nCurrently we support multiple subjects including Math, Science, English, and more!", showContact: false };
  }

  // Score/Results related
  if (msg.includes('score') || msg.includes('result') || msg.includes('marks') || msg.includes('grade')) {
    return { response: "📊 Viewing Your Scores:\n\n• After completing a test, you'll see your score immediately\n• All scores are saved in your dashboard under 'Recent Results'\n• You can see: Score, Percentage, Test name, Subject, and Date\n• Teachers can view all student results in their Analytics tab\n\nYour progress is tracked automatically!", showContact: false };
  }

  // Subject related
  if (msg.includes('subject') || msg.includes('maths') || msg.includes('science') || msg.includes('english') || msg.includes('hindi')) {
    return { response: "📖 Available Subjects:\n\n• Mathematics\n• Science\n• English\n• Hindi\n• Social Studies\n• Computer Science\n• General Knowledge\n\nMore subjects are being added regularly! Tests are available for all classes from 5 to 10.", showContact: false };
  }

  // Class related
  if (msg.includes('class') || msg.includes('grade') || msg.includes('standard')) {
    return { response: "🎓 Quizy supports students from Class 5 to Class 10.\n\nWhen you register, you select your class. You can change your class anytime from Profile Settings. Tests are filtered automatically based on your class level!", showContact: false };
  }

  // Teacher/Admin related
  if (msg.includes('teacher') || msg.includes('admin') || msg.includes('educator')) {
    return { response: "👩‍🏫 For Teachers:\n\n• Register with an authorized email or admin code\n• Create and manage tests\n• Upload questions via CSV or JSON\n• View analytics and student performance\n• Export results as CSV\n• Track all student submissions\n\nThe Teacher Dashboard has all the tools you need!", showContact: false };
  }

  // Features related
  if (msg.includes('feature') || msg.includes('what can') || msg.includes('what does') || msg.includes('capability')) {
    return { response: "✨ Quizy Features:\n\n📝 For Students:\n• Take interactive tests\n• Instant score calculation\n• Progress tracking\n• Dark/Light theme\n• Class-based test filtering\n\n👨‍🏫 For Teachers:\n• Create tests easily\n• Bulk question upload\n• Analytics dashboard\n• CSV export\n• Student performance tracking", showContact: false };
  }

  // Pricing/Free related
  if (msg.includes('free') || msg.includes('price') || msg.includes('cost') || msg.includes('pay') || msg.includes('money')) {
    return { response: "🎉 Great news! Quizy is completely FREE!\n\nAll features are available at no cost for both students and teachers. Our mission is to make quality education accessible to everyone.", showContact: false };
  }

  // Profile/Settings related
  if (msg.includes('profile') || msg.includes('setting') || msg.includes('account')) {
    return { response: "⚙️ Profile Settings:\n\nYou can manage your account from Profile Settings:\n• Change theme (Light/Dark/System)\n• Update your class\n• Change password\n• Manage notifications\n• Export your data\n• Delete account if needed\n\nClick on your profile icon in the dashboard to access settings!", showContact: false };
  }

  // Theme related
  if (msg.includes('theme') || msg.includes('dark mode') || msg.includes('light mode') || msg.includes('color')) {
    return { response: "🎨 Theme Options:\n\n• Light Mode ☀️\n• Dark Mode 🌙\n• System (follows your device preference)\n\nChange your theme anytime from Profile Settings. Your preference is saved automatically!", showContact: false };
  }

  // How it works
  if (msg.includes('how') && (msg.includes('work') || msg.includes('use'))) {
    return { response: "🚀 How Quizy Works:\n\n1. Register as a Student or Teacher\n2. Students: Take tests, view scores, track progress\n3. Teachers: Create tests, upload questions, view analytics\n4. Everything is saved automatically\n5. Access from any device!\n\nIt's that simple! 😊", showContact: false };
  }

  // Thanks
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thx') || msg.includes('appreciate')) {
    return { response: "You're welcome! 😊 Happy to help! Is there anything else you'd like to know about Quizy?", showContact: false };
  }

  // Goodbye
  if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('later')) {
    return { response: "Goodbye! 👋 Best of luck with your studies! Come back anytime you need help. 🎓", showContact: false };
  }

  // Yes/No responses
  if (msg === 'yes' || msg === 'yeah' || msg === 'yep' || msg === 'sure') {
    return { response: "Great! What would you like to know? Feel free to ask me anything about Quizy! 😊", showContact: false };
  }

  if (msg === 'no' || msg === 'nope' || msg === 'nah') {
    return { response: "Okay! If you have any questions later, I'm here to help. Happy learning! 📚", showContact: false };
  }

  // About Quizy
  if (msg.includes('what is quizy') || msg.includes('about quizy') || msg.includes('tell me about')) {
    return { response: "📚 About Quizy:\n\nQuizy is a modern academic testing platform by Experts Academy of Excellence, designed for students of Classes 5-10 (CBSE/ICSE) and their teachers.\n\n• Students can take interactive tests and track their progress\n• Teachers can create tests and analyze student performance\n• Beautiful, distraction-free interface\n• Completely free to use!\n\nBuilt with ❤️ by Nihal Pawar", showContact: false };
  }

  // Who made this
  if (msg.includes('who made') || msg.includes('who created') || msg.includes('developer') || msg.includes('built by')) {
    return { response: "Quizy was made with ❤️ by Nihal Pawar! 👨‍💻", showContact: false };
  }

  // Good/Great responses
  if (msg.includes('good') || msg.includes('great') || msg.includes('awesome') || msg.includes('nice') || msg.includes('cool')) {
    return { response: "Glad you think so! 😊 Is there anything specific you'd like to know about Quizy?", showContact: false };
  }

  // OK responses
  if (msg === 'ok' || msg === 'okay' || msg === 'alright' || msg === 'got it' || msg === 'understood') {
    return { response: "Perfect! Let me know if you have any other questions. I'm here to help! 💪", showContact: false };
  }

  // Default smart response - try to give helpful answer
  return {
    response: `I understand you're asking about "${message}". 🤔\n\nHere's what I can help you with:\n\n• Registration & Login\n• Taking Tests\n• Viewing Scores\n• Available Subjects\n• Teacher Features\n• Profile Settings\n• Theme Preferences\n\nTry asking about any of these topics, or type "contact" if you'd like to reach our support team!`,
    showContact: false
  };
};

// Shared deadline — everything auto-expires after this
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


function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean; isTyping?: boolean }[]>([
    { text: "Hi! 👋 I'm Quizy Bot, your smart assistant. Tap a topic below or type anything to get started!", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Quick reply suggestions
  const quickReplies = [
    { label: '📚 What is Quizy?', value: 'what is quizy' },
    { label: '📝 How to register?', value: 'how to register' },
    { label: '📖 Subjects available', value: 'subjects' },
    { label: '💬 Contact support', value: 'contact' },
    { label: '🎓 Classes offered', value: 'classes' },
    { label: '⭐ Features', value: 'features' },
  ];

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping, scrollToBottom]);

  // Typing animation — reveals text character by character
  const typeMessage = useCallback((fullText: string, showContact: boolean) => {
    setIsBotTyping(true);

    // Add placeholder message that will be typed out
    setMessages(prev => [...prev, { text: '', isBot: true, isTyping: true }]);

    let charIndex = 0;
    const speed = Math.max(8, Math.min(18, 1200 / fullText.length)); // Adaptive speed

    const typeInterval = setInterval(() => {
      charIndex++;
      setMessages(prev => {
        const updated = [...prev];
        const lastBot = updated.length - 1;
        if (updated[lastBot] && updated[lastBot].isBot) {
          updated[lastBot] = { text: fullText.slice(0, charIndex), isBot: true, isTyping: charIndex < fullText.length };
        }
        return updated;
      });

      if (charIndex >= fullText.length) {
        clearInterval(typeInterval);
        setIsBotTyping(false);
        if (showContact) {
          setTimeout(() => setShowContactForm(true), 400);
        }
      }
    }, speed);
  }, []);

  const handleSend = useCallback((text?: string) => {
    const userMessage = (text || input).trim();
    if (!userMessage || isBotTyping) return;

    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    if (!text) setInput('');

    // Short delay then start typing
    setTimeout(() => {
      const { response, showContact } = getSmartResponse(userMessage);
      typeMessage(response, showContact);
    }, 300);
  }, [input, isBotTyping, typeMessage]);

  const handleQuickReply = useCallback((value: string) => {
    handleSend(value);
  }, [handleSend]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'support_queries'), {
        ...contactForm,
        createdAt: Timestamp.now(),
        status: 'pending'
      });
      setSubmitted(true);
      setMessages(prev => [...prev, { text: "✅ Your message has been sent! Our team will get back to you soon.", isBot: true }]);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => {
        setShowContactForm(false);
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting query:', error);
      setMessages(prev => [...prev, { text: "Sorry, there was an error. Please try again.", isBot: true }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#1650EB] rounded-full shadow-lg shadow-[#1650EB]/25 flex items-center justify-center z-50 hover:shadow-xl hover:bg-[#1243c7] transition-all"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-50 overflow-hidden
              bottom-24 right-4
              w-[calc(100vw-2rem)] max-w-96 max-h-[70vh] sm:max-h-[600px]
              rounded-2xl shadow-2xl
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
              flex flex-col"
          >
            {/* Header */}
            <div className="relative overflow-hidden flex-shrink-0">
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1650EB 60%, #1243c7 100%)' }}
              />
              <div className="relative z-10 flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/25">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border-2 border-[#1650EB]" />
                    </span>
                  </div>
                  <h3 className="typo-brand text-xl text-white">Quizy Bot</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/15 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white/80 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/80 dark:bg-gray-900 overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex items-end gap-1.5 max-w-[85%] ${msg.isBot ? '' : 'flex-row-reverse'}`}>
                    {msg.isBot && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 mb-0.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#1650EB] dark:text-[#6095DB]" />
                      </div>
                    )}
                    <div className={`px-3.5 py-2.5 ${msg.isBot
                      ? 'bg-white dark:bg-gray-800 text-[#020218] dark:text-gray-200 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700 shadow-sm'
                      : 'bg-[#1650EB] text-white rounded-2xl rounded-br-md shadow-sm shadow-[#1650EB]/20'
                      }`}>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}{msg.isTyping && <span className="inline-block w-0.5 h-3.5 bg-[#1650EB] dark:bg-[#6095DB] ml-0.5 animate-pulse" />}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator (3 dots before text starts) */}
              {isBotTyping && messages.length > 0 && messages[messages.length - 1]?.text === '' && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1650EB]/10 dark:bg-[#1650EB]/20 mb-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1650EB] dark:text-[#6095DB]" />
                    </div>
                    <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Form */}
              {showContactForm && !submitted && (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleContactSubmit}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm font-medium text-[#020218] dark:text-gray-300">Contact Support</p>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none"
                  />
                  <textarea
                    placeholder="Your Message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-[#1650EB] text-white rounded-lg text-sm font-medium hover:bg-[#1243c7] disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </motion.form>
              )}

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">Message sent successfully!</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && !isBotTyping && (
              <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.value}
                      onClick={() => handleQuickReply(qr.value)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#1650EB]/8 dark:bg-[#1650EB]/15 text-[#1650EB] dark:text-[#6095DB] border border-[#1650EB]/20 dark:border-[#1650EB]/30 rounded-full hover:bg-[#1650EB]/15 dark:hover:bg-[#1650EB]/25 transition-colors active:scale-95"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-bottom">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  disabled={isBotTyping}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent outline-none disabled:opacity-50 transition-all"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isBotTyping}
                  className="p-2.5 bg-[#1650EB] text-white rounded-full hover:bg-[#1243c7] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
