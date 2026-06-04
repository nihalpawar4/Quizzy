'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    GraduationCap,
    Mail,
    ArrowRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    KeyRound,
    X,
    Sparkles,
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// ─── Toast notification component ────────────────────────────────────────────

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div
            className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, x: 60, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`pointer-events-auto relative flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-2xl backdrop-blur-xl
                            ${toast.type === 'success'
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                : toast.type === 'error'
                                    ? 'bg-red-50/90 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                    : 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                            }`}
                    >
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                        {toast.type === 'info' && <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ─── Animated email sent illustration ────────────────────────────────────────

function EmailSentAnimation() {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mx-auto w-28 h-28 mb-6"
        >
            {/* Outer glow ring */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(22,80,235,0.15) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.2, 0.5],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Circle background */}
            <motion.div
                className="absolute inset-2 rounded-full bg-gradient-to-br from-[#1650EB] to-[#6095DB] shadow-lg shadow-[#1650EB]/30"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Icon */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                <Mail className="w-12 h-12 text-white" />
            </motion.div>

            {/* Checkmark badge */}
            <motion.div
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 flex items-center justify-center"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 15 }}
            >
                <CheckCircle2 className="w-6 h-6 text-white" />
            </motion.div>

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-[#1650EB]"
                    style={{
                        top: '50%',
                        left: '50%',
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                        x: [0, Math.cos((i * Math.PI * 2) / 6) * 55],
                        y: [0, Math.sin((i * Math.PI * 2) / 6) * 55],
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0],
                    }}
                    transition={{
                        delay: 0.5 + i * 0.08,
                        duration: 1,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </motion.div>
    );
}

// ─── Neon glow loading spinner ───────────────────────────────────────────────

function NeonSpinner() {
    return (
        <div className="relative w-5 h-5">
            <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className="absolute -inset-0.5 rounded-full"
                style={{
                    background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

// ─── Main page component ─────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Auto-dismiss toasts after 5 seconds
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts((prev) => prev.slice(1));
        }, 5000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const addToast = (message: string, type: Toast['type']) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            addToast('Please enter your email address.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Firebase sendPasswordResetEmail — always succeeds silently even if email doesn't exist
            // This is the correct security behavior (no email enumeration)
            await sendPasswordResetEmail(auth, email.trim());
            setIsSuccess(true);
            addToast('Password reset request processed successfully.', 'success');
        } catch (error: unknown) {
            console.error('Password reset error:', error);

            // Even on most errors, show generic success to prevent email enumeration
            // Only show error for clearly client-side issues
            if (error instanceof Error) {
                const msg = error.message;
                if (msg.includes('invalid-email')) {
                    addToast('Please enter a valid email address.', 'error');
                } else if (msg.includes('too-many-requests')) {
                    addToast('Too many requests. Please try again later.', 'error');
                } else if (msg.includes('network-request-failed')) {
                    addToast('Network error. Please check your connection.', 'error');
                } else {
                    // For user-not-found and any other errors, show generic success
                    // This prevents email enumeration attacks
                    setIsSuccess(true);
                    addToast('Password reset request processed successfully.', 'success');
                }
            } else {
                setIsSuccess(true);
                addToast('Password reset request processed successfully.', 'success');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTryAnother = () => {
        setIsSuccess(false);
        setEmail('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col relative overflow-hidden">
            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#6095DB]/30 dark:bg-[#1650EB]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1650EB]/20 dark:bg-[#6095DB]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                {/* Extra animated ambient glow */}
                <motion.div
                    className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(22,80,235,0.08) 0%, transparent 70%)' }}
                    animate={{ scale: [1, 1.2, 1], x: ['-50%', '-45%', '-50%'], y: [0, -20, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
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
                        <span className="typo-brand text-2xl text-[#020218] dark:text-white group-hover:text-[#1650EB] dark:group-hover:text-[#6095DB] transition-colors">
                            Quizy
                        </span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-center">

                    {/* Left Side — Branding */}
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
                                    <ShieldCheck className="w-4 h-4" />
                                    Secure Account Recovery
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl lg:text-5xl text-[#020218] dark:text-white leading-tight"
                            >
                                <span className="typo-serif-display">Reset your</span>{' '}
                                <span className="typo-display text-[#1650EB]">
                                    Password
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="typo-body text-lg text-[#6D6D6D] dark:text-gray-400"
                            >
                                Don&apos;t worry, it happens to the best of us. Enter your email and we&apos;ll send you a secure link to reset your password.
                            </motion.p>

                            {/* Security features */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-4 pt-4"
                            >
                                {[
                                    { icon: KeyRound, text: 'Secure password reset via email' },
                                    { icon: ShieldCheck, text: 'Your data is always protected' },
                                    { icon: Sparkles, text: 'Quick and easy recovery process' },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#1650EB]/10 dark:bg-[#1650EB]/20 flex items-center justify-center">
                                            <item.icon className="w-5 h-5 text-[#1650EB] dark:text-[#6095DB]" />
                                        </div>
                                        <span className="typo-body text-[#020218] dark:text-gray-300">{item.text}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Right Side — Form Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md mx-auto lg:mx-0"
                    >
                        <div className="relative">
                            {/* Decorative gradient blur */}
                            <div className="absolute -inset-1 bg-[#1650EB]/20 rounded-3xl blur-lg opacity-30" />

                            {/* Glassmorphism card */}
                            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50 p-8 overflow-hidden">
                                {/* Inner glass shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-[#1650EB]/5 dark:from-gray-800/40 dark:via-transparent dark:to-[#1650EB]/10 pointer-events-none" />

                                <div className="relative z-10">
                                    {/* Mobile Logo */}
                                    <div className="lg:hidden text-center mb-6">
                                        <Link href="/" className="inline-flex items-center gap-2">
                                            <div className="w-12 h-12 bg-[#1650EB] rounded-xl flex items-center justify-center">
                                                <GraduationCap className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="typo-brand text-2xl text-[#020218] dark:text-white">Quizy</span>
                                        </Link>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {!isSuccess ? (
                                            /* ── Request Form State ── */
                                            <motion.div
                                                key="form"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {/* Header */}
                                                <div className="text-center mb-6">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1650EB]/20">
                                                        <KeyRound className="w-7 h-7 text-white" />
                                                    </div>
                                                    <h2 className="typo-heading text-2xl text-[#020218] dark:text-white mb-2">
                                                        Forgot Password?
                                                    </h2>
                                                    <p className="typo-body text-[#6D6D6D] dark:text-gray-400 text-sm">
                                                        No worries! Enter the email address associated with your account.
                                                    </p>
                                                </div>

                                                {/* Form */}
                                                <form onSubmit={handleSubmit} className="space-y-5">
                                                    {/* Email Input */}
                                                    <div>
                                                        <label
                                                            htmlFor="reset-email"
                                                            className="block text-sm text-[#020218] dark:text-gray-300 mb-2"
                                                            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}
                                                        >
                                                            Email Address
                                                        </label>
                                                        <div className="relative group">
                                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1650EB] transition-colors" />
                                                            <input
                                                                id="reset-email"
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="you@example.com"
                                                                required
                                                                autoComplete="email"
                                                                autoFocus
                                                                aria-describedby="email-hint"
                                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[#020218] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1650EB] focus:border-transparent focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <p id="email-hint" className="mt-2 text-xs text-[#6D6D6D] dark:text-gray-500">
                                                            We&apos;ll send a password reset link to this email.
                                                        </p>
                                                    </div>

                                                    {/* Submit Button — Blue Neon Glow */}
                                                    <motion.button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                                                        whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                                                        className="forgot-password-btn w-full flex items-center justify-center gap-2 py-3.5 bg-[#1650EB] text-white rounded-xl shadow-lg shadow-[#1650EB]/25 hover:shadow-xl hover:shadow-[#1650EB]/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}
                                                    >
                                                        {/* Neon glow effect */}
                                                        <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 20px rgba(22,80,235,0.5), 0 0 40px rgba(22,80,235,0.3), inset 0 0 20px rgba(255,255,255,0.1)' }} />

                                                        <span className="relative z-10 flex items-center gap-2">
                                                            {isSubmitting ? (
                                                                <>
                                                                    <NeonSpinner />
                                                                    Sending Reset Link...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Send Reset Link
                                                                    <ArrowRight className="w-5 h-5" />
                                                                </>
                                                            )}
                                                        </span>
                                                    </motion.button>
                                                </form>

                                                {/* Divider */}
                                                <div className="relative my-6">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                                    </div>
                                                    <div className="relative flex justify-center text-sm">
                                                        <span className="px-4 bg-white/80 dark:bg-gray-900/80 text-[#6D6D6D]">
                                                            Remember your password?
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Back to Login */}
                                                <Link
                                                    href="/auth/login"
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-50 dark:bg-gray-800 text-[#020218] dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-[#1650EB]/5 dark:hover:bg-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] transition-all"
                                                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Back to Sign In
                                                </Link>
                                            </motion.div>
                                        ) : (
                                            /* ── Success State ── */
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                                className="text-center"
                                            >
                                                {/* Animated illustration */}
                                                <EmailSentAnimation />

                                                <h2 className="typo-heading text-2xl text-[#020218] dark:text-white mb-3">
                                                    Check Your Email
                                                </h2>

                                                <p className="typo-body text-[#6D6D6D] dark:text-gray-400 mb-2 text-sm">
                                                    If an account exists with this email, a reset link has been sent.
                                                </p>

                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
                                                    <Mail className="w-4 h-4 text-[#1650EB]" />
                                                    <span className="text-sm font-medium text-[#020218] dark:text-gray-200 break-all">
                                                        {email}
                                                    </span>
                                                </div>

                                                <div className="space-y-3 mb-6 text-left">
                                                    <div className="flex items-start gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                                        <AlertCircle className="w-4 h-4 text-[#1650EB] dark:text-[#6095DB] flex-shrink-0 mt-0.5" />
                                                        <div className="text-xs text-[#6D6D6D] dark:text-gray-400 space-y-1">
                                                            <p>The link will expire in <strong className="text-[#020218] dark:text-gray-200">1 hour</strong>.</p>
                                                            <p>Check your <strong className="text-[#020218] dark:text-gray-200">spam or junk</strong> folder if you don&apos;t see it.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="space-y-3">
                                                    <Link
                                                        href="/auth/login"
                                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1650EB] text-white rounded-xl shadow-lg shadow-[#1650EB]/25 hover:shadow-xl hover:bg-[#1243c7] transition-all"
                                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}
                                                    >
                                                        <ArrowLeft className="w-4 h-4" />
                                                        Return to Sign In
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        onClick={handleTryAnother}
                                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-50 dark:bg-gray-800 text-[#020218] dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-[#1650EB]/5 dark:hover:bg-gray-700 hover:border-[#1650EB] dark:hover:border-[#1650EB] transition-all text-sm"
                                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        Try a different email
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
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
            </main>
        </div>
    );
}
