'use client';

/**
 * RevealPhase — Phase 4: Reward card with glassmorphism design.
 * Handles: direct rewards, brain teasers, math challenges, spin wheel, memory game.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../DailyRewardExperience.module.css';
import type { RewardData } from '@/services/dailyRewardService';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── SVG Icon Component ────────────────────────────────────────────────

function RewardIcon({ icon }: { icon: string }) {
    const props = {
        width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5,
        strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    };

    switch (icon) {
        case 'lightbulb':
            return <svg {...props} className={styles.illustrationGold}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>;
        case 'microscope':
            return <svg {...props} className={styles.illustrationCyan}><path d="M6 18h8M6 22h12M14 22v-4M10 18V8a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v2" /><circle cx="12" cy="4" r="2" /><path d="M12 14a4 4 0 1 0 0-8" /></svg>;
        case 'puzzle':
            return <svg {...props} className={styles.illustrationBlue}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
        case 'calculator':
            return <svg {...props} className={styles.illustrationGreen}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>;
        case 'star':
            return <svg {...props} className={styles.illustrationAmber}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
        case 'zap':
            return <svg {...props} className={styles.illustrationYellow}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
        case 'shield':
            return <svg {...props} className={styles.illustrationBlue}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>;
        case 'ticket':
            return <svg {...props} className={styles.illustrationPurple}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2M13 17v2M13 11v2" /></svg>;
        case 'crown':
            return <svg {...props} className={styles.illustrationAmber}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>;
        case 'sparkles':
            return <svg {...props} className={styles.illustrationGold}><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" /></svg>;
        default:
            return <svg {...props} className={styles.illustrationBlue}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
    }
}

// ─── Spin Wheel Mini-Game ───────────────────────────────────────────────

const WHEEL_SEGMENTS = [
    { xp: 5, color: '#64748b' },
    { xp: 15, color: '#0ea5e9' },
    { xp: 10, color: '#a78bfa' },
    { xp: 25, color: '#fbbf24' },
    { xp: 10, color: '#38bdf8' },
    { xp: 20, color: '#34d399' },
];

function SpinWheel({ onResult }: { onResult: (xp: number) => void }) {
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    const handleSpin = useCallback(() => {
        if (spinning) return;
        setSpinning(true);

        const segAngle = 360 / WHEEL_SEGMENTS.length;
        const winIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
        // Spin 4-6 full rotations + land on segment
        const spins = 4 + Math.random() * 2;
        const targetAngle = spins * 360 + (360 - winIdx * segAngle - segAngle / 2);

        setRotation(targetAngle);

        setTimeout(() => {
            const xp = WHEEL_SEGMENTS[winIdx].xp;
            setResult(xp);
            onResult(xp);
        }, 2500);
    }, [spinning, onResult]);

    const segAngle = 360 / WHEEL_SEGMENTS.length;

    return (
        <div className={styles.spinWheelContainer}>
            <div className={styles.spinPointer} />
            <motion.div
                className={styles.spinWheel}
                animate={{ rotate: rotation }}
                transition={{ duration: 2.5, ease: [0.15, 0.85, 0.35, 1] }}
            >
                {WHEEL_SEGMENTS.map((seg, i) => (
                    <div
                        key={i}
                        className={styles.spinSegment}
                        style={{
                            transform: `rotate(${i * segAngle}deg) skewY(-${90 - segAngle}deg)`,
                            background: seg.color + '20',
                            borderBottom: `1px solid ${seg.color}30`,
                        }}
                    >
                        <span style={{
                            transform: `skewY(${90 - segAngle}deg) rotate(${segAngle / 2}deg)`,
                            color: seg.color,
                        }}>
                            +{seg.xp}
                        </span>
                    </div>
                ))}
            </motion.div>
            {!spinning && result === null && (
                <button className={styles.spinButton} onClick={handleSpin}>
                    SPIN
                </button>
            )}
            {result !== null && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--dr-primary)', color: '#fff',
                        borderRadius: '999px', padding: '8px 16px',
                        fontWeight: 700, fontSize: '16px', zIndex: 10,
                    }}
                >
                    +{result} XP
                </motion.div>
            )}
        </div>
    );
}

// ─── Memory Game ────────────────────────────────────────────────────────

const MEMORY_EMOJIS = ['⚡', '🌟', '💎', '🔥', '🎯', '🧩', '🎨', '🚀'];

function MemoryGame({ onResult }: { onResult: (xp: number) => void }) {
    const [cards, setCards] = useState<{ emoji: string; id: number }[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [matched, setMatched] = useState<number[]>([]);
    const [attempts, setAttempts] = useState(0);
    const [done, setDone] = useState(false);
    const lockRef = useRef(false);

    // Initialize 4 cards (2 pairs) on mount
    useEffect(() => {
        const pair1 = MEMORY_EMOJIS[Math.floor(Math.random() * MEMORY_EMOJIS.length)];
        let pair2 = pair1;
        while (pair2 === pair1) {
            pair2 = MEMORY_EMOJIS[Math.floor(Math.random() * MEMORY_EMOJIS.length)];
        }
        const deck = [
            { emoji: pair1, id: 0 }, { emoji: pair2, id: 1 },
            { emoji: pair1, id: 2 }, { emoji: pair2, id: 3 },
        ];
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        setCards(deck);
    }, []);

    const handleFlip = useCallback((index: number) => {
        if (lockRef.current || flipped.includes(index) || matched.includes(index) || done) return;

        const newFlipped = [...flipped, index];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            lockRef.current = true;
            setAttempts(a => a + 1);

            if (cards[newFlipped[0]].emoji === cards[newFlipped[1]].emoji) {
                // Match found
                setTimeout(() => {
                    setMatched(m => [...m, newFlipped[0], newFlipped[1]]);
                    setFlipped([]);
                    lockRef.current = false;

                    // Check if all matched
                    if (matched.length + 2 === cards.length) {
                        setDone(true);
                        // Fewer attempts = more XP
                        const xp = attempts <= 1 ? 20 : attempts <= 2 ? 15 : 10;
                        onResult(xp);
                    }
                }, 400);
            } else {
                // No match — flip back
                setTimeout(() => {
                    setFlipped([]);
                    lockRef.current = false;
                }, 800);
            }
        }
    }, [flipped, matched, cards, done, attempts, onResult]);

    if (cards.length === 0) return null;

    return (
        <div>
            <p style={{ fontSize: 12, color: 'var(--dr-text-muted)', marginBottom: 10, textAlign: 'center' }}>
                Match the pairs to earn bonus XP
            </p>
            <div className={styles.memoryGrid}>
                {cards.map((card, i) => {
                    const isFlipped = flipped.includes(i);
                    const isMatched = matched.includes(i);
                    const show = isFlipped || isMatched;

                    return (
                        <motion.div
                            key={i}
                            className={isMatched ? styles.memoryCardMatched : isFlipped ? styles.memoryCardFlipped : styles.memoryCard}
                            onClick={() => handleFlip(i)}
                            whileTap={!show ? { scale: 0.95 } : undefined}
                            animate={{ rotateY: show ? 0 : 180 }}
                            transition={{ duration: 0.3 }}
                        >
                            {show ? card.emoji : <span className={styles.memoryCardBack}>?</span>}
                        </motion.div>
                    );
                })}
            </div>
            {done && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: 13, color: '#34d399', textAlign: 'center', fontWeight: 600 }}
                >
                    🎉 Matched in {attempts} {attempts === 1 ? 'try' : 'tries'}!
                </motion.p>
            )}
        </div>
    );
}

// ─── Main RevealPhase ───────────────────────────────────────────────────

interface RevealPhaseProps {
    reward: RewardData;
    displayXP: number;
    onSelectOption: (index: number) => void;
    onClaim: () => void;
    isAnswered: boolean;
    selectedOption: number | null;
    isClaiming: boolean;
}

export default function RevealPhase({
    reward,
    displayXP,
    onSelectOption,
    onClaim,
    isAnswered,
    selectedOption,
    isClaiming,
}: RevealPhaseProps) {
    const [miniGameXP, setMiniGameXP] = useState<number | null>(null);
    const [miniGameDone, setMiniGameDone] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const isChallenge = reward.type === 'brain_teaser' || reward.type === 'math_challenge';
    const isSpinWheel = reward.type === 'spin_wheel';
    const isMemoryGame = reward.type === 'memory_game';
    const hasMiniGame = isChallenge || isSpinWheel || isMemoryGame;

    // Can claim when no mini-game, or mini-game is done, or challenge is answered
    const canClaim = !hasMiniGame || miniGameDone || (isChallenge && isAnswered);

    const handleMiniGameResult = useCallback((xp: number) => {
        setMiniGameXP(xp);
        setMiniGameDone(true);
    }, []);

    function rarityClass(r: string): string {
        switch (r) {
            case 'legendary': return styles.rarityLegendary;
            case 'epic': return styles.rarityEpic;
            case 'rare': return styles.rarityRare;
            case 'uncommon': return styles.rarityUncommon;
            default: return styles.rarityCommon;
        }
    }

    function iconWrapClass(r: string): string {
        switch (r) {
            case 'legendary': return styles.rewardIconWrapLegendary;
            case 'epic': return styles.rewardIconWrapEpic;
            case 'rare': return styles.rewardIconWrapRare;
            case 'uncommon': return styles.rewardIconWrapUncommon;
            default: return styles.rewardIconWrapCommon;
        }
    }

    const finalXP = miniGameXP ?? (isChallenge && isAnswered && selectedOption !== reward.correctIndex ? 5 : reward.xp);

    return (
        <motion.div
            className={styles.revealContainer}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className={styles.rewardCard} ref={cardRef}>
                {/* Icon */}
                <motion.div
                    className={`${styles.rewardIconWrap} ${iconWrapClass(reward.rarity)}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                >
                    <RewardIcon icon={reward.icon || 'star'} />
                </motion.div>

                {/* Title */}
                <motion.h3
                    className={styles.rewardTitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                >
                    {reward.title}
                </motion.h3>

                {/* Rarity badge */}
                <motion.span
                    className={`${styles.rarityBadge} ${rarityClass(reward.rarity)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {reward.rarity}
                </motion.span>

                {/* Description */}
                <motion.p
                    className={styles.rewardDescription}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                >
                    {reward.description}
                </motion.p>

                {/* Content / Challenge / Mini-Game */}
                <AnimatePresence mode="wait">
                    {isSpinWheel && !miniGameDone ? (
                        <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <SpinWheel onResult={handleMiniGameResult} />
                        </motion.div>
                    ) : isMemoryGame && !miniGameDone ? (
                        <motion.div key="memory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <MemoryGame onResult={handleMiniGameResult} />
                        </motion.div>
                    ) : isChallenge && reward.content ? (
                        <motion.div key="challenge" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                                            <motion.button
                                                key={i}
                                                className={cls}
                                                onClick={() => onSelectOption(i)}
                                                disabled={isAnswered}
                                                whileTap={!isAnswered ? { scale: 0.97 } : undefined}
                                            >
                                                {opt}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    ) : reward.content ? (
                        <motion.div
                            key="content"
                            className={styles.rewardContent}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            {reward.content}
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {/* XP Badge */}
                <motion.div
                    className={styles.badgeRow}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <div className={styles.xpBadge}>
                        <span>+{finalXP}</span>
                        <span className={styles.xpBadgeLabel}>XP</span>
                    </div>
                </motion.div>

                {/* Claim Button */}
                <motion.button
                    className={styles.claimButton}
                    onClick={onClaim}
                    disabled={!canClaim || isClaiming}
                    whileTap={canClaim ? { scale: 0.97 } : undefined}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: canClaim ? 1 : 0.4, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                >
                    {isClaiming ? 'Claiming...' : canClaim ? 'Claim Reward' : 'Complete challenge first'}
                </motion.button>
            </div>
        </motion.div>
    );
}
