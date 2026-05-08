/**
 * Tour Step Configurations for Quizy
 * 
 * Navbar-only tour — highlights key navigation elements on landing page
 * and student dashboard. Kept minimal for a clean, non-intrusive experience.
 */

import type { TourStep } from './GuidedTour';

// ==================== LANDING PAGE TOUR STEPS ====================

export const landingPageSteps: TourStep[] = [
  {
    target: '[data-tour="landing-logo"]',
    title: 'Welcome to Quizy! 🎓',
    description: 'This is the Quizy learning platform — your gateway to mastering exams with interactive tests and expert tutoring.',
    placement: 'bottom',
    icon: '👋',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-theme-toggle"]',
    title: 'Light & Dark Mode',
    description: 'Toggle between light and dark themes anytime. Your preference is saved automatically.',
    placement: 'bottom',
    icon: '🌙',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="landing-nav-actions"]',
    title: 'Quick Navigation',
    description: 'Sign in, get started, or access FAQ right from the navigation bar.',
    placement: 'bottom',
    icon: '🧭',
    spotlightPadding: 6,
  },
];

// ==================== STUDENT DASHBOARD TOUR STEPS ====================

export const studentDashboardSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard-logo"]',
    title: 'Your Dashboard 🏠',
    description: 'Welcome to your Student Dashboard — your central hub for tests, reports, and progress.',
    placement: 'bottom',
    icon: '🏠',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-home"]',
    title: 'Go Home',
    description: 'Click the Home button anytime to go back to the main landing page.',
    placement: 'bottom',
    icon: '🏡',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="dashboard-notifications"]',
    title: 'Notifications 🔔',
    description: 'Get real-time notifications for new tests, announcements, and updates from your teachers.',
    placement: 'bottom',
    icon: '🔔',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="dashboard-chat"]',
    title: 'Chat with Teachers 💬',
    description: 'Open the real-time chat to message your teachers directly. Ask doubts and stay connected!',
    placement: 'bottom',
    icon: '💬',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="dashboard-profile"]',
    title: 'Your Profile',
    description: 'Access your profile settings, change your photo, manage preferences, or log out.',
    placement: 'bottom',
    icon: '👤',
    spotlightPadding: 6,
  },
];

// ==================== HELPER FUNCTIONS ====================

export function isTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`quizy_tour_${tourId}`) !== null;
}

export function resetTour(tourId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`quizy_tour_${tourId}`);
}
