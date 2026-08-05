'use client';

/**
 * useDailyReward — State machine + Firebase logic for daily reward flow.
 * Manages: phase transitions, reward data, streak, skip, claim.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    hasClaimedToday,
    claimDailyReward,
    rollReward,
    type RewardData,
} from '@/services/dailyRewardService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import {
    playArrival,
    playUnlock,
    playReveal,
    playSuccess,
    isMuted,
} from '@/lib/rewardSounds';

// ─── Phase types ────────────────────────────────────────────────────────

export type RewardPhase =
    | 'checking'        // Initial Firebase check
    | 'entry'           // Phase 1: "Daily Surprise" text
    | 'capsule'         // Phase 2+3: Capsule + streak + swipe
    | 'reveal'          // Phase 4: Reward card (+ mini challenge)
    | 'claim'           // Phase 5: Claim animation
    | 'done';           // Exit (render nothing)

// ─── Streak data ────────────────────────────────────────────────────────

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: string;
}

// ─── Hook return type ───────────────────────────────────────────────────

export interface UseDailyRewardReturn {
    phase: RewardPhase;
    reward: RewardData | null;
    streak: StreakData;
    currentXP: number;
    displayXP: number;
    isFirstVisit: boolean;
    showSkip: boolean;
    isClaiming: boolean;

    // Challenge state
    selectedOption: number | null;
    isAnswered: boolean;

    // Actions
    skipToReveal: () => void;
    handleSwipeComplete: () => void;
    handleSelectOption: (index: number) => void;
    handleClaim: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// ─── Constants ──────────────────────────────────────────────────────────

const ENTRY_DURATION_FIRST = 1800; // ms — first-time user
const ENTRY_DURATION_RETURN = 800;  // ms — returning user
const SKIP_DELAY = 3000;            // ms — show skip after 3s
const CLAIM_DURATION = 1500;        // ms — claim animation duration
const FIRST_VISIT_KEY = 'quizy_dr_first_visit';

// ─── Hook ───────────────────────────────────────────────────────────────

export function useDailyReward(
    userId: string,
    refreshUserFn: () => Promise<void>
): UseDailyRewardReturn {
    const [phase, setPhase] = useState<RewardPhase>('checking');
    const [reward, setReward] = useState<RewardData | null>(null);
    const [streak, setStreak] = useState<StreakData>({
        currentStreak: 0,
        longestStreak: 0,
        lastStreakDate: '',
    });
    const [currentXP, setCurrentXP] = useState(0);
    const [displayXP, setDisplayXP] = useState(0);
    const [isFirstVisit, setIsFirstVisit] = useState(false);
    const [showSkip, setShowSkip] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const xpAnimRef = useRef<number | null>(null);

    // ─── Check claim status on mount ────────────────────────────────

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        (async () => {
            try {
                const claimed = await hasClaimedToday(userId);
                if (cancelled) return;
                if (claimed) {
                    setPhase('done');
                    return;
                }

                // Roll reward
                const rolled = rollReward();
                setReward(rolled);

                // Fetch current XP + streak
                try {
                    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
                    if (snap.exists()) {
                        const data = snap.data();
                        setCurrentXP(data.xp || 0);
                        setDisplayXP(data.xp || 0);
                        setStreak({
                            currentStreak: data.currentStreak || 0,
                            longestStreak: data.longestStreak || 0,
                            lastStreakDate: data.lastStreakDate || '',
                        });
                    }
                } catch (e) {
                    console.warn('[Reward] XP/streak fetch error:', e);
                }

                // Check if first visit
                if (typeof window !== 'undefined') {
                    const visited = localStorage.getItem(FIRST_VISIT_KEY);
                    if (!visited) {
                        setIsFirstVisit(true);
                        localStorage.setItem(FIRST_VISIT_KEY, '1');
                    }
                }

                // Start experience
                if (!cancelled) setPhase('entry');
            } catch (err) {
                console.error('[Reward] Init error:', err);
                if (!cancelled) setPhase('done');
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    // ─── Auto phase transitions ─────────────────────────────────────

    useEffect(() => {
        if (phase === 'entry') {
            const duration = isFirstVisit ? ENTRY_DURATION_FIRST : ENTRY_DURATION_RETURN;
            const t = setTimeout(() => setPhase('capsule'), duration);
            return () => clearTimeout(t);
        }
        if (phase === 'claim') {
            const t = setTimeout(() => setPhase('done'), CLAIM_DURATION);
            return () => clearTimeout(t);
        }
    }, [phase, isFirstVisit]);

    // ─── Skip button timer ──────────────────────────────────────────

    useEffect(() => {
        if (phase === 'entry' || phase === 'capsule') {
            skipTimerRef.current = setTimeout(() => setShowSkip(true), SKIP_DELAY);
            return () => {
                if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
            };
        }
        if (phase === 'reveal' || phase === 'claim') {
            setShowSkip(false);
        }
    }, [phase]);

    // ─── Sound triggers ─────────────────────────────────────────────

    useEffect(() => {
        if (isMuted()) return;
        if (phase === 'entry') playArrival();
        if (phase === 'reveal') playReveal();
        if (phase === 'claim') playSuccess();
    }, [phase]);

    // ─── Lock scroll ────────────────────────────────────────────────

    useEffect(() => {
        if (phase === 'done' || phase === 'checking') return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [phase]);

    // ─── XP counter animation ───────────────────────────────────────

    const animateXP = useCallback((from: number, to: number) => {
        if (xpAnimRef.current) cancelAnimationFrame(xpAnimRef.current);
        const duration = 1000;
        const start = performance.now();

        function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayXP(Math.round(from + (to - from) * eased));
            if (progress < 1) xpAnimRef.current = requestAnimationFrame(tick);
        }

        xpAnimRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => () => {
        if (xpAnimRef.current) cancelAnimationFrame(xpAnimRef.current);
    }, []);

    // ─── Actions ────────────────────────────────────────────────────

    const skipToReveal = useCallback(() => {
        setPhase('reveal');
    }, []);

    const handleSwipeComplete = useCallback(() => {
        if (!isMuted()) playUnlock();
        setPhase('reveal');
    }, []);

    const handleSelectOption = useCallback((index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);
    }, [isAnswered]);

    const handleClaim = useCallback(async () => {
        if (!reward || isClaiming) return;
        setIsClaiming(true);

        try {
            let finalReward = reward;
            // Wrong answer on challenge → reduced XP (5)
            if (
                (reward.type === 'brain_teaser' || reward.type === 'math_challenge') &&
                isAnswered && selectedOption !== reward.correctIndex
            ) {
                finalReward = { ...reward, xp: 5 };
            }

            await claimDailyReward(userId, finalReward);

            // Animate XP counter
            const newXP = currentXP + finalReward.xp;
            animateXP(currentXP, newXP);

            // Refresh user profile
            await refreshUserFn();

            setPhase('claim');
        } catch (err) {
            console.error('[Reward] Claim error:', err);
            setPhase('claim');
        }
    }, [reward, isClaiming, userId, isAnswered, selectedOption, currentXP, animateXP, refreshUserFn]);

    return {
        phase,
        reward,
        streak,
        currentXP,
        displayXP,
        isFirstVisit,
        showSkip,
        isClaiming,
        selectedOption,
        isAnswered,
        skipToReveal,
        handleSwipeComplete,
        handleSelectOption,
        handleClaim,
        refreshUser: refreshUserFn,
    };
}
