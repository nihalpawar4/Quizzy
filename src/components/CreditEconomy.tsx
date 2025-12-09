'use client';

/**
 * Credit Economy Components
 * Reusable UI components for the gamified credit economy system
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    Coins,
    Sparkles,
    TrendingUp,
    Trophy,
    Gift,
    Star,
    Zap,
    Target,
    Loader2,
    Award,
    History,
    ShoppingCart
} from 'lucide-react';
import { CreditWallet, CreditTransaction, UserBadge, PremiumTest } from '@/types';
import { CREDIT_CONSTANTS } from '@/types';

// ==================== WALLET DISPLAY COMPONENT ====================

interface WalletDisplayProps {
    wallet: CreditWallet | null;
    loading?: boolean;
    compact?: boolean;
    onClick?: () => void;
}

export function WalletDisplay({ wallet, loading, compact = false, onClick }: WalletDisplayProps) {
    if (loading) {
        return (
            <button
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl"
                title="Loading wallet..."
            >
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">...</span>
            </button>
        );
    }

    // Even if wallet is null, show a clickable button in compact mode
    if (!wallet && compact) {
        return (
            <button
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-xl transition-all"
                title="Click to view wallet"
            >
                <Coins className="w-4 h-4" />
                <span className="font-bold text-sm">0</span>
            </button>
        );
    }

    if (!wallet) {
        return null;
    }

    const hasGlow = wallet.hasGlowStatus || (wallet.glowUnlockedUntil && new Date() < new Date(wallet.glowUnlockedUntil));

    if (compact) {
        return (
            <button
                onClick={onClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${hasGlow
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30 animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    }`}
                title={`${wallet.balance} Coins - Click for details`}
            >
                <Coins className="w-4 h-4" />
                <span className="font-bold text-sm">{wallet.balance}</span>
                {hasGlow && <Sparkles className="w-3 h-3" />}
            </button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative overflow-hidden rounded-2xl p-6 ${hasGlow
                ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
        >
            {/* Glow effect */}
            {hasGlow && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
            )}

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasGlow ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/50'
                            }`}>
                            <Coins className={`w-6 h-6 ${hasGlow ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                        </div>
                        <div>
                            <p className={`text-sm ${hasGlow ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                Your Balance
                            </p>
                            <p className={`text-3xl font-bold ${hasGlow ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {wallet.balance} <span className="text-lg">Coins</span>
                            </p>
                        </div>
                    </div>
                    {hasGlow && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">Glowing!</span>
                        </div>
                    )}
                </div>

                {/* Progress toward glow status */}
                {!hasGlow && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Progress to Glow Status
                            </span>
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {wallet.weeklySpent}/{CREDIT_CONSTANTS.GLOW_THRESHOLD} coins
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (wallet.weeklySpent / CREDIT_CONSTANTS.GLOW_THRESHOLD) * 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Spend {Math.max(0, CREDIT_CONSTANTS.GLOW_THRESHOLD - wallet.weeklySpent)} more coins this week to unlock Glow Status next week!
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ==================== GLOW PROFILE FRAME ====================

interface GlowProfileFrameProps {
    hasGlow: boolean;
    children: React.ReactNode;
    className?: string;
}

export function GlowProfileFrame({ hasGlow, children, className = '' }: GlowProfileFrameProps) {
    if (!hasGlow) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={`relative ${className}`}>
            {/* Outer glow ring */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 rounded-full blur-sm animate-pulse" />
            {/* Inner content */}
            <div className="relative">
                {children}
            </div>
            {/* Sparkle decorations */}
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-bounce" />
        </div>
    );
}

// ==================== BADGE DISPLAY COMPONENT ====================

interface BadgeDisplayProps {
    badge: UserBadge;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

export function BadgeDisplay({ badge, size = 'md', showDetails = false }: BadgeDisplayProps) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-lg',
        md: 'w-12 h-12 text-2xl',
        lg: 'w-16 h-16 text-3xl'
    };

    const rarityColors = {
        common: 'from-gray-400 to-gray-500',
        rare: 'from-blue-400 to-indigo-500',
        epic: 'from-purple-400 to-violet-500',
        legendary: 'from-amber-400 to-orange-500'
    };

    return (
        <div className="flex items-center gap-3">
            <div className={`${sizeClasses[size]} bg-gradient-to-br ${rarityColors[badge.badgeRarity]} rounded-xl flex items-center justify-center shadow-lg leading-none`}>
                <span className="flex items-center justify-center">{badge.badgeIcon}</span>
            </div>
            {showDetails && (
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{badge.badgeName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{badge.awardReason}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(badge.earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                </div>
            )}
        </div>
    );
}

// ==================== BADGES COLLECTION ====================

interface BadgesCollectionProps {
    badges: UserBadge[];
    maxDisplay?: number;
    onViewAll?: () => void;
}

export function BadgesCollection({ badges, maxDisplay = 5, onViewAll }: BadgesCollectionProps) {
    const displayedBadges = badges.slice(0, maxDisplay);
    const remainingCount = badges.length - maxDisplay;

    if (badges.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No badges earned yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Complete tests and activities to earn badges!</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {displayedBadges.map((badge) => (
                    <motion.div
                        key={badge.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        className="relative group"
                        title={`${badge.badgeName}: ${badge.awardReason}`}
                    >
                        <BadgeDisplay badge={badge} size="md" />
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {badge.badgeName}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                    </motion.div>
                ))}
                {remainingCount > 0 && (
                    <button
                        onClick={onViewAll}
                        className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        +{remainingCount}
                    </button>
                )}
            </div>
        </div>
    );
}

// ==================== TRANSACTION HISTORY ====================

interface TransactionHistoryProps {
    transactions: CreditTransaction[];
    maxDisplay?: number;
}

export function TransactionHistory({ transactions, maxDisplay = 10 }: TransactionHistoryProps) {
    const displayedTransactions = transactions.slice(0, maxDisplay);

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'allowance': return <Gift className="w-4 h-4 text-green-500" />;
            case 'test_attempt': return <Target className="w-4 h-4 text-blue-500" />;
            case 'premium_test': return <Star className="w-4 h-4 text-purple-500" />;
            case 'bonus': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'reward': return <Trophy className="w-4 h-4 text-yellow-500" />;
            default: return <Coins className="w-4 h-4 text-gray-500" />;
        }
    };

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {displayedTransactions.map((tx) => (
                <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        {getTransactionIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {tx.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>
                    </div>
                    <div className={`font-bold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==================== PREMIUM TEST CARD ====================

interface PremiumTestCardProps {
    test: PremiumTest;
    canAfford: boolean;
    onAttempt: (test: PremiumTest) => void;
    loading?: boolean;
}

export function PremiumTestCard({ test, canAfford, onAttempt, loading }: PremiumTestCardProps) {
    const isFree = test.isMandatory || test.coinCost === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border ${isFree
                ? 'border-green-200 dark:border-green-800'
                : canAfford
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-gray-200 dark:border-gray-800 opacity-75'
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-1 bg-[#1650EB]/10 dark:bg-indigo-900/50 text-[#1243c7] dark:text-[#6095DB] text-xs font-medium rounded-full">
                            {test.subject}
                        </span>
                        {isFree ? (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                FREE
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                <Coins className="w-3 h-3" />
                                {test.coinCost}
                            </span>
                        )}
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                            Premium
                        </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{test.title}</h4>
                    {test.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{test.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{test.questionCount} Questions</span>
                {test.duration && <span>{test.duration} min</span>}
                <span>{test.totalAttempts} attempts</span>
            </div>

            <button
                onClick={() => onAttempt(test)}
                disabled={!isFree && !canAfford || loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${isFree
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:from-amber-500 hover:to-yellow-600'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <ShoppingCart className="w-4 h-4" />
                        {isFree ? 'Start Free Test' : canAfford ? `Attempt for ${test.coinCost} Coins` : 'Insufficient Coins'}
                    </>
                )}
            </button>
        </motion.div>
    );
}

// ==================== REWARD POPUP MODAL ====================

interface RewardPopupProps {
    isOpen: boolean;
    onClose: () => void;
    badge?: UserBadge;
    coinsEarned?: number;
    message?: string;
}

export function RewardPopup({ isOpen, onClose, badge, coinsEarned, message }: RewardPopupProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: 50 }}
                        className="bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-3xl p-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center max-w-sm">
                            {/* Confetti effect */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[...Array(20)].map((_, i) => {
                                    // Pre-computed positions based on index for confetti
                                    const positions = [
                                        { x: 15, y: 20, r: 45 }, { x: 85, y: 15, r: 120 }, { x: 30, y: 80, r: 200 },
                                        { x: 70, y: 75, r: 280 }, { x: 50, y: 10, r: 90 }, { x: 10, y: 50, r: 160 },
                                        { x: 90, y: 45, r: 230 }, { x: 25, y: 35, r: 310 }, { x: 75, y: 60, r: 25 },
                                        { x: 45, y: 85, r: 140 }, { x: 5, y: 70, r: 180 }, { x: 95, y: 25, r: 260 },
                                        { x: 35, y: 55, r: 340 }, { x: 65, y: 40, r: 70 }, { x: 20, y: 90, r: 150 },
                                        { x: 80, y: 5, r: 220 }, { x: 55, y: 65, r: 290 }, { x: 40, y: 20, r: 10 },
                                        { x: 60, y: 95, r: 110 }, { x: 12, y: 30, r: 190 }
                                    ];
                                    const pos = positions[i];
                                    return (
                                        <motion.div
                                            key={i}
                                            className="absolute w-2 h-2 bg-amber-400 rounded-full"
                                            initial={{
                                                x: '50%',
                                                y: '50%',
                                                scale: 0
                                            }}
                                            animate={{
                                                x: `${pos.x}%`,
                                                y: `${pos.y}%`,
                                                scale: [0, 1, 0],
                                                rotate: pos.r
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                delay: i * 0.05,
                                                ease: "easeOut"
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
                                    {badge ? (
                                        <span className="text-5xl">{badge.badgeIcon}</span>
                                    ) : (
                                        <Gift className="w-12 h-12 text-white" />
                                    )}
                                </div>
                            </motion.div>

                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                🎉 Congratulations!
                            </h3>

                            {badge && (
                                <div className="mb-4">
                                    <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                                        {badge.badgeName}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {badge.awardReason}
                                    </p>
                                </div>
                            )}

                            {coinsEarned && (
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <Coins className="w-6 h-6 text-amber-500" />
                                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        +{coinsEarned} Coins
                                    </span>
                                </div>
                            )}

                            {message && (
                                <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-medium rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-colors"
                            >
                                Awesome! 🚀
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ==================== GLOW STATUS INDICATOR ====================

interface GlowStatusIndicatorProps {
    hasGlow: boolean;
    className?: string;
}

export function GlowStatusIndicator({ hasGlow, className = '' }: GlowStatusIndicatorProps) {
    if (!hasGlow) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-medium rounded-full shadow-lg shadow-amber-500/30 ${className}`}
        >
            <Sparkles className="w-3 h-3" />
            Glowing Profile
        </motion.div>
    );
}
