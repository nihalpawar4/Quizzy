'use client';

/**
 * GuidedTour — Premium onboarding tour component for Quizy
 * 
 * Features:
 * - Futuristic spotlight / torch-focus effect with vibrant glowing shadows
 * - Glassmorphism tooltip cards with title, description, step count, progress indicator
 * - Smart positioning so tooltips never overflow the viewport
 * - Keyboard navigation (Arrow keys, ESC, Enter)
 * - Smooth buttery animations with framer-motion
 * - localStorage persistence for onboarding state
 * - Mobile responsive
 * - Accessibility: focus management, screen-reader labels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

// ==================== TYPES ====================

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Description text */
  description: string;
  /** Position preference for the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional action to perform when this step is shown */
  onShow?: () => void;
  /** Optional spotlight padding around the element (px) */
  spotlightPadding?: number;
  /** Optional icon emoji for the step */
  icon?: string;
}

export interface GuidedTourProps {
  /** Array of tour steps */
  steps: TourStep[];
  /** Unique key for localStorage persistence (e.g., 'landing-tour', 'dashboard-tour') */
  tourId: string;
  /** Whether to auto-start on first visit */
  autoStart?: boolean;
  /** Callback when tour completes */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
  /** Externally controlled active state */
  isActive?: boolean;
  /** Callback when tour active state changes */
  onActiveChange?: (active: boolean) => void;
}

// ==================== HELPERS ====================

/** Get the bounding rect of an element, or null if not found */
function getElementRect(selector: string): DOMRect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  } catch {
    return null;
  }
}

/** Scroll element into view smoothly */
function scrollToElement(selector: string) {
  try {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  } catch {
    // Silently handle invalid selectors
  }
}

/** Calculate optimal tooltip position to prevent viewport overflow */
function calculateTooltipPosition(
  targetRect: DOMRect,
  placement: string,
  tooltipWidth: number,
  tooltipHeight: number,
  spotlightPadding: number
): { top: number; left: number; actualPlacement: string } {
  const margin = 16; // Min distance from viewport edge
  const gap = 16; // Gap between spotlight and tooltip
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spotTop = targetRect.top - spotlightPadding;
  const spotBottom = targetRect.bottom + spotlightPadding;
  const spotLeft = targetRect.left - spotlightPadding;
  const spotRight = targetRect.right + spotlightPadding;
  const spotCenterX = (spotLeft + spotRight) / 2;
  const spotCenterY = (spotTop + spotBottom) / 2;

  // Try placements in order of preference
  const placements = placement === 'auto'
    ? ['bottom', 'top', 'right', 'left']
    : [placement, 'bottom', 'top', 'right', 'left'];

  for (const p of placements) {
    let top = 0;
    let left = 0;

    switch (p) {
      case 'bottom':
        top = spotBottom + gap;
        left = spotCenterX - tooltipWidth / 2;
        break;
      case 'top':
        top = spotTop - gap - tooltipHeight;
        left = spotCenterX - tooltipWidth / 2;
        break;
      case 'right':
        top = spotCenterY - tooltipHeight / 2;
        left = spotRight + gap;
        break;
      case 'left':
        top = spotCenterY - tooltipHeight / 2;
        left = spotLeft - gap - tooltipWidth;
        break;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, vh - tooltipHeight - margin));

    // Check if it fits without overlapping the spotlight
    const tooltipRight = left + tooltipWidth;
    const tooltipBottom = top + tooltipHeight;

    const overlapsSpotlight =
      left < spotRight && tooltipRight > spotLeft &&
      top < spotBottom && tooltipBottom > spotTop;

    if (!overlapsSpotlight) {
      return { top, left, actualPlacement: p };
    }
  }

  // Fallback: place below and offset
  return {
    top: Math.min(spotBottom + gap, vh - tooltipHeight - margin),
    left: Math.max(margin, Math.min(spotCenterX - tooltipWidth / 2, vw - tooltipWidth - margin)),
    actualPlacement: 'bottom',
  };
}

// ==================== COMPONENT ====================

