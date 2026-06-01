'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import {
    Coins,
    Flame,
    Gamepad2,
    Trophy,
    Award,
    ChevronRight,
    Lock,
    Play,
    Zap,
    Target,
    Brain,
    Swords,
    Calculator,
    Search,
    Sparkles,
    ArrowRight,
    Gift,
    Crown,
    Star,
    Users,
    BookOpen,
    Globe,
    Puzzle,
    Timer,
    TrendingUp,
} from 'lucide-react';
import type { GameStats } from '@/types';
import WordHuntGame from './WordHuntGame';

// ─── Animated Counter ───────────────────────────────────────
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionVal = useMotionValue(0);
    const rounded = useTransform(motionVal, (v) => Math.round(v));

    useEffect(() => {
        const controls = animate(motionVal, value, { duration, ease: 'easeOut' });
        return controls.stop;
    }, [value, duration, motionVal]);

    useEffect(() => {
        const unsub = rounded.on('change', (v) => {
            if (ref.current) ref.current.textContent = String(v);
        });
        return unsub;
    }, [rounded]);

    return <span ref={ref}>0</span>;
}

// ─── Types ──────────────────────────────────────────────────
interface GamesZoneProps {
    userId: string;
    userName: string;
    coins: number;
    gameStats: GameStats | null;
    onCoinsChange: () => void;
}

// ─── Featured Games ─────────────────────────────────────────
const FEATURED_GAMES = [
    {
        id: 'quiz-arena',
        name: 'Quiz Arena',
        subtitle: 'Real-time Quiz',
        description: 'Compete in real-time quizzes against other students',
        image: '/images/games/quiz-arena.png',
        icon: Trophy,
        gradient: 'from-orange-500 via-amber-500 to-yellow-400',
        shadowColor: 'shadow-orange-500/20',
        difficulty: 'Medium',
        xp: 50,
        available: false,
    },
    {
        id: 'word-hunt',
        name: 'Word Hunt',
        subtitle: 'Find & Learn',
        description: 'Find hidden words in the puzzle grid',
        image: '/images/games/word-hunt.png',
        icon: Search,
        gradient: 'from-blue-600 via-blue-500 to-cyan-400',
        shadowColor: 'shadow-blue-500/20',
        difficulty: 'Easy',
        xp: 30,
        available: true,
    },
    {
        id: 'math-dash',
        name: 'Math Dash',
        subtitle: 'Speed Math',
        description: 'Solve math problems at lightning speed',
        image: '/images/games/math-dash.png',
        icon: Calculator,
        gradient: 'from-emerald-600 via-green-500 to-teal-400',
        shadowColor: 'shadow-emerald-500/20',
        difficulty: 'Hard',
        xp: 60,
        available: false,
    },
    {
        id: 'brain-boost',
        name: 'Brain Boost',
        subtitle: 'Quick Puzzles',
        description: 'Challenge your brain with mini puzzles',
        image: '/images/games/brain-boost.png',
        icon: Brain,
        gradient: 'from-purple-600 via-violet-500 to-fuchsia-400',
        shadowColor: 'shadow-purple-500/20',
        difficulty: 'Medium',
        xp: 40,
        available: false,
    },
    {
        id: 'battle-friends',
        name: 'Battle Friends',
        subtitle: 'PvP Challenge',
        description: 'Challenge your friends to a knowledge duel',
        image: '/images/games/battle-friends.png',
        icon: Swords,
        gradient: 'from-rose-600 via-pink-500 to-red-400',
        shadowColor: 'shadow-rose-500/20',
        difficulty: 'Hard',
        xp: 70,
        available: false,
    },
];

