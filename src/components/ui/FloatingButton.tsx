'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ==================== TYPES ====================

export interface FloatingButtonProps {
  icon: React.ReactNode;
  tooltipText: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  ariaLabel: string;
  delay?: number;
  hidden?: boolean;
}

// ==================== COMPONENT ====================

export default function FloatingButton({
  icon,
  tooltipText,
  variant = 'primary',
  onClick,
  ariaLabel,
  delay = 0,
  hidden = false,
}: FloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const showTooltip = isHovered || isFocused;
  const isPrimary = variant === 'primary';

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="fab-wrapper"
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 200, damping: 18, delay }
          }
        >
          {/* Tooltip — slides from right to left */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="fab-tooltip"
                initial={{ opacity: 0, x: 8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.96 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.1 }
                    : { type: 'spring', stiffness: 400, damping: 28 }
                }
                role="tooltip"
              >
                <span className="fab-tooltip-text">{tooltipText}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Button */}
          <motion.button
            className={`fab-btn fab-btn--${variant}`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            aria-label={ariaLabel}
          >
            {/* Pulse ring — primary only */}
            {isPrimary && <span className="fab-pulse-ring" aria-hidden="true" />}

            {/* Glass surface */}
            <span className={`fab-glass fab-glass--${variant}`}>
              {icon}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
