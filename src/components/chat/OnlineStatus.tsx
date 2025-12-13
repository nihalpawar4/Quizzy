'use client';

/**
 * Online Status Indicator Component
 * Shows green/gray dot for online/offline status
 */

import React from 'react';
import { formatLastSeen } from '@/lib/chatServices';

interface OnlineStatusProps {
    isOnline: boolean;
    lastSeen?: Date;
    showText?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export default function OnlineStatus({
    isOnline,
    lastSeen,
    showText = false,
    size = 'medium'
}: OnlineStatusProps) {
    const sizeClasses = {
        small: 'w-2 h-2',
        medium: 'w-3 h-3',
        large: 'w-4 h-4'
    };

    const getStatusText = () => {
        if (isOnline) return 'Online';
        if (lastSeen) return formatLastSeen(lastSeen);
        return 'Offline';
    };

    return (
        <div className="flex items-center gap-1.5">
            {/* Status Dot */}
            <span
                className={`
                    ${sizeClasses[size]} 
                    rounded-full 
                    ${isOnline
                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                        : 'bg-gray-400'
                    }
                    transition-all duration-300
                `}
                style={{
                    animation: isOnline ? 'pulse 2s infinite' : 'none'
                }}
            />

            {/* Status Text */}
            {showText && (
                <span className={`
                    text-xs
                    ${isOnline ? 'text-green-500' : 'text-gray-400'}
                `}>
                    {getStatusText()}
                </span>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
            `}</style>
        </div>
    );
}
