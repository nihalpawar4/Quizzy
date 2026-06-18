'use client';

/**
 * DailySurpriseReward — Premium 3D Orchestrator
 * Lazy-loads Three.js scene. XP only (no coins). Real-time profile update.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DailySurpriseReward.module.css';
import {
    hasClaimedToday,
    claimDailyReward,
    rollReward,
    type RewardData,
} from '@/services/dailyRewardService';
import { useAuth } from '@/contexts/AuthContext';
import {
    playArrival,
    playCountdownTick,
    playUnlock,
    playReveal,
    playSuccess,
    isMuted,
} from '@/lib/rewardSounds';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

// Lazy-load heavy 3D components
const MysteryBoxScene = dynamic(() => import('./reward/MysteryBoxScene'), { ssr: false });
const RewardOverlay = dynamic(() => import('./reward/RewardOverlay'), { ssr: false });

// Phase state machine
type Phase =
    | 'checking'
    | 'overlay'
    | 'box-arrived'
    | 'countdown'
    | 'opening'
    | 'burst'
    | 'reward-reveal'
    | 'claimed'
    | 'done';

// Map to 3D scene phase
function toScenePhase(p: Phase): 'idle' | 'countdown' | 'opening' | 'burst' | 'done' {
    switch (p) {
        case 'overlay':
        case 'box-arrived': return 'idle';
        case 'countdown': return 'countdown';
        case 'opening': return 'opening';
        case 'burst': return 'burst';
        default: return 'done';
    }
}

// Map to overlay phase
function toOverlayPhase(p: Phase): 'box-arrived' | 'countdown' | 'opening' | 'reward-reveal' | 'claimed' | 'hidden' {
    switch (p) {
        case 'box-arrived': return 'box-arrived';
        case 'countdown': return 'countdown';
        case 'opening':
        case 'burst': return 'opening';
        case 'reward-reveal': return 'reward-reveal';
        case 'claimed': return 'claimed';
        default: return 'hidden';
    }
}

interface DailySurpriseRewardProps {
    userId: string;
}

export default function DailySurpriseReward({ userId }: DailySurpriseRewardProps) {
    const { refreshUser } = useAuth();

    const [phase, setPhase] = useState<Phase>('checking');
    const [reward, setReward] = useState<RewardData | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [countdownValue, setCountdownValue] = useState(3);

    // XP animation
    const [currentXP, setCurrentXP] = useState(0);
    const [displayXP, setDisplayXP] = useState(0);
    const xpAnimRef = useRef<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // ─── Check claim status on mount ────────────────────────────────────

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

                // Fetch current XP
                try {
                    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
                    if (snap.exists()) {
                        const xp = snap.data().xp || 0;
                        setCurrentXP(xp);
                        setDisplayXP(xp);
                    }
                } catch (e) {
                    console.warn('[Reward] XP fetch error:', e);
                }

                // Start experience
                setPhase('overlay');
            } catch (err) {
                console.error('[Reward] Init error:', err);
                if (!cancelled) setPhase('done');
            }
        })();

        return () => { cancelled = true; };
    }, [userId]);

    // ─── Auto phase transitions ─────────────────────────────────────────

    useEffect(() => {
        if (phase === 'overlay') {
            const t = setTimeout(() => setPhase('box-arrived'), 600);
            return () => clearTimeout(t);
        }
        if (phase === 'claimed') {
            const t = setTimeout(() => setPhase('done'), 2000);
            return () => clearTimeout(t);
        }
    }, [phase]);

    // ─── Sound triggers ─────────────────────────────────────────────────

    useEffect(() => {
        if (isMuted()) return;
        if (phase === 'box-arrived') playArrival();
        if (phase === 'opening') playUnlock();
        if (phase === 'burst') playReveal();
        if (phase === 'claimed') playSuccess();
    }, [phase]);

    // ─── Countdown ──────────────────────────────────────────────────────

    useEffect(() => {
        if (phase !== 'countdown') return;
        if (countdownValue <= 0) {
            setPhase('opening');
            return;
        }
        if (!isMuted()) playCountdownTick();
        const t = setTimeout(() => setCountdownValue(v => v - 1), 700);
        return () => clearTimeout(t);
    }, [phase, countdownValue]);

    // ─── 3D scene complete → burst → reveal ─────────────────────────────

    const handleOpeningComplete = useCallback(() => {
        setPhase('burst');
        setTimeout(() => setPhase('reward-reveal'), 1200);
    }, []);

    // ─── Lock scroll / trap focus ───────────────────────────────────────

    useEffect(() => {
        if (phase === 'done' || phase === 'checking') return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [phase]);

    // ─── XP counter animation ───────────────────────────────────────────

    const animateXP = useCallback((from: number, to: number) => {
        if (xpAnimRef.current) cancelAnimationFrame(xpAnimRef.current);
        const duration = 1200;
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

    // ─── Handlers ───────────────────────────────────────────────────────

    const handleOpenReward = useCallback(() => {
        if (phase === 'box-arrived') {
            setCountdownValue(3);
            setPhase('countdown');
        }
    }, [phase]);

    const handleSelectOption = useCallback((i: number) => {
        if (isAnswered) return;
        setSelectedOption(i);
        setIsAnswered(true);
    }, [isAnswered]);

    const handleClaim = useCallback(async () => {
        if (!reward || isClaiming) return;
        setIsClaiming(true);

        try {
            let finalReward = reward;
            // Wrong answer on brain teaser → only 5 XP
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

            // Refresh user profile (syncs XP across dashboard)
            await refreshUser();

            setPhase('claimed');
        } catch (err) {
            console.error('[Reward] Claim error:', err);
            setPhase('claimed');
        }
    }, [reward, isClaiming, userId, isAnswered, selectedOption, currentXP, animateXP, refreshUser]);

    // ─── Early exit ─────────────────────────────────────────────────────

    if (phase === 'done' || phase === 'checking') return null;

    // ─── Render ─────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className={styles.overlay}
                key="daily-reward"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                role="dialog"
                aria-modal="true"
                aria-label="Daily Surprise Reward"
                ref={containerRef}
            >
                {/* 3D Scene — centered square container */}
                {reward && (
                    <div className={styles.sceneContainer}>
                        <MysteryBoxScene
                            phase={toScenePhase(phase)}
                            rarity={reward.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'}
                            onOpeningComplete={handleOpeningComplete}
                        />
                    </div>
                )}

                {/* UI Overlay */}
                {reward && (
                    <RewardOverlay
                        phase={toOverlayPhase(phase)}
                        reward={reward}
                        countdownValue={countdownValue}
                        displayXP={displayXP}
                        onOpenReward={handleOpenReward}
                        onSelectOption={handleSelectOption}
                        onClaim={handleClaim}
                        isAnswered={isAnswered}
                        selectedOption={selectedOption}
                        isClaiming={isClaiming}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
