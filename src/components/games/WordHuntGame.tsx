'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import {
    ArrowLeft,
    Trophy,
    Pause,
    Play,
    RotateCcw,
    Search,
    Target,
    Timer,
    Shuffle,
    ChevronDown,
    BarChart3,
    Clock,
    CheckCircle2,
    Circle,
    Zap,
    Sparkles,
    Lock,
    Coins,
    Star,
    Lightbulb,
    Gamepad2,
    Award,
    Eye,
    Plus,
} from 'lucide-react';
import { addCoins, spendCoins } from '@/services/coinService';
import { updateGameStats } from '@/services/gameService';
import type { GameStats } from '@/types';

// ─── Animated Counter ─────────────────────────────────────
function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionVal = useMotionValue(0);
    const rounded = useTransform(motionVal, (v) => Math.round(v));
    useEffect(() => { const c = animate(motionVal, value, { duration, ease: 'easeOut' }); return c.stop; }, [value, duration, motionVal]);
    useEffect(() => { const u = rounded.on('change', (v) => { if (ref.current) ref.current.textContent = String(v); }); return u; }, [rounded]);
    return <span ref={ref}>0</span>;
}

// ─── Types ────────────────────────────────────────────────
interface WordHuntGameProps {
    userId: string;
    userName: string;
    coins: number;
    gameStats: GameStats | null;
    onBack: () => void;
    onCoinsChange: () => void;
}

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface PlacedWord {
    word: string;
    found: boolean;
    cells: { row: number; col: number }[];
    color: string;
}

// ─── Constants ────────────────────────────────────────────
const WORD_POOL = [
    'SCHOOL', 'BOOK', 'PENCIL', 'LEARNING', 'TEACHER',
    'BRAIN', 'STUDY', 'KNOWLEDGE', 'SCIENCE', 'READING',
    'MATH', 'QUIZ', 'CLASS', 'EXAM', 'GRADE',
    'SMART', 'THINK', 'LEARN', 'WRITE', 'SOLVE',
    'LOGIC', 'FOCUS', 'SKILL', 'IDEA', 'MIND',
];

const HIGHLIGHT_COLORS = [
    'bg-blue-300/70 dark:bg-blue-700/50',
    'bg-emerald-300/70 dark:bg-emerald-700/50',
    'bg-purple-300/70 dark:bg-purple-700/50',
    'bg-amber-300/70 dark:bg-amber-700/50',
    'bg-pink-300/70 dark:bg-pink-700/50',
    'bg-teal-300/70 dark:bg-teal-700/50',
    'bg-red-300/70 dark:bg-red-700/50',
    'bg-indigo-300/70 dark:bg-indigo-700/50',
    'bg-orange-300/70 dark:bg-orange-700/50',
    'bg-cyan-300/70 dark:bg-cyan-700/50',
];

const DIFFICULTY_CONFIG: Record<Difficulty, { gridSize: number; wordCount: number; time: number }> = {
    Easy: { gridSize: 8, wordCount: 5, time: 300 },
    Medium: { gridSize: 10, wordCount: 8, time: 270 },
    Hard: { gridSize: 12, wordCount: 10, time: 180 },
};

type Direction = [number, number];
const DIRECTIONS: Direction[] = [[0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]];

// ─── Grid Generator ───────────────────────────────────────
function generateGrid(difficulty: Difficulty): { grid: string[][]; placedWords: PlacedWord[] } {
    const { gridSize, wordCount } = DIFFICULTY_CONFIG[difficulty];
    const grid: string[][] = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ''));
    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.filter(w => w.length <= gridSize).slice(0, wordCount);
    const placedWords: PlacedWord[] = [];

    for (const word of selectedWords) {
        let placed = false;
        const dirOrder = [...DIRECTIONS].sort(() => Math.random() - 0.5);
        for (let attempt = 0; attempt < 100 && !placed; attempt++) {
            const dir = dirOrder[attempt % dirOrder.length];
            const startRow = Math.floor(Math.random() * gridSize);
            const startCol = Math.floor(Math.random() * gridSize);
            const cells: { row: number; col: number }[] = [];
            let fits = true;
            for (let i = 0; i < word.length; i++) {
                const r = startRow + dir[0] * i, c = startCol + dir[1] * i;
                if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) { fits = false; break; }
                if (grid[r][c] !== '' && grid[r][c] !== word[i]) { fits = false; break; }
                cells.push({ row: r, col: c });
            }
            if (fits) {
                cells.forEach((c, i) => { grid[c.row][c.col] = word[i]; });
                placedWords.push({ word, found: false, cells, color: HIGHLIGHT_COLORS[placedWords.length % HIGHLIGHT_COLORS.length] });
                placed = true;
            }
        }
    }
    for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) if (grid[r][c] === '') grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return { grid, placedWords };
}

