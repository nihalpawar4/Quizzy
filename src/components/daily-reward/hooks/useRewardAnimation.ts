'use client';

/**
 * useRewardAnimation — XP counter animation + confetti helpers.
 */

import { useCallback, useRef } from 'react';

// ─── Confetti colors (matches brand palette) ────────────────────────────

const CONFETTI_COLORS = [
    '#0EA5E9', '#38BDF8', '#a78bfa', '#fbbf24',
    '#34d399', '#f472b6', '#60a5fa', '#818cf8',
];

/**
 * Spawn CSS confetti particles into a container element.
 * Returns a cleanup function.
 */
export function spawnConfetti(container: HTMLElement, count = 40): () => void {
    const pieces: HTMLDivElement[] = [];

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.style.cssText = `
            position: absolute;
            width: ${4 + Math.random() * 6}px;
            height: ${6 + Math.random() * 8}px;
            border-radius: 1px;
            background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
            top: 40%;
            left: ${10 + Math.random() * 80}%;
            opacity: 0;
            pointer-events: none;
            animation: confetti-pop ${1.5 + Math.random() * 1.5}s ease-out ${Math.random() * 0.3}s forwards;
        `;
        container.appendChild(el);
        pieces.push(el);
    }

    // Inject keyframes if not already present
    if (!document.getElementById('dr-confetti-keyframes')) {
        const style = document.createElement('style');
        style.id = 'dr-confetti-keyframes';
        style.textContent = `
            @keyframes confetti-pop {
                0% {
                    transform: translateY(0) translateX(0) rotateZ(0deg) scale(0);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                    transform: scale(1);
                }
                100% {
                    transform: translateY(${300 + Math.random() * 200}px) translateX(${-80 + Math.random() * 160}px) rotateZ(${360 + Math.random() * 360}deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    return () => {
        pieces.forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
    };
}

/**
 * Hook for managing XP orb fly animation.
 * Creates small orbs that fly from a source point to a target point.
 */
export function useXPFlyAnimation() {
    const cleanupRef = useRef<(() => void) | null>(null);

    const flyXP = useCallback((
        sourceRect: DOMRect,
        targetRect: DOMRect,
        count = 6
    ) => {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 10001;
        `;
        document.body.appendChild(container);

        const orbs: HTMLDivElement[] = [];

        for (let i = 0; i < count; i++) {
            const orb = document.createElement('div');
            const startX = sourceRect.left + sourceRect.width / 2 + (Math.random() - 0.5) * 40;
            const startY = sourceRect.top + sourceRect.height / 2 + (Math.random() - 0.5) * 40;
            const endX = targetRect.left + targetRect.width / 2;
            const endY = targetRect.top + targetRect.height / 2;
            const delay = i * 60;

            orb.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #0EA5E9;
                box-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
                left: ${startX}px;
                top: ${startY}px;
                opacity: 0;
                animation: xp-fly-${i} 0.8s ease-in ${delay}ms forwards;
            `;
            container.appendChild(orb);
            orbs.push(orb);

            // Dynamic keyframes for each orb
            const style = document.createElement('style');
            style.textContent = `
                @keyframes xp-fly-${i} {
                    0% {
                        opacity: 1;
                        transform: translate(0, 0) scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(${(endX - startX) * 0.3}px, ${-60 - Math.random() * 40}px) scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(${endX - startX}px, ${endY - startY}px) scale(0.3);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const cleanup = () => {
            if (container.parentNode) container.parentNode.removeChild(container);
        };
        cleanupRef.current = cleanup;

        setTimeout(cleanup, 2000);
    }, []);

    return { flyXP };
}
