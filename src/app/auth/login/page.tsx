'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    GraduationCap,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    AlertCircle,
    Sparkles,
    BookOpen,
    Trophy,
    Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CLASS_OPTIONS } from '@/lib/constants';

// Google Icon SVG Component
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role') as 'student' | 'teacher' | null;

    const { signIn, signInWithGoogle, updateStudentClass, loading, rememberedUser } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showClassSelector, setShowClassSelector] = useState(false);
    const [selectedClass, setSelectedClass] = useState<number>(5);
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);

    // Pre-fill email if remembered user exists
    useEffect(() => {
        if (rememberedUser && !email) {
            setEmail(rememberedUser.email);
            setShowWelcomeBack(true);
        }
    }, [rememberedUser, email]);

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

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsGoogleLoading(true);

        try {
            const role = roleParam || 'student';
            const result = await signInWithGoogle(role);

            if (result.needsClassSelection) {
                // New student user - show class selector
                setShowClassSelector(true);
                setIsGoogleLoading(false);
                return;
            }

            router.push('/dashboard');
        } catch (err: unknown) {
            console.error('Google sign-in error:', err);
            if (err instanceof Error) {
                if (err.message.includes('popup-closed-by-user')) {
                    setError('Sign in cancelled. Please try again.');
                } else if (err.message.includes('popup-blocked')) {
                    setError('Popup was blocked. Please allow popups for this site.');
                } else {
                    setError(err.message);
                }
            } else {
                setError('Failed to sign in with Google. Please try again.');
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleClassSelection = async () => {
        setError(null);
        setIsGoogleLoading(true);

        try {
            await updateStudentClass(selectedClass);
            router.push('/dashboard');
        } catch (err: unknown) {
            console.error('Class selection error:', err);
            setError('Failed to complete registration. Please try again.');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    // Class Selection Modal
    if (showClassSelector) {
        return (
            <div className="w-full max-w-sm mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-[#1650EB] rounded-xl flex items-center justify-center mx-auto mb-3">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-[#020218] dark:text-white">
                            Select Your Class
                        </h2>
                        <p className="text-sm text-[#6D6D6D] dark:text-gray-400 mt-1">
                            Choose your current class to continue
                        </p>
                    </div>

                    {/* Class Options */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {CLASS_OPTIONS.map((option) => (
                            <motion.button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectedClass(option.value)}
                                whileTap={{ scale: 0.95 }}
                                className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all ${selectedClass === option.value
                                    ? 'bg-[#1650EB] text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {option.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Continue Button */}
                    <motion.button
                        type="button"
                        onClick={handleClassSelection}
                        disabled={isGoogleLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1650EB] text-white rounded-xl font-semibold shadow-lg shadow-[#1650EB]/25 hover:bg-[#1243c7] transition-all disabled:opacity-50"
                    >
                        {isGoogleLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>
        );
    }

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
                        <div className="text-center mb-6">
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
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Quick Sign In Options */}
                        <div className="space-y-3 mb-6">
                            <motion.button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading || loading}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-gray-800 text-[#020218] dark:text-white rounded-xl font-medium border-2 border-gray-200 dark:border-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isGoogleLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <GoogleIcon />
                                        Continue with Google
                                    </>
                                )}
                            </motion.button>

                            <div className="flex items-center gap-2 text-xs text-[#6D6D6D] dark:text-gray-500 justify-center">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Quick sign in - No password needed!</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-gray-900 text-[#6D6D6D]">
                                    or sign in with email
                                </span>
                            </div>
                        </div>

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
                        <div className="relative my-6">
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
