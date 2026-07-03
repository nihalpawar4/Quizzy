'use client';

/**
 * GlobalOverlays — Client component that lazy-loads non-critical global UI.
 * These components are never needed for first paint but must be globally available:
 * - PWARegistration: service worker registration
 * - InstallPrompt: PWA install banner
 * - IncomingCallModal: incoming call notification
 * - CallScreen: active call UI
 * - TouchBubbles: click/touch interaction effects
 */

import dynamic from 'next/dynamic';

const PWARegistration = dynamic(
    () => import('@/components/PWAProvider').then(m => ({ default: m.PWARegistration })),
    { ssr: false }
);
const InstallPrompt = dynamic(
    () => import('@/components/InstallPrompt').then(m => ({ default: m.InstallPrompt })),
    { ssr: false }
);
const IncomingCallModal = dynamic(
    () => import('@/components/call/IncomingCallModal'),
    { ssr: false }
);
const CallScreen = dynamic(
    () => import('@/components/call/CallScreen'),
    { ssr: false }
);
const TouchBubbles = dynamic(
    () => import('@/components/ui/TouchBubbles'),
    { ssr: false }
);

export default function GlobalOverlays() {
    return (
        <>
            <PWARegistration />
            <InstallPrompt />
            <IncomingCallModal />
            <CallScreen />
            <TouchBubbles />
        </>
    );
}
