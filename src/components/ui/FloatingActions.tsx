'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageCircle, MessageCircleQuestion, Search, Phone, X } from 'lucide-react';
import FloatingButton from './FloatingButton';

// ==================== TYPES ====================

interface FloatingActionsProps {
  onOpenChat: () => void;
  onOpenQuestion: () => void;
  isChatOpen?: boolean;
}

// ==================== COMPONENT ====================

export default function FloatingActions({
  onOpenChat,
  onOpenQuestion,
  isChatOpen = false,
}: FloatingActionsProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isNearFooter, setIsNearFooter] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Detect scroll near footer ----
  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (!footer) return;
      const footerRect = footer.getBoundingClientRect();
      setIsNearFooter(footerRect.top < window.innerHeight + 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ---- Close dock on Escape ----
  useEffect(() => {
    if (!isDockOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDockOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDockOpen]);

  // ---- Close dock on click outside ----
  useEffect(() => {
    if (!isDockOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDockOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick); };
  }, [isDockOpen]);

  // ---- Dock items ----
  const dockItems = [
    {
      id: 'ask-ai',
      icon: <MessageCircle className="w-[18px] h-[18px]" />,
      label: 'Ask AI',
      sub: 'Chat with Quizy AI',
      action: () => { setIsDockOpen(false); onOpenChat(); },
    },
    {
      id: 'ask-question',
      icon: <MessageCircleQuestion className="w-[18px] h-[18px]" />,
      label: 'Ask Question',
      sub: 'Post a doubt',
      action: () => { setIsDockOpen(false); onOpenQuestion(); },
    },
    {
      id: 'search-notes',
      icon: <Search className="w-[18px] h-[18px]" />,
      label: 'Search Notes',
      sub: 'Find study material',
      action: () => { setIsDockOpen(false); window.location.href = '/dashboard'; },
    },
    {
      id: 'contact-teacher',
      icon: <Phone className="w-[18px] h-[18px]" />,
      label: 'Contact Teacher',
      sub: 'Message your teacher',
      action: () => { setIsDockOpen(false); window.location.href = '/chat'; },
    },
  ];

  const handlePrimaryClick = useCallback(() => {
    if (isNearFooter) {
      setIsDockOpen(prev => !prev);
    } else {
      onOpenChat();
    }
  }, [isNearFooter, onOpenChat]);

  // Hide when chat panel is open
  if (isChatOpen) return null;

  return (
    <div ref={containerRef} className="fab-container" role="toolbar" aria-label="Quick actions">
      {/* Dock backdrop */}
      <AnimatePresence>
        {isDockOpen && (
          <motion.div
            className="fab-dock-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Command Dock */}
      <AnimatePresence>
        {isDockOpen && (
          <motion.div
            className="fab-dock"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 320, damping: 26 }}
            role="menu"
            aria-label="Quick actions menu"
          >
            <div className="fab-dock-header">
              <span className="fab-dock-title">Quick Actions</span>
              <button onClick={() => setIsDockOpen(false)} className="fab-dock-close" aria-label="Close">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="fab-dock-items">
              {dockItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  className="fab-dock-item"
                  onClick={item.action}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 320, damping: 26, delay: i * 0.035 }}
                  role="menuitem"
                >
                  <span className="fab-dock-item-icon">{item.icon}</span>
                  <span className="fab-dock-item-text">
                    <span className="fab-dock-item-label">{item.label}</span>
                    <span className="fab-dock-item-sub">{item.sub}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary — Post Question */}
      <FloatingButton
        icon={<MessageCircleQuestion className="w-[22px] h-[22px] text-[#1650EB] dark:text-[#6095DB]" strokeWidth={2} />}
        tooltipText="Ask a Question"
        variant="secondary"
        onClick={onOpenQuestion}
        ariaLabel="Post a question"
        delay={0.12}
        hidden={isDockOpen}
      />

      {/* Primary — AI Chat */}
      <FloatingButton
        icon={<MessageCircle className="w-6 h-6 text-[#1650EB] dark:text-[#6095DB]" strokeWidth={2} />}
        tooltipText="Ask Quizy AI"
        variant="primary"
        onClick={handlePrimaryClick}
        ariaLabel={isNearFooter ? 'Open quick actions' : 'Ask Quizy AI'}
        delay={0.04}
      />
    </div>
  );
}
