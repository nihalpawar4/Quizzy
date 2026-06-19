'use client';

/**
 * PremiumBadge — SVG illustration badges displayed next to username for premium users.
 * Each badge is a hand-crafted SVG with gradients and glow effects.
 */

import type { BadgeType } from '@/services/premiumService';

interface PremiumBadgeProps {
    badgeType: BadgeType;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_MAP = {
    sm: { badge: 16, container: 'text-[9px] px-1.5 py-0.5 gap-1' },
    md: { badge: 18, container: 'text-[10px] px-2 py-0.5 gap-1' },
    lg: { badge: 22, container: 'text-xs px-2.5 py-1 gap-1.5' },
};

// ─── SVG Badge Illustrations ──────────────────────────────────

function ProBadgeIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="proBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <filter id="proGlow">
                    <feGaussianBlur stdDeviation="1" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Shield background */}
            <path d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.35C17.17 22.15 21 17.25 21 12V7L12 2z" fill="url(#proBoltGrad)" opacity="0.15" />
            <path d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.35C17.17 22.15 21 17.25 21 12V7L12 2z" stroke="url(#proBoltGrad)" strokeWidth="1.5" fill="none" />
            {/* Lightning bolt */}
            <path d="M13.5 6L9 13h3l-1.5 5L16 11h-3.5L13.5 6z" fill="url(#proBoltGrad)" filter="url(#proGlow)" />
        </svg>
    );
}

function EliteBadgeIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="eliteCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <filter id="eliteGlow">
                    <feGaussianBlur stdDeviation="0.8" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Circle bg */}
            <circle cx="12" cy="12" r="10" fill="url(#eliteCrownGrad)" opacity="0.12" />
            <circle cx="12" cy="12" r="10" stroke="url(#eliteCrownGrad)" strokeWidth="1.5" fill="none" />
            {/* Crown */}
            <path d="M6 16h12v1.5H6V16z" fill="url(#eliteCrownGrad)" rx="0.5" />
            <path d="M6 16L8 9l4 3 4-3 2 7" fill="url(#eliteCrownGrad)" filter="url(#eliteGlow)" />
            {/* Jewel dots */}
            <circle cx="8" cy="8.5" r="1" fill="#fef3c7" />
            <circle cx="12" cy="11.5" r="1" fill="#fef3c7" />
            <circle cx="16" cy="8.5" r="1" fill="#fef3c7" />
        </svg>
    );
}

function DiamondBadgeIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e0e7ff" />
                    <stop offset="30%" stopColor="#a78bfa" />
                    <stop offset="70%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                </linearGradient>
                <linearGradient id="diamondShine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.8" />
                </linearGradient>
                <filter id="diamondGlow">
                    <feGaussianBlur stdDeviation="1" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Diamond shape */}
            <path d="M12 3L4 10l8 11 8-11L12 3z" fill="url(#diamondGrad)" opacity="0.2" />
            <path d="M12 3L4 10l8 11 8-11L12 3z" stroke="url(#diamondGrad)" strokeWidth="1.5" fill="none" />
            {/* Facets */}
            <path d="M12 3L8 10h8L12 3z" fill="url(#diamondGrad)" filter="url(#diamondGlow)" />
            <path d="M4 10l8 11V10H4z" fill="url(#diamondGrad)" opacity="0.6" />
            <path d="M20 10l-8 11V10h8z" fill="url(#diamondGrad)" opacity="0.8" />
            {/* Shine */}
            <path d="M9 8l3-3 3 3" stroke="url(#diamondShine)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            {/* Sparkle dots */}
            <circle cx="7" cy="9" r="0.6" fill="white" opacity="0.8" />
            <circle cx="15" cy="7" r="0.5" fill="white" opacity="0.6" />
        </svg>
    );
}

function ScholarBadgeIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="scholarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <filter id="scholarGlow">
                    <feGaussianBlur stdDeviation="0.8" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Hexagon bg */}
            <path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2z" fill="url(#scholarGrad)" opacity="0.12" />
            <path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2z" stroke="url(#scholarGrad)" strokeWidth="1.2" fill="none" />
            {/* Graduation cap */}
            <path d="M12 7L5 11l7 4 7-4-7-4z" fill="url(#scholarGrad)" filter="url(#scholarGlow)" />
            <path d="M8.5 13v3.5L12 18.5l3.5-2V13" stroke="url(#scholarGrad)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Tassel */}
            <line x1="19" y1="11" x2="19" y2="16" stroke="url(#scholarGrad)" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="19" cy="16.5" r="1" fill="url(#scholarGrad)" />
        </svg>
    );
}

// ─── Config ──────────────────────────────────────────────────

const BADGE_CONFIG: Record<BadgeType, { Icon: React.FC<{ size: number }>; bgClass: string; textClass: string; label: string } | null> = {
    none: null,
    pro: { Icon: ProBadgeIcon, bgClass: 'bg-blue-50 dark:bg-blue-950/40', textClass: 'text-blue-600 dark:text-blue-400', label: 'Pro' },
    elite: { Icon: EliteBadgeIcon, bgClass: 'bg-amber-50 dark:bg-amber-950/40', textClass: 'text-amber-600 dark:text-amber-400', label: 'Elite' },
    diamond: { Icon: DiamondBadgeIcon, bgClass: 'bg-purple-50 dark:bg-purple-950/40', textClass: 'text-purple-600 dark:text-purple-400', label: 'Diamond' },
    scholar: { Icon: ScholarBadgeIcon, bgClass: 'bg-emerald-50 dark:bg-emerald-950/40', textClass: 'text-emerald-600 dark:text-emerald-400', label: 'Scholar' },
};

export default function PremiumBadge({ badgeType, size = 'sm', className = '' }: PremiumBadgeProps) {
    const config = BADGE_CONFIG[badgeType];
    if (!config) return null;

    const { Icon, bgClass, textClass, label } = config;
    const sizeConfig = SIZE_MAP[size];

    return (
        <span
            className={`premium-badge-animated inline-flex items-center rounded-full font-bold ${bgClass} ${textClass} ${sizeConfig.container} ${className}`}
        >
            <Icon size={sizeConfig.badge} />
            <span>{label}</span>
        </span>
    );
}
