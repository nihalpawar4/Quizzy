'use client';

/**
 * Message Status Icon Component
 * Shows sent (single tick), delivered (double tick), seen (blue double tick)
 */

import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import type { MessageStatus } from '@/types';

interface MessageStatusIconProps {
    status: MessageStatus;
    size?: 'small' | 'medium';
}

export default function MessageStatusIcon({
    status,
    size = 'small'
}: MessageStatusIconProps) {
    const sizeClass = size === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    switch (status) {
        case 'sending':
            return (
                <Clock className={`${sizeClass} text-white/50`} />
            );
        case 'sent':
            // Single gray tick - message sent to server
            return (
                <Check className={`${sizeClass} text-white/70`} />
            );
        case 'delivered':
            // Double gray ticks - message delivered to recipient's device
            return (
                <CheckCheck className={`${sizeClass} text-white/70`} />
            );
        case 'seen':
            // Double blue ticks - message seen by recipient
            return (
                <CheckCheck className={`${sizeClass} text-blue-400`} />
            );
        default:
            return null;
    }
}
