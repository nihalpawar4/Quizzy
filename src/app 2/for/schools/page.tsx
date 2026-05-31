'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowRight,
  Users,
  BarChart3,
  BookOpen,
  Shield,
  Globe,
  Layers,
} from 'lucide-react';

export default function ForSchoolsPage() {
  const benefits = [
    {
      icon: Users,
      title: 'Manage All Students',
      desc: 'Onboard entire classrooms at once. Teachers can create and assign tests to specific classes, making school-wide assessment seamless.',
    },
    {
      icon: BarChart3,
      title: 'Institutional Analytics',
      desc: 'Get class-level and school-level performance insights. Compare across subjects, identify trends, and make data-driven decisions.',
    },
    {
      icon: BookOpen,
      title: 'Multi-Subject Coverage',
      desc: 'Mathematics, Science, English, Hindi, Social Studies, Computer Science, and General Knowledge — all subjects for Classes 5 to 10.',
    },
    {
      icon: Shield,
      title: 'Verified Teachers Only',
      desc: 'Teacher accounts require admin authorization, ensuring your institution maintains full control over who creates and manages academic content.',
    },
    {
      icon: Globe,
      title: 'Access Anywhere',
      desc: 'Quizy works on all devices — phones, tablets, laptops, and desktops. Students can take tests from home or school with the same experience.',
    },
    {
      icon: Layers,
      title: 'CBSE & ICSE Ready',
      desc: 'Tests and content align with CBSE and ICSE board standards. Ideal for schools following either curriculum for Classes 5 through 10.',
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
            {'// FOR_SCHOOLS'}
          </span>
          <h1 className="text-3xl sm:text-5xl mb-4">
            <span className="typo-serif-display">Scale assessments with</span>{' '}
            <span className="typo-display text-[#1650EB]">Quizy</span>
          </h1>
          <p className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Deploy Quizy across your school for digital assessments, teacher analytics, and student progress tracking. Built for CBSE and ICSE schools with Classes 5–10.
          </p>
          <Link
            href="/auth/register?role=teacher"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1650EB] text-white rounded-xl text-base shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Get Started for Your School
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
