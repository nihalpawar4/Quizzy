/**
 * Coin & XP Service — Firestore-backed virtual currency and experience points
 */

import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

// ── XP Reward Constants ─────────────────────────────────────────────────

/** XP awarded for completing a daily challenge */
export const DAILY_CHALLENGE_XP = 10;

/** XP awarded for completing a weekly challenge */
export const WEEKLY_CHALLENGE_XP = 30;

/** XP awarded for completing any regular test */
export const TEST_COMPLETION_XP = 10;

/** Bonus XP awarded when scoring above 80% in any activity */
export const HIGH_SCORE_BONUS_XP = 15;

/** Score percentage threshold for bonus XP */
export const HIGH_SCORE_THRESHOLD = 80;

// ── XP Activity Types ───────────────────────────────────────────────────

export type XpActivityType = 'daily_challenge' | 'weekly_challenge' | 'test';

/**
 * Add XP to a user's total (atomic increment)
 */
export async function addXp(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        xp: increment(amount),
    });
}

/**
 * Calculate and award XP for an activity.
 * - Daily challenge completed: +10 XP
 * - Weekly challenge completed: +30 XP
 * - Regular test completed: +10 XP
 * - Bonus: +15 XP if scored > 80% in any activity
 *
 * Returns the total XP awarded.
 */
export async function awardActivityXp(
    userId: string,
    activityType: XpActivityType,
    score: number,
    totalQuestions: number
): Promise<number> {
    // Base XP based on activity type
    let baseXp = 0;
    switch (activityType) {
        case 'daily_challenge':
            baseXp = DAILY_CHALLENGE_XP;
            break;
        case 'weekly_challenge':
            baseXp = WEEKLY_CHALLENGE_XP;
            break;
        case 'test':
            baseXp = TEST_COMPLETION_XP;
            break;
    }

    // Calculate bonus XP for high scores (>80%)
    let bonusXp = 0;
    if (totalQuestions > 0) {
        const percentage = (score / totalQuestions) * 100;
        if (percentage > HIGH_SCORE_THRESHOLD) {
            bonusXp = HIGH_SCORE_BONUS_XP;
        }
    }

    const totalXp = baseXp + bonusXp;

    // Award XP atomically
    if (totalXp > 0) {
        await addXp(userId, totalXp);
    }

    return totalXp;
}

/**
 * Get current coin balance for a user
 */
export async function getCoins(userId: string): Promise<number> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        return snap.data().coins || 0;
    }
    return 0;
}

/**
 * Add coins to a user's balance (atomic increment)
 */
export async function addCoins(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
        coins: increment(amount),
    });
}

/**
 * Spend coins from a user's balance (atomic decrement)
 * Returns false if insufficient balance
 */
export async function spendCoins(userId: string, amount: number): Promise<boolean> {
    if (amount <= 0) return true;

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    const currentCoins = snap.exists() ? (snap.data().coins || 0) : 0;

    if (currentCoins < amount) {
        return false; // Insufficient balance
    }

    await updateDoc(userRef, {
        coins: increment(-amount),
    });
    return true;
}

/**
 * Subscribe to real-time coin balance changes
 */
export function subscribeToCoins(userId: string, callback: (coins: number) => void): () => void {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    return onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data().coins || 0);
        } else {
            callback(0);
        }
    });
}
