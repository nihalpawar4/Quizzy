'use client';

/**
 * PremiumContext — Global premium state provider.
 * Provides real-time premium status to all components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
    subscribeToPremiumStatus,
    purchasePremium as purchasePremiumService,
    purchasePremiumTier as purchasePremiumTierService,
    setActiveBubbleTheme as setThemeService,
    setActiveProfileFrame as setFrameService,
    setActiveBadge as setBadgeService,
    activateXPBoost as activateBoostService,
    type PremiumStatus,
    type BubbleTheme,
    type ProfileFrameType,
    type BadgeType,
} from '@/services/premiumService';
import { activatePremiumTrial } from '@/services/premiumService';

interface PremiumContextType {
    // Status
    isPremium: boolean;
    isTrial: boolean;
    trialExpiresAt: Date | null;
    premiumExpiresAt: Date | null;
    hasClaimedTrial: boolean;
    loading: boolean;
    // Cosmetics
    activeBubbleTheme: BubbleTheme;
    activeProfileFrame: ProfileFrameType;
    activeBadge: BadgeType;
    // Streak shields
    streakShieldsRemaining: number;
    // XP Boost
    xpBoostActive: boolean;
    xpBoostMultiplier: number;
    // Actions
    purchasePremium: () => Promise<{ success: boolean; error?: string }>;
    purchasePremiumByTier: (tier: string, xpCost: number) => Promise<{ success: boolean; error?: string }>;
    setBubbleTheme: (theme: BubbleTheme) => Promise<void>;
    setProfileFrame: (frame: ProfileFrameType) => Promise<void>;
    setBadge: (badge: BadgeType) => Promise<void>;
    activateXPBoost: (minutes?: number) => Promise<void>;
}

const defaultStatus: PremiumContextType = {
    isPremium: false,
    isTrial: false,
    trialExpiresAt: null,
    premiumExpiresAt: null,
    hasClaimedTrial: false,
    loading: true,
    activeBubbleTheme: 'default',
    activeProfileFrame: 'none',
    activeBadge: 'none',
    streakShieldsRemaining: 0,
    xpBoostActive: false,
    xpBoostMultiplier: 1,
    purchasePremium: async () => ({ success: false, error: 'Not initialized' }),
    purchasePremiumByTier: async () => ({ success: false, error: 'Not initialized' }),
    setBubbleTheme: async () => {},
    setProfileFrame: async () => {},
    setBadge: async () => {},
    activateXPBoost: async () => {},
};

const PremiumContext = createContext<PremiumContextType>(defaultStatus);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [status, setStatus] = useState<PremiumStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const launchTrialChecked = useRef(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Subscribe to real-time premium status
    useEffect(() => {
        if (!user?.uid) {
            setStatus(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = subscribeToPremiumStatus(user.uid, (newStatus) => {
            setStatus(newStatus);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.uid, refreshKey]);

    // ─── Timer to detect trial expiry (time-based, not data-based) ───
    // Firestore onSnapshot only fires when data changes, but trial expiry is
    // time-based. This timer forces a re-evaluation when the trial period ends.
    useEffect(() => {
        if (!status?.isTrial || !status?.trialExpiresAt) return;

        const now = Date.now();
        const expiresAt = status.trialExpiresAt.getTime();
        const msUntilExpiry = expiresAt - now;

        if (msUntilExpiry <= 0) {
            // Trial already expired — force re-evaluation now
            setRefreshKey(k => k + 1);
            return;
        }

        // Schedule re-evaluation when trial expires
        const timer = setTimeout(() => {
            setRefreshKey(k => k + 1);
        }, msUntilExpiry + 500); // +500ms buffer to ensure we're past expiry

        return () => clearTimeout(timer);
    }, [status?.isTrial, status?.trialExpiresAt]);

    // ─── Timer to detect purchased premium expiry (30-day subscriptions) ───
    useEffect(() => {
        if (!status?.isPremium || !status?.premiumExpiresAt) return;

        const now = Date.now();
        const expiresAt = status.premiumExpiresAt.getTime();
        const msUntilExpiry = expiresAt - now;

        if (msUntilExpiry <= 0) {
            // Already expired — force re-evaluation
            setRefreshKey(k => k + 1);
            return;
        }

        // Schedule re-evaluation when premium expires
        const timer = setTimeout(() => {
            setRefreshKey(k => k + 1);
        }, msUntilExpiry + 500);

        return () => clearTimeout(timer);
    }, [status?.isPremium, status?.premiumExpiresAt]);

    // ─── Launch trial: 24-hour free premium for first-time student ───
    useEffect(() => {
        if (!user?.uid || !status || loading || launchTrialChecked.current) return;
        if (user.role !== 'student') return;
        launchTrialChecked.current = true;

        // Skip if already premium (purchased or active trial) or already claimed
        if (status.isPremium) return;

        // Check localStorage to prevent re-triggering on the same device
        const key = `quizy_premium_launch_trial_${user.uid}`;
        if (typeof window !== 'undefined' && localStorage.getItem(key)) return;

        // Activate 24-hour trial (server-side also checks first-time)
        activatePremiumTrial(user.uid, 24)
            .then((result) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(key, new Date().toISOString());
                }
                if (!result.success) {
                    console.log('Trial not activated:', result.error);
                }
            })
            .catch(console.error);
    }, [user?.uid, user?.role, status, loading]);

    const handlePurchase = useCallback(async () => {
        if (!user?.uid) return { success: false, error: 'Not logged in' };
        const result = await purchasePremiumService(user.uid);
        return result;
    }, [user?.uid]);

    const handlePurchaseByTier = useCallback(async (tier: string, xpCost: number) => {
        if (!user?.uid) return { success: false, error: 'Not logged in' };
        const result = await purchasePremiumTierService(user.uid, tier, xpCost);
        return result;
    }, [user?.uid]);

    const handleSetBubbleTheme = useCallback(async (theme: BubbleTheme) => {
        if (!user?.uid) return;
        await setThemeService(user.uid, theme);
    }, [user?.uid]);

    const handleSetProfileFrame = useCallback(async (frame: ProfileFrameType) => {
        if (!user?.uid) return;
        await setFrameService(user.uid, frame);
    }, [user?.uid]);

    const handleSetBadge = useCallback(async (badge: BadgeType) => {
        if (!user?.uid) return;
        await setBadgeService(user.uid, badge);
    }, [user?.uid]);

    const handleActivateXPBoost = useCallback(async (minutes: number = 30) => {
        if (!user?.uid) return;
        await activateBoostService(user.uid, minutes);
    }, [user?.uid]);

    const value: PremiumContextType = {
        isPremium: status?.isPremium ?? false,
        isTrial: status?.isTrial ?? false,
        trialExpiresAt: status?.trialExpiresAt ?? null,
        premiumExpiresAt: status?.premiumExpiresAt ?? null,
        hasClaimedTrial: status?.hasClaimedTrial ?? false,
        loading,
        activeBubbleTheme: (status?.activeBubbleTheme as BubbleTheme) ?? 'default',
        activeProfileFrame: (status?.activeProfileFrame as ProfileFrameType) ?? 'none',
        activeBadge: (status?.activeBadge as BadgeType) ?? 'none',
        streakShieldsRemaining: status?.streakShieldsRemaining ?? 0,
        xpBoostActive: status?.xpBoostActive ?? false,
        xpBoostMultiplier: status?.xpBoostMultiplier ?? 1,
        purchasePremium: handlePurchase,
        purchasePremiumByTier: handlePurchaseByTier,
        setBubbleTheme: handleSetBubbleTheme,
        setProfileFrame: handleSetProfileFrame,
        setBadge: handleSetBadge,
        activateXPBoost: handleActivateXPBoost,
    };

    return (
        <PremiumContext.Provider value={value}>
            {children}
        </PremiumContext.Provider>
    );
}

export function usePremium(): PremiumContextType {
    return useContext(PremiumContext);
}
