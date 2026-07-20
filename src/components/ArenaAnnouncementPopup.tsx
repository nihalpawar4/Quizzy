'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, ExternalLink, Sparkles, Zap } from 'lucide-react';

const ARENA_SEEN_KEY = 'quizy_arena_announcement_seen';

export default function ArenaAnnouncementPopup() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Only show if never seen before
        const seen = localStorage.getItem(ARENA_SEEN_KEY);
        if (!seen) {
            // Small delay so dashboard loads first
            const timer = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem(ARENA_SEEN_KEY, 'true');
    };

    const handlePlay = () => {
        localStorage.setItem(ARENA_SEEN_KEY, 'true');
        window.open('https://quizy-arena.vercel.app', '_blank', 'noopener,noreferrer');
        setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleDismiss}
                        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="relative w-full max-w-md pointer-events-auto rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20">
                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white/70 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Gradient background */}
                            <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-8 pt-10">
                                {/* Decorative elements */}
                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
                                    {/* Floating particles */}
                                    <motion.div
                                        animate={{ y: [-8, 8, -8], opacity: [0.3, 0.7, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        className="absolute top-12 left-8"
                                    >
                                        <Sparkles className="w-4 h-4 text-yellow-300/50" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ y: [6, -6, 6], opacity: [0.2, 0.6, 0.2] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                        className="absolute top-24 right-16"
                                    >
                                        <Zap className="w-3 h-3 text-amber-300/40" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ y: [-5, 5, -5], opacity: [0.4, 0.8, 0.4] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                        className="absolute bottom-20 right-8"
                                    >
                                        <Sparkles className="w-3 h-3 text-purple-200/40" />
                                    </motion.div>
                                </div>

                                {/* NEW badge */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.3, stiffness: 400 }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-[11px] font-bold text-gray-900 tracking-wide uppercase mb-5 shadow-lg shadow-amber-500/30"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    New Feature
                                </motion.div>

                                {/* Icon */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.15, stiffness: 300 }}
                                    className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-5 shadow-lg"
                                >
                                    <motion.div
                                        animate={{ rotate: [0, -8, 8, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
                                    >
                                        <Swords className="w-8 h-8 text-white" />
                                    </motion.div>
                                </motion.div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-extrabold text-white mb-2 tracking-tight"
                                >
                                    Quizy Arena is Here! ⚔️
                                </motion.h2>

                                {/* Description */}
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-sm text-purple-100/80 leading-relaxed mb-7"
                                >
                                    Challenge your friends in real-time quiz battles, climb the leaderboard, and prove you&apos;re the ultimate quiz champion. The arena awaits!
                                </motion.p>

                                {/* CTA Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex gap-3"
                                >
                                    <button
                                        onClick={handlePlay}
                                        className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white text-purple-700 font-bold text-sm rounded-xl hover:bg-purple-50 active:scale-[0.97] transition-all shadow-lg shadow-black/10 group"
                                    >
                                        <Swords className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        Play Arena
                                        <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        className="px-5 py-3.5 text-white/70 hover:text-white font-medium text-sm rounded-xl hover:bg-white/10 active:scale-[0.97] transition-all"
                                    >
                                        Later
                                    </button>
                                </motion.div>
                            </div>

                            {/* Bottom accent bar */}
                            <div className="h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
