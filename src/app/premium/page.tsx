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
    Timer,
    Check,
    Flame,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PREMIUM_XP_COST, PREMIUM_TIERS, type PremiumTier } from '@/lib/constants';
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
import { getResultsByStudent } from '@/lib/services';
import type { TestResult } from '@/types';

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

// Analytics stats are now computed from real user data (see useRealAnalytics hook)

// ─── Compute real analytics from test results ─────────────────────────
function useRealAnalytics(userId: string | undefined, userXP: number) {
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        getResultsByStudent(userId)
            .then(setResults)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    return useMemo(() => {
        if (loading || results.length === 0) {
            // Return zeros / defaults for new users
            const emptyAnalytics = [
                { label: 'ACCURACY', value: results.length === 0 && !loading ? '—' : '...', color: '#10B981', data: [0] },
                { label: 'TESTS DONE', value: results.length === 0 && !loading ? '0' : '...', color: '#1650EB', data: [0] },
                { label: 'XP EARNED', value: results.length === 0 && !loading ? '0' : '...', color: '#8B5CF6', data: [0] },
                { label: 'STUDY TIME', value: results.length === 0 && !loading ? '0m' : '...', color: '#F59E0B', data: [0] },
            ];
            const emptySocial = [
                { value: '0', label: 'Tests Completed', color: '#1650EB' },
                { value: '0', label: 'XP Earned', color: '#8B5CF6' },
                { value: '—', label: 'Avg Accuracy', color: '#10B981' },
            ];
            return { analyticsStats: emptyAnalytics, socialStats: emptySocial, loading };
        }

        // ── Compute accuracy ──
        const scorableResults = results.filter(r => {
            if (r.isPdfTest) return r.pdfEvaluated && r.pdfMaxMarks && r.pdfMaxMarks > 0;
            if (r.evaluationStatus === 'pending' || r.evaluationStatus === 'under_review' || r.evaluationStatus === 'evaluated') return false;
            if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.totalMarks > 0 && r.marksObtained !== undefined) return true;
            return r.totalQuestions > 0;
        });

        const accuracies = scorableResults.map(r => {
            if (r.isPdfTest && r.pdfEvaluated && r.pdfMaxMarks) return ((r.pdfMarksAwarded || 0) / r.pdfMaxMarks) * 100;
            if (r.evaluationStatus === 'published' && (r.evaluationMode === 'manual' || r.evaluationMode === 'hybrid') && r.totalMarks && r.totalMarks > 0 && r.marksObtained !== undefined) return (r.marksObtained / r.totalMarks) * 100;
            return r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0;
        });
        const avgAccuracy = accuracies.length > 0 ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : 0;

        // Build sparkline data from last 7 test accuracies (oldest → newest)
        const last7Accuracies = accuracies.slice(0, 7).reverse();
        const accuracySparkline = last7Accuracies.length > 0 ? last7Accuracies : [0];

        // ── Tests completed ──
        const testsCompleted = results.length;

        // ── XP ──
        const formattedXP = userXP >= 1000 ? `${(userXP / 1000).toFixed(1)}k` : String(userXP);

        // ── Study time ──
        const totalSeconds = results.reduce((sum, r) => sum + (r.timeTakenSeconds || 0), 0);
        const totalMinutes = Math.round(totalSeconds / 60);
        const studyTimeStr = totalMinutes >= 60
            ? `${(totalMinutes / 60).toFixed(1)}h`
            : `${totalMinutes}m`;

        // Build sparkline from cumulative tests over time (last 7 data points)
        const testsSparkline = results.length >= 2
            ? results.slice(0, 7).reverse().map((_, i) => i + 1)
            : [results.length];

        // XP sparkline: just show current as a point
        const xpSparkline = [Math.max(1, userXP * 0.3), Math.max(1, userXP * 0.5), Math.max(1, userXP * 0.7), Math.max(1, userXP)];

        // Study time sparkline
        const timeSparkline = results.length >= 2
            ? results.slice(0, 7).reverse().map(r => (r.timeTakenSeconds || 0) / 60)
            : [totalMinutes];

        const analyticsStats = [
            { label: 'ACCURACY', value: `${avgAccuracy}%`, color: '#10B981', data: accuracySparkline },
            { label: 'TESTS DONE', value: String(testsCompleted), color: '#1650EB', data: testsSparkline },
            { label: 'XP EARNED', value: formattedXP, color: '#8B5CF6', data: xpSparkline },
            { label: 'STUDY TIME', value: studyTimeStr, color: '#F59E0B', data: timeSparkline },
        ];

        // ── Social proof stats (real data) ──
        const socialStats = [
            { value: String(testsCompleted), label: 'Tests Completed', color: '#1650EB' },
            { value: formattedXP, label: 'Total XP', color: '#8B5CF6' },
            { value: accuracies.length > 0 ? `${avgAccuracy}%` : '—', label: 'Avg Accuracy', color: '#10B981' },
        ];

        return { analyticsStats, socialStats, loading };
    }, [results, loading, userXP]);
}

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

