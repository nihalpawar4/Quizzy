'use client';

/**
 * Quizy Premium — Production-ready premium upgrade page.
 * Blue brand identity · Linear-inspired polish · Bento feature grid.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
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
    Loader2,
    AlertCircle,
    Gift,
    ChevronRight,
    Award,
    Rocket,
    User,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PREMIUM_XP_COST } from '@/lib/constants';
import {
    BUBBLE_THEMES,
    PROFILE_FRAMES,
    PREMIUM_BADGES,
    activatePremiumTrial,
    type BubbleTheme,
    type ProfileFrameType,
    type BadgeType,
} from '@/services/premiumService';
import ProfileFrame from '@/components/ui/ProfileFrame';
import PremiumBadge from '@/components/ui/PremiumBadge';
import MotivationalLoader from '@/components/ui/MotivationalLoader';

// ─── Theme-aware design tokens ───────────────────────────────────────
function getPremiumTheme(isDark: boolean) {
    return {
        isDark,
        blue: '#1650EB',
        violet: '#8B5CF6',
        amber: '#F59E0B',
        emerald: '#10B981',
        rose: '#F43F5E',
        bg: isDark ? '#0a0f1e' : '#f1f5f9',
        text: isDark ? '#ffffff' : '#0f172a',
        textMuted: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderSubtle: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        surface: isDark ? 'rgba(15,20,35,0.75)' : '#ffffff',
        headerBg: isDark ? 'rgba(10,15,30,0.92)' : 'rgba(255,255,255,0.92)',
        accentText: isDark ? '#93B4FF' : '#1650EB',
        progressTrack: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        bannerStyle: {
            background: isDark ? 'rgba(15,20,35,0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 16,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        } satisfies React.CSSProperties,
    };
}

type PremiumTheme = ReturnType<typeof getPremiumTheme>;

const THEME_META: Record<string, { name: string; color: string; glow: string }> = {
    default: { name: 'Ocean', color: '#3B82F6', glow: 'rgba(59,130,246,0.5)' },
    fire: { name: 'Lightning', color: '#F59E0B', glow: 'rgba(245,158,11,0.5)' },
    neon: { name: 'Aurora', color: '#10B981', glow: 'rgba(16,185,129,0.5)' },
    water: { name: 'Frost', color: '#67E8F9', glow: 'rgba(103,232,249,0.45)' },
    sparkle: { name: 'Galaxy', color: '#8B5CF6', glow: 'rgba(139,92,246,0.5)' },
};

const FRAME_DISPLAY: { id: ProfileFrameType; label: string }[] = [
    { id: 'diamond', label: 'Diamond' },
    { id: 'gold', label: 'Scholar' },
    { id: 'fire', label: 'Cosmic' },
    { id: 'aurora', label: 'Aurora' },
];

const ANALYTICS_STATS = [
    { label: 'Accuracy', value: '87%', color: '#10B981', data: [62, 68, 71, 75, 78, 82, 87] },
    { label: 'Rank Growth', value: 'Top 3%', color: '#1650EB', data: [40, 48, 55, 62, 70, 78, 88] },
    { label: 'XP Earned', value: '12.4k', color: '#8B5CF6', data: [30, 42, 50, 58, 65, 72, 80] },
    { label: 'Study Time', value: '24.6h', color: '#F59E0B', data: [55, 58, 60, 63, 68, 72, 76] },
];

const SOCIAL_STATS = [
    { value: '+32%', label: 'Faster Progress', color: '#1650EB' },
    { value: '+2.8x', label: 'Higher XP Gain', color: '#8B5CF6' },
    { value: '+48%', label: 'Better Accuracy', color: '#10B981' },
];

// ─── Background ──────────────────────────────────────────────────────
function PremiumBackground({ p }: { p: PremiumTheme }) {
    if (p.isDark) {
        return (
            <>
                <div className="premium-bg-mesh">
                    <div className="premium-bg-blob premium-bg-blob--1" />
                    <div className="premium-bg-blob premium-bg-blob--2" />
                    <div className="premium-bg-blob premium-bg-blob--3" />
                </div>
                <div className="premium-noise" />
            </>
        );
    }
    return (
        <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 40%, #f1f5f9 100%)',
            }}
        />
    );
}


// ─── Single XP Progress Bar ───────────────────────────────────────────
function XPProgressBar({ p, currentXP, maxXP }: { p: PremiumTheme; currentXP: number; maxXP: number }) {
    const pct = Math.min(currentXP / maxXP, 1);
    const remaining = Math.max(0, maxXP - currentXP);

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-2 tabular-nums" style={{ color: p.textMuted }}>
                <span>{currentXP} XP</span>
                <span className="font-medium" style={{ color: p.violet }}>{remaining} XP remaining</span>
                <span>{maxXP} XP</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: p.progressTrack }}>
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #1650EB, #8B5CF6, #F59E0B)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
            </div>
            <p className="text-[11px] text-center mt-2 tabular-nums" style={{ color: p.textMuted }}>
                {Math.round(pct * 100)}% toward Premium
            </p>
        </div>
    );
}

// ─── Magnetic CTA Button ─────────────────────────────────────────────
function MagneticCTA({
    children,
    onClick,
    disabled,
    className = '',
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 300, damping: 20 });
    const springY = useSpring(y, { stiffness: 300, damping: 20 });

    const handleMove = (e: React.MouseEvent) => {
        if (disabled || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.18);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.18);
    };

    const handleLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-bold text-white transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]'} ${className}`}
            style={{
                x: springX,
                y: springY,
                ...(disabled
                    ? { background: '#1e293b' }
                    : {
                          background: 'linear-gradient(135deg, #1650EB, #8B5CF6)',
                          boxShadow: '0 4px 20px rgba(22,80,235,0.35)',
                      }),
            }}
        >
            {children}
        </motion.button>
    );
}

// ─── Animated Bubble ─────────────────────────────────────────────────
function AnimBubble({ color, glow, size = 36, delay = 0 }: { color: string; glow: string; size?: number; delay?: number }) {
    return (
        <motion.div
            className="relative rounded-full flex-shrink-0"
            style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), ${color}cc 40%, ${color}88 70%, ${color}44)`,
                boxShadow: `0 0 16px ${glow}, inset 0 -4px 10px rgba(0,0,0,0.15)`,
            }}
            animate={{ scale: [1, 1.08, 1], y: [0, -5, 0] }}
            transition={{ duration: 2.8, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
            <div
                className="absolute rounded-full"
                style={{
                    width: size * 0.28,
                    height: size * 0.16,
                    top: size * 0.14,
                    left: size * 0.18,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.7), transparent)',
                }}
            />
        </motion.div>
    );
}

// ─── Mini Sparkline ──────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const h = 24;
    const w = 100;
    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="premium-sparkline" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#grad-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Static frame preview (no rotation) ───────────────────────────────
const FRAME_RING_STATIC: Record<ProfileFrameType, { ring: string; glow: string } | null> = {
    none: null,
    gold: { ring: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fcd34d)', glow: '0 0 10px rgba(251,191,36,0.35)' },
    diamond: { ring: 'linear-gradient(135deg, #93c5fd, #dbeafe, #60a5fa)', glow: '0 0 10px rgba(96,165,250,0.35)' },
    fire: { ring: 'linear-gradient(135deg, #f97316, #ef4444, #f97316)', glow: '0 0 10px rgba(239,68,68,0.35)' },
    aurora: { ring: 'linear-gradient(135deg, #34d399, #60a5fa, #a78bfa)', glow: '0 0 10px rgba(96,165,250,0.3)' },
};

function StaticFramePreview({ frameType, size = 36, p }: { frameType: ProfileFrameType; size?: number; p: PremiumTheme }) {
    const cfg = FRAME_RING_STATIC[frameType];
    if (!cfg) return null;
    const ringWidth = Math.max(2, Math.round(size * 0.06));
    const ringGap = Math.max(1, Math.round(size * 0.04));
    const containerSize = size + (ringWidth + ringGap) * 2;

    return (
        <div
            className="relative inline-flex items-center justify-center rounded-full flex-shrink-0"
            style={{
                width: containerSize,
                height: containerSize,
                background: cfg.ring,
                boxShadow: cfg.glow,
                padding: ringWidth + ringGap,
            }}
        >
            <div
                className="rounded-full flex items-center justify-center overflow-hidden"
                style={{
                    width: size + ringGap * 2,
                    height: size + ringGap * 2,
                    padding: ringGap,
                    background: p.isDark ? '#0f172a' : '#ffffff',
                }}
            >
                <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                        width: size,
                        height: size,
                        background: 'linear-gradient(135deg, #1650EB, #6095DB)',
                    }}
                >
                    <User className="text-white" style={{ width: size * 0.42, height: size * 0.42 }} />
                </div>
            </div>
        </div>
    );
}

// ─── Section header (open layout — no box) ───────────────────────────
function FeatureSection({
    p,
    title,
    subtitle,
    icon: Icon,
    iconColor,
    children,
    delay = 0,
}: {
    p: PremiumTheme;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35 }}
            className="py-1"
        >
            <div className="flex items-center gap-3 mb-3 px-0.5">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}28` }}
                >
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
                <div>
                    <p className="text-[13px] font-bold" style={{ color: p.text }}>{title}</p>
                    {subtitle && <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>{subtitle}</p>}
                </div>
            </div>
            {children}
        </motion.div>
    );
}

// ─── Horizontal Feature Banner (boxed sections) ──────────────────────
function FeatureBanner({
    p,
    title,
    subtitle,
    icon: Icon,
    iconColor,
    children,
    delay = 0,
}: {
    p: PremiumTheme;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="p-4"
            style={p.bannerStyle}
        >
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}
                >
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: p.text }}>{title}</p>
                    {subtitle && <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>{subtitle}</p>}
                </div>
            </div>
            {children}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
export default function PremiumPage() {
    const { resolvedTheme } = useTheme();
    const p = useMemo(() => getPremiumTheme(resolvedTheme === 'dark'), [resolvedTheme]);
    const { user, loading: authLoading, refreshUser } = useAuth();
    const {
        isPremium,
        isTrial,
        trialExpiresAt,
        hasClaimedTrial,
        activeBubbleTheme,
        activeProfileFrame,
        activeBadge,
        streakShieldsRemaining,
        purchasePremium,
        setBubbleTheme,
        setProfileFrame,
        setBadge,
        activateXPBoost,
    } = usePremium();
    const router = useRouter();

    const [showConfirm, setShowConfirm] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [activeSection, setActiveSection] = useState<'features' | 'customize'>('features');
    const [boostActivating, setBoostActivating] = useState(false);
    const [trialClaiming, setTrialClaiming] = useState(false);
    const [trialError, setTrialError] = useState<string | null>(null);

    const currentXP = user?.xp || 0;
    const canAfford = currentXP >= PREMIUM_XP_COST;

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

    const handleClaimTrial = useCallback(async () => {
        if (!user?.uid || trialClaiming) return;
        setTrialClaiming(true);
        setTrialError(null);
        try {
            const result = await activatePremiumTrial(user.uid, 24);
            if (result.success) {
                await refreshUser();
            } else {
                setTrialError(result.error || 'Could not activate trial.');
            }
        } catch (e) {
            console.error(e);
            setTrialError('Something went wrong. Please try again.');
        }
        setTrialClaiming(false);
    }, [user?.uid, trialClaiming, refreshUser]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: p.bg }}>
                <MotivationalLoader />
            </div>
        );
    }

    const trialTimeLeft = trialExpiresAt
        ? Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
        : 0;

    return (
        <div className="min-h-screen relative" style={{ background: p.bg, color: p.text }}>
            <PremiumBackground p={p} />

            {/* ─── Header ─── */}
            <header
                className="sticky top-0 z-50 backdrop-blur-xl border-b"
                style={{ background: p.headerBg, borderColor: p.border }}
            >
                <div className="relative max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
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
                            <Crown className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h1 className="typo-subheading text-[15px]" style={{ color: p.text }}>Quizy Premium</h1>
                    </div>
                    {isPremium ? (
                        <span
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full text-white"
                            style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)' }}
                        >
                            {isTrial ? `Trial · ${trialTimeLeft}h` : 'Active'}
                        </span>
                    ) : (
                        <span
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
                            style={{ background: p.isDark ? 'rgba(22,80,235,0.12)' : 'rgba(22,80,235,0.08)', color: p.accentText, border: `1px solid ${p.border}` }}
                        >
                            <Sparkles className="w-3 h-3" />
                            <span className="tabular-nums">{currentXP} XP</span>
                        </span>
                    )}
                </div>
            </header>

            <main className="relative z-10 max-w-lg mx-auto px-4 pb-24">

                {/* ═══ HERO ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mt-4 p-5 relative overflow-hidden"
                    style={p.bannerStyle}
                >
                    <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mb-3"
                        style={{ background: p.isDark ? 'rgba(22,80,235,0.12)' : 'rgba(22,80,235,0.08)', color: p.accentText, border: `1px solid ${p.border}`, letterSpacing: '0.08em' }}
                    >
                        <Crown className="w-3 h-3" />
                        QUIZY+
                    </span>

                    <h2 className="typo-heading text-[22px] leading-tight tracking-tight" style={{ color: p.text }}>
                        Unlock Your Potential
                    </h2>
                    <p className="text-[13px] mt-1.5 mb-4" style={{ color: p.textMuted }}>
                        Premium tools designed for ambitious learners.
                    </p>

                    {!isPremium ? (
                        <>
                            <MagneticCTA onClick={() => setShowConfirm(true)} disabled={!canAfford} className="w-full justify-center">
                                <Crown className="w-4 h-4" />
                                Unlock Premium — {PREMIUM_XP_COST} XP
                                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                            </MagneticCTA>
                            <XPProgressBar p={p} currentXP={currentXP} maxXP={PREMIUM_XP_COST} />
                        </>
                    ) : (
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium"
                            style={{ background: 'rgba(16,185,129,0.12)', color: p.emerald, border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isTrial ? `Trial · ${trialTimeLeft}h remaining` : 'Lifetime Premium'}
                        </div>
                    )}
                </motion.div>

                {/* ═══ FREE TRIAL ═══ */}
                {!isPremium && !hasClaimedTrial && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-3 p-4"
                        style={p.bannerStyle}
                    >
                        <div className="flex items-center gap-3.5">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(22,80,235,0.2))', border: `1px solid ${p.border}` }}
                            >
                                <Gift className="w-5 h-5" style={{ color: p.violet }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold" style={{ color: p.text }}>Free 24h Trial</p>
                                <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>Try every premium feature for 24 hours — first time only.</p>
                            </div>
                            <button
                                onClick={handleClaimTrial}
                                disabled={trialClaiming}
                                className="text-[12px] font-bold px-4 py-2.5 rounded-xl text-white flex items-center gap-1 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)', boxShadow: '0 4px 14px rgba(22,80,235,0.25)' }}
                            >
                                {trialClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Claim <ChevronRight className="w-3.5 h-3.5" /></>}
                            </button>
                        </div>
                        {trialError && (
                            <div
                                className="flex items-center gap-2 p-2.5 rounded-lg mt-3 text-left"
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                            >
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                <p className="text-[11px] text-red-400">{trialError}</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Already-claimed trial indicator */}
                {!isPremium && hasClaimedTrial && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-3 p-4 flex items-center gap-3.5"
                        style={p.bannerStyle}
                    >
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: p.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${p.border}` }}
                        >
                            <Gift className="w-5 h-5" style={{ color: p.textMuted }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold" style={{ color: p.text }}>Free Trial Used</p>
                            <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>You&apos;ve already claimed your 24h trial. Earn {PREMIUM_XP_COST} XP to unlock premium forever!</p>
                        </div>
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: p.textMuted }} />
                    </motion.div>
                )}

                {/* ═══ TABS (premium users) ═══ */}
                {isPremium && (
                    <div className="mt-4 flex gap-1 p-1 rounded-2xl" style={p.bannerStyle}>
                        {(['features', 'customize'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSection(tab)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all capitalize"
                                style={{
                                    background: activeSection === tab ? (p.isDark ? 'rgba(22,80,235,0.15)' : 'rgba(22,80,235,0.08)') : 'transparent',
                                    color: activeSection === tab ? p.accentText : p.textMuted,
                                    border: activeSection === tab ? `1px solid ${p.border}` : '1px solid transparent',
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                )}

                {/* ═══ FEATURES ═══ */}
                {(activeSection === 'features' || !isPremium) && (
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                            <h3 className="typo-subheading text-[13px]" style={{ color: p.textMuted }}>Premium Features</h3>
                            <span className="text-[11px] font-medium flex items-center gap-0.5" style={{ color: p.accentText }}>
                                See all <ChevronRight className="w-3 h-3" />
                            </span>
                        </div>

                        <FeatureSection p={p} title="Bubble Themes" subtitle="5 interactive touch effects" icon={Sparkles} iconColor={p.violet} delay={0.12}>
                            <div className="flex items-end justify-between gap-1 px-1 py-3">
                                {Object.entries(THEME_META).map(([id, meta], i) => (
                                    <div key={id} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <AnimBubble color={meta.color} glow={meta.glow} size={40} delay={i * 0.15} />
                                        <span className="text-[10px] font-semibold text-center" style={{ color: meta.color }}>{meta.name}</span>
                                    </div>
                                ))}
                            </div>
                        </FeatureSection>

                        <FeatureSection p={p} title="Profile Frames" subtitle="Animated avatar borders" icon={Award} iconColor={p.amber} delay={0.16}>
                            <div className="flex items-center justify-between gap-2 px-1 py-3">
                                {FRAME_DISPLAY.map((frame) => (
                                    <div key={`${frame.id}-${frame.label}`} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <StaticFramePreview frameType={frame.id} size={36} p={p} />
                                        <span className="text-[10px] font-medium text-center" style={{ color: p.textMuted }}>{frame.label}</span>
                                    </div>
                                ))}
                            </div>
                        </FeatureSection>

                        <FeatureBanner p={p} title="Advanced Analytics" subtitle="Track · Improve · Rank up" icon={BarChart3} iconColor={p.emerald} delay={0.2}>
                            <div className="grid grid-cols-4 gap-2">
                                {ANALYTICS_STATS.map((stat) => (
                                    <div key={stat.label} className="p-2 rounded-xl text-center" style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}18` }}>
                                        <p className="text-[8px] font-semibold uppercase" style={{ color: `${stat.color}bb` }}>{stat.label}</p>
                                        <p className="text-[13px] font-extrabold mt-0.5 tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                                        <Sparkline data={stat.data} color={stat.color} />
                                    </div>
                                ))}
                            </div>
                        </FeatureBanner>

                        <FeatureBanner p={p} title="Premium Badges" subtitle="Exclusive status badges" icon={Star} iconColor={p.rose} delay={0.24}>
                            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
                                {PREMIUM_BADGES.filter((b) => b.id !== 'none').map((badge) => (
                                    <div key={badge.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 px-2 py-1.5 rounded-xl" style={{ background: p.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${p.borderSubtle}` }}>
                                        <PremiumBadge badgeType={badge.id as BadgeType} size="lg" className="!bg-transparent !px-0 !py-0" />
                                        <span className="text-[10px] font-medium" style={{ color: p.textMuted }}>{badge.label}</span>
                                    </div>
                                ))}
                            </div>
                        </FeatureBanner>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.28 }}
                            className="p-4 flex items-center gap-3"
                            style={p.bannerStyle}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(22,80,235,0.2))', border: `1px solid ${p.border}` }}
                            >
                                <Rocket className="w-5 h-5" style={{ color: p.amber }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold" style={{ color: p.text }}>XP Boost & More</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {[
                                        { label: '1.2x XP', color: p.blue },
                                        { label: 'Weekly Challenges', color: p.violet },
                                        { label: 'Bonus Rewards', color: p.emerald },
                                        { label: 'Exclusive Events', color: p.amber },
                                    ].map((item) => (
                                        <span key={item.label} className="text-[10px] font-medium" style={{ color: item.color }}>{item.label}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.32 }}
                            className="p-4"
                            style={p.bannerStyle}
                        >
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-[13px] font-bold" style={{ color: p.text }}>Trusted by Top Learners</p>
                                    <div className="flex items-center gap-0.5 mt-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} className="w-3 h-3 fill-current" style={{ color: p.amber }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {SOCIAL_STATS.map((s, i) => (
                                    <div key={i} className="p-2.5 rounded-xl text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}18` }}>
                                        <p className="text-[14px] font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color: p.textMuted }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ═══ CUSTOMIZE ═══ */}
                {isPremium && activeSection === 'customize' && (
                    <div className="mt-5 space-y-6">
                        <section>
                            <h3 className="typo-subheading text-[13px] mb-3 flex items-center gap-2" style={{ color: p.text }}>
                                <Sparkles className="w-4 h-4" style={{ color: p.blue }} />
                                Bubble Theme
                            </h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {BUBBLE_THEMES.map((theme) => {
                                    const meta = THEME_META[theme.id] || { name: theme.label, color: p.blue, glow: 'rgba(22,80,235,0.5)' };
                                    const isActive = activeBubbleTheme === theme.id;
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => setBubbleTheme(theme.id as BubbleTheme)}
                                            className="p-3.5 rounded-2xl text-left transition-all"
                                            style={{
                                                ...p.bannerStyle,
                                                border: `1.5px solid ${isActive ? meta.color : p.border}`,
                                                background: isActive ? `${meta.color}10` : p.surface,
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5 mb-1.5">
                                                <AnimBubble color={meta.color} glow={meta.glow} size={24} />
                                                <p className="text-[12px] font-bold" style={{ color: p.text }}>{meta.name}</p>
                                            </div>
                                            <p className="text-[10px]" style={{ color: p.textMuted }}>{theme.description}</p>
                                            {isActive && <CheckCircle className="w-3.5 h-3.5 mt-1.5" style={{ color: meta.color }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="typo-subheading text-[13px] mb-3 flex items-center gap-2" style={{ color: p.text }}>
                                <Award className="w-4 h-4" style={{ color: p.blue }} />
                                Profile Frame
                            </h3>
                            <div className="grid grid-cols-3 gap-2.5">
                                {PROFILE_FRAMES.map((frame) => {
                                    const isActive = activeProfileFrame === frame.id;
                                    return (
                                        <button
                                            key={frame.id}
                                            onClick={() => setProfileFrame(frame.id as ProfileFrameType)}
                                            className="flex flex-col items-center p-3 rounded-2xl transition-all"
                                            style={{
                                                ...p.bannerStyle,
                                                border: `1.5px solid ${isActive ? p.blue : p.border}`,
                                                background: isActive ? 'rgba(22,80,235,0.1)' : p.surface,
                                            }}
                                        >
                                            <ProfileFrame
                                                frameType={frame.id as ProfileFrameType}
                                                photoURL={user?.photoURL}
                                                userName={user?.name || 'U'}
                                                size={40}
                                            />
                                            <p className="text-[10px] font-bold mt-2" style={{ color: p.text }}>{frame.label}</p>
                                            {isActive && <CheckCircle className="w-3 h-3 mt-1" style={{ color: p.blue }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="typo-subheading text-[13px] mb-3 flex items-center gap-2" style={{ color: p.text }}>
                                <Star className="w-4 h-4" style={{ color: p.blue }} />
                                Badge
                            </h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {PREMIUM_BADGES.map((badge) => {
                                    const isActive = activeBadge === badge.id;
                                    return (
                                        <button
                                            key={badge.id}
                                            onClick={() => setBadge(badge.id as BadgeType)}
                                            className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                                            style={{
                                                ...p.bannerStyle,
                                                border: `1.5px solid ${isActive ? p.blue : p.border}`,
                                                background: isActive ? 'rgba(22,80,235,0.1)' : p.surface,
                                            }}
                                        >
                                            {badge.id === 'none' ? (
                                                <span className="text-lg" style={{ color: p.textMuted }}>—</span>
                                            ) : (
                                                <PremiumBadge badgeType={badge.id as BadgeType} size="lg" className="!bg-transparent !px-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold" style={{ color: p.text }}>{badge.label}</p>
                                                <p className="text-[10px]" style={{ color: p.textMuted }}>{badge.description}</p>
                                            </div>
                                            {isActive && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: p.blue }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="typo-subheading text-[13px] mb-3 flex items-center gap-2" style={{ color: p.text }}>
                                <Zap className="w-4 h-4" style={{ color: p.blue }} />
                                Quick Actions
                            </h3>
                            <div className="space-y-2.5">
                                <button
                                    onClick={handleActivateBoost}
                                    disabled={boostActivating}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                                    style={p.bannerStyle}
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)' }}
                                    >
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold" style={{ color: p.text }}>Activate 2X XP Boost</p>
                                        <p className="text-[11px]" style={{ color: p.textMuted }}>Double XP for 30 minutes</p>
                                    </div>
                                    {boostActivating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: p.blue }} />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" style={{ color: p.textMuted }} />
                                    )}
                                </button>

                                <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={p.bannerStyle}>
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #06B6D4, #0369A1)' }}
                                    >
                                        <Shield className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold" style={{ color: p.text }}>Streak Shields</p>
                                        <p className="text-[11px]" style={{ color: p.textMuted }}>Protects your streak</p>
                                    </div>
                                    <span className="text-[16px] font-bold tabular-nums" style={{ color: p.blue }}>
                                        {streakShieldsRemaining}
                                    </span>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {/* ═══ PURCHASE MODAL ═══ */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        style={{ background: p.isDark ? 'rgba(1,8,18,0.88)' : 'rgba(15,23,42,0.45)', backdropFilter: 'blur(12px)' }}
                        onClick={() => !purchasing && setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 8 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="w-full max-w-sm p-6 rounded-3xl"
                            style={p.bannerStyle}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div
                                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #1650EB, #8B5CF6)',
                                        boxShadow: '0 8px 32px rgba(22,80,235,0.3)',
                                    }}
                                >
                                    <Crown className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="typo-heading text-lg mb-1.5" style={{ color: p.text }}>Confirm Purchase</h3>
                                <p className="text-[13px] mb-5" style={{ color: p.textMuted }}>
                                    Unlock all premium features for{' '}
                                    <span className="font-bold" style={{ color: p.blue }}>
                                        {PREMIUM_XP_COST} XP
                                    </span>
                                    .
                                </p>

                                <div
                                    className="p-3.5 rounded-xl mb-5 space-y-2 text-left"
                                    style={{ background: p.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${p.borderSubtle}` }}
                                >
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: p.textMuted }}>Your XP</span>
                                        <span className="font-semibold tabular-nums" style={{ color: p.text }}>{currentXP.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: p.textMuted }}>Cost</span>
                                        <span className="font-semibold text-red-400 tabular-nums">-{PREMIUM_XP_COST}</span>
                                    </div>
                                    <div className="pt-2 flex justify-between text-[13px]" style={{ borderTop: `1px solid ${p.borderSubtle}` }}>
                                        <span style={{ color: p.textMuted }}>Remaining</span>
                                        <span className="font-semibold tabular-nums" style={{ color: p.emerald }}>
                                            {(currentXP - PREMIUM_XP_COST).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {purchaseError && (
                                    <div
                                        className="flex items-center gap-2 p-3 rounded-xl mb-4 text-left"
                                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-[12px] text-red-400">{purchaseError}</p>
                                    </div>
                                )}

                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        disabled={purchasing}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                                        style={{ background: p.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${p.borderSubtle}`, color: p.textMuted }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchasing}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all flex items-center justify-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #1650EB, #8B5CF6)', boxShadow: '0 4px 16px rgba(22,80,235,0.25)' }}
                                    >
                                        {purchasing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Crown className="w-4 h-4" /> Confirm
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {purchaseSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-2xl flex items-center gap-2 text-[13px] font-bold text-white shadow-2xl"
                        style={{
                            background: 'linear-gradient(135deg, #1650EB, #8B5CF6)',
                            boxShadow: '0 8px 32px rgba(22,80,235,0.35)',
                        }}
                    >
                        <CheckCircle className="w-4 h-4" />
                        Welcome to Premium!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
