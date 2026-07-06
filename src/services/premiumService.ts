/**
 * Premium Service — Handles premium purchases, trials, and feature management.
 * All premium state is stored on the user document in Firestore.
 */

import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PREMIUM_XP_COST } from '@/lib/constants';

// ─── Types ─────────────────────────────────────────────────────────────

export interface PremiumStatus {
    isPremium: boolean;
    isTrial: boolean;
    premiumTier: string; // 'basic' | 'pro' | 'promax' | 'none'
    trialExpiresAt: Date | null;
    premiumExpiresAt: Date | null;
    hasClaimedTrial: boolean;
    purchasedAt: Date | null;
    activeBubbleTheme: string;
    activeProfileFrame: string;
    activeBadge: string;
    streakShieldsRemaining: number;
    xpBoostActive: boolean;
    xpBoostExpiresAt: Date | null;
    xpBoostMultiplier: number;
}

export type BubbleTheme = 'default' | 'sparkle' | 'neon' | 'fire' | 'water';
export type ProfileFrameType = 'none' | 'gold' | 'diamond' | 'fire' | 'aurora';
export type BadgeType = 'none' | 'pro' | 'elite' | 'diamond' | 'scholar';

export const BUBBLE_THEMES: { id: BubbleTheme; label: string; emoji: string; description: string }[] = [
    { id: 'default', label: 'Classic Blue', emoji: '🫧', description: 'Quizy signature blue bubbles' },
    { id: 'sparkle', label: 'Golden Sparkle', emoji: '✨', description: 'Shimmering golden star particles' },
    { id: 'neon', label: 'Neon Glow', emoji: '💜', description: 'Vibrant neon circles with glow' },
    { id: 'fire', label: 'Fire Ember', emoji: '🔥', description: 'Blazing orange-red embers' },
    { id: 'water', label: 'Ocean Drop', emoji: '💧', description: 'Translucent blue water drops' },
];

export const PROFILE_FRAMES: { id: ProfileFrameType; label: string; emoji: string; description: string }[] = [
    { id: 'none', label: 'No Frame', emoji: '⭕', description: 'Default avatar style' },
    { id: 'gold', label: 'Golden Crown', emoji: '👑', description: 'Rotating golden gradient border' },
    { id: 'diamond', label: 'Diamond Shine', emoji: '💎', description: 'Shimmering blue-white sparkle' },
    { id: 'fire', label: 'Fire Ring', emoji: '🔥', description: 'Pulsing red-orange glow' },
    { id: 'aurora', label: 'Aurora Borealis', emoji: '🌌', description: 'Shifting multi-color gradient' },
];

export const PREMIUM_BADGES: { id: BadgeType; label: string; emoji: string; description: string }[] = [
    { id: 'none', label: 'No Badge', emoji: '—', description: 'Hide badge' },
    { id: 'pro', label: 'Pro', emoji: '⚡', description: 'Blue lightning bolt' },
    { id: 'elite', label: 'Elite', emoji: '👑', description: 'Golden crown' },
    { id: 'diamond', label: 'Diamond', emoji: '💎', description: 'Sparkling diamond' },
    { id: 'scholar', label: 'Scholar', emoji: '🎓', description: 'Graduation cap' },
];

// ─── Check Premium Status ──────────────────────────────────────────────