// ─── SVG Tier Illustration Icons ─────────────────────────────────────
function TierIcon({ type, size = 32, color }: { type: 'bolt' | 'crown' | 'gem'; size?: number; color: string }) {
    if (type === 'bolt') {
        return (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
                <defs>
                    <linearGradient id="bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="50%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                    <filter id="bolt-glow">
                        <feGaussianBlur stdDeviation="2" result="glow" />
                        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <circle cx="24" cy="24" r="20" fill="url(#bolt-grad)" opacity="0.15" />
                <circle cx="24" cy="24" r="14" fill="url(#bolt-grad)" opacity="0.25" />
                <path d="M26.5 8L15 26h7.5L20 40l13-18h-8l1.5-14z" fill="url(#bolt-grad)" filter="url(#bolt-glow)" />
                <path d="M26.5 8L15 26h7.5L20 40l13-18h-8l1.5-14z" fill="white" opacity="0.3" />
                <path d="M25 12l-1 10h6l-9 14 3-12h-6l7-12z" fill="white" opacity="0.15" />
            </svg>
        );
    }
    if (type === 'crown') {
        return (
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
                <defs>
                    <linearGradient id="crown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#C4B5FD" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                    <filter id="crown-glow">
                        <feGaussianBlur stdDeviation="1.5" result="glow" />
                        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <circle cx="24" cy="24" r="20" fill="url(#crown-grad)" opacity="0.12" />
                <circle cx="24" cy="24" r="14" fill="url(#crown-grad)" opacity="0.2" />
                <path d="M10 32l4-16 6 8 4-10 4 10 6-8 4 16H10z" fill="url(#crown-grad)" filter="url(#crown-glow)" />
                <path d="M10 32l4-16 6 8 4-10 4 10 6-8 4 16H10z" fill="white" opacity="0.25" />
                <circle cx="14" cy="16" r="2" fill="#C4B5FD" opacity="0.8" />
                <circle cx="24" cy="14" r="2.5" fill="#E9D5FF" opacity="0.9" />
                <circle cx="34" cy="16" r="2" fill="#C4B5FD" opacity="0.8" />
                <rect x="10" y="32" width="28" height="4" rx="2" fill="url(#crown-grad)" opacity="0.6" />
                <rect x="10" y="32" width="28" height="4" rx="2" fill="white" opacity="0.15" />
            </svg>
        );
    }
    // gem
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            <defs>
                <linearGradient id="gem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="40%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="gem-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <filter id="gem-glow">
                    <feGaussianBlur stdDeviation="2" result="glow" />
                    <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#gem-grad)" opacity="0.12" />
            <circle cx="24" cy="24" r="14" fill="url(#gem-grad)" opacity="0.18" />
            <path d="M24 8l10 10-10 22L14 18l10-10z" fill="url(#gem-grad)" filter="url(#gem-glow)" />
            <path d="M14 18h20L24 40 14 18z" fill="url(#gem-grad)" opacity="0.8" />
            <path d="M14 18l10-10 10 10H14z" fill="url(#gem-grad)" />
            <path d="M14 18l10-10 10 10H14z" fill="white" opacity="0.3" />
            <path d="M24 8l-3 10h6L24 8z" fill="white" opacity="0.2" />
            <path d="M16 19l8 18 8-18" stroke="white" strokeWidth="0.5" opacity="0.3" fill="none" />
            <path d="M14 18l10 22" stroke="url(#gem-shine)" strokeWidth="1" opacity="0.4" />
        </svg>
    );
}