export default function GuidedTour({
  steps,
  tourId,
  autoStart = true,
  onComplete,
  onSkip,
  isActive: externalActive,
  onActiveChange,
}: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const spotlightPadding = step?.spotlightPadding ?? 8;

  // Check localStorage for tour completion
  const storageKey = `quizy_tour_${tourId}`;

  // Sync with external active state
  useEffect(() => {
    if (externalActive !== undefined) {
      setIsActive(externalActive);
      if (externalActive) setCurrentStep(0);
    }
  }, [externalActive]);

  // Auto-start logic
  useEffect(() => {
    if (!autoStart) return;
    if (externalActive !== undefined) return; // Controlled externally

    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay tour start to let the page render
      const timer = setTimeout(() => {
        setIsActive(true);
        onActiveChange?.(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, storageKey]);

  // Update target rect when step changes
  const updatePosition = useCallback(() => {
    if (!isActive || !step) return;

    const rect = getElementRect(step.target);
    if (!rect) {
      // If element not found, skip to next step
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      }
      return;
    }

    setTargetRect(rect);

    // Calculate tooltip position after a frame
    requestAnimationFrame(() => {
      const tw = tooltipRef.current?.offsetWidth || 340;
      const th = tooltipRef.current?.offsetHeight || 200;
      const pos = calculateTooltipPosition(
        rect,
        step.placement || 'auto',
        tw,
        th,
        spotlightPadding
      );
      setTooltipPos({ top: pos.top, left: pos.left, placement: pos.actualPlacement });
    });
  }, [isActive, step, currentStep, totalSteps, spotlightPadding]);

  // Update position on step change, scroll, resize
  useEffect(() => {
    if (!isActive) return;

    // Scroll to element first
    scrollToElement(step?.target || '');

    // Wait for scroll to settle
    const scrollTimer = setTimeout(() => {
      updatePosition();
      step?.onShow?.();
    }, 400);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(scrollTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  // Prevent body scroll when tour is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  // ==================== HANDLERS ====================

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tour complete
      handleComplete();
    }

    setTimeout(() => setIsAnimating(false), 300);
  }, [currentStep, totalSteps, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating || currentStep <= 0) return;
    setIsAnimating(true);
    setCurrentStep((prev) => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentStep, isAnimating]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, 'skipped');
    setIsActive(false);
    onActiveChange?.(false);
    onSkip?.();
    document.body.style.overflow = '';
  }, [storageKey, onSkip, onActiveChange]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(storageKey, 'completed');
    setIsActive(false);
    onActiveChange?.(false);
    onComplete?.();
    document.body.style.overflow = '';
  }, [storageKey, onComplete, onActiveChange]);

  // ==================== RENDER ====================

  if (!isActive || !step || !targetRect) return null;

  // Spotlight dimensions with padding — capped for mobile so large elements
  // don't cause full-page highlighting
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const maxW = isMobile ? Math.min(window.innerWidth * 0.88, 360) : Infinity;
  const maxH = isMobile ? 200 : Infinity;

  const rawW = targetRect.width + spotlightPadding * 2;
  const rawH = targetRect.height + spotlightPadding * 2;
  const sw = Math.min(rawW, maxW);
  const sh = Math.min(rawH, maxH);

  // Center the capped spotlight on the target element
  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;
  const sx = centerX - sw / 2;
  const sy = centerY - sh / 2;

  return (
    <AnimatePresence>
      {isActive && (
        <div
          ref={overlayRef}
          className="guided-tour-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${step.title}`}
          style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
        >
          {/* SVG Overlay with spotlight cutout */}
          <motion.svg
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="guided-tour-svg-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 99999,
            }}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{
                    x: sx,
                    y: sy,
                    width: sw,
                    height: sh,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              </mask>
              {/* Glow filter for spotlight ring */}
              <filter id="tour-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Dimmed background */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(2, 2, 24, 0.72)"
              mask="url(#tour-spotlight-mask)"
              style={{ pointerEvents: 'auto' }}
              onClick={handleSkip}
            />

            {/* Animated glow ring around spotlight */}
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{
                x: sx - 3,
                y: sy - 3,
                width: sw + 6,
                height: sh + 6,
                opacity: 1,
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              rx="14"
              ry="14"
              fill="none"
              stroke="rgba(22, 80, 235, 0.6)"
              strokeWidth="2"
              filter="url(#tour-glow)"
              className="tour-glow-ring"
            />

            {/* Outer pulse ring */}
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{
                x: sx - 6,
                y: sy - 6,
                width: sw + 12,
                height: sh + 12,
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              rx="16"
              ry="16"
              fill="none"
              stroke="rgba(96, 149, 219, 0.4)"
              strokeWidth="1.5"
            />
          </motion.svg>

          {/* Tooltip Card */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
              top: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              left: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
            }}
            className="tour-tooltip-card"
            style={{
              position: 'fixed',
              zIndex: 100000,
              width: 'min(340px, calc(100vw - 32px))',
              pointerEvents: 'auto',
            }}
            role="tooltip"
          >
            {/* Progress bar at top */}
            <div className="tour-tooltip-progress-bar">
              <motion.div
                className="tour-tooltip-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Card content */}
            <div className="tour-tooltip-content">
              {/* Header row */}
              <div className="tour-tooltip-header">
                <div className="tour-tooltip-step-badge">
                  {step.icon ? (
                    <span className="tour-tooltip-icon-emoji">{step.icon}</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#1650EB]" />
                  )}
                  <span>Step {currentStep + 1}/{totalSteps}</span>
                </div>
                <button
                  onClick={handleSkip}
                  className="tour-tooltip-close"
                  aria-label="Skip tour"
                  title="Skip tour (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="tour-tooltip-title">{step.title}</h3>
                  <p className="tour-tooltip-desc">{step.description}</p>
                </motion.div>
              </AnimatePresence>

              {/* Step dots progress */}
              <div className="tour-tooltip-dots">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`tour-tooltip-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="tour-tooltip-nav">
                <button
                  onClick={handleSkip}
                  className="tour-btn-skip"
                  aria-label="Skip tour"
                >
                  Skip
                </button>
                <div className="tour-nav-right">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="tour-btn-prev"
                      aria-label="Previous step"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="tour-btn-next"
                    aria-label={currentStep === totalSteps - 1 ? 'Finish tour' : 'Next step'}
                  >
                    {currentStep === totalSteps - 1 ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ==================== TOUR RESTART BUTTON ====================

/**
 * A button that replays a specific tour.
 * Can be placed in settings, help menu, or profile dropdown.
 */
export function RestartTourButton({
  tourId,
  onRestart,
  label = 'Replay Tour',
  className = '',
}: {
  tourId: string;
  onRestart: () => void;
  label?: string;
  className?: string;
}) {
  const handleRestart = () => {
    localStorage.removeItem(`quizy_tour_${tourId}`);
    onRestart();
  };

  return (
    <button
      onClick={handleRestart}
      className={`tour-restart-btn ${className}`}
      aria-label={label}
    >
      <RotateCcw className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
