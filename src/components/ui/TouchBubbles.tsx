'use client';

/**
 * TouchBubbles — Global touch/click interaction that spawns animated bubbles.
 * Default theme for all users (blue). Premium users get special themes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import type { BubbleTheme } from '@/services/premiumService';

// Theme-specific colors and styles
const THEME_CONFIG: Record<BubbleTheme, {
    colors: string[];
    className: string;
    shape: 'circle' | 'star';
    glow: boolean;
}> = {
    default: {
        colors: ['rgba(22,80,235,0.6)', 'rgba(96,149,219,0.5)', 'rgba(22,80,235,0.4)', 'rgba(96,149,219,0.3)'],
        className: 'touch-bubble-default',
        shape: 'circle',
        glow: false,
    },
    sparkle: {
        colors: ['rgba(255,215,0,0.7)', 'rgba(255,193,7,0.6)', 'rgba(255,235,59,0.5)', 'rgba(255,215,0,0.4)'],
        className: 'touch-bubble-sparkle',
        shape: 'star',
        glow: true,
    },
    neon: {
        colors: ['rgba(168,85,247,0.7)', 'rgba(236,72,153,0.6)', 'rgba(59,130,246,0.6)', 'rgba(34,211,238,0.5)'],
        className: 'touch-bubble-neon',
        shape: 'circle',
        glow: true,
    },
    fire: {
        colors: ['rgba(249,115,22,0.7)', 'rgba(239,68,68,0.6)', 'rgba(245,158,11,0.5)', 'rgba(249,115,22,0.4)'],
        className: 'touch-bubble-fire',
        shape: 'circle',
        glow: true,
    },
    water: {
        colors: ['rgba(56,189,248,0.5)', 'rgba(96,165,250,0.4)', 'rgba(147,197,253,0.3)', 'rgba(56,189,248,0.35)'],
        className: 'touch-bubble-water',
        shape: 'circle',
        glow: false,
    },
};

// Interactive element selectors to ignore
const IGNORE_SELECTORS = 'button, a, input, textarea, select, [role="button"], [role="dialog"], .no-bubbles';

const MAX_BUBBLES = 25;

export default function TouchBubbles() {
    const { activeBubbleTheme, isPremium } = usePremium();
    const bubblesRef = useRef<HTMLDivElement[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const theme = isPremium ? activeBubbleTheme : 'default';

    const spawnBubbles = useCallback((x: number, y: number) => {
        const container = containerRef.current;
        if (!container) return;

        const config = THEME_CONFIG[theme] || THEME_CONFIG.default;
        const count = 4 + Math.floor(Math.random() * 3); // 4-6 bubbles

        for (let i = 0; i < count; i++) {
            // Clean up old bubbles if max reached
            if (bubblesRef.current.length >= MAX_BUBBLES) {
                const oldest = bubblesRef.current.shift();
                oldest?.remove();
            }

            const bubble = document.createElement('div');
            const size = 6 + Math.random() * 10; // 6-16px
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];
            const driftX = (Math.random() - 0.5) * 60; // -30 to +30px horizontal drift
            const driftY = -(40 + Math.random() * 60); // -40 to -100px upward
            const duration = 500 + Math.random() * 400; // 500-900ms
            const delay = i * 30; // Stagger

            bubble.className = `touch-bubble ${config.className}`;
            bubble.style.cssText = `
                position: fixed;
                left: ${x - size / 2}px;
                top: ${y - size / 2}px;
                width: ${size}px;
                height: ${size}px;
                border-radius: ${config.shape === 'star' ? '2px' : '50%'};
                background: ${color};
                pointer-events: none;
                z-index: 99999;
                opacity: 0;
                --drift-x: ${driftX}px;
                --drift-y: ${driftY}px;
                animation: bubble-float ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms forwards;
                ${config.glow ? `box-shadow: 0 0 ${size}px ${color};` : ''}
                ${config.shape === 'star' ? `transform: rotate(${Math.random() * 360}deg);` : ''}
            `;

            // Star shape for sparkle theme
            if (config.shape === 'star') {
                bubble.textContent = '✦';
                bubble.style.background = 'none';
                bubble.style.color = color;
                bubble.style.fontSize = `${size}px`;
                bubble.style.lineHeight = '1';
                bubble.style.textShadow = `0 0 ${size / 2}px ${color}`;
                bubble.style.width = 'auto';
                bubble.style.height = 'auto';
            }

            container.appendChild(bubble);
            bubblesRef.current.push(bubble);

            // Remove after animation
            bubble.addEventListener('animationend', () => {
                bubble.remove();
                bubblesRef.current = bubblesRef.current.filter(b => b !== bubble);
            });
        }
    }, [theme]);

    useEffect(() => {
        const handleInteraction = (e: TouchEvent | MouseEvent) => {
            // Get touch/click coordinates
            let x: number, y: number;
            if ('touches' in e) {
                if (e.touches.length === 0) return;
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            } else {
                x = e.clientX;
                y = e.clientY;
            }

            // Don't spawn on interactive elements
            const target = e.target as HTMLElement;
            if (target.closest(IGNORE_SELECTORS)) return;

            spawnBubbles(x, y);
        };

        // Use touchstart on mobile, mousedown on desktop
        document.addEventListener('touchstart', handleInteraction, { passive: true });
        document.addEventListener('mousedown', handleInteraction);

        return () => {
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('mousedown', handleInteraction);
        };
    }, [spawnBubbles]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            bubblesRef.current.forEach(b => b.remove());
            bubblesRef.current = [];
        };
    }, []);

    return <div ref={containerRef} className="touch-bubbles-container no-bubbles" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }} />;
}