export function resolvePremiumStatus(userData: Record<string, unknown>): PremiumStatus {
    const now = new Date();

    // Trial check
    const trialExpiry = userData.premiumTrialExpiresAt
        ? (userData.premiumTrialExpiresAt as { toDate?: () => Date }).toDate?.() || new Date(userData.premiumTrialExpiresAt as string)
        : null;
    const isTrial = trialExpiry ? trialExpiry > now : false;

    // Purchased premium expiry check (30-day subscriptions)
    const premiumExpiry = userData.premiumExpiresAt
        ? (userData.premiumExpiresAt as { toDate?: () => Date }).toDate?.() || new Date(userData.premiumExpiresAt as string)
        : null;
    const isPermanent = userData.isPremium === true && (!premiumExpiry || premiumExpiry > now);

    // XP boost check
    const boostExpiry = userData.xpBoostExpiresAt
        ? (userData.xpBoostExpiresAt as { toDate?: () => Date }).toDate?.() || new Date(userData.xpBoostExpiresAt as string)
        : null;
    const xpBoostActive = userData.xpBoostActive === true && boostExpiry ? boostExpiry > now : false;

    const isActive = isPermanent || isTrial;

    // Resolve tier — during a trial, treat as 'promax' (full access); otherwise read stored tier
    const resolvedTier = isActive
        ? (isTrial && !isPermanent)
            ? 'promax'
            : ((userData.premiumTier as string) || 'basic')
        : 'none';

    // ── Tier-aware cosmetic validation ──────────────────────────
    // Only allow cosmetics that belong to the user's current tier
    const allowedThemes: Record<string, string[]> = {
        basic: ['default', 'sparkle', 'neon'],
        pro: ['default', 'sparkle', 'neon', 'fire', 'water'],
        promax: ['default', 'sparkle', 'neon', 'fire', 'water'],
    };
    const allowedFrames: Record<string, string[]> = {
        basic: ['none', 'gold'],
        pro: ['none', 'gold', 'diamond', 'fire', 'aurora'],
        promax: ['none', 'gold', 'diamond', 'fire', 'aurora'],
    };
    const allowedBadges: Record<string, string[]> = {
        basic: ['none', 'pro'],
        pro: ['none', 'pro', 'elite', 'scholar'],
        promax: ['none', 'pro', 'elite', 'diamond', 'scholar'],
    };

    const storedTheme = (userData.activeBubbleTheme as string) || 'default';
    const storedFrame = (userData.activeProfileFrame as string) || 'none';
    const storedBadge = (userData.activeBadge as string) || 'none';

    // Validate against tier — reset to default if cosmetic isn't allowed for their tier
    const validatedTheme = isActive && resolvedTier !== 'none'
        ? (allowedThemes[resolvedTier]?.includes(storedTheme) ? storedTheme : 'default')
        : 'default';
    const validatedFrame = isActive && resolvedTier !== 'none'
        ? (allowedFrames[resolvedTier]?.includes(storedFrame) ? storedFrame : 'none')
        : 'none';
    const validatedBadge = isActive && resolvedTier !== 'none'
        ? (allowedBadges[resolvedTier]?.includes(storedBadge) ? storedBadge : 'none')
        : 'none';

    return {
        isPremium: isActive,
        isTrial: !isPermanent && isTrial,
        premiumTier: resolvedTier,
        trialExpiresAt: trialExpiry,
        premiumExpiresAt: premiumExpiry,
        hasClaimedTrial: !!userData.premiumTrialClaimedAt,
        purchasedAt: userData.premiumPurchasedAt
            ? (userData.premiumPurchasedAt as { toDate?: () => Date }).toDate?.() || new Date(userData.premiumPurchasedAt as string)
            : null,
        // Cosmetics are validated against tier — higher-tier cosmetics reset to defaults
        activeBubbleTheme: validatedTheme,
        activeProfileFrame: validatedFrame,
        activeBadge: validatedBadge,
        streakShieldsRemaining: isActive ? ((userData.streakShieldsRemaining as number) || 0) : 0,
        xpBoostActive: isActive ? xpBoostActive : false,
        xpBoostExpiresAt: boostExpiry,
        xpBoostMultiplier: (isActive && xpBoostActive) ? ((userData.xpBoostMultiplier as number) || 2) : 1,
    };
}

export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        return {
            isPremium: false, isTrial: false, premiumTier: 'none', trialExpiresAt: null, premiumExpiresAt: null, hasClaimedTrial: false, purchasedAt: null,
            activeBubbleTheme: 'default', activeProfileFrame: 'none', activeBadge: 'none',
            streakShieldsRemaining: 0, xpBoostActive: false, xpBoostExpiresAt: null, xpBoostMultiplier: 1,
        };
    }
    return resolvePremiumStatus(snap.data());
}

// ─── Subscribe to Premium Status (Real-Time) ──────────────────────────

export function subscribeToPremiumStatus(
    userId: string,
    callback: (status: PremiumStatus) => void
): () => void {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    return onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            callback(resolvePremiumStatus(snap.data()));
        }
    });
}

// ─── Purchase Premium with XP ──────────────────────────────────────────

