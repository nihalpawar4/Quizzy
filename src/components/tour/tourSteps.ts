/**
 * Tour Step Configurations for Quizy
 * 
 * Defines all the tour steps for each page of the platform.
 * Each step targets a DOM element via CSS selector (using data-tour attributes)
 * and provides contextual guidance for first-time users.
 * 
 * IMPORTANT: All targets point to small, focused elements (icons, buttons, headings)
 * — never full-page sections or large containers. This ensures the spotlight
 * looks clean on mobile.
 * 
 * NOTE: Corresponding data-tour="..." attributes must exist on the target elements.
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
  {
    target: '[data-tour="landing-hero"]',
    title: 'Master Your Exams',
    description: 'Quizy helps students of Classes 5–10 practice with interactive tests, track progress, and achieve academic excellence.',
    placement: 'bottom',
    icon: '🏆',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-cta-student"]',
    title: 'Start Learning',
    description: 'Click here to create your free student account and begin your learning journey!',
    placement: 'bottom',
    icon: '🚀',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="landing-cta-teacher"]',
    title: 'Teacher Portal',
    description: 'Teachers can create tests, manage students, view analytics, and share study materials.',
    placement: 'bottom',
    icon: '👨‍🏫',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="landing-features"]',
    title: 'Platform Features',
    description: 'Explore all features — Subject Tests, Real-Time Chat, Analytics, Progress Tracking, and more!',
    placement: 'bottom',
    icon: '✨',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-faq"]',
    title: 'FAQ Section',
    description: 'Have questions? Find answers to commonly asked questions about the platform here.',
    placement: 'bottom',
    icon: '❓',
    spotlightPadding: 8,
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
  {
    target: '[data-tour="dashboard-stats"]',
    title: 'Quick Stats',
    description: 'Track your key metrics at a glance — total tests taken, average score, and active tests.',
    placement: 'bottom',
    icon: '📊',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-tabs"]',
    title: 'Tab Navigation',
    description: 'Switch between Available Tests, My Reports, Study Notes, and Homework tabs.',
    placement: 'bottom',
    icon: '📑',
    spotlightPadding: 6,
  },
  {
    target: '[data-tour="dashboard-content"]',
    title: 'Your Content',
    description: 'This is where your tests, reports, notes, and homework appear based on the selected tab.',
    placement: 'bottom',
    icon: '📚',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-quick-actions"]',
    title: 'Quick Actions ⚡',
    description: 'Homework, Practice Mode, Chat, and Help Center are just a click away.',
    placement: 'top',
    icon: '⚡',
    spotlightPadding: 8,
  },
];

// ==================== HELPER FUNCTION ====================

/**
 * Check if a tour has been completed or skipped
 */
export function isTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`quizy_tour_${tourId}`) !== null;
}

/**
 * Reset a tour so it can be replayed
 */
export function resetTour(tourId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`quizy_tour_${tourId}`);
}
