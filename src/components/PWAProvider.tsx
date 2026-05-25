'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    installApp: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    installApp: async () => false,
});

export const usePWA = () => useContext(PWAContext);

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(display-mode: standalone)').matches;
        }
        return false;
    });
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof window !== 'undefined') {
            return navigator.onLine;
        }
        return true;
    });
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            console.log('[Quizy PWA] App installed successfully!');
        };

        // Listen for online/offline
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const installApp = useCallback(async () => {
        if (!deferredPrompt) {
            console.log('[Quizy PWA] No install prompt available');
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('[Quizy PWA] User accepted the install prompt');
                setDeferredPrompt(null);
                setIsInstallable(false);
                return true;
            } else {
                console.log('[Quizy PWA] User dismissed the install prompt');
                return false;
            }
        } catch (error) {
            console.error('[Quizy PWA] Error installing app:', error);
            return false;
        }
    }, [deferredPrompt]);

    const value: PWAContextType = {
        isInstallable,
        isInstalled,
        isOnline,
        installApp,
    };

    return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

/**
 * Handles service worker registration + update detection.
 * Renders the UpdateBanner when a new SW version is waiting.
 */
export function PWARegistration() {
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);
    const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        let cleanupInterval: ReturnType<typeof setInterval> | undefined;

        const storeWaiting = (sw: ServiceWorker) => {
            setWaitingSW(sw);
            setShowUpdateBanner(true);
        };

        const detectWaitingWorker = (reg: ServiceWorkerRegistration) => {
            if (reg.waiting) {
                console.log('[Quizy PWA] Update waiting to activate');
                storeWaiting(reg.waiting);
            }
        };

        const trackInstalling = (reg: ServiceWorkerRegistration) => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[Quizy PWA] New version installed and waiting');
                    storeWaiting(newWorker);
                }
            });
        };

        // When the new SW takes over, reload the page automatically
        let refreshing = false;
        const handleControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            console.log('[Quizy PWA] New SW activated — reloading page…');
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        const registerSW = async () => {
            try {
                // Register main service worker
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[Quizy PWA] Service Worker registered, scope:', registration.scope);

                // If there's already a waiting worker (e.g. user returned to the tab)
                detectWaitingWorker(registration);

                // Listen for future updates
                registration.addEventListener('updatefound', () => {
                    console.log('[Quizy PWA] Update found!');
                    trackInstalling(registration);
                });

                // Check for updates every 60 seconds
                cleanupInterval = setInterval(() => {
                    registration.update().catch((err: Error) => {
                        console.warn('[Quizy PWA] Update check failed:', err.message);
                    });
                }, 60 * 1000);

                // Also check on visibility change (when user comes back to tab/app)
                const handleVisibility = () => {
                    if (document.visibilityState === 'visible') {
                        registration.update().catch(() => {});
                    }
                };
                document.addEventListener('visibilitychange', handleVisibility);
            } catch (error) {
                console.error('[Quizy PWA] SW registration failed:', error);
            }

            // Register Firebase Messaging service worker separately
            try {
                const fbReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('[Quizy PWA] Firebase Messaging SW registered, scope:', fbReg.scope);
            } catch (error) {
                console.error('[Quizy PWA] Firebase Messaging SW registration failed:', error);
            }
        };

        // Run after page load
        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', () => registerSW(), { once: true });
        }

        return () => {
            if (cleanupInterval) clearInterval(cleanupInterval);
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    const handleApplyUpdate = useCallback(() => {
        // Clear install-dismissed so the install prompt re-shows after reload (for mobile users)
        localStorage.removeItem('quizy-install-dismissed');
        localStorage.removeItem('quizy-app-installed-shown');

        if (waitingSW) {
            waitingSW.postMessage({ type: 'SKIP_WAITING' });
        }
        // Fallback: if controllerchange doesn't fire within 3s, force reload
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }, [waitingSW]);

    if (!showUpdateBanner) return null;

    return <UpdateBanner onUpdate={handleApplyUpdate} />;
}

/* ──────────────────────────────────────────────────────────
   UPDATE BANNER – persistent, prominent, stays until updated
   ────────────────────────────────────────────────────────── */

function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
    const [updating, setUpdating] = useState(false);

    const handleUpdate = () => {
        setUpdating(true);
        onUpdate();
    };

    return (
        <div
            id="pwa-update-banner"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                background: 'linear-gradient(135deg, #1650EB 0%, #0D3AB8 50%, #0A2A8C 100%)',
                color: '#fff',
                padding: '0',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                boxShadow: '0 4px 24px rgba(22, 80, 235, 0.35)',
                animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
                @keyframes pulse-ring {
                    0%   { transform: scale(0.8); opacity: 1; }
                    80%, 100% { transform: scale(2); opacity: 0; }
                }
                @keyframes spin-update {
                    to { transform: rotate(360deg); }
                }
                #pwa-update-btn:hover {
                    background: rgba(255,255,255,1) !important;
                    color: #1650EB !important;
                    transform: scale(1.03);
                }
                #pwa-update-btn:active {
                    transform: scale(0.97);
                }
            `}</style>

            <div
                style={{
                    maxWidth: '640px',
                    margin: '0 auto',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                }}
            >
                {/* Animated icon */}
                <div style={{ position: 'relative', flexShrink: 0, width: 36, height: 36 }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.25)',
                            animation: 'pulse-ring 2s ease-out infinite',
                        }}
                    />
                    <div
                        style={{
                            position: 'relative',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                        }}
                    >
                        🚀
                    </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: '1.3' }}>
                        New Update Available!
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px', lineHeight: '1.3' }}>
                        Tap update to get the latest version with the new logo &amp; improvements.
                    </div>
                </div>

                {/* Button */}
                <button
                    id="pwa-update-btn"
                    onClick={handleUpdate}
                    disabled={updating}
                    style={{
                        flexShrink: 0,
                        padding: '8px 20px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.9)',
                        color: '#1650EB',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: updating ? 0.7 : 1,
                    }}
                >
                    {updating ? (
                        <>
                            <span
                                style={{
                                    width: 14,
                                    height: 14,
                                    border: '2px solid #1650EB',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    animation: 'spin-update 0.8s linear infinite',
                                }}
                            />
                            Updating…
                        </>
                    ) : (
                        'Update Now'
                    )}
                </button>
            </div>
        </div>
    );
}
