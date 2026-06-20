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
    trialExpiresAt: Date | null;
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
    const isPermanent = userData.isPremium === true;
    const trialExpiry = userData.premiumTrialExpiresAt
        ? (userData.premiumTrialExpiresAt as { toDate?: () => Date }).toDate?.() || new Date(userData.premiumTrialExpiresAt as string)
        : null;
    const isTrial = trialExpiry ? trialExpiry > now : false;

    // Check XP boost expiry
    const boostExpiry = userData.xpBoostExpiresAt
        ? (userData.xpBoostExpiresAt as { toDate?: () => Date }).toDate?.() || new Date(userData.xpBoostExpiresAt as string)
        : null;
    const xpBoostActive = userData.xpBoostActive === true && boostExpiry ? boostExpiry > now : false;

    return {
        isPremium: isPermanent || isTrial,
        isTrial: !isPermanent && isTrial,
        trialExpiresAt: trialExpiry,
        hasClaimedTrial: !!userData.premiumTrialClaimedAt,
        purchasedAt: userData.premiumPurchasedAt
            ? (userData.premiumPurchasedAt as { toDate?: () => Date }).toDate?.() || new Date(userData.premiumPurchasedAt as string)
            : null,
        activeBubbleTheme: (userData.activeBubbleTheme as string) || 'default',
        activeProfileFrame: (userData.activeProfileFrame as string) || 'none',
        activeBadge: (userData.activeBadge as string) || 'none',
        streakShieldsRemaining: (userData.streakShieldsRemaining as number) || 0,
        xpBoostActive,
        xpBoostExpiresAt: boostExpiry,
        xpBoostMultiplier: xpBoostActive ? ((userData.xpBoostMultiplier as number) || 2) : 1,
    };
}

export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        return {
            isPremium: false, isTrial: false, trialExpiresAt: null, hasClaimedTrial: false, purchasedAt: null,
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
