'use client';

/**
 * EntryPhase — Phase 1: "Daily Surprise" text + spotlight background.
 * Auto-advances to capsule phase. Duration: 1.8s (first) / 0.8s (returning).
 */

import React from 'react';
import { motion } from 'framer-motion';
import styles from '../DailyRewardExperience.module.css';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function EntryPhase() {
    return (
        <motion.div
            className={styles.entryContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
        >
            <motion.p
                className={styles.entryLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
            >
                Daily Surprise
            </motion.p>

            <motion.h2
                className={styles.entryHeadline}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
            >
                Something special{'\n'}is waiting for you
            </motion.h2>

            <motion.p
                className={styles.entrySubtext}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
            >
                Your daily reward is ready to be revealed
            </motion.p>
        </motion.div>
    );
}
