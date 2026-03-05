'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Bot,
  Loader2,
  CheckCircle,
  Sun,
  Moon,
  Clock,
  Zap,
  Bell
} from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';


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
    return { response: "📚 About Quizy:\n\nQuizy is a modern academic testing platform designed for students of Classes 5-10 and their teachers.\n\n• Students can take interactive tests and track their progress\n• Teachers can create tests and analyze student performance\n• Beautiful, distraction-free interface\n• Completely free to use!\n\nBuilt with ❤️ by Nihal Pawar", showContact: false };
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
const ENROLLMENT_DEADLINE = new Date('2026-03-31T23:59:59+05:30').getTime();

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
                🎓 2027 BATCH ENROLLMENT CLOSING SOON!
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

// ==================== ENROLLMENT POPUP ====================
function EnrollmentPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Don't show popup if enrollment deadline has passed
    if (Date.now() >= ENROLLMENT_DEADLINE) return;

    // Show popup for first 3 page visits (tracked in localStorage)
    const visitCountStr = localStorage.getItem('enrollment_popup_visits') || '0';
    const visitCount = parseInt(visitCountStr, 10);
    if (visitCount < 3) {
      localStorage.setItem('enrollment_popup_visits', String(visitCount + 1));
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
            className="fixed inset-0 bg-black/50 z-[70]"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-gray-900">
              {/* Top accent bar */}
              <div className="h-2 bg-[#1650EB]" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10"
                aria-label="Close popup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-7 pt-6">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1650EB]/10 border border-[#1650EB]/20 rounded-full mb-5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1650EB]" />
                  <span className="text-xs font-bold text-[#1650EB] tracking-wide uppercase">
                    New Enrollments Open
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 leading-tight">
                  2027 Batch
                  <span className="block text-[#1650EB]">Now Enrolling!</span>
                </h2>

                {/* Subtitle */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-5 leading-relaxed">
                  Enroll now in <strong className="text-gray-900 dark:text-white">Nihal&apos;s Home Tutoring Classes</strong> for Classes 5 to 10. Limited seats for the upcoming academic year!
                </p>

                {/* Class chips */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {[5, 6, 7, 8, 9, 10].map((cls) => (
                    <div
                      key={cls}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full"
                    >
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Class {cls}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                    { icon: BookOpen, text: 'All Subjects' },
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
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#1650EB] hover:bg-[#1243c7] text-white rounded-xl font-bold text-base shadow-md shadow-[#1650EB]/20 transition-all duration-200 hover:shadow-lg"
                >
                  <GraduationCap className="w-5 h-5" />
                  Enroll Now — It&apos;s Free!
                  <ArrowRight className="w-5 h-5" />
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
                    Enrollment closes March 31, 2026 • Don&apos;t miss out!
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
        <span className="font-medium text-[#020218] dark:text-white">{question}</span>
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
            <div className="p-5 pt-0 text-[#6D6D6D] dark:text-gray-400 bg-white dark:bg-gray-900">
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
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hi! 👋 I'm Quizy Bot, your smart assistant. Ask me anything about Quizy - tests, registration, subjects, features, and more! Type 'contact' if you need to reach our support team.", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');
    setIsTyping(true);

    // Get smart response
    const { response, showContact } = getSmartResponse(userMessage);

    // Simulate typing delay for more natural feel
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { text: response, isBot: true }]);

      if (showContact) {
        setTimeout(() => setShowContactForm(true), 500);
      }
    }, 800 + Math.random() * 500);
  };

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
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#1650EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Quizy Bot</h3>
                  <p className="text-xs text-white/80">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[80%] ${msg.isBot ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isBot ? 'bg-[#1650EB]/10 dark:bg-[#1650EB]/20' : 'bg-gray-200 dark:bg-gray-800'
                      }`}>
                      {msg.isBot ? (
                        <Bot className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
                      ) : (
                        <User className="w-4 h-4 text-[#6D6D6D] dark:text-gray-400" />
                      )}
                    </div>
                    <div className={`p-3 rounded-2xl ${msg.isBot
                      ? 'bg-white dark:bg-gray-800 text-[#020218] dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
                      : 'bg-[#1650EB] text-white rounded-tr-none'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1650EB]/10 dark:bg-[#1650EB]/20">
                      <Bot className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-gray-800 rounded-tl-none border border-gray-200 dark:border-gray-700">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#6D6D6D] dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[#6D6D6D] dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[#6D6D6D] dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] outline-none"
                />
                <button
                  onClick={handleSend}
                  className="p-2 bg-[#1650EB] text-white rounded-lg hover:bg-[#1243c7] transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
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
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('[Quizy] User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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

  // If user is logged in, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1650EB] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
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
            <span className="text-xl font-bold text-[#020218] dark:text-white">Quizy</span>
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
              className="hidden sm:block text-sm font-medium text-[#6D6D6D] dark:text-gray-400 hover:text-[#020218] dark:hover:text-white transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-[#6D6D6D] dark:text-gray-400 hover:text-[#020218] dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-[#1650EB] text-white rounded-lg text-sm font-medium hover:bg-[#1243c7] transition-colors shadow-sm"
            >
              Get Started
            </Link>
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
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#1650EB]/25 dark:bg-[#6095DB]/15 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 50, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#6095DB]/20 dark:bg-[#1650EB]/10 rounded-full blur-3xl"
          />

          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
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
          {/* Nihal's Home Tutoring Badge - Simple */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 border border-[#1650EB]/30 dark:border-[#1650EB]/50 rounded-full mb-4"
          >
            <span className="text-sm font-bold text-[#1650EB] dark:text-[#6095DB]">
              Nihal&apos;s Home Tutoring Classes
            </span>
          </motion.div>

          {/* Class Badge */}
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
              <Sparkles className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB]" />
            </motion.div>
            <span className="text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">
              For Classes 5-10 • All Subjects
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#020218] dark:text-white mb-6"
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              Master Your
            </motion.span>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
              className="block mt-2"
            >
              <span className="text-[#1650EB]">
                Exams
              </span>
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg sm:text-xl text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Practice smarter, not harder. Take interactive tests, track your progress,
            and achieve academic excellence with our distraction-free platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth/register?role=student"
              className="group relative flex items-center gap-2 px-8 py-4 bg-[#1650EB] text-white rounded-xl font-semibold text-lg shadow-lg shadow-[#1650EB]/25 hover:shadow-xl hover:shadow-[#1650EB]/35 hover:bg-[#1243c7] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative z-10 flex items-center gap-2">
                Start Learning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/auth/login?role=teacher"
              className="group flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-[#020218] dark:text-gray-300 rounded-xl font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] hover:bg-[#1650EB]/5 dark:hover:bg-gray-700 transition-all"
            >
              Teacher Portal
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 flex items-center justify-center gap-2 text-sm text-[#6D6D6D] dark:text-gray-400"
          >
            <Heart className="w-4 h-4 text-[#1650EB]" />
            <span>Trusted by students across India</span>
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
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
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
              <h3 className="text-lg font-semibold text-[#020218] dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[#6D6D6D] dark:text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#020218] dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[#6D6D6D] dark:text-gray-400">
              Got questions? We&apos;ve got answers!
            </p>
          </motion.div>

          <div className="space-y-4">
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

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#1650EB] rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[#020218] dark:text-white">Quizy</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8">
              <Link href="#" className="text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#faq" className="text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors">
                FAQ
              </Link>
            </div>

            {/* Made with love */}
            <div className="flex items-center gap-2 text-[#6D6D6D] dark:text-gray-400">
              <span className="text-sm">Made with</span>
              <Heart className="w-4 h-4 text-[#1650EB] fill-[#1650EB]" />
              <span className="text-sm">by</span>
              <span className="text-sm font-semibold text-[#020218] dark:text-white">Nihal Pawar</span>
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © 2025 Quizy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