export async function purchasePremium(userId: string): Promise<{ success: boolean; error?: string }> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        return { success: false, error: 'User not found' };
    }

    const data = snap.data();
    if (data.isPremium === true) {
        return { success: false, error: 'Already a premium member!' };
    }

    const currentXP = (data.xp as number) || 0;
    if (currentXP < PREMIUM_XP_COST) {
        return { success: false, error: `Not enough XP. You need ${PREMIUM_XP_COST} XP but have ${currentXP} XP.` };
    }

    // Deduct XP and activate premium
    await updateDoc(userRef, {
        xp: increment(-PREMIUM_XP_COST),
        isPremium: true,
        premiumPurchasedAt: new Date(),
    });

    // Log the purchase
    const purchaseRef = doc(db, COLLECTIONS.PREMIUM_PURCHASES, `${userId}_${Date.now()}`);
    await setDoc(purchaseRef, {
        userId,
        xpSpent: PREMIUM_XP_COST,
        purchasedAt: new Date(),
        type: 'permanent',
    });

    return { success: true };
}

// ─── Purchase Premium with Tier ────────────────────────────────────────

export async function purchasePremiumTier(
    userId: string,
    tier: string,
    xpCost: number
): Promise<{ success: boolean; error?: string }> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        return { success: false, error: 'User not found' };
    }

    const data = snap.data();
    const tierOrder = ['basic', 'pro', 'promax'];
    const currentTier = (data.premiumTier as string) || 'basic';
    const currentTierIndex = tierOrder.indexOf(currentTier);
    const newTierIndex = tierOrder.indexOf(tier);

    // Block if already on the same or higher tier (no downgrades either)
    if (data.isPremium === true && newTierIndex <= currentTierIndex) {
        return { success: false, error: newTierIndex === currentTierIndex ? 'You already have this plan!' : 'Cannot downgrade your plan.' };
    }

    const currentXP = (data.xp as number) || 0;
    if (currentXP < xpCost) {
        return { success: false, error: `Not enough XP. You need ${xpCost} XP but have ${currentXP} XP.` };
    }

    // Deduct XP and activate premium with tier info + 30-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await updateDoc(userRef, {
        xp: increment(-xpCost),
        isPremium: true,
        premiumTier: tier,
        premiumPurchasedAt: new Date(),
        premiumExpiresAt: expiresAt,
    });

    // Log the purchase
    const purchaseRef = doc(db, COLLECTIONS.PREMIUM_PURCHASES, `${userId}_${Date.now()}`);
    await setDoc(purchaseRef, {
        userId,
        xpSpent: xpCost,
        tier,
        purchasedAt: new Date(),
        expiresAt,
        type: '30-day',
    });

    return { success: true };
}

// ─── Activate Premium Trial (first-time only) ─────────────────────────

export async function activatePremiumTrial(userId: string, hours: number = 24): Promise<{ success: boolean; error?: string }> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        return { success: false, error: 'User not found' };
    }

    const data = snap.data();

    // Block if already permanently premium
    if (data.isPremium === true) {
        return { success: false, error: 'Already a premium member!' };
    }

    // Block if trial was already claimed (one-time only)
    if (data.premiumTrialClaimedAt) {
        return { success: false, error: 'You have already claimed your free trial.' };
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    await updateDoc(userRef, {
        premiumTrialExpiresAt: expiresAt,
        premiumTrialClaimedAt: new Date(),
    });

    return { success: true };
}

// ─── Cosmetic Setters ──────────────────────────────────────────────────

export async function setActiveBubbleTheme(userId: string, theme: BubbleTheme): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, { activeBubbleTheme: theme });
}

export async function setActiveProfileFrame(userId: string, frame: ProfileFrameType): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, { activeProfileFrame: frame });
}

export async function setActiveBadge(userId: string, badge: BadgeType): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, { activeBadge: badge });
}

// ─── Streak Shields ────────────────────────────────────────────────────

export async function addStreakShields(userId: string, count: number = 1): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, { streakShieldsRemaining: increment(count) });
}

export async function useStreakShield(userId: string): Promise<boolean> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return false;

    const shields = (snap.data().streakShieldsRemaining as number) || 0;
    if (shields <= 0) return false;

    await updateDoc(userRef, { streakShieldsRemaining: increment(-1) });
    return true;
}

// ─── XP Boost ──────────────────────────────────────────────────────────

export async function activateXPBoost(userId: string, minutes: number = 30, multiplier: number = 2): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        xpBoostActive: true,
        xpBoostExpiresAt: new Date(Date.now() + minutes * 60 * 1000),
        xpBoostMultiplier: multiplier,
    });
}
