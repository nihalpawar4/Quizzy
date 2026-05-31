'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Trophy,
  MessageCircle,
  Sparkles,
  CheckCircle,
  Zap,
} from 'lucide-react';

export default function ForStudentsPage() {
  const benefits = [
    {
      icon: BookOpen,
      title: 'Subject Tests',
      desc: 'Practice interactive tests in Mathematics, Science, English, Hindi, Social Studies, Computer Science, and General Knowledge — all tailored to your class level.',
    },
    {
      icon: Trophy,
      title: 'Track Your Progress',
      desc: 'See your scores, percentages, and performance trends over time. Know exactly where you stand and which areas need improvement.',
    },
    {
      icon: MessageCircle,
      title: 'Chat with Teachers',
      desc: 'Real-time WhatsApp-like messaging with your teachers. Get doubts cleared instantly with read receipts, typing indicators, and emoji support.',
    },
    {
      icon: Sparkles,
      title: 'Beautiful Interface',
      desc: 'Study comfortably with dark and light themes, clean design, and a distraction-free environment built for focused learning.',
    },
    {
      icon: Zap,
      title: 'Instant Results',
      desc: 'Get your test scores immediately after submission. No waiting — review your answers and learn from mistakes right away.',
    },
    {
      icon: CheckCircle,
      title: 'Completely Free',
      desc: 'All features are available at no cost. No hidden fees, no premium tiers — just quality education for every student.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/90 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#1650EB] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="typo-brand text-2xl text-[#020218] dark:text-white">Quizy</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-[#6D6D6D] dark:text-gray-400 hover:text-[#1650EB] dark:hover:text-white transition-colors inline-flex items-center gap-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="typo-arsenal text-[#1650EB] dark:text-[#6095DB] mb-4 block">
            {'// FOR_STUDENTS'}
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            <span className="typo-serif-display">Ace your exams with</span>{' '}
            <span className="typo-display text-[#1650EB]">Quizy</span>
          </h1>
          <p className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Quizy by Experts Academy of Excellence helps students of Classes 5–10 practice smarter with interactive tests, instant feedback, and progress tracking across all CBSE/ICSE subjects.
          </p>
          <Link
            href="/auth/register?role=student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Start Learning Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Benefits Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#1650EB]/40 hover:shadow-lg hover:shadow-[#1650EB]/10 transition-all"
            >
              <div className="w-12 h-12 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-xl flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" />
              </div>
              <h3 className="typo-subheading text-lg text-[#020218] dark:text-white mb-2">{b.title}</h3>
              <p className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
