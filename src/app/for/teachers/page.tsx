'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Trophy,
  BarChart3,
  Upload,
  Users,
  Shield,
} from 'lucide-react';

export default function ForTeachersPage() {
  const benefits = [
    {
      icon: BookOpen,
      title: 'Create Tests Easily',
      desc: 'Build interactive tests with multiple-choice questions. Set time limits, assign subjects and classes, and publish instantly to your students.',
    },
    {
      icon: Upload,
      title: 'Bulk Upload',
      desc: 'Save time by uploading questions in bulk via CSV or JSON files. Import entire question banks in seconds.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      desc: 'View detailed performance analytics — class averages, individual scores, completion rates, and trends over time.',
    },
    {
      icon: Trophy,
      title: 'Export Reports',
      desc: 'Export student results and performance data as CSV files for record-keeping, parent meetings, or administrative use.',
    },
    {
      icon: Users,
      title: 'Student Management',
      desc: 'See all your students at a glance. Track who has completed which tests, view individual progress, and identify students who need help.',
    },
    {
      icon: Shield,
      title: 'Secure & Verified',
      desc: 'Teacher accounts require admin authorization, ensuring only verified educators can access the teacher dashboard and create content.',
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
            {'// FOR_TEACHERS'}
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            <span className="typo-serif-display">Empower your teaching with</span>{' '}
            <span className="typo-display text-[#1650EB]">Quizy</span>
          </h1>
          <p className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Create tests, track student performance, and get detailed analytics — all in one platform. Quizy gives teachers the tools they need to make learning measurable and impactful.
          </p>
          <Link
            href="/auth/register?role=teacher"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Get Started as Teacher
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
