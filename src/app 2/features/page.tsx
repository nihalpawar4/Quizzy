'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  MessageCircle,
  Trophy,
  User,
  Sparkles,
  Sun,
  Bell,
  BarChart3,
  Upload,
  Shield,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Subject Tests',
    desc: 'Interactive tests in Maths, Science, English, Hindi, Social Studies, Computer Science and General Knowledge for Classes 5–10.',
    category: 'Students',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Chat',
    desc: 'WhatsApp-like messaging between students and teachers with read receipts, typing indicators, emojis, and customisable backgrounds.',
    category: 'Communication',
  },
  {
    icon: Trophy,
    title: 'Progress Tracking',
    desc: 'Detailed dashboard showing scores, percentages, test history, and performance trends over time.',
    category: 'Students',
  },
  {
    icon: BarChart3,
    title: 'Teacher Analytics',
    desc: 'Class-level and individual performance analytics. View completion rates, averages, and export data as CSV.',
    category: 'Teachers',
  },
  {
    icon: Upload,
    title: 'Bulk Upload',
    desc: 'Teachers can upload question banks via CSV or JSON — import hundreds of questions in seconds.',
    category: 'Teachers',
  },
  {
    icon: User,
    title: 'Profile Pictures',
    desc: 'Upload your photo and see it everywhere — in chat, dashboard, test results, and across the app.',
    category: 'Personalisation',
  },
  {
    icon: Shield,
    title: 'Verified Teachers',
    desc: 'Teacher sign-ups require admin codes or authorised emails, keeping the platform safe and credible.',
    category: 'Security',
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Real-time push notifications for new messages, test results, and important updates with badge counts.',
    category: 'Communication',
  },
  {
    icon: Sparkles,
    title: 'Dark & Light Themes',
    desc: 'Switch between dark, light, or system theme anytime. Your preference is saved automatically.',
    category: 'Personalisation',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    desc: 'Scores are calculated and displayed immediately after test submission. No waiting period.',
    category: 'Students',
  },
  {
    icon: GraduationCap,
    title: 'Class-Based Filtering',
    desc: 'Tests are automatically filtered by your class level so you always see relevant content.',
    category: 'Students',
  },
  {
    icon: Sun,
    title: 'PWA Support',
    desc: 'Install Quizy as an app on your phone or desktop for a native-like experience with offline support.',
    category: 'Platform',
  },
];

export default function FeaturesPage() {
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
            {'// ALL_FEATURES'}
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            <span className="typo-serif-display">Everything you need to</span>{' '}
            <span className="typo-display text-[#1650EB]">excel</span>
          </h1>
          <p className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto">
            Quizy is packed with features for students, teachers, and schools — all completely free.
          </p>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#1650EB]/40 hover:shadow-lg hover:shadow-[#1650EB]/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-xl flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" />
                </div>
                <span className="typo-accent text-[10px] text-[#6D6D6D] dark:text-gray-500">{f.category}</span>
              </div>
              <h3 className="typo-subheading text-lg text-[#020218] dark:text-white mb-2">{f.title}</h3>
              <p className="typo-body text-sm text-[#6D6D6D] dark:text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
