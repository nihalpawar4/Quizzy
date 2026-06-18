'use client';

/**
 * RewardOverlay — HTML/CSS UI layer over 3D scene.
 * SVG illustrations instead of emojis. XP only, no coins.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../DailySurpriseReward.module.css';
import type { RewardData } from '@/services/dailyRewardService';
import { isMuted, setMuted } from '@/lib/rewardSounds';

export type OverlayPhase =
    | 'box-arrived'
    | 'countdown'
    | 'opening'
    | 'reward-reveal'
    | 'claimed'
    | 'hidden';

interface RewardOverlayProps {
    phase: OverlayPhase;
    reward: RewardData | null;
    countdownValue: number;
    displayXP: number;
    onOpenReward: () => void;
    onSelectOption: (index: number) => void;
    onClaim: () => void;
    isAnswered: boolean;
    selectedOption: number | null;
    isClaiming: boolean;
}

// ─── SVG icon illustrations ─────────────────────────────────────────────

function RewardIllustration({ icon, size = 32 }: { icon: string; size?: number }) {
    const s = size;
    const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    switch (icon) {
        case 'lightbulb':
            return (
                <svg {...props} className={styles.illustrationGold}>
                    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                </svg>
            );
        case 'microscope':
            return (
                <svg {...props} className={styles.illustrationCyan}>
                    <path d="M6 18h8M6 22h12M14 22v-4M10 18V8a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v2" />
                    <circle cx="12" cy="4" r="2" />
                    <path d="M12 14a4 4 0 1 0 0-8" />
                </svg>
            );
        case 'puzzle':
            return (
                <svg {...props} className={styles.illustrationBlue}>
                    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.452-.968-.878a2.5 2.5 0 1 0 0 4.693c.466-.426.998-.358 1.468.112l.706.706c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.414 1.414a2.41 2.41 0 0 1-1.704.706 2.41 2.41 0 0 1-1.704-.706l-.707-.707c-.47-.47-.538-1.002-.112-1.468a2.5 2.5 0 1 0-4.693 0c.426.466.358.998-.112 1.468l-.706.706a2.41 2.41 0 0 1-1.704.706 2.41 2.41 0 0 1-1.704-.706L3.293 22.293a1 1 0 0 1 0-1.414l.707-.707" />
                </svg>
            );
        case 'calculator':
            return (
                <svg {...props} className={styles.illustrationGreen}>
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="10" y2="10" />
                    <line x1="14" y1="10" x2="16" y2="10" />
                    <line x1="8" y1="14" x2="10" y2="14" />
                    <line x1="14" y1="14" x2="16" y2="14" />
                    <line x1="8" y1="18" x2="16" y2="18" />
                </svg>
            );
        case 'star':
            return (
                <svg {...props} className={styles.illustrationAmber}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            );
        case 'zap':
            return (
                <svg {...props} className={styles.illustrationYellow}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
            );
        case 'shield':
            return (
                <svg {...props} className={styles.illustrationBlue}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                </svg>
            );
        case 'ticket':
            return (
                <svg {...props} className={styles.illustrationPurple}>
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2M13 17v2M13 11v2" />
                </svg>
            );
        case 'crown':
            return (
                <svg {...props} className={styles.illustrationAmber}>
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
            );
        case 'sparkles':
            return (
                <svg {...props} className={styles.illustrationGold}>
                    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                    <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                </svg>
            );
        default:
            return (
                <svg {...props} className={styles.illustrationBlue}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                </svg>
            );
    }
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function RewardOverlay({
    phase,
    reward,
    countdownValue,
    displayXP,
    onOpenReward,
    onSelectOption,
    onClaim,
    isAnswered,
    selectedOption,
    isClaiming,
}: RewardOverlayProps) {
    const [soundMuted, setSoundMuted] = useState(isMuted());

    const handleToggleMute = useCallback(() => {
        const v = !soundMuted;
        setSoundMuted(v);
        setMuted(v);
    }, [soundMuted]);

    function rarityClass(r: string): string {
        switch (r) {
            case 'legendary': return styles.rarityLegendary ?? '';
            case 'epic': return styles.rarityEpic ?? '';
            case 'rare': return styles.rarityRare ?? '';
            case 'uncommon': return styles.rarityUncommon ?? '';
            default: return styles.rarityCommon ?? '';
        }
    }

    if (phase === 'hidden') return null;

    return (
        <div className={styles.uiOverlay}>
            {/* Mute toggle */}
            <button className={styles.muteButton} onClick={handleToggleMute}>
                {soundMuted ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                )}
            </button>

            <AnimatePresence mode="wait">

                {/* ═══ Box Arrived ═══ */}
                {phase === 'box-arrived' && (
                    <motion.div
                        key="arrived"
                        className={styles.centerContent}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.4 }}
                    >
                        <h2 className={styles.headline}>Your Daily Surprise</h2>
                        <p className={styles.headlineAccent}>has arrived!</p>
                        <motion.button
                            className={styles.ctaButton}
                            onClick={onOpenReward}
                            whileTap={{ scale: 0.96 }}
                        >
                            Open Reward
                        </motion.button>
                    </motion.div>
                )}

                {/* ═══ Countdown ═══ */}
                {phase === 'countdown' && (
                    <motion.div
                        key="countdown"
                        className={styles.centerContent}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <AnimatePresence mode="wait">
                            {countdownValue > 0 ? (
                                <motion.span
                                    key={countdownValue}
                                    className={styles.countdownNumber}
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.6, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: EASE_OUT }}
                                >
                                    {countdownValue}
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="ready"
                                    className={styles.countdownLabel}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Get Ready...
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ═══ Opening ═══ */}
                {phase === 'opening' && (
                    <motion.div
                        key="opening"
                        className={styles.centerContent}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.6 }}
                    >
                        <h2 className={styles.headline}>
                            Surprise <span className={styles.headlineGradient}>Unlocked!</span>
                        </h2>
                    </motion.div>
                )}

                {/* ═══ Reward Card ═══ */}
                {phase === 'reward-reveal' && reward && (
                    <motion.div
                        key="reward"
                        className={styles.rewardPhase}
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                    >
                        <div className={styles.rewardCard}>
                            {reward.rarity === 'legendary' && (
                                <div className={styles.sparkleDots} aria-hidden>
                                    {Array.from({ length: 6 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={styles.sparkleDot}
                                            style={{
                                                top: `${15 + Math.random() * 65}%`,
                                                left: `${10 + Math.random() * 80}%`,
                                                animationDelay: `${Math.random() * 2}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* SVG Illustration Icon */}
                            <motion.div
                                className={styles.rewardIconWrap}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                            >
                                <RewardIllustration icon={reward.icon} size={28} />
                            </motion.div>

                            <h3 className={styles.rewardTitle}>{reward.title}</h3>

                            <span className={`${styles.rewardRarity} ${rarityClass(reward.rarity)}`}>
                                {reward.rarity}
                            </span>

                            <p className={styles.rewardDescription}>{reward.description}</p>

                            {/* Content */}
                            {(reward.type === 'brain_teaser' || reward.type === 'math_challenge') ? (
                                <>
                                    <div className={styles.rewardContentQuestion}>
                                        {reward.content}
                                    </div>

                                    {reward.options && (
                                        <div className={styles.optionsGrid}>
                                            {reward.options.map((opt, i) => {
                                                let cls = styles.optionButton;
                                                if (isAnswered) {
                                                    if (i === reward.correctIndex) cls = styles.optionCorrect;
                                                    else if (i === selectedOption) cls = styles.optionWrong;
                                                    else cls = styles.optionDisabled;
                                                }
                                                return (
                                                    <button key={i} className={cls} onClick={() => onSelectOption(i)} disabled={isAnswered}>
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {isAnswered && (
                                        <motion.div
                                            className={selectedOption === reward.correctIndex ? styles.answerCorrect : styles.answerWrong}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            {selectedOption === reward.correctIndex
                                                ? `Correct! +${reward.xp} XP`
                                                : `Answer: ${reward.answer} (+5 XP)`}
                                        </motion.div>
                                    )}
                                </>
                            ) : reward.type !== 'bonus_xp' ? (
                                <div className={styles.rewardContent}>
                                    {reward.content}
                                </div>
                            ) : null}

                            {/* XP badge */}
                            {reward.xp > 0 && (
                                <div className={styles.badgeRow}>
                                    <motion.span
                                        className={styles.rewardXP}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        +{(reward.type === 'brain_teaser' || reward.type === 'math_challenge')
                                            ? (isAnswered ? (selectedOption === reward.correctIndex ? reward.xp : 5) : reward.xp)
                                            : reward.xp
                                        } XP
                                    </motion.span>
                                </div>
                            )}

                            {displayXP > 0 && (
                                <motion.div
                                    className={styles.xpCounter}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <span className={styles.xpCounterLabel}>Total XP</span>
                                    <span className={styles.xpCounterValue}>{displayXP.toLocaleString()}</span>
                                </motion.div>
                            )}

                            <motion.button
                                className={styles.claimButton}
                                onClick={onClaim}
                                disabled={
                                    isClaiming ||
                                    ((reward.type === 'brain_teaser' || reward.type === 'math_challenge') && !isAnswered)
                                }
                                whileTap={{ scale: 0.97 }}
                            >
                                {isClaiming ? 'Claiming...' : 'Claim Reward'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* ═══ Claimed ═══ */}
                {phase === 'claimed' && (
                    <motion.div
                        key="claimed"
                        className={styles.centerContent}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: EASE_OUT }}
                    >
                        <motion.div
                            className={styles.claimedIcon}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <svg className={styles.claimedCheckmark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </motion.div>
                        <h3 className={styles.claimedTitle}>Reward Added!</h3>
                        <p className={styles.claimedSubtext}>Come back tomorrow for another surprise</p>
                        {displayXP > 0 && (
                            <motion.p className={styles.xpFinal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                Total XP: <strong>{displayXP.toLocaleString()}</strong>
                            </motion.p>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