// ─── Categories ─────────────────────────────────────────────
const CATEGORIES = [
    { name: 'All Games', icon: Gamepad2, color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40' },
    { name: 'Maths', icon: Calculator, color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40' },
    { name: 'English', icon: BookOpen, color: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40' },
    { name: 'General Knowledge', icon: Globe, color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40' },
    { name: 'Puzzles', icon: Puzzle, color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40' },
    { name: 'Quick Play', icon: Timer, color: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40' },
];

// ─── Main Component ─────────────────────────────────────────
export default function GamesZone({ userId, userName, coins, gameStats, onCoinsChange }: GamesZoneProps) {
    const [activeGame, setActiveGame] = useState<string | null>(null);

    if (activeGame === 'word-hunt') {
        return (
            <WordHuntGame
                userId={userId}
                userName={userName}
                coins={coins}
                gameStats={gameStats}
                onBack={() => setActiveGame(null)}
                onCoinsChange={onCoinsChange}
            />
        );
    }

    const stats = {
        coins,
        dayStreak: gameStats?.dayStreak || 0,
        gamesPlayed: gameStats?.gamesPlayed || 0,
        badgesEarned: gameStats?.badgesEarned || 0,
    };

    const difficultyColor = (d: string) => {
        if (d === 'Easy') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        if (d === 'Hard') return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pb-8"
        >
            {/* ─── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Games Zone
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        Learn. Play. Win.
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl px-4 py-2.5 shadow-sm"
                >
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-sm shadow-amber-400/30">
                        <Coins className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg text-amber-700 dark:text-amber-400 tabular-nums">
                        <AnimatedCounter value={stats.coins} />
                    </span>
                    <button className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm shadow-blue-500/30 active:scale-90">
                        +
                    </button>
                </motion.div>
            </div>

            {/* ─── Hero Banner ──────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative mb-12"
                style={{ minHeight: 340 }}
            >
                {/* ── Hero background card (clipped) ── */}
                <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-blue-500/15" style={{ minHeight: 340 }}>
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6]" />

                    {/* Decorative layers */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* Radial glows */}
                        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 bg-blue-400/15 rounded-full blur-3xl" />
                        <div className="absolute top-1/3 right-[15%] w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 right-[30%] w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl" />

                        {/* Concentric circles */}
                        <div className="absolute -top-24 -right-24 w-96 h-96 border border-white/[0.05] rounded-full" />
                        <div className="absolute -top-16 -right-16 w-72 h-72 border border-white/[0.04] rounded-full" />
                        <div className="absolute -top-8 -right-8 w-48 h-48 border border-white/[0.03] rounded-full" />
                        <div className="absolute -bottom-32 -left-32 w-80 h-80 border border-white/[0.04] rounded-full" />

                        {/* Dot grid pattern */}
                        <div className="absolute inset-0 opacity-[0.035]" style={{
                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                            backgroundSize: '28px 28px'
                        }} />

                        {/* Floating Particles */}
                        <motion.div animate={{ y: [-5, 7, -5], x: [0, 3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute top-6 left-[12%] w-2 h-2 bg-white/25 rounded-full" />
                        <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                            className="absolute top-14 left-[35%] w-1.5 h-1.5 bg-yellow-300/40 rounded-full" />
                        <motion.div animate={{ y: [-8, 4, -8], x: [0, -4, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                            className="absolute bottom-16 left-[25%] w-2.5 h-2.5 bg-white/15 rounded-full" />
                        <motion.div animate={{ y: [4, -7, 4] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                            className="absolute top-20 right-[45%] w-1 h-1 bg-cyan-300/30 rounded-full" />
                        <motion.div animate={{ y: [-3, 5, -3], x: [2, -2, 2] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                            className="absolute bottom-10 right-[35%] w-2 h-2 bg-white/10 rounded-full" />
                        <motion.div animate={{ y: [5, -5, 5] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                            className="absolute top-10 right-[25%] w-1.5 h-1.5 bg-amber-200/25 rounded-full" />
                        <motion.div animate={{ y: [-6, 3, -6] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                            className="absolute bottom-24 left-[50%] w-1 h-1 bg-white/20 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute top-1/3 left-[8%] w-3 h-3 bg-white/10 rounded-full" />
                    </div>

                    {/* Left text content */}
                    <div className="relative px-6 sm:px-10 py-10 sm:py-12 z-10 max-w-[55%]" style={{ minHeight: 340 }}>
                        <motion.h3
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3"
                        >
                            Play Games,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-300">
                                Grow Smarter!
                            </span>
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="text-blue-100/80 text-base sm:text-lg mb-7 leading-relaxed max-w-md"
                        >
                            Fun educational games that improve learning through play.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-3"
                        >
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveGame('word-hunt')}
                                className="flex items-center gap-2.5 bg-white text-[#1D4ED8] px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:shadow-xl transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Start Playing
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white px-5 py-3 rounded-xl text-sm font-semibold border border-white/15 transition-all"
                            >
                                Explore Games
                                <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        </motion.div>
                    </div>
                </div>

                {/* ── Mascot Composition (outside overflow-hidden, overlaps hero bottom) ── */}
                <div className="hidden md:block absolute top-0 right-[4%] w-[35%] pointer-events-none" style={{ height: 'calc(100% + 30px)' }}>
                    {/* Radial glow behind mascot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[85%] aspect-square rounded-full bg-gradient-radial from-yellow-300/15 via-white/5 to-transparent blur-2xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[65%] aspect-square rounded-full bg-white/[0.06] blur-xl" />

                    {/* Mascot — raw img, no container, no border, no card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.3, type: 'spring', damping: 18 }}
                        className="absolute inset-0 flex items-end justify-center z-10"
                    >
                        <motion.div
                            animate={{ y: [-6, 6, -6] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/games/hero-mascot.png"
                                alt="Student mascot"
                                className="w-full max-w-[280px] h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] select-none mix-blend-multiply"
                                draggable={false}
                            />
                        </motion.div>
                    </motion.div>

                    {/* ── Floating Icon Badges ── */}
                    {/* Trophy — top left */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: 'spring' }}
                        className="absolute top-[8%] left-[-5%] z-20"
                    >
                        <motion.div animate={{ y: [-4, 6, -4], rotate: [-5, 5, -5] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
                            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/40">
                                <Trophy className="w-5 h-5 text-white" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Controller — bottom left */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, type: 'spring' }}
                        className="absolute bottom-[15%] left-[-8%] z-20"
                    >
                        <motion.div animate={{ y: [5, -5, 5], rotate: [3, -3, 3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                                <Gamepad2 className="w-5 h-5 text-white" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Coins — top right */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                        className="absolute top-[12%] right-[-3%] z-20"
                    >
                        <motion.div animate={{ y: [3, -7, 3], x: [-2, 2, -2] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}>
                            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40">
                                <Coins className="w-4 h-4 text-white" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Star — mid right */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9, type: 'spring' }}
                        className="absolute top-[35%] right-[-6%] z-20"
                    >
                        <motion.div animate={{ y: [-5, 4, -5], rotate: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/40">
                                <Star className="w-4 h-4 text-white fill-current" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* XP badge — bottom right */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, type: 'spring' }}
                        className="absolute bottom-[18%] right-[-2%] z-20"
                    >
                        <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
                            <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-green-500 px-2.5 py-1.5 rounded-full shadow-lg shadow-green-500/30">
                                <Zap className="w-3 h-3 text-white" />
                                <span className="text-[10px] font-bold text-white">+50 XP</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ── Glassmorphism Info Cards ── */}

                    {/* Active Players — top left */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.65 }}
                        className="absolute top-[2%] left-[5%] z-30"
                    >
                        <motion.div animate={{ y: [-3, 5, -3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}>
                            <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2">
                                <div className="w-6 h-6 bg-green-400/30 rounded-lg flex items-center justify-center">
                                    <Users className="w-3 h-3 text-green-300" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/50 font-medium leading-tight">Active Players</p>
                                    <p className="text-[11px] text-white font-bold leading-tight">12,450 Students</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Level Progress — mid-left */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 }}
                        className="absolute top-[52%] left-[-12%] z-30"
                    >
                        <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}>
                            <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 bg-purple-400/30 rounded-md flex items-center justify-center">
                                        <TrendingUp className="w-3 h-3 text-purple-300" />
                                    </div>
                                    <p className="text-[10px] text-white font-bold">Level 5</p>
                                </div>
                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '75%' }}
                                        transition={{ delay: 1, duration: 1.2 }}
                                        className="h-full bg-gradient-to-r from-purple-400 to-violet-400 rounded-full"
                                    />
                                </div>
                                <p className="text-[8px] text-white/40 mt-0.5">75% Complete</p>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Daily Reward — bottom center */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.85 }}
                        className="absolute bottom-[5%] left-[25%] z-30"
                    >
                        <motion.div animate={{ y: [3, -5, 3] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                            <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2">
                                <div className="w-6 h-6 bg-amber-400/30 rounded-lg flex items-center justify-center">
                                    <Coins className="w-3 h-3 text-amber-300" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/50 font-medium leading-tight">Daily Reward</p>
                                    <p className="text-[11px] text-white font-bold leading-tight">+20 Coins</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>

            {/* ─── Player Stats ───────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-7">
                {[
                    { icon: Coins, label: 'Coins Earned', value: stats.coins, iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500', shadow: 'shadow-amber-400/20' },
                    { icon: Flame, label: 'Daily Streak', value: stats.dayStreak, iconBg: 'bg-gradient-to-br from-orange-500 to-red-500', shadow: 'shadow-orange-500/20' },
                    { icon: Gamepad2, label: 'Games Played', value: stats.gamesPlayed, iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
                    { icon: Award, label: 'Badges Collected', value: stats.badgesEarned, iconBg: 'bg-gradient-to-br from-purple-500 to-violet-500', shadow: 'shadow-purple-500/20' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.06 }}
                            whileHover={{ y: -3, scale: 1.01 }}
                            className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 cursor-default transition-shadow hover:shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-md ${stat.shadow}`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums mb-1">
                                <AnimatedCounter value={stat.value} duration={1.2 + i * 0.2} />
                            </p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {stat.label}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* ─── Daily Challenge ─────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                whileHover={{ y: -1 }}
                className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mb-7 shadow-sm hover:shadow-md transition-all"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-t-3xl" />
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 flex-shrink-0">
                        <Target className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Daily Challenge</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Complete today&apos;s challenge and win <span className="font-bold text-amber-600 dark:text-amber-400">20 coins</span>!
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '0%' }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                />
                            </div>
                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
                                0 / 10
                            </span>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveGame('word-hunt')}
                        className="px-6 py-3 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all flex-shrink-0"
                    >
                        Play Now
                    </motion.button>
                </div>
            </motion.div>

            {/* ─── Featured Games ──────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-5">
                    <motion.h3
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg font-bold text-gray-900 dark:text-white"
                    >
                        Featured Games
                    </motion.h3>
                    <button className="text-xs text-[#1D4ED8] dark:text-blue-400 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
                        View All <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {FEATURED_GAMES.map((game, i) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.06 }}
                            whileHover={game.available ? { y: -6, scale: 1.02 } : {}}
                            className={`relative rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer transition-all ${game.available ? 'hover:shadow-xl ' + game.shadowColor : 'opacity-60'}`}
                            onClick={() => game.available && setActiveGame(game.id)}
                        >
                            {/* Card image */}
                            <div className="relative h-32 sm:h-36 overflow-hidden">
                                <Image
                                    src={game.image}
                                    alt={game.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 20vw"
                                />
                                {/* Lock overlay */}
                                {!game.available && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] flex items-center justify-center">
                                        <div className="w-11 h-11 bg-black/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                                            <Lock className="w-5 h-5 text-white/90" />
                                        </div>
                                    </div>
                                )}
                                {/* Difficulty badge */}
                                <div className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${difficultyColor(game.difficulty)}`}>
                                    {game.difficulty}
                                </div>
                            </div>

                            {/* Card body */}
                            <div className="p-3.5">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{game.name}</h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{game.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                                        <Zap className="w-3 h-3" /> {game.xp} XP
                                    </div>
                                    <button
                                        className={`text-xs font-bold flex items-center gap-0.5 ${game.available
                                            ? 'text-[#1D4ED8] dark:text-blue-400 hover:underline'
                                            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                            }`}
                                    >
                                        Play <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ─── Categories ──────────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Categories</h3>
                    <button className="text-xs text-[#1D4ED8] dark:text-blue-400 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
                        View All <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                    {CATEGORIES.map((cat, i) => {
                        const CatIcon = cat.icon;
                        return (
                            <motion.div
                                key={cat.name}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 + i * 0.04 }}
                                whileHover={{ y: -3, scale: 1.04 }}
                                className="flex-shrink-0 flex flex-col items-center gap-2.5 cursor-pointer"
                            >
                                <div className={`w-16 h-16 rounded-2xl border ${cat.color} flex items-center justify-center transition-all hover:shadow-md`}>
                                    <CatIcon className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 text-center max-w-[72px] leading-tight">
                                    {cat.name}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Leaderboard & Rewards ────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Leaderboard */}
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                    className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-sm shadow-amber-400/20">
                                <Trophy className="w-4 h-4 text-white" />
                            </div>
                            Leaderboard
                        </h4>
                        <button className="text-xs text-[#1D4ED8] dark:text-blue-400 font-semibold hover:underline">View All</button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
                        {['Daily', 'Weekly', 'Monthly'].map((tab, i) => (
                            <button
                                key={tab}
                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${i === 0
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {[
                            { rank: 1, name: 'Aryan Sharma', score: 560, medal: Crown, medalColor: 'text-amber-500' },
                            { rank: 2, name: 'Priya Verma', score: 420, medal: Award, medalColor: 'text-gray-400' },
                            { rank: 3, name: 'Rohan Singh', score: 310, medal: Award, medalColor: 'text-amber-700' },
                        ].map((player) => {
                            const MedalIcon = player.medal;
                            return (
                                <div key={player.rank} className="flex items-center gap-3 py-1.5">
                                    <div className="w-6 flex items-center justify-center">
                                        <MedalIcon className={`w-4 h-4 ${player.medalColor}`} />
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                                        {player.name.charAt(0)}
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{player.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{player.score}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Current user */}
                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-3 -mx-1 border border-blue-100 dark:border-blue-900/40">
                            <span className="w-6 text-center text-xs font-bold text-[#1D4ED8] dark:text-blue-400">4</span>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                                {userName.charAt(0)}
                            </div>
                            <span className="flex-1 text-sm font-bold text-[#1D4ED8] dark:text-blue-400 truncate">You</span>
                            <div className="flex items-center gap-1.5">
                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stats.coins}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Rewards Store */}
                <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                    className="relative rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm shadow-purple-400/20">
                                <Gift className="w-4 h-4 text-white" />
                            </div>
                            Rewards Store
                        </h4>
                        <button className="text-xs text-[#1D4ED8] dark:text-blue-400 font-semibold hover:underline">View All</button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                        Spend your coins on exciting rewards and unlock premium content!
                    </p>

                    <div className="space-y-3 mb-5">
                        {[
                            { icon: Star, name: 'Custom Avatar', cost: 100, color: 'text-amber-500' },
                            { icon: Sparkles, name: 'Premium Theme', cost: 200, color: 'text-purple-500' },
                            { icon: Zap, name: 'XP Boost', cost: 150, color: 'text-blue-500' },
                        ].map((item) => {
                            const ItemIcon = item.icon;
                            return (
                                <div key={item.name} className="flex items-center gap-3 py-1">
                                    <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                                        <ItemIcon className={`w-4 h-4 ${item.color}`} />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-800/60">
                                        <Coins className="w-3 h-3 text-amber-500" />
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{item.cost}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-bold shadow-md shadow-green-500/20"
                    >
                        Explore Rewards
                    </motion.button>

                    {/* Coming soon overlay */}
                    <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] rounded-3xl flex items-center justify-center z-10">
                        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-700 dark:text-amber-400 px-5 py-2.5 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-2 shadow-sm">
                            <Lock className="w-3.5 h-3.5" /> Coming Soon
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
