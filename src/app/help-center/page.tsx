'use client';

/**
 * Help Center — Premium-gated coming soon page.
 * Accessible only to Quizy Premium members.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    HelpCircle,
    Crown,
    Lock,
    MessageCircle,
    BookOpen,
    Shield,
    Sparkles,
    Mail,
    FileQuestion,
    Headphones,
    Construction,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Design tokens ───────────────────────────────────────────────────
function getHelpTheme(isDark: boolean) {
    return {
        isDark,
        blue: '#1650EB',
        violet: '#8B5CF6',
        amber: '#F59E0B',
        emerald: '#10B981',
        bg: isDark ? '#0a0f1e' : '#f1f5f9',
        text: isDark ? '#ffffff' : '#0f172a',
        textMuted: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        surface: isDark ? 'rgba(15,20,35,0.75)' : '#ffffff',
        headerBg: isDark ? 'rgba(10,15,30,0.92)' : 'rgba(255,255,255,0.92)',
        accentText: isDark ? '#93B4FF' : '#1650EB',
        bannerStyle: {
            background: isDark ? 'rgba(15,20,35,0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 16,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        } satisfies React.CSSProperties,
    };
}

// ─── Premium gate tooltip ────────────────────────────────────────────
function PremiumTooltip({ show, p }: { show: boolean; p: ReturnType<typeof getHelpTheme> }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute z-50 px-3.5 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap"
                    style={{
                        background: 'linear-gradient(135deg, #1650EB, #8B5CF6)',
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(22,80,235,0.35)',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 8,
                    }}
                >
                    <div className="flex items-center gap-1.5">
                        <Crown className="w-3 h-3" />
                        Accessible to Quizy Premium members only
                    </div>
                    {/* Arrow */}
                    <div
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                        style={{ background: '#1650EB' }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Coming soon features preview ────────────────────────────────────
const UPCOMING_FEATURES = [
    { icon: MessageCircle, label: 'Live Chat Support', desc: 'Get instant help from our team', color: '#3B82F6' },
    { icon: BookOpen, label: 'Knowledge Base', desc: 'Guides, tutorials & FAQs', color: '#8B5CF6' },
    { icon: FileQuestion, label: 'Ticket System', desc: 'Submit & track support requests', color: '#10B981' },
    { icon: Headphones, label: 'Priority Support', desc: 'Faster response for premium', color: '#F59E0B' },
    { icon: Mail, label: 'Email Support', desc: 'Reach us at support@quizy.app', color: '#EC4899' },
    { icon: Shield, label: 'Account Recovery', desc: 'Secure account assistance', color: '#06B6D4' },
];

export default function HelpCenterPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { isPremium } = usePremium();
    const { isDarkMode } = useTheme();
    const p = getHelpTheme(isDarkMode);

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [clickTooltip, setClickTooltip] = useState(false);

    // Auto-hide click tooltip after 3s
    useEffect(() => {
        if (clickTooltip) {
            const t = setTimeout(() => setClickTooltip(false), 3000);
            return () => clearTimeout(t);
        }
    }, [clickTooltip]);

    const showTooltipMessage = tooltipVisible || clickTooltip;

    return (
        <div className="min-h-screen relative" style={{ background: p.bg, color: p.text }}>
            {/* Background pattern */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <div
                    className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.04]"
                    style={{ background: 'radial-gradient(circle, #1650EB 0%, transparent 70%)', top: '-200px', right: '-200px' }}
                />
                <div
                    className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.03]"
                    style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: '-100px', left: '-100px' }}
                />
            </div>

            {/* Header */}
            <header
                className="sticky top-0 z-50 backdrop-blur-xl border-b"
                style={{ background: p.headerBg, borderColor: p.border }}
            >
                <div className="relative max-w-5xl mx-auto px-4 py-3.5 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-xl transition-colors"
                        style={{ color: p.textMuted }}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 flex-1">
                        <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)' }}
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h1 className="typo-subheading text-[15px]" style={{ color: p.text }}>Help Center</h1>
                    </div>
                    {isPremium ? (
                        <span
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full text-white"
                            style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)' }}
                        >
                            Premium
                        </span>
                    ) : (
                        <span
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
                            style={{
                                background: p.isDark ? 'rgba(22,80,235,0.12)' : 'rgba(22,80,235,0.08)',
                                color: p.accentText,
                                border: `1px solid ${p.border}`,
                            }}
                        >
                            <Lock className="w-3 h-3" />
                            Premium Only
                        </span>
                    )}
                </div>
            </header>

            <main className="relative z-10 max-w-lg mx-auto px-4 pb-24">
                {/* Coming Soon Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mt-8 text-center"
                >
                    {/* Animated icon */}
                    <motion.div
                        className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(22,80,235,0.1), rgba(139,92,246,0.08))',
                            border: `1px solid ${p.border}`,
                        }}
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Construction className="w-10 h-10" style={{ color: p.accentText }} />
                        <motion.div
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Sparkles className="w-3 h-3 text-white" />
                        </motion.div>
                    </motion.div>

                    <h2 className="typo-heading text-[26px] leading-tight tracking-tight mb-2" style={{ color: p.text }}>
                        Coming Soon!
                    </h2>
                    <p className="text-[14px] leading-relaxed max-w-sm mx-auto" style={{ color: p.textMuted }}>
                        Help Center is under development and will be available soon. Stay tuned!
                    </p>
                </motion.div>

                {/* Premium gate card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="mt-6 p-5 relative overflow-hidden"
                    style={p.bannerStyle}
                    onMouseEnter={() => !isPremium && setTooltipVisible(true)}
                    onMouseLeave={() => setTooltipVisible(false)}
                    onClick={() => !isPremium && setClickTooltip(true)}
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: isPremium
                                    ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))'
                                    : 'linear-gradient(135deg, rgba(22,80,235,0.15), rgba(139,92,246,0.1))',
                                border: `1px solid ${isPremium ? 'rgba(16,185,129,0.2)' : p.border}`,
                            }}
                        >
                            {isPremium ? (
                                <Crown className="w-5 h-5" style={{ color: '#10B981' }} />
                            ) : (
                                <Lock className="w-5 h-5" style={{ color: p.accentText }} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold" style={{ color: p.text }}>
                                {isPremium ? 'Premium Access Active' : 'Premium Feature'}
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ color: p.textMuted }}>
                                {isPremium
                                    ? 'You\'ll get early access when Help Center launches!'
                                    : 'Accessible to Quizy Premium members only'}
                            </p>
                        </div>
                        {!isPremium && (
                            <button
                                onClick={(e) => { e.stopPropagation(); router.push('/premium'); }}
                                className="text-[11px] font-bold px-3.5 py-2 rounded-xl text-white flex items-center gap-1 transition-all hover:-translate-y-0.5 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)', boxShadow: '0 4px 14px rgba(22,80,235,0.25)' }}
                            >
                                <Crown className="w-3 h-3" />
                                Upgrade
                            </button>
                        )}
                    </div>

                    {/* Tooltip on hover/click for non-premium */}
                    {!isPremium && (
                        <PremiumTooltip show={showTooltipMessage} p={p} />
                    )}
                </motion.div>

                {/* Upcoming Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="mt-6"
                >
                    <h3 className="typo-subheading text-[13px] mb-3 px-0.5" style={{ color: p.textMuted }}>
                        What&apos;s Coming
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                        {UPCOMING_FEATURES.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={feature.label}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
                                    className="p-3.5 rounded-2xl group relative cursor-default"
                                    style={p.bannerStyle}
                                    onMouseEnter={() => !isPremium && setTooltipVisible(true)}
                                    onMouseLeave={() => setTooltipVisible(false)}
                                    onClick={() => !isPremium && setClickTooltip(true)}
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                                        style={{ background: `${feature.color}12`, border: `1px solid ${feature.color}20` }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: feature.color }} />
                                    </div>
                                    <p className="text-[12px] font-bold mb-0.5" style={{ color: p.text }}>{feature.label}</p>
                                    <p className="text-[10px] leading-snug" style={{ color: p.textMuted }}>{feature.desc}</p>

                                    {/* Lock overlay for non-premium */}
                                    {!isPremium && (
                                        <div
                                            className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            style={{
                                                background: p.isDark ? 'rgba(10,15,30,0.85)' : 'rgba(241,245,249,0.9)',
                                                backdropFilter: 'blur(2px)',
                                            }}
                                        >
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: p.accentText }}>
                                                <Lock className="w-3.5 h-3.5" />
                                                Premium Only
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Close / Go Back Button */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="mt-8 text-center"
                >
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 rounded-2xl text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                        style={{
                            background: p.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${p.border}`,
                            color: p.textMuted,
                        }}
                    >
                        Close
                    </button>
                </motion.div>

                {/* Footer note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-[10px] mt-4 flex items-center justify-center gap-1"
                    style={{ color: p.textMuted }}
                >
                    <Shield className="w-3 h-3" />
                    Help Center will be available exclusively for Premium members
                </motion.p>
            </main>
        </div>
    );
}
