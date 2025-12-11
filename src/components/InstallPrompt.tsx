'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWA } from './PWAProvider';

export function InstallPrompt() {
    const { isInstallable, isInstalled, installApp } = usePWA();
    const [showPrompt, setShowPrompt] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [justInstalled, setJustInstalled] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Handle mount state
    useEffect(() => {
        setMounted(true);
    }, []);

    // Show install prompt after 3 seconds - ALWAYS (unless already installed/dismissed)
    useEffect(() => {
        if (!mounted) return;

        // Don't show if already running as installed PWA
        if (isInstalled) {
            return;
        }

        // Check localStorage only after mounted (client-side)
        const dismissed = localStorage.getItem('quizy-install-dismissed');
        const alreadyInstalled = localStorage.getItem('quizy-app-installed-shown');

        if (dismissed || alreadyInstalled) {
            console.log('[Quizy Install] Already dismissed or installed, not showing');
            return;
        }

        // Show the install prompt after 3 seconds - GUARANTEED
        console.log('[Quizy Install] Will show prompt in 3 seconds...');
        const timer = setTimeout(() => {
            console.log('[Quizy Install] Showing install prompt NOW');
            setShowPrompt(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [mounted, isInstalled]);

    // Handle success toast when app is installed
    useEffect(() => {
        if (!mounted || !isInstalled) return;

        const alreadyShown = localStorage.getItem('quizy-app-installed-shown');
        if (!alreadyShown) {
            setJustInstalled(true);
            localStorage.setItem('quizy-app-installed-shown', 'true');

            const timer = setTimeout(() => {
                setJustInstalled(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [mounted, isInstalled]);

    const handleInstall = useCallback(async () => {
        if (isInstallable) {
            // Browser supports automatic install
            setInstalling(true);
            const success = await installApp();
            setInstalling(false);
            if (success) {
                setShowPrompt(false);
            }
        } else {
            // Show instructions alert for browsers without beforeinstallprompt
            alert('To install Quizy:\n\n1. Tap the ⋮ menu in Chrome\n2. Select "Add to Home screen"\n3. Tap "Add"\n\nThe app will appear on your home screen!');
            setShowPrompt(false);
            localStorage.setItem('quizy-install-dismissed', Date.now().toString());
        }
    }, [isInstallable, installApp]);

    const handleDismiss = useCallback(() => {
        setShowPrompt(false);
        localStorage.setItem('quizy-install-dismissed', Date.now().toString());
    }, []);

    // Don't render anything on server
    if (!mounted) return null;

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
                >
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {/* Gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700" />

                        {/* Content */}
                        <div className="p-5">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <Smartphone className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                        Install Quizy
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        By Nihal Pawar
                                    </p>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                Install Quizy on your device for quick access, offline support, and a native app experience!
                            </p>

                            {/* Features */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {['📱 Works Offline', '⚡ Fast Access', '🔔 Notifications'].map((feature) => (
                                    <span
                                        key={feature}
                                        className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400"
                                    >
                                        {feature}
                                    </span>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleInstall}
                                    disabled={installing}
                                    className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {installing ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                            />
                                            Installing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5" />
                                            Install App
                                        </>
                                    )}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDismiss}
                                    className="btn btn-secondary px-4"
                                >
                                    Later
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Success Toast */}
            {justInstalled && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
                >
                    <div className="bg-green-500 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">App Installed!</p>
                            <p className="text-sm text-green-100">Quizy is now on your device</p>
                        </div>
                        <button
                            onClick={() => setJustInstalled(false)}
                            className="p-1 rounded-full hover:bg-green-600 transition-colors flex-shrink-0"
                            aria-label="Dismiss notification"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
