'use client';

import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles, BookOpen, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role');

    const { signIn, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await signIn(email, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            console.error('Login error:', err);
            if (err instanceof Error) {
                if (err.message.includes('user-not-found')) {
                    setError('No account found with this email');
                } else if (err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
                    setError('Incorrect email or password');
                } else {
                    setError(err.message);
                }
            } else {
                setError('Failed to sign in. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Branding */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="hidden lg:block"
            >
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#1650EB]/10 dark:bg-[#1650EB]/20 rounded-full text-sm font-medium text-[#1650EB] dark:text-[#6095DB]">
                            <Sparkles className="w-4 h-4" />
                            Nihal&apos;s Home Tutoring Classes
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl lg:text-5xl font-bold text-[#020218] dark:text-white leading-tight"
                    >
                        Welcome back to{' '}
                        <span className="text-[#1650EB]">
                            Quizy
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-[#6D6D6D] dark:text-gray-400"
                    >
                        Continue your learning journey. Practice tests, track progress, and excel in your exams.
                    </motion.p>

                    {/* Feature highlights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-4 pt-4"
                    >
                        {[
                            { icon: BookOpen, text: 'Access all your tests instantly' },
                            { icon: Trophy, text: 'View your progress and scores' },
                            { icon: GraduationCap, text: 'Continue where you left off' },
                        ].map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#1650EB]/10 dark:bg-[#1650EB]/20 flex items-center justify-center">
                                    <item.icon className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                </div>
                                <span className="text-[#020218] dark:text-gray-300">{item.text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Side - Login Form */}
            <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md mx-auto lg:mx-0"
            >
                {/* Card */}
                <div className="relative">
                    {/* Decorative gradient blur */}
                    <div className="absolute -inset-1 bg-[#1650EB]/20 rounded-3xl blur-lg opacity-30" />

                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-6">
                            <Link href="/" className="inline-flex items-center gap-2">
                                <div className="w-12 h-12 bg-[#1650EB] rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-7 h-7 text-white" />
                                </div>
                                <span className="text-2xl font-bold text-[#020218] dark:text-white">Quizy</span>
                            </Link>
                        </div>

                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#020218] dark:text-white mb-2">
                                Sign In
                            </h2>
                            <p className="text-[#6D6D6D] dark:text-gray-400">
                                {roleParam === 'teacher'
                                    ? 'Access your teacher dashboard'
                                    : 'Continue your learning journey'}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                            >
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-[#020218] dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1650EB] transition-colors" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[#020218] dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1650EB] transition-colors" />
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isSubmitting || loading}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1650EB] text-white rounded-xl font-semibold shadow-lg shadow-[#1650EB]/25 hover:shadow-xl hover:bg-[#1243c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-gray-900 text-[#6D6D6D]">
                                    New to Quizy?
                                </span>
                            </div>
                        </div>

                        {/* Register Link */}
                        <Link
                            href={roleParam === 'teacher' ? '/auth/register?role=teacher' : '/auth/register'}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-50 dark:bg-gray-800 text-[#020218] dark:text-gray-300 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:bg-[#1650EB]/5 dark:hover:bg-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] transition-all"
                        >
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Footer Link */}
                <p className="text-center mt-6 text-sm text-[#6D6D6D] dark:text-gray-400">
                    <Link href="/" className="hover:text-[#1650EB] dark:hover:text-[#6095DB] transition-colors inline-flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 rotate-180" />
                        Back to Home
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}

function LoginLoading() {
    return (
        <div className="w-full max-w-md">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <div className="flex justify-center">
                    <Loader2 className="w-8 h-8 text-[#1650EB] animate-spin" />
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#6095DB]/30 dark:bg-[#1650EB]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1650EB]/20 dark:bg-[#6095DB]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Header */}
            <header className="relative px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="w-10 h-10 bg-[#1650EB] rounded-xl flex items-center justify-center shadow-lg shadow-[#1650EB]/25"
                        >
                            <GraduationCap className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-xl font-bold text-[#020218] dark:text-white group-hover:text-[#1650EB] dark:group-hover:text-[#6095DB] transition-colors">Quizy</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative flex-1 flex items-center justify-center px-6 py-12">
                <Suspense fallback={<LoginLoading />}>
                    <LoginForm />
                </Suspense>
            </main>
        </div>
    );
}
