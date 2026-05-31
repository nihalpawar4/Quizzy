'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowRight,
  Eye,
  Shield,
  BarChart3,
  MessageCircle,
  Heart,
  Clock,
} from 'lucide-react';

export default function ForParentsPage() {
  const benefits = [
    {
      icon: Eye,
      title: 'Monitor Progress',
      desc: 'Stay updated on your child\'s academic progress. See test scores, completion rates, and subject-wise performance trends.',
    },
    {
      icon: Shield,
      title: 'Safe Environment',
      desc: 'Quizy provides a distraction-free, ad-free learning environment. Chat is limited to student-teacher communication only.',
    },
    {
      icon: BarChart3,
      title: 'Performance Insights',
      desc: 'Understand your child\'s strengths and weaknesses across subjects. Identify areas that need extra attention before exams.',
    },
    {
      icon: MessageCircle,
      title: 'Teacher Communication',
      desc: 'Your child can communicate directly with teachers through secure in-app messaging for doubt resolution and guidance.',
    },
    {
      icon: Heart,
      title: 'Free for All',
      desc: 'Quizy is completely free. No subscriptions, no hidden costs. Quality education should be accessible to every family.',
    },
    {
      icon: Clock,
      title: 'Study Anytime',
      desc: 'Available on all devices with dark mode support. Your child can study at their own pace, anytime and anywhere.',
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
            {'// FOR_PARENTS'}
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            <span className="typo-serif-display">Your child&apos;s success,</span>{' '}
            <span className="typo-display text-[#1650EB]">tracked</span>
          </h1>
          <p className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Quizy by Experts Academy of Excellence gives parents peace of mind with a safe, ad-free learning platform where you can monitor your child&apos;s academic progress across all subjects.
          </p>
          <Link
            href="/auth/register?role=student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Register Your Child
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
