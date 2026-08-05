'use client';

/**
 * CapsulePhase — Phase 2+3: Floating capsule (3D), streak timeline, swipe-to-unlock.
 * Combined into one visual phase for streamlined UX.
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import dynamic from 'next/dynamic';
import styles from '../DailyRewardExperience.module.css';
import type { StreakData } from '../hooks/useDailyReward';

// Lazy-load 3D scene
const CapsuleScene = dynamic(() => import('../three/CapsuleScene'), { ssr: false });

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── Streak timeline config ────────────────────────────────────────────

const STREAK_DAYS = [
    { day: 1, label: '10 XP' },
    { day: 2, label: '20 XP' },
    { day: 3, label: 'Hint' },
    { day: 4, label: 'Border' },
    { day: 5, label: '2× XP' },
    { day: 6, label: 'Theme' },
    { day: 7, label: '★' },
];

interface CapsulePhaseProps {
    rarity: Rarity;
    streak: StreakData;
    onSwipeComplete: () => void;
}

export default function CapsulePhase({ rarity, streak, onSwipeComplete }: CapsulePhaseProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [unlocked, setUnlocked] = useState(false);

    const dragX = useMotionValue(0);
    const progressWidth = useTransform(dragX, (v) => {
        if (!trackRef.current) return '0%';
        const trackWidth = trackRef.current.offsetWidth - 52; // knob width + padding
        const pct = Math.max(0, Math.min(100, (v / trackWidth) * 100));
        return `${pct}%`;
    });

    const handleDrag = useCallback((_: unknown, info: { offset: { x: number } }) => {
        if (!trackRef.current || unlocked) return;
        const trackWidth = trackRef.current.offsetWidth - 52;
        const pct = Math.max(0, Math.min(100, (info.offset.x / trackWidth) * 100));
        setSwipeProgress(pct);
    }, [unlocked]);

    const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
        if (!trackRef.current || unlocked) return;
        const trackWidth = trackRef.current.offsetWidth - 52;
        const pct = (info.offset.x / trackWidth) * 100;

        if (pct >= 85) {
            setUnlocked(true);
            // Snap to end
            animate(dragX, trackWidth, { type: 'spring', stiffness: 300, damping: 30 });
            setTimeout(onSwipeComplete, 300);
        } else {
            // Snap back
            animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
            setSwipeProgress(0);
        }
    }, [unlocked, dragX, onSwipeComplete]);

    const currentDay = Math.min((streak.currentStreak % 7) + 1, 7);

    return (
        <motion.div
            className={styles.capsuleLayout}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
        >
            {/* Streak Timeline */}
            <motion.div
                className={styles.streakTimeline}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
            >
                {STREAK_DAYS.map((s, i) => {
                    const isCompleted = s.day < currentDay;
                    const isCurrent = s.day === currentDay;
                    const isStar = s.day === 7;
                    const isLast = i === STREAK_DAYS.length - 1;

                    let dotClass = styles.streakDot;
                    if (isStar && isCompleted) dotClass = styles.streakDotStarCompleted;
                    else if (isStar) dotClass = styles.streakDotStar;
                    else if (isCompleted) dotClass = styles.streakDotCompleted;
                    else if (isCurrent) dotClass = styles.streakDotCurrent;

                    return (
                        <motion.div
                            key={s.day}
                            className={styles.streakDay}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.3 + i * 0.05, ease: EASE_OUT }}
                        >
                            <div className={dotClass}>
                                {isStar ? '★' : isCompleted ? '✓' : s.day}
                            </div>
                            <span className={isCurrent ? styles.streakLabelActive : styles.streakLabel}>
                                {s.label}
                            </span>
                            {/* Connector line */}
                            {!isLast && (
                                <div className={isCompleted ? styles.streakConnectorFilled : styles.streakConnector} />
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* 3D Capsule Scene */}
            <motion.div
                className={styles.sceneContainer}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, type: 'spring', damping: 20 }}
            >
                <CapsuleScene rarity={rarity} />
            </motion.div>

            {/* Swipe to Unlock */}
            <motion.div
                className={styles.swipeContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
            >
                <div className={styles.swipeTrack} ref={trackRef}>
                    {/* Progress fill */}
                    <motion.div
                        className={styles.swipeProgress}
                        style={{ width: progressWidth }}
                    />

                    {/* Draggable knob */}
                    <motion.div
                        className={styles.swipeKnob}
                        drag="x"
                        dragConstraints={trackRef}
                        dragElastic={0}
                        dragMomentum={false}
                        style={{ x: dragX }}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                        whileTap={{ scale: 1.05 }}
                    >
                        <span className={styles.swipeKnobIcon}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </span>
                    </motion.div>

                    {/* Label */}
                    <motion.span
                        className={styles.swipeLabel}
                        animate={{ opacity: swipeProgress > 20 ? 0 : undefined }}
                    >
                        Slide to unlock your surprise
                    </motion.span>
                </div>
            </motion.div>
        </motion.div>
    );
}
