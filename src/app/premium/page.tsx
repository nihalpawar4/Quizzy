'use client';

/**
 * Quizy Premium — Refined premium page with strict blue color system,
 * minimal SaaS aesthetic inspired by Linear, Raycast, Stripe.
 * No glows, no neon, no rainbow — just clean, premium, sophisticated.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Crown,
    ArrowLeft,
    Sparkles,
    Shield,
    Zap,
    BarChart3,
    Star,
    CheckCircle,
    X,
    Loader2,
    AlertCircle,
    Gift,
    ChevronRight,
    TrendingUp,
    Clock,
    Target,
    Award,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { PREMIUM_XP_COST } from '@/lib/constants';
import {
    BUBBLE_THEMES,
    PROFILE_FRAMES,
    PREMIUM_BADGES,
    type BubbleTheme,
    type ProfileFrameType,
    type BadgeType,
} from '@/services/premiumService';
import ProfileFrame from '@/components/ui/ProfileFrame';
import PremiumBadge from '@/components/ui/PremiumBadge';
import MotivationalLoader from '@/components/ui/MotivationalLoader';

// ─── Design Tokens (strict blue system) ──────────────────────────────
const T = {
    bg: '#020617',
    surface: '#0F172A',
    surfaceHover: '#132238',
    border: 'rgba(56,189,248,0.12)',
    borderSubtle: 'rgba(255,255,255,0.06)',
    primary: '#0EA5E9',
    secondary: '#38BDF8',
    accent: '#06B6D4',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.72)',
    textMuted: 'rgba(255,255,255,0.40)',
};

// ─── Theme display config ────────────────────────────────────────────
const THEME_META: Record<string, { name: string; hue: string }> = {
    default: { name: 'Ocean', hue: '#0EA5E9' },
    sparkle: { name: 'Galaxy', hue: '#6366F1' },
    neon: { name: 'Aurora', hue: '#22D3EE' },
    fire: { name: 'Lightning', hue: '#818CF8' },
    water: { name: 'Frost', hue: '#94A3B8' },
};

const FRAME_META: Record<string, string> = {
    none: 'None', gold: 'Inferno', diamond: 'Diamond', fire: 'Cosmic', aurora: 'Aurora',
};

// ═══════════════════════════════════════════════════════════════════════
export default function PremiumPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const {
        isPremium, isTrial, trialExpiresAt,
        activeBubbleTheme, activeProfileFrame, activeBadge,
        streakShieldsRemaining,
        purchasePremium, setBubbleTheme, setProfileFrame, setBadge,
        activateXPBoost,
    } = usePremium();
    const router = useRouter();

    const [showConfirm, setShowConfirm] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [activeSection, setActiveSection] = useState<'features' | 'customize'>('features');
    const [boostActivating, setBoostActivating] = useState(false);

    const currentXP = user?.xp || 0;
    const canAfford = currentXP >= PREMIUM_XP_COST;
    const xpRemaining = Math.max(0, PREMIUM_XP_COST - currentXP);
    const progressPercent = Math.min(100, Math.round((currentXP / PREMIUM_XP_COST) * 100));

    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/login');
    }, [user, authLoading, router]);

    const handlePurchase = useCallback(async () => {
        setPurchasing(true);
        setPurchaseError(null);
        const result = await purchasePremium();
        if (result.success) {
            setPurchaseSuccess(true);
            await refreshUser();
            setShowConfirm(false);
            setTimeout(() => setPurchaseSuccess(false), 3000);
        } else {
            setPurchaseError(result.error || 'Purchase failed');
        }
        setPurchasing(false);
    }, [purchasePremium, refreshUser]);

    const handleActivateBoost = useCallback(async () => {
        setBoostActivating(true);
        await activateXPBoost(30);
        setBoostActivating(false);
    }, [activateXPBoost]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
                <MotivationalLoader />
            </div>
        );
    }

    const trialTimeLeft = trialExpiresAt
        ? Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
        : 0;

    // Shared card style
    const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: '20px' };
    const cardInner = { background: `rgba(255,255,255,0.03)`, border: `1px solid ${T.borderSubtle}`, borderRadius: '12px' };

    return (
        <div className="min-h-screen" style={{ background: T.bg }}>
            {/* ─── Header ─── */}
            <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: `${T.bg}ee`, borderBottom: `1px solid ${T.border}` }}>
                <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl transition-colors" style={{ color: T.textMuted }}>
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Crown className="w-5 h-5" style={{ color: T.primary }} />
                    <h1 className="text-[15px] font-semibold flex-1" style={{ color: T.textPrimary, letterSpacing: '-0.01em' }}>Quizy Premium</h1>
                    {isPremium ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${T.primary}18`, color: T.secondary, border: `1px solid ${T.border}` }}>
                            {isTrial ? `Trial · ${trialTimeLeft}h` : 'Active'}
                        </span>
                    ) : (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${T.primary}10`, color: T.textMuted }}>
                            <Sparkles className="w-3 h-3 inline mr-1" style={{ color: T.secondary }} />
                            {currentXP} XP
                        </span>
                    )}
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 pb-24">

                {/* ════════════════════════════════════════════════════════════ */}
                {/* HERO BANNER                                                */}
                {/* ════════════════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-4 p-5 sm:p-6"
                    style={card}
                >
                    <div className="flex items-start gap-5">
                        {/* Left */}
                        <div className="flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-4" style={{ background: `${T.primary}12`, color: T.secondary, letterSpacing: '0.05em' }}>
                                <Crown className="w-3 h-3" />
                                QUIZY+
                            </span>
                            <h2 className="text-xl sm:text-[22px] font-bold leading-[1.25] tracking-tight" style={{ color: T.textPrimary }}>
                                Learn Faster.<br />
                                <span style={{ color: T.primary }}>Compete Smarter.</span><br />
                                Stand Out.
                            </h2>
                            <p className="text-[13px] mt-3 leading-relaxed" style={{ color: T.textMuted }}>
                                Premium tools designed for ambitious learners.
                            </p>

                            {/* CTA */}
                            {!isPremium ? (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={!canAfford}
                                    className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${canAfford ? 'hover:brightness-110 active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'}`}
                                    style={{ background: T.primary, color: '#fff' }}
                                >
                                    <Crown className="w-3.5 h-3.5" />
                                    Unlock Premium — {PREMIUM_XP_COST} XP
                                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                                </button>
                            ) : (
                                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium" style={{ background: `${T.primary}12`, color: T.secondary, border: `1px solid ${T.border}` }}>
                                    <CheckCircle className="w-4 h-4" style={{ color: '#34D399' }} />
                                    {isTrial ? `Trial active · ${trialTimeLeft}h remaining` : 'Lifetime Premium'}
                                </div>
                            )}
                        </div>

                        {/* Right — XP Progress */}
                        <div className="hidden xs:flex flex-col items-end gap-3 pt-8 flex-shrink-0 w-[140px]">
                            <div className="text-right">
                                <p className="text-2xl font-bold tabular-nums" style={{ color: T.textPrimary }}>{currentXP} <span className="text-sm font-medium" style={{ color: T.textMuted }}>XP</span></p>
                                <p className="text-[11px] font-medium mt-0.5" style={{ color: T.textMuted }}>{progressPercent}% Complete</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {!isPremium && (
                        <div className="mt-5">
                            <div className="flex items-center justify-between text-[11px] mb-2" style={{ color: T.textMuted }}>
                                <span className="tabular-nums">{currentXP} XP</span>
                                <span className="tabular-nums">{PREMIUM_XP_COST} XP</span>
                            </div>
                            <div className="h-[10px] rounded-full overflow-hidden premium-progress-track" style={{ background: `rgba(255,255,255,0.04)` }}>
                                <motion.div
                                    className="h-full rounded-full premium-progress-fill"
                                    style={{ background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                />
                            </div>
                            <p className="text-[11px] font-medium text-center mt-2.5 tabular-nums" style={{ color: T.textMuted }}>
                                {xpRemaining} XP remaining
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* ─── Free Trial ─── */}
                {!isPremium && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 p-4 flex items-center gap-3.5"
                        style={card}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${T.primary}12`, border: `1px solid ${T.border}` }}>
                            <Gift className="w-5 h-5" style={{ color: T.secondary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>Free 24h Trial</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>Try every premium feature for 24 hours.</p>
                        </div>
                        <button className="text-[12px] font-semibold px-3.5 py-2 rounded-lg transition-all hover:brightness-110" style={{ background: T.primary, color: '#fff' }}>
                            Claim Trial
                        </button>
                    </motion.div>
                )}

                {/* ─── Tabs ─── */}
                {isPremium && (
                    <div className="mt-4 flex gap-1 p-1 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        {(['features', 'customize'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveSection(tab)}
                                className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize"
                                style={{
                                    background: activeSection === tab ? `${T.primary}15` : 'transparent',
                                    color: activeSection === tab ? T.secondary : T.textMuted,
                                    border: activeSection === tab ? `1px solid ${T.border}` : '1px solid transparent',
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                )}

                {/* ═══════════ FEATURES SECTION ═══════════ */}
                {(activeSection === 'features' || !isPremium) && (
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                            <h3 className="text-[13px] font-semibold" style={{ color: T.textSecondary }}>Premium Features</h3>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-2 gap-3">

                            {/* ── Bubble Themes ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="p-4" style={card}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>Bubble Themes</p>
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: T.textMuted }} />
                                </div>
                                <p className="text-[10px] mb-3" style={{ color: T.textMuted }}>5 premium effects</p>
                                <div className="flex items-center gap-2 mb-2.5">
                                    {Object.entries(THEME_META).map(([id, meta]) => (
                                        <div
                                            key={id}
                                            className="w-8 h-8 rounded-full flex-shrink-0"
                                            style={{
                                                background: `radial-gradient(circle at 30% 30%, ${meta.hue}40, ${meta.hue}15)`,
                                                border: `1px solid ${meta.hue}30`,
                                                boxShadow: `inset 0 1px 2px ${meta.hue}20`,
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {Object.values(THEME_META).map(meta => (
                                        <span key={meta.name} className="text-[9px] font-medium" style={{ color: T.textMuted }}>{meta.name}</span>
                                    ))}
                                </div>
                            </motion.div>

                            {/* ── Profile Frames ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                                className="p-4" style={card}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>Profile Frames</p>
                                    <Award className="w-3.5 h-3.5" style={{ color: T.textMuted }} />
                                </div>
                                <p className="text-[10px] mb-3" style={{ color: T.textMuted }}>Premium avatar frames</p>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {PROFILE_FRAMES.filter(f => f.id !== 'none').map(frame => (
                                        <div key={frame.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                                            <ProfileFrame frameType={frame.id as ProfileFrameType} photoURL={null} userName="U" size={30} />
                                            <span className="text-[8px] font-medium" style={{ color: T.textMuted }}>{FRAME_META[frame.id]}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* ── Analytics ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="p-4" style={card}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>Analytics</p>
                                    <BarChart3 className="w-3.5 h-3.5" style={{ color: T.textMuted }} />
                                </div>
                                <p className="text-[10px] mb-3" style={{ color: T.textMuted }}>Track. Improve. Rank up.</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { label: 'Solved', value: '2,840' },
                                        { label: 'Accuracy', value: '87%' },
                                        { label: 'Rank', value: 'Top 3%' },
                                        { label: 'Study', value: '24.6h' },
                                    ].map(s => (
                                        <div key={s.label} className="p-2 rounded-lg" style={cardInner}>
                                            <p className="text-[9px] font-medium" style={{ color: T.textMuted }}>{s.label}</p>
                                            <p className="text-[13px] font-bold mt-0.5" style={{ color: T.secondary }}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* ── Premium Badges ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                                className="p-4" style={card}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>Badges</p>
                                    <Star className="w-3.5 h-3.5" style={{ color: T.textMuted }} />
                                </div>
                                <p className="text-[10px] mb-3" style={{ color: T.textMuted }}>Exclusive status badges</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PREMIUM_BADGES.filter(b => b.id !== 'none').map(badge => (
                                        <div key={badge.id} className="flex flex-col items-center gap-1.5 p-2 rounded-lg" style={cardInner}>
                                            <PremiumBadge badgeType={badge.id as BadgeType} size="md" className="!bg-transparent !px-0 !py-0" />
                                            <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>{badge.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* ── XP Boost ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="p-4" style={card}
                        >
                            <div className="flex items-center gap-3 mb-3.5">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${T.primary}12`, border: `1px solid ${T.border}` }}>
                                    <Zap className="w-4 h-4" style={{ color: T.secondary }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>XP Boost & More</p>
                                    <p className="text-[11px]" style={{ color: T.textMuted }}>Premium advantages that push you ahead</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { icon: TrendingUp, title: '1.2x XP', desc: 'Every quiz' },
                                    { icon: Target, title: 'Challenges', desc: 'Weekly' },
                                    { icon: Gift, title: 'Rewards', desc: 'Bonus' },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-lg text-center" style={cardInner}>
                                        <item.icon className="w-4 h-4" style={{ color: T.secondary }} />
                                        <p className="text-[11px] font-semibold" style={{ color: T.textPrimary }}>{item.title}</p>
                                        <p className="text-[9px]" style={{ color: T.textMuted }}>{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* ── Trusted By ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                            className="p-4" style={card}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>Trusted by Top Learners</p>
                                    <div className="flex items-center gap-0.5 mt-1">
                                        {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" style={{ color: T.secondary }} />)}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: '+32%', label: 'Faster Progress' },
                                    { value: '+2.8x', label: 'XP Gain' },
                                    { value: '+48%', label: 'Accuracy' },
                                ].map((s, i) => (
                                    <div key={i} className="p-2.5 rounded-lg text-center" style={cardInner}>
                                        <p className="text-[15px] font-bold" style={{ color: T.secondary }}>{s.value}</p>
                                        <p className="text-[9px] font-medium mt-0.5" style={{ color: T.textMuted }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ═══════════ CUSTOMIZE SECTION ═══════════ */}
                {isPremium && activeSection === 'customize' && (
                    <div className="mt-5 space-y-6">

                        {/* Bubble Themes */}
                        <section>
                            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: T.textPrimary }}>
                                <Sparkles className="w-4 h-4" style={{ color: T.secondary }} />
                                Bubble Theme
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {BUBBLE_THEMES.map(theme => {
                                    const meta = THEME_META[theme.id] || { name: theme.label, hue: T.primary };
                                    const isActive = activeBubbleTheme === theme.id;
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => setBubbleTheme(theme.id as BubbleTheme)}
                                            className="p-3 rounded-2xl text-left transition-all"
                                            style={{
                                                background: T.surface,
                                                border: `1.5px solid ${isActive ? T.primary : T.border}`,
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5 mb-1">
                                                <div className="w-7 h-7 rounded-full flex-shrink-0" style={{
                                                    background: `radial-gradient(circle at 30% 30%, ${meta.hue}50, ${meta.hue}18)`,
                                                    border: `1px solid ${meta.hue}30`,
                                                }} />
                                                <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>{meta.name}</p>
                                            </div>
                                            <p className="text-[10px]" style={{ color: T.textMuted }}>{theme.description}</p>
                                            {isActive && <CheckCircle className="w-3.5 h-3.5 mt-1.5" style={{ color: T.primary }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Profile Frames */}
                        <section>
                            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: T.textPrimary }}>
                                <Award className="w-4 h-4" style={{ color: T.secondary }} />
                                Profile Frame
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {PROFILE_FRAMES.map(frame => {
                                    const isActive = activeProfileFrame === frame.id;
                                    return (
                                        <button
                                            key={frame.id}
                                            onClick={() => setProfileFrame(frame.id as ProfileFrameType)}
                                            className="flex flex-col items-center p-3 rounded-2xl transition-all"
                                            style={{
                                                background: T.surface,
                                                border: `1.5px solid ${isActive ? T.primary : T.border}`,
                                            }}
                                        >
                                            <ProfileFrame
                                                frameType={frame.id as ProfileFrameType}
                                                photoURL={user?.photoURL}
                                                userName={user?.name || 'U'}
                                                size={40}
                                            />
                                            <p className="text-[10px] font-semibold mt-2" style={{ color: T.textPrimary }}>{FRAME_META[frame.id] || frame.label}</p>
                                            {isActive && <CheckCircle className="w-3 h-3 mt-1" style={{ color: T.primary }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Badges */}
                        <section>
                            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: T.textPrimary }}>
                                <Star className="w-4 h-4" style={{ color: T.secondary }} />
                                Badge
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {PREMIUM_BADGES.map(badge => {
                                    const isActive = activeBadge === badge.id;
                                    return (
                                        <button
                                            key={badge.id}
                                            onClick={() => setBadge(badge.id as BadgeType)}
                                            className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                                            style={{
                                                background: T.surface,
                                                border: `1.5px solid ${isActive ? T.primary : T.border}`,
                                            }}
                                        >
                                            {badge.id === 'none' ? (
                                                <span className="text-lg" style={{ color: T.textMuted }}>—</span>
                                            ) : (
                                                <PremiumBadge badgeType={badge.id as BadgeType} size="lg" className="!bg-transparent !px-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>{badge.label}</p>
                                                <p className="text-[10px]" style={{ color: T.textMuted }}>{badge.description}</p>
                                            </div>
                                            {isActive && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: T.primary }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section>
                            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: T.textPrimary }}>
                                <Zap className="w-4 h-4" style={{ color: T.secondary }} />
                                Quick Actions
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={handleActivateBoost}
                                    disabled={boostActivating}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                                    style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                >
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${T.primary}15` }}>
                                        <Zap className="w-4 h-4" style={{ color: T.secondary }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>Activate 2X XP Boost</p>
                                        <p className="text-[11px]" style={{ color: T.textMuted }}>Double XP for 30 minutes</p>
                                    </div>
                                    {boostActivating ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.secondary }} /> : <ChevronRight className="w-4 h-4" style={{ color: T.textMuted }} />}
                                </button>

                                <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${T.primary}15` }}>
                                        <Shield className="w-4 h-4" style={{ color: T.secondary }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>Streak Shields</p>
                                        <p className="text-[11px]" style={{ color: T.textMuted }}>Protects your streak</p>
                                    </div>
                                    <span className="text-[15px] font-bold tabular-nums" style={{ color: T.secondary }}>{streakShieldsRemaining}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {/* ═══════════ PURCHASE MODAL ═══════════ */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
                        onClick={() => !purchasing && setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm p-6 rounded-2xl"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: T.primary }}>
                                    <Crown className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-bold mb-1.5" style={{ color: T.textPrimary }}>Confirm Purchase</h3>
                                <p className="text-[13px] mb-5" style={{ color: T.textMuted }}>
                                    Unlock all premium features for <span className="font-semibold" style={{ color: T.secondary }}>{PREMIUM_XP_COST} XP</span>.
                                </p>

                                <div className="p-3 rounded-xl mb-5 space-y-1.5" style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid ${T.borderSubtle}` }}>
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: T.textMuted }}>Your XP</span>
                                        <span className="font-semibold tabular-nums" style={{ color: T.textPrimary }}>{currentXP.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: T.textMuted }}>Cost</span>
                                        <span className="font-semibold tabular-nums" style={{ color: '#F87171' }}>-{PREMIUM_XP_COST}</span>
                                    </div>
                                    <div className="pt-1.5 flex justify-between text-[13px]" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                                        <span style={{ color: T.textMuted }}>Remaining</span>
                                        <span className="font-semibold tabular-nums" style={{ color: '#34D399' }}>{(currentXP - PREMIUM_XP_COST).toLocaleString()}</span>
                                    </div>
                                </div>

                                {purchaseError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-left" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F87171' }} />
                                        <p className="text-[12px]" style={{ color: '#F87171' }}>{purchaseError}</p>
                                    </div>
                                )}

                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        disabled={purchasing}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                                        style={{ background: `rgba(255,255,255,0.05)`, color: T.textMuted, border: `1px solid ${T.borderSubtle}` }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchasing}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2"
                                        style={{ background: T.primary }}
                                    >
                                        {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4" /> Confirm</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Success Toast ─── */}
            <AnimatePresence>
                {purchaseSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl flex items-center gap-2 text-[13px] font-semibold text-white"
                        style={{ background: '#059669' }}
                    >
                        <CheckCircle className="w-4 h-4" />
                        Welcome to Premium!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
