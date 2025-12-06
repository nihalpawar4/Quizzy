'use client';

import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    GraduationCap,
    Mail,
    Lock,
    User,
    ArrowRight,
    Loader2,
    AlertCircle,
    BookOpen,
    Shield
} from 'lucide-react';
import { useAuth, validateAdminCode } from '@/contexts/AuthContext';
import { CLASS_OPTIONS, ADMIN_EMAILS } from '@/lib/constants';

type Role = 'student' | 'teacher';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role') as Role | null;

    const { signUp, loading } = useAuth();

    const [role, setRole] = useState<Role>(roleParam || 'student');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [studentClass, setStudentClass] = useState<number>(5);
    const [adminCode, setAdminCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (role === 'teacher') {
            const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
            const isValidCode = validateAdminCode(adminCode);

            if (!isAdminEmail && !isValidCode) {
                setError('Invalid admin code or email not authorized for teacher access');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            await signUp(email, password, name, role, role === 'student' ? studentClass : undefined);
            router.push('/dashboard');
        } catch (err: unknown) {
            console.error('Registration error:', err);
            if (err instanceof Error) {
                if (err.message.includes('email-already-in-use')) {
                    setError('An account with this email already exists');
                } else {
                    setError(err.message);
                }
            } else {
                setError('Failed to create account. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
        >
            {/* Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-800 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Join Quizy and start your learning journey
                    </p>
                </div>

                {/* Role Selector */}
                <div className="flex gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${role === 'student'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${role === 'teacher'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Shield className="w-5 h-5" />
                        Teacher
                    </button>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Class Selector (Students Only) */}
                    {role === 'student' && (
                        <div>
                            <label htmlFor="class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Your Class
                            </label>
                            <select
                                id="class"
                                value={studentClass}
                                onChange={(e) => setStudentClass(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            >
                                {CLASS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Admin Code (Teachers Only) */}
                    {role === 'teacher' && (
                        <div>
                            <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Admin Code
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="adminCode"
                                    type="text"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                    placeholder="Enter admin code"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                Required for teacher registration (or use an authorized email)
                            </p>
                        </div>
                    )}

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                            Already have an account?
                        </span>
                    </div>
                </div>

                {/* Login Link */}
                <Link
                    href="/auth/login"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    Sign In
                </Link>
            </div>

            {/* Footer Link */}
            <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
                <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    ← Back to Home
                </Link>
            </p>
        </motion.div>
    );
}

function RegisterLoading() {
    return (
        <div className="w-full max-w-md">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <div className="flex justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
            {/* Header */}
            <header className="px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Quizy</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 py-12">
                <Suspense fallback={<RegisterLoading />}>
                    <RegisterForm />
                </Suspense>
            </main>
        </div>
    );
}
