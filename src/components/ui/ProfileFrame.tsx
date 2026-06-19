'use client';

/**
 * ProfileFrame — Animated profile picture frame for premium users.
 * Wraps avatar in a container with an animated glowing ring border.
 */

import { User } from 'lucide-react';
import type { ProfileFrameType } from '@/services/premiumService';

interface ProfileFrameProps {
    frameType: ProfileFrameType;
    photoURL?: string | null;
    userName: string;
    size?: number; // px — avatar size
    className?: string;
}

const FRAME_RING_STYLES: Record<ProfileFrameType, {
    ring: string;
    glow: string;
    animation: string;
} | null> = {
    none: null,
    gold: {
        ring: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fcd34d, #f59e0b)',
        glow: '0 0 16px rgba(251,191,36,0.5), 0 0 32px rgba(245,158,11,0.25)',
        animation: 'profile-ring-gold',
    },
    diamond: {
        ring: 'linear-gradient(135deg, #93c5fd, #dbeafe, #60a5fa, #e0e7ff)',
        glow: '0 0 16px rgba(147,197,253,0.5), 0 0 32px rgba(96,165,250,0.25)',
        animation: 'profile-ring-diamond',
    },
    fire: {
        ring: 'linear-gradient(135deg, #f97316, #ef4444, #f97316, #fbbf24)',
        glow: '0 0 18px rgba(239,68,68,0.5), 0 0 36px rgba(249,115,22,0.25)',
        animation: 'profile-ring-fire',
    },
    aurora: {
        ring: 'linear-gradient(135deg, #34d399, #60a5fa, #a78bfa, #f472b6, #34d399)',
        glow: '0 0 16px rgba(96,165,250,0.4), 0 0 32px rgba(167,139,250,0.2)',
        animation: 'profile-ring-aurora',
    },
};

export default function ProfileFrame({
    frameType,
    photoURL,
    userName,
    size = 40,
    className = '',
}: ProfileFrameProps) {
    const frameConfig = FRAME_RING_STYLES[frameType];
    const hasFrame = frameType !== 'none' && frameConfig;

    // Ring thickness and gap scale with avatar size
    const ringWidth = Math.max(2, Math.round(size * 0.06));
    const ringGap = Math.max(1, Math.round(size * 0.04));
    const containerSize = hasFrame ? size + (ringWidth + ringGap) * 2 : size;

    const avatarEl = photoURL ? (
        <img
            src={photoURL}
            alt={userName}
            className="rounded-full object-cover"
            style={{ width: `${size}px`, height: `${size}px` }}
        />
    ) : (
        <div
            className="bg-gradient-to-br from-[#1650EB] to-[#6095DB] rounded-full flex items-center justify-center"
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            <User className="text-white" style={{ width: `${size * 0.45}px`, height: `${size * 0.45}px` }} />
        </div>
    );

    if (!hasFrame) {
        return (
            <div className={`relative inline-flex ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
                <div className="rounded-full overflow-hidden border-2 border-white dark:border-gray-800">
                    {avatarEl}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative inline-flex items-center justify-center rounded-full ${frameConfig.animation} ${className}`}
            style={{
                width: `${containerSize}px`,
                height: `${containerSize}px`,
                background: frameConfig.ring,
                boxShadow: frameConfig.glow,
                padding: `${ringWidth + ringGap}px`,
            }}
        >
            {/* Inner background to create the gap */}
            <div
                className="rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden"
                style={{
                    width: `${size + ringGap * 2}px`,
                    height: `${size + ringGap * 2}px`,
                    padding: `${ringGap}px`,
                }}
            >
                <div className="rounded-full overflow-hidden" style={{ width: `${size}px`, height: `${size}px` }}>
                    {avatarEl}
                </div>
            </div>
        </div>
    );
}
