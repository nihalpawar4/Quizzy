'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWA } from './PWAProvider';

export function InstallPrompt() {
    const { isInstallable, isInstalled, installApp } = usePWA();
    const [showPrompt, setShowPrompt] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [justInstalled, setJustInstalled] = useState(false);

    useEffect(() => {
        // Show prompt after 5 seconds if installable and not dismissed before
        if (isInstallable && !isInstalled) {
            const dismissed = localStorage.getItem('quizy-install-dismissed');
            if (!dismissed) {
                const timer = setTimeout(() => setShowPrompt(true), 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [isInstallable, isInstalled]);

    useEffect(() => {
        if (isInstalled) {
            setJustInstalled(true);
            setShowPrompt(false);
        }
    }, [isInstalled]);

    const handleInstall = async () => {
        setInstalling(true);
        const success = await installApp();
        setInstalling(false);
        if (success) {
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for 7 days
        localStorage.setItem('quizy-install-dismissed', Date.now().toString());
        setTimeout(() => {
            localStorage.removeItem('quizy-install-dismissed');
        }, 7 * 24 * 60 * 60 * 1000);
    };

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
                        <CheckCircle className="w-6 h-6" />
                        <div>
                            <p className="font-medium">App Installed!</p>
                            <p className="text-sm text-green-100">Quizy is now on your device</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
