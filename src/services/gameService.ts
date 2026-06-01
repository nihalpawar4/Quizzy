/**
 * Game Service — Firestore-backed game stats & leaderboard for Games Zone
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { GameStats } from '@/types';

/**
 * Get game stats for a user
 */
export async function getGameStats(userId: string): Promise<GameStats | null> {
    const ref = doc(db, COLLECTIONS.GAME_STATS, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        return {
            id: snap.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as GameStats;
    }
    return null;
}

/**
 * Initialize or update game stats after a game completes
 */
export async function updateGameStats(
    userId: string,
    userName: string,
    data: {
        wordsFound: number;
        score: number;
        timeTaken: number; // seconds
    }
): Promise<void> {
    const ref = doc(db, COLLECTIONS.GAME_STATS, userId);
    const snap = await getDoc(ref);

    const today = new Date().toISOString().split('T')[0];

    if (snap.exists()) {
        const existing = snap.data();
        const prevBestTime = existing.bestTime || 9999;
        const prevBestScore = existing.bestScore || 0;

        // Calculate day streak
        let dayStreak = existing.dayStreak || 0;
        const lastPlayed = existing.lastPlayedDate;
        if (lastPlayed) {
            const lastDate = new Date(lastPlayed);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                dayStreak += 1;
            } else if (diffDays > 1) {
                dayStreak = 1;
            }
            // If same day, keep current streak
        } else {
            dayStreak = 1;
        }

        await updateDoc(ref, {
            gamesPlayed: (existing.gamesPlayed || 0) + 1,
            wordsFound: (existing.wordsFound || 0) + data.wordsFound,
            bestTime: data.timeTaken < prevBestTime ? data.timeTaken : prevBestTime,
            bestScore: data.score > prevBestScore ? data.score : prevBestScore,
            totalScore: (existing.totalScore || 0) + data.score,
            dayStreak,
            lastPlayedDate: today,
            updatedAt: serverTimestamp(),
        });
    } else {
        // Create new stats doc
        await setDoc(ref, {
            userId,
            userName,
            gamesPlayed: 1,
            wordsFound: data.wordsFound,
            bestTime: data.timeTaken,
            bestScore: data.score,
            totalScore: data.score,
            badgesEarned: 0,
            dayStreak: 1,
            lastPlayedDate: today,
            updatedAt: serverTimestamp(),
        });
    }
}

/**
 * Subscribe to real-time game stats changes
 */
export function subscribeToGameStats(userId: string, callback: (stats: GameStats | null) => void): () => void {
    const ref = doc(db, COLLECTIONS.GAME_STATS, userId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback({
                id: snap.id,
                ...data,
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as GameStats);
        } else {
            callback(null);
        }
    });
}

/**
 * Get leaderboard (top users by total score)
 */
export async function getLeaderboard(maxResults: number = 10): Promise<{ userId: string; userName: string; totalScore: number; gamesPlayed: number }[]> {
    const ref = collection(db, COLLECTIONS.GAME_STATS);
    const q = query(ref, orderBy('totalScore', 'desc'), limit(maxResults));
    const snap = await getDocs(q);

    return snap.docs.map((doc) => {
        const data = doc.data();
        return {
            userId: doc.id,
            userName: data.userName || 'Unknown',
            totalScore: data.totalScore || 0,
            gamesPlayed: data.gamesPlayed || 0,
        };
    });
}
