/**
 * Coin Service — Firestore-backed virtual currency for Games Zone
 */

import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

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
