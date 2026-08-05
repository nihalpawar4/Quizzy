'use client';

/**
 * DailyRewardExperience — Main Orchestrator
 * 5-phase flow: Entry → Capsule+Streak+Swipe → Reveal → Claim → Done
 * Skip button after 3s. Max 10s first-time, 5s returning.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DailyRewardExperience.module.css';
import { useDailyReward } from './hooks/useDailyReward';
import { useAuth } from '@/contexts/AuthContext';
import { isMuted, setMuted } from '@/lib/rewardSounds';

// Phase components
import EntryPhase from './phases/EntryPhase';
import CapsulePhase from './phases/CapsulePhase';
import RevealPhase from './phases/RevealPhase';
import ClaimPhase from './phases/ClaimPhase';

// ─── Props ──────────────────────────────────────────────────────────────

interface DailyRewardExperienceProps {
    userId: string;
}

export default function DailyRewardExperience({ userId }: DailyRewardExperienceProps) {
    const { refreshUser } = useAuth();
    const [soundMuted, setSoundMuted] = useState(() => isMuted());

    const {
        phase,
        reward,
        streak,
        displayXP,
        showSkip,
        isClaiming,
        selectedOption,
        isAnswered,
        skipToReveal,
        handleSwipeComplete,
        handleSelectOption,
        handleClaim,
    } = useDailyReward(userId, refreshUser);

    // ─── Mute toggle ────────────────────────────────────────────────

    const handleToggleMute = useCallback(() => {
        const v = !soundMuted;
        setSoundMuted(v);
        setMuted(v);
    }, [soundMuted]);

    // ─── Early exit ─────────────────────────────────────────────────

    if (phase === 'done' || phase === 'checking') return null;

    // ─── Render ─────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className={`${styles.overlay} ${styles.backdropDark}`}
                key="daily-reward-experience"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                role="dialog"
                aria-modal="true"
                aria-label="Daily Surprise Reward"
            >
                {/* Background elements */}
                <div className={styles.gridBg} />
                <div className={styles.spotlight} />

                {/* Top controls: Skip + Mute */}
                <div className={styles.topControls}>
                    {/* Skip button — appears after 3s */}
                    <AnimatePresence>
                        {showSkip && phase !== 'reveal' && phase !== 'claim' && (
                            <motion.button
                                className={styles.skipButton}
                                onClick={skipToReveal}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                Skip
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Mute toggle */}
                    <motion.button
                        className={styles.muteButton}
                        onClick={handleToggleMute}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {soundMuted ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                        )}
                    </motion.button>
                </div>

                {/* XP display */}
                <motion.div
                    className={styles.xpDisplay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span className={styles.xpDisplayValue}>{displayXP.toLocaleString()}</span>
                    XP
                </motion.div>

                {/* Phase content */}
                <AnimatePresence mode="wait">
                    {phase === 'entry' && (
                        <EntryPhase key="entry" />
                    )}

                    {phase === 'capsule' && reward && (
                        <CapsulePhase
                            key="capsule"
                            rarity={reward.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'}
                            streak={streak}
                            onSwipeComplete={handleSwipeComplete}
                        />
                    )}

                    {phase === 'reveal' && reward && (
                        <RevealPhase
                            key="reveal"
                            reward={reward}
                            displayXP={displayXP}
                            onSelectOption={handleSelectOption}
                            onClaim={handleClaim}
                            isAnswered={isAnswered}
                            selectedOption={selectedOption}
                            isClaiming={isClaiming}
                        />
                    )}

                    {phase === 'claim' && (
                        <ClaimPhase
                            key="claim"
                            displayXP={displayXP}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
