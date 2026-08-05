'use client';

/**
 * ClaimPhase — Phase 5: Claim animation with confetti + card shrink + exit.
 * Duration: 1.5 seconds total.
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { spawnConfetti } from '../hooks/useRewardAnimation';
import styles from '../DailyRewardExperience.module.css';

interface ClaimPhaseProps {
    displayXP: number;
}

export default function ClaimPhase({ displayXP }: ClaimPhaseProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Spawn confetti
        const cleanup = spawnConfetti(containerRef.current, 50);

        return cleanup;
    }, []);

    return (
        <motion.div
            ref={containerRef}
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 10000,
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
        >
            {/* Success message */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                style={{ textAlign: 'center' }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                    style={{
                        fontSize: 48,
                        marginBottom: 12,
                    }}
                >
                    ✨
                </motion.div>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    style={{
                        fontFamily: 'var(--dr-font-display)',
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--dr-text-primary)',
                        margin: 0,
                    }}
                >
                    Reward Claimed!
                </motion.p>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className={styles.xpBadge}
                    style={{ marginTop: 10 }}
                >
                    {displayXP.toLocaleString()} XP
                </motion.p>
            </motion.div>
        </motion.div>
    );
}