// ─── Limited Time Offer Countdown (7-day rolling) ────────────────────
function useCountdown() {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // Offer resets every 7 days from a fixed weekly anchor (Monday 00:00 UTC)
        const getOfferEnd = () => {
            const now = new Date();
            const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
            const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
            const end = new Date(now);
            end.setUTCDate(now.getUTCDate() + daysUntilNextMonday);
            end.setUTCHours(0, 0, 0, 0);
            return end;
        };

        const update = () => {
            const now = new Date();
            const end = getOfferEnd();
            const diff = Math.max(0, end.getTime() - now.getTime());
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return timeLeft;
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
        purchasePremiumByTier,
        setBubbleTheme,
        setProfileFrame,
        setBadge,
        activateXPBoost,
    } = usePremium();
    const router = useRouter();
    const countdown = useCountdown();

    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedTier, setSelectedTier] = useState<typeof PREMIUM_TIERS[number] | null>(null);
    const [useDiscount, setUseDiscount] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [activeSection, setActiveSection] = useState<'features' | 'customize'>('features');
    const [boostActivating, setBoostActivating] = useState(false);
    const [trialClaiming, setTrialClaiming] = useState(false);
    const [trialError, setTrialError] = useState<string | null>(null);

    const currentXP = user?.xp || 0;
    const canAfford = currentXP >= PREMIUM_XP_COST;

    // Fetch real analytics from user's test results
    const { analyticsStats, socialStats } = useRealAnalytics(user?.uid, currentXP);

    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/login');
    }, [user, authLoading, router]);

    const handleSelectTier = useCallback((tier: typeof PREMIUM_TIERS[number]) => {
        setSelectedTier(tier);
        setUseDiscount(true);
        setPurchaseError(null);
        setShowConfirm(true);
    }, []);

    const handlePurchase = useCallback(async () => {
        if (!selectedTier) return;
        setPurchasing(true);
        setPurchaseError(null);
        const cost = useDiscount ? selectedTier.discountedPrice : selectedTier.price;
        const result = await purchasePremiumByTier(selectedTier.id, cost);
        if (result.success) {
            setPurchaseSuccess(true);
            await refreshUser();
            setShowConfirm(false);
            setSelectedTier(null);
            setTimeout(() => setPurchaseSuccess(false), 3000);
        } else {
            setPurchaseError(result.error || 'Purchase failed');
        }
        setPurchasing(false);
    }, [selectedTier, useDiscount, purchasePremiumByTier, refreshUser]);

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

            <main className="relative z-10 max-w-5xl mx-auto px-4 pb-24">

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

                    {isPremium && (
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium"
                            style={{ background: 'rgba(16,185,129,0.12)', color: p.emerald, border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isTrial ? `Trial · ${trialTimeLeft}h remaining` : 'Premium Active'}
                        </div>
                    )}
                </motion.div>

                {/* ═══ LIMITED TIME OFFER BANNER (vanishes when countdown expires) ═══ */}
                {!isPremium && (countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.4 }}
                        className="mt-3 p-3.5 relative overflow-hidden"
                        style={{
                            ...p.bannerStyle,
                            background: p.isDark
                                ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.06))'
                                : 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04))',
                            border: `1px solid ${p.isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)'}`,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.2))', border: '1px solid rgba(245,158,11,0.2)' }}
                            >
                                <Flame className="w-5 h-5" style={{ color: '#F59E0B' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold" style={{ color: p.text }}>
                                    🔥 Limited Time — Save 200 XP on all plans!
                                </p>
                                <p className="text-[10px] mt-0.5" style={{ color: p.textMuted }}>Offer ends in {countdown.days}d {countdown.hours}h</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {[{ val: countdown.days, label: 'd' }, { val: countdown.hours, label: 'h' }, { val: countdown.minutes, label: 'm' }, { val: countdown.seconds, label: 's' }].map((t, i) => (
                                    <div key={i} className="text-center">
                                        <span
                                            className="inline-block text-[11px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-md"
                                            style={{ background: p.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', color: '#F59E0B', minWidth: 24 }}
                                        >
                                            {String(t.val).padStart(2, '0')}{t.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ═══ SUBSCRIPTION TIERS + DESKTOP FEATURE PREVIEW ═══ */}
                {!isPremium && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between px-0.5 mb-3">
                            <h3 className="typo-subheading text-[13px]" style={{ color: p.textMuted }}>Choose Your Plan</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: p.isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                30 Days Access
                            </span>
                        </div>

                        {/* Tier cards */}
                        <div className="space-y-3">
                                {PREMIUM_TIERS.map((tier, index) => {
                                    const canAffordTier = currentXP >= tier.discountedPrice;
                                    return (
                                        <motion.div
                                            key={tier.id}
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                                            className="relative overflow-hidden"
                                            style={{
                                                ...p.bannerStyle,
                                                border: tier.highlighted
                                                    ? `1.5px solid ${tier.color}55`
                                                    : p.bannerStyle.border,
                                                boxShadow: tier.highlighted
                                                    ? `0 4px 24px ${tier.glow}, ${p.bannerStyle.boxShadow || 'none'}`
                                                    : p.bannerStyle.boxShadow,
                                            }}
                                        >
                                            {/* Popular badge */}
                                            {tier.highlighted && (
                                                <div
                                                    className="absolute top-0 right-0 text-[9px] font-extrabold text-white px-3 py-1 rounded-bl-xl"
                                                    style={{ background: tier.gradient, letterSpacing: '0.06em' }}
                                                >
                                                    ⭐ MOST POPULAR
                                                </div>
                                            )}

                                            <div className="p-4">
                                                {/* Tier header with SVG illustration */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <motion.div
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{ background: `${tier.color}12`, border: `1px solid ${tier.color}25` }}
                                                        animate={{ scale: [1, 1.04, 1] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                                                    >
                                                        <TierIcon type={tier.iconType} size={30} color={tier.color} />
                                                    </motion.div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-[15px] font-extrabold" style={{ color: p.text }}>{tier.name}</h4>
                                                            {tier.discount > 0 && (
                                                                <span
                                                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
                                                                >
                                                                    SAVE {tier.discount} XP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>{tier.tagline}</p>
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                <div className="flex items-baseline gap-2 mb-3 px-0.5">
                                                    <span className="text-[24px] font-black tabular-nums" style={{ color: tier.color }}>
                                                        {tier.discountedPrice}
                                                    </span>
                                                    <span className="text-[12px] font-bold" style={{ color: tier.color, opacity: 0.7 }}>XP</span>
                                                    <span className="text-[10px] font-medium" style={{ color: p.textMuted }}>/ {tier.duration}</span>
                                                    <span
                                                        className="text-[13px] font-semibold tabular-nums line-through ml-1"
                                                        style={{ color: p.textMuted, opacity: 0.5 }}
                                                    >
                                                        {tier.price} XP
                                                    </span>
                                                    <span className="flex-1" />
                                                    <span
                                                        className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                                        style={{ background: `${tier.color}12`, color: tier.color, border: `1px solid ${tier.color}25` }}
                                                    >
                                                        <Timer className="w-2.5 h-2.5" />
                                                        7 Days Left
                                                    </span>
                                                </div>

                                                {/* Features */}
                                                <div
                                                    className="rounded-xl p-3 mb-3"
                                                    style={{ background: p.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', border: `1px solid ${p.borderSubtle}` }}
                                                >
                                                    <div className={`grid gap-1.5 ${tier.features.length > 8 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                                        {tier.features.map((feature, fi) => (
                                                            <div key={fi} className="flex items-center gap-2">
                                                                <Check className="w-3 h-3 flex-shrink-0" style={{ color: tier.color }} />
                                                                <span className="text-[11px] font-medium" style={{ color: p.text, opacity: 0.85 }}>{feature}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* CTA */}
                                                <button
                                                    onClick={() => handleSelectTier(tier)}
                                                    disabled={!canAffordTier}
                                                    className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all flex items-center justify-center gap-2"
                                                    style={{
                                                        background: canAffordTier ? tier.gradient : (p.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                                                        color: canAffordTier ? '#ffffff' : p.textMuted,
                                                        boxShadow: canAffordTier ? `0 4px 16px ${tier.glow}` : 'none',
                                                        opacity: canAffordTier ? 1 : 0.5,
                                                        cursor: canAffordTier ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    {canAffordTier ? (
                                                        <>
                                                            <Crown className="w-3.5 h-3.5" />
                                                            Get {tier.name} — {tier.discountedPrice} XP
                                                            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            Need {tier.discountedPrice - currentXP} more XP
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Neon glow XP progress for this tier */}
                                            {!canAffordTier && (
                                                <div className="px-4 pb-3">
                                                    <div className="h-2 rounded-full overflow-hidden relative" style={{ background: p.progressTrack }}>
                                                        <motion.div
                                                            className="h-full rounded-full relative"
                                                            style={{
                                                                background: tier.gradient,
                                                                boxShadow: `0 0 8px ${tier.glow}, 0 0 16px ${tier.glow}, 0 0 24px ${tier.color}33`,
                                                            }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((currentXP / tier.discountedPrice) * 100, 100)}%` }}
                                                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + index * 0.1 }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-center mt-1.5 tabular-nums" style={{ color: p.textMuted }}>
                                                        {Math.round((currentXP / tier.discountedPrice) * 100)}% — {currentXP}/{tier.discountedPrice} XP
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                        </div>

                        {/* Compare plans hint */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-center text-[10px] mt-3 flex items-center justify-center gap-1"
                            style={{ color: p.textMuted }}
                        >
                            <Shield className="w-3 h-3" />
                            All plans valid for 30 days · One-time XP purchase · Renew anytime
                        </motion.p>
                    </div>
                )}

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
                            <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>You&apos;ve already claimed your 24h trial. Choose a plan starting from {PREMIUM_XP_COST} XP for 30 days of premium!</p>
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

                {/* ═══ FEATURES (only visible to premium users) ═══ */}
                {isPremium && activeSection === 'features' && (
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                            <h3 className="typo-subheading text-[13px]" style={{ color: p.textMuted }}>Your Premium Features</h3>
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
                                {analyticsStats.map((stat) => (
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
                                    <p className="text-[13px] font-bold" style={{ color: p.text }}>Your Performance</p>
                                    <div className="flex items-center gap-0.5 mt-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} className="w-3 h-3 fill-current" style={{ color: p.amber }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {socialStats.map((s, i) => (
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
                {showConfirm && selectedTier && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        style={{ background: p.isDark ? 'rgba(1,8,18,0.88)' : 'rgba(15,23,42,0.45)', backdropFilter: 'blur(12px)' }}
                        onClick={() => !purchasing && (setShowConfirm(false), setSelectedTier(null))}
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
                                        background: selectedTier.gradient,
                                        boxShadow: `0 8px 32px ${selectedTier.glow}`,
                                    }}
                                >
                                    <TierIcon type={selectedTier.iconType} size={36} color="#fff" />
                                </div>
                                <h3 className="typo-heading text-lg mb-0.5" style={{ color: p.text }}>Confirm {selectedTier.name}</h3>
                                <p className="text-[11px] mb-1" style={{ color: p.textMuted }}>{selectedTier.tagline}</p>
                                <p className="text-[10px] font-medium mb-4" style={{ color: p.accentText }}>Valid for {selectedTier.duration}</p>

                                {/* Discount toggle */}
                                <div
                                    className="flex items-center justify-between p-3 rounded-xl mb-3 text-left"
                                    style={{ background: p.isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                                        <span className="text-[11px] font-bold" style={{ color: p.text }}>Apply Limited Offer (-{selectedTier.discount} XP)</span>
                                    </div>
                                    <button
                                        onClick={() => setUseDiscount(!useDiscount)}
                                        className="w-9 h-5 rounded-full transition-all relative flex-shrink-0"
                                        style={{
                                            background: useDiscount ? '#10B981' : (p.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                        }}
                                    >
                                        <motion.div
                                            className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                                            animate={{ left: useDiscount ? 18 : 2 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                        />
                                    </button>
                                </div>

                                {/* Cost breakdown */}
                                <div
                                    className="p-3.5 rounded-xl mb-4 space-y-2 text-left"
                                    style={{ background: p.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${p.borderSubtle}` }}
                                >
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: p.textMuted }}>Your XP</span>
                                        <span className="font-semibold tabular-nums" style={{ color: p.text }}>{currentXP.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span style={{ color: p.textMuted }}>{selectedTier.name} Plan</span>
                                        {useDiscount ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] line-through tabular-nums" style={{ color: p.textMuted }}>-{selectedTier.price}</span>
                                                <span className="font-semibold tabular-nums" style={{ color: '#EF4444' }}>-{selectedTier.discountedPrice}</span>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-red-400 tabular-nums">-{selectedTier.price}</span>
                                        )}
                                    </div>
                                    {useDiscount && (
                                        <div className="flex justify-between text-[12px]">
                                            <span className="flex items-center gap-1" style={{ color: '#10B981' }}>
                                                <Sparkles className="w-3 h-3" /> You save
                                            </span>
                                            <span className="font-bold tabular-nums" style={{ color: '#10B981' }}>{selectedTier.discount} XP</span>
                                        </div>
                                    )}
                                    <div className="pt-2 flex justify-between text-[13px]" style={{ borderTop: `1px solid ${p.borderSubtle}` }}>
                                        <span style={{ color: p.textMuted }}>Remaining</span>
                                        <span className="font-semibold tabular-nums" style={{ color: p.emerald }}>
                                            {(currentXP - (useDiscount ? selectedTier.discountedPrice : selectedTier.price)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Feature highlights in modal */}
                                <div
                                    className="p-3 rounded-xl mb-4 text-left"
                                    style={{ background: `${selectedTier.color}08`, border: `1px solid ${selectedTier.color}15` }}
                                >
                                    <p className="text-[10px] font-bold uppercase mb-2" style={{ color: selectedTier.color, letterSpacing: '0.06em' }}>Includes</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        {selectedTier.features.slice(0, 6).map((f, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <Check className="w-2.5 h-2.5 flex-shrink-0" style={{ color: selectedTier.color }} />
                                                <span className="text-[10px]" style={{ color: p.text, opacity: 0.8 }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedTier.features.length > 6 && (
                                        <p className="text-[9px] mt-1.5 font-medium" style={{ color: p.textMuted }}>+{selectedTier.features.length - 6} more features included</p>
                                    )}
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
                                        onClick={() => { setShowConfirm(false); setSelectedTier(null); }}
                                        disabled={purchasing}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                                        style={{ background: p.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${p.borderSubtle}`, color: p.textMuted }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchasing || currentXP < (useDiscount ? selectedTier.discountedPrice : selectedTier.price)}
                                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all flex items-center justify-center gap-2"
                                        style={{
                                            background: selectedTier.gradient,
                                            boxShadow: `0 4px 16px ${selectedTier.glow}`,
                                            opacity: currentXP >= (useDiscount ? selectedTier.discountedPrice : selectedTier.price) ? 1 : 0.5,
                                        }}
                                    >
                                        {purchasing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Crown className="w-4 h-4" /> Get {selectedTier.name}
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