// ─── Main Component ───────────────────────────────────────
export default function WordHuntGame({ userId, userName, coins, gameStats, onBack, onCoinsChange }: WordHuntGameProps) {
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
    const [grid, setGrid] = useState<string[][]>([]);
    const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
    const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(270);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isGameWon, setIsGameWon] = useState(false);
    const [hints, setHints] = useState(3);
    const [highlightedCells, setHighlightedCells] = useState<Map<string, string>>(new Map());
    const [coinsEarned, setCoinsEarned] = useState(0);
    const [showCoinAnimation, setShowCoinAnimation] = useState(false);
    const [coinAnimationAmount, setCoinAnimationAmount] = useState(0);
    const [startTime] = useState(Date.now());
    const gridRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const initGame = useCallback(() => {
        const config = DIFFICULTY_CONFIG[difficulty];
        const { grid: g, placedWords: w } = generateGrid(difficulty);
        setGrid(g); setPlacedWords(w); setSelectedCells([]); setHighlightedCells(new Map());
        setTimeLeft(config.time); setScore(0); setIsPaused(false); setIsGameOver(false); setIsGameWon(false); setHints(3); setCoinsEarned(0);
    }, [difficulty]);

    useEffect(() => { initGame(); }, [initGame]);

    useEffect(() => {
        if (isPaused || isGameOver || isGameWon) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => { if (prev <= 1) { clearInterval(timerRef.current!); setIsGameOver(true); handleGameEnd(false); return 0; } return prev - 1; });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPaused, isGameOver, isGameWon]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const handleGameEnd = async (won: boolean) => {
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const wordsFound = placedWords.filter(w => w.found).length;
        let totalCoins = coinsEarned;
        if (won) { totalCoins += 20; totalCoins += Math.floor(timeLeft / 10); }
        if (totalCoins > 0) { try { await addCoins(userId, totalCoins); onCoinsChange(); } catch (e) { console.error(e); } }
        try { await updateGameStats(userId, userName, { wordsFound, score: score + (won ? 50 : 0), timeTaken }); } catch (e) { console.error(e); }
    };

    const checkWord = useCallback((cells: { row: number; col: number }[]) => {
        if (cells.length < 2) return;
        const letters = cells.map(c => grid[c.row][c.col]).join('');
        const reversed = [...letters].reverse().join('');
        const idx = placedWords.findIndex(w => !w.found && (w.word === letters || w.word === reversed));
        if (idx !== -1) {
            const updated = [...placedWords]; updated[idx].found = true; setPlacedWords(updated);
            const newHL = new Map(highlightedCells);
            updated[idx].cells.forEach(c => newHL.set(`${c.row}-${c.col}`, updated[idx].color));
            setHighlightedCells(newHL);
            setScore(p => p + 10);
            const reward = 5; setCoinsEarned(p => p + reward);
            setCoinAnimationAmount(reward); setShowCoinAnimation(true); setTimeout(() => setShowCoinAnimation(false), 1500);
            if (updated.every(w => w.found)) { setIsGameWon(true); setScore(p => p + 50); handleGameEnd(true); }
        }
    }, [grid, placedWords, highlightedCells, coinsEarned, userId, userName, onCoinsChange]);

    const getCellFromTouch = (e: React.Touch) => {
        if (!gridRef.current) return null;
        const rect = gridRef.current.getBoundingClientRect();
        const cellSize = rect.width / DIFFICULTY_CONFIG[difficulty].gridSize;
        const col = Math.floor((e.clientX - rect.left) / cellSize);
        const row = Math.floor((e.clientY - rect.top) / cellSize);
        const gs = DIFFICULTY_CONFIG[difficulty].gridSize;
        return (row >= 0 && row < gs && col >= 0 && col < gs) ? { row, col } : null;
    };

    const handleMouseDown = (r: number, c: number) => { if (isPaused || isGameOver || isGameWon) return; setIsSelecting(true); setSelectedCells([{ row: r, col: c }]); };
    const handleMouseEnter = (row: number, col: number) => {
        if (!isSelecting || isPaused || isGameOver || isGameWon || selectedCells.length === 0) return;
        const first = selectedCells[0]; const dr = row - first.row; const dc = col - first.col;
        const maxD = Math.max(Math.abs(dr), Math.abs(dc)); if (maxD === 0) return;
        const sR = dr === 0 ? 0 : dr / Math.abs(dr); const sC = dc === 0 ? 0 : dc / Math.abs(dc);
        if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) return;
        const newSel: { row: number; col: number }[] = [];
        for (let i = 0; i <= maxD; i++) newSel.push({ row: first.row + sR * i, col: first.col + sC * i });
        setSelectedCells(newSel);
    };
    const handleMouseUp = () => { if (isSelecting) { checkWord(selectedCells); setSelectedCells([]); setIsSelecting(false); } };
    const handleTouchStart = (e: React.TouchEvent) => { if (isPaused || isGameOver || isGameWon) return; const cell = getCellFromTouch(e.touches[0]); if (cell) { setIsSelecting(true); setSelectedCells([cell]); } };
    const handleTouchMove = (e: React.TouchEvent) => { if (!isSelecting) return; e.preventDefault(); const cell = getCellFromTouch(e.touches[0]); if (cell) handleMouseEnter(cell.row, cell.col); };
    const handleTouchEnd = () => handleMouseUp();

    const useHint = async () => {
        if (hints <= 0 || isPaused || isGameOver || isGameWon) return;
        const success = await spendCoins(userId, 5); if (!success) return; onCoinsChange(); setHints(p => p - 1);
        const unfound = placedWords.filter(w => !w.found); if (unfound.length === 0) return;
        const word = unfound[Math.floor(Math.random() * unfound.length)];
        const unhighlighted = word.cells.filter(c => !highlightedCells.has(`${c.row}-${c.col}`));
        if (unhighlighted.length > 0) { const cell = unhighlighted[Math.floor(Math.random() * unhighlighted.length)]; const newHL = new Map(highlightedCells); newHL.set(`${cell.row}-${cell.col}`, 'bg-yellow-300/80 dark:bg-yellow-700/60'); setHighlightedCells(newHL); }
    };

    const usePowerUp = async (type: 'revealWord' | 'revealLetter' | 'addTime' | 'shuffle') => {
        const costs = { revealWord: 20, revealLetter: 10, addTime: 15, shuffle: 25 };
        const success = await spendCoins(userId, costs[type]); if (!success) return; onCoinsChange();
        if (type === 'revealWord') {
            const unfound = placedWords.filter(w => !w.found); if (unfound.length === 0) return;
            const word = unfound[Math.floor(Math.random() * unfound.length)];
            const updated = placedWords.map(w => w.word === word.word ? { ...w, found: true } : w); setPlacedWords(updated);
            const newHL = new Map(highlightedCells); word.cells.forEach(c => newHL.set(`${c.row}-${c.col}`, word.color)); setHighlightedCells(newHL);
            setScore(p => p + 5); if (updated.every(w => w.found)) { setIsGameWon(true); setScore(p => p + 50); handleGameEnd(true); }
        } else if (type === 'revealLetter') {
            const unfound = placedWords.filter(w => !w.found); if (unfound.length === 0) return;
            const word = unfound[Math.floor(Math.random() * unfound.length)];
            const unhighlighted = word.cells.filter(c => !highlightedCells.has(`${c.row}-${c.col}`));
            if (unhighlighted.length > 0) { const cell = unhighlighted[Math.floor(Math.random() * unhighlighted.length)]; const newHL = new Map(highlightedCells); newHL.set(`${cell.row}-${cell.col}`, 'bg-yellow-300/80 dark:bg-yellow-700/60'); setHighlightedCells(newHL); }
        } else if (type === 'addTime') { setTimeLeft(p => p + 30); }
        else if (type === 'shuffle') {
            const wordKeys = new Set<string>(); placedWords.forEach(w => w.cells.forEach(c => wordKeys.add(`${c.row}-${c.col}`)));
            setGrid(grid.map((row, r) => row.map((cell, c) => wordKeys.has(`${r}-${c}`) ? cell : String.fromCharCode(65 + Math.floor(Math.random() * 26)))));
        }
    };

    const isSelected = (r: number, c: number) => selectedCells.some(s => s.row === r && s.col === c);
    const foundCount = placedWords.filter(w => w.found).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
            {/* ─── Header ──────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onBack}
                        className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </motion.button>
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Word Hunt</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Find the hidden words!</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/60 dark:border-amber-800/60 rounded-xl px-3 py-2 shadow-sm">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-sm text-amber-700 dark:text-amber-400 tabular-nums">{coins}</span>
                    </div>
                    <button className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/60 rounded-xl px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 shadow-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                        <Trophy className="w-3.5 h-3.5" /> Leaderboard
                    </button>
                </div>
            </div>

            {/* ─── Hero Banner ──────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4338CA] via-[#5B21B6] to-[#4338CA] p-5 sm:p-6 mb-5 shadow-lg shadow-purple-500/10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.04] rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/[0.03] rounded-full" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                </div>
                <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-sm">
                        <Image src="/images/games/word-hunt.png" alt="Word Hunt" width={40} height={40} className="rounded-lg" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">Word Hunt</h3>
                        <p className="text-white/60 text-sm">Find all the hidden words in the grid.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <Search className="w-6 h-6 text-white/40" />
                        <Target className="w-5 h-5 text-white/30" />
                    </div>
                </div>
            </motion.div>

            {/* Coin Animation */}
            <AnimatePresence>
                {showCoinAnimation && (
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: -10, scale: 1 }} exit={{ opacity: 0, y: -30 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-amber-500/30 flex items-center gap-2">
                        <Coins className="w-4 h-4" /> +{coinAnimationAmount} coins!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Over / Won Modal */}
            <AnimatePresence>
                {(isGameOver || isGameWon) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30">
                                {isGameWon ? <Trophy className="w-10 h-10 text-amber-500" /> : <Clock className="w-10 h-10 text-gray-400" />}
                            </motion.div>
                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                                {isGameWon ? 'Congratulations!' : 'Time\'s Up!'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                {isGameWon ? `You found all ${placedWords.length} words!` : `You found ${foundCount} of ${placedWords.length} words.`}
                            </p>
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <div className="text-center">
                                    <p className="text-3xl font-extrabold text-[#1D4ED8]">{score}</p>
                                    <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Score</p>
                                </div>
                                <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
                                <div className="text-center">
                                    <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{coinsEarned}</p>
                                    <p className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-center gap-1"><Coins className="w-3 h-3" /> Coins</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={initGame}
                                    className="flex-1 py-3 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
                                    <RotateCcw className="w-4 h-4" /> Play Again
                                </motion.button>
                                <button onClick={onBack}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    Back
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Main Layout ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                {/* Left Column */}
                <div>
                    {/* Game Controls Bar */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4 shadow-sm">
                        <div className="relative">
                            <button onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)} className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Difficulty</span>
                                <span className="font-bold text-sm text-[#1D4ED8] dark:text-blue-400">{difficulty}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <AnimatePresence>
                                {showDifficultyDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowDifficultyDropdown(false)} />
                                        <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[120px]">
                                            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                                                <button key={d} onClick={() => { setDifficulty(d); setShowDifficultyDropdown(false); }}
                                                    className={`block w-full px-4 py-2.5 text-sm text-left transition-colors ${difficulty === d ? 'text-[#1D4ED8] font-semibold bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                                    {d}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className={`font-mono font-bold text-base tabular-nums ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-base text-gray-900 dark:text-white tabular-nums">{score}</span>
                        </div>
                    </motion.div>

                    {/* Word Grid */}
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 mb-4 shadow-sm">
                        <div ref={gridRef} className="grid gap-[3px] sm:gap-1 select-none"
                            style={{ gridTemplateColumns: `repeat(${DIFFICULTY_CONFIG[difficulty].gridSize}, 1fr)` }}
                            onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                            {grid.map((row, r) => row.map((letter, c) => {
                                const key = `${r}-${c}`; const highlighted = highlightedCells.get(key); const selected = isSelected(r, c);
                                return (
                                    <motion.div key={key} onMouseDown={() => handleMouseDown(r, c)} onMouseEnter={() => handleMouseEnter(r, c)} onMouseUp={handleMouseUp}
                                        whileHover={!highlighted && !selected ? { scale: 1.05 } : {}}
                                        className={`aspect-square flex items-center justify-center rounded-lg text-[11px] sm:text-sm font-bold cursor-pointer select-none transition-colors duration-100
                                            ${highlighted ? `${highlighted} text-gray-900 dark:text-white shadow-sm` : selected ? 'bg-blue-200 dark:bg-blue-700/50 text-blue-800 dark:text-blue-200 ring-2 ring-blue-400/50 shadow-sm' : 'bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80'}`}>
                                        {letter}
                                    </motion.div>
                                );
                            }))}
                        </div>
                    </motion.div>

                    {/* Instruction */}
                    <div className="flex items-start gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/15 dark:to-indigo-900/15 rounded-xl p-3.5 mb-4 border border-blue-100 dark:border-blue-900/30">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Find all the words hidden in the grid.</p>
                            <p className="text-[11px] text-blue-600/60 dark:text-blue-400/60 mt-0.5">Words can be placed horizontally, vertically or diagonally.</p>
                        </div>
                    </div>

                    {/* Power-Ups */}
                    <div className="mb-5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Power-Ups</h4>
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            {[
                                { type: 'revealWord' as const, icon: Eye, label: 'Reveal Word', cost: 20 },
                                { type: 'revealLetter' as const, icon: Target, label: 'Reveal Letter', cost: 10 },
                                { type: 'addTime' as const, icon: Plus, label: 'Add Time', cost: 15 },
                                { type: 'shuffle' as const, icon: Shuffle, label: 'Shuffle', cost: 25 },
                            ].map(p => {
                                const PIcon = p.icon;
                                return (
                                    <motion.button key={p.type} whileHover={coins >= p.cost ? { y: -2, scale: 1.02 } : {}} whileTap={coins >= p.cost ? { scale: 0.97 } : {}}
                                        onClick={() => usePowerUp(p.type)} disabled={isPaused || isGameOver || isGameWon || coins < p.cost}
                                        className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed group">
                                        <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                            <PIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-[#1D4ED8] dark:group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">{p.label}</p>
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-800/60">
                                            <Coins className="w-3 h-3 text-amber-500" />
                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{p.cost}</span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex gap-3">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsPaused(!isPaused)} disabled={isGameOver || isGameWon}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all">
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {isPaused ? 'Resume' : 'Pause'}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={initGame}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <RotateCcw className="w-4 h-4" /> Restart
                        </motion.button>
                    </div>
                </div>

                {/* ─── Right Sidebar ────────────────────────── */}
                <div className="space-y-4">
                    {/* Words to Find */}
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Words to Find</h4>
                            <span className="text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-[#1D4ED8] dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40 tabular-nums">
                                {foundCount} / {placedWords.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {placedWords.map((pw, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.03 }}
                                    className="flex items-center gap-2.5">
                                    {pw.found ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                                    <span className={`text-sm font-medium tracking-wide ${pw.found ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-60' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {pw.word}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Hint */}
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm flex-1">Hint</h4>
                            <span className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center shadow-sm">
                                {hints}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">Reveal a random letter <Coins className="w-3 h-3 text-amber-500" /> 5</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={useHint}
                            disabled={hints <= 0 || isPaused || isGameOver || isGameWon}
                            className="w-full py-2.5 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            Use Hint
                        </motion.button>
                    </motion.div>

                    {/* Best Score */}
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Best Score</h4>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                            <AnimatedCounter value={gameStats?.bestScore || 0} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keep trying to beat your record!</p>
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-[#1D4ED8] dark:text-blue-400" />
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Stats</h4>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Games Played', value: String(gameStats?.gamesPlayed || 0), icon: Gamepad2 },
                                { label: 'Words Found', value: String(gameStats?.wordsFound || 0), icon: Search },
                                { label: 'Best Time', value: gameStats?.bestTime ? formatTime(gameStats.bestTime) : '--:--', icon: Timer },
                            ].map(stat => {
                                const SIcon = stat.icon;
                                return (
                                    <div key={stat.label} className="flex items-center justify-between py-0.5">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <SIcon className="w-3.5 h-3.5 text-gray-400" /> {stat.label}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{stat.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Pause Overlay */}
            <AnimatePresence>
                {isPaused && !isGameOver && !isGameWon && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center max-w-xs w-full">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <Pause className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Game Paused</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Take a break, come back when ready!</p>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsPaused(false)}
                                className="w-full py-3.5 bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
                                <Play className="w-4 h-4" /> Resume
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
