/**
 * Tour Step Configurations for Quizy
 * 
 * Defines all the tour steps for each page of the platform.
 * Each step targets a DOM element via CSS selector (using data-tour attributes)
 * and provides contextual guidance for first-time users.
 * 
 * NOTE: Corresponding data-tour="..." attributes must exist on the target elements.
 */

import type { TourStep } from './GuidedTour';

// ==================== LANDING PAGE TOUR STEPS ====================

export const landingPageSteps: TourStep[] = [
  {
    target: '[data-tour="landing-logo"]',
    title: 'Welcome to Quizy! 🎓',
    description: 'This is the Quizy learning platform — your gateway to mastering exams with interactive tests, real-time chat, and expert tutoring.',
    placement: 'bottom',
    icon: '👋',
    spotlightPadding: 12,
  },
  {
    target: '[data-tour="landing-theme-toggle"]',
    title: 'Light & Dark Mode',
    description: 'Toggle between light and dark themes anytime. Your preference is saved automatically for the best reading experience.',
    placement: 'bottom',
    icon: '🌙',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-nav-actions"]',
    title: 'Quick Navigation',
    description: 'Use the navigation bar to quickly access FAQ, sign in, or get started with a free account.',
    placement: 'bottom',
    icon: '🧭',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-hero"]',
    title: 'Master Your Exams',
    description: 'Quizy helps students of Classes 5–10 practice with interactive tests, track progress, and achieve academic excellence.',
    placement: 'bottom',
    icon: '🏆',
    spotlightPadding: 16,
  },
  {
    target: '[data-tour="landing-cta-student"]',
    title: 'Start Learning',
    description: 'Click here to create your free student account and begin your learning journey with Quizy!',
    placement: 'bottom',
    icon: '🚀',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-cta-teacher"]',
    title: 'Teacher Portal',
    description: 'Teachers can access the Teacher Portal to create tests, manage students, view analytics, and share study materials.',
    placement: 'bottom',
    icon: '👨‍🏫',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="landing-features"]',
    title: 'Platform Features',
    description: 'Explore all features — Subject Tests, Real-Time Chat, Analytics, Profile Pictures, Progress Tracking, and Dark Mode support!',
    placement: 'top',
    icon: '✨',
    spotlightPadding: 12,
  },
  {
    target: '[data-tour="landing-faq"]',
    title: 'FAQ Section',
    description: 'Have questions? Find answers to commonly asked questions about the platform, features, and how everything works.',
    placement: 'top',
    icon: '❓',
    spotlightPadding: 12,
  },
];

// ==================== STUDENT DASHBOARD TOUR STEPS ====================

export const studentDashboardSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard-logo"]',
    title: 'Your Dashboard 🏠',
    description: 'Welcome to your Student Dashboard! This is your central hub for accessing tests, viewing reports, and tracking your progress.',
    placement: 'bottom',
    icon: '🏠',
    spotlightPadding: 12,
  },
  {
    target: '[data-tour="dashboard-home"]',
    title: 'Go Home',
    description: 'Click the Home button anytime to go back to the main landing page.',
    placement: 'bottom',
    icon: '🏡',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-notifications"]',
    title: 'Notifications Bell 🔔',
    description: 'Get real-time notifications for new tests, announcements, and important updates from your teachers. Never miss anything!',
    placement: 'bottom',
    icon: '🔔',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-chat"]',
    title: 'Chat with Teachers 💬',
    description: 'Open the real-time chat to message your teachers directly. Ask doubts, get guidance, and stay connected!',
    placement: 'bottom',
    icon: '💬',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-profile"]',
    title: 'Your Profile',
    description: 'Access your profile settings, change your photo, manage preferences, or log out. You can also replay this tour from here!',
    placement: 'bottom',
    icon: '👤',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: 'Quick Stats',
    description: 'Track your key metrics at a glance — total tests taken, average score percentage, and active tests available for you.',
    placement: 'bottom',
    icon: '📊',
    spotlightPadding: 10,
  },
  {
    target: '[data-tour="dashboard-tabs"]',
    title: 'Tab Navigation',
    description: 'Switch between sections: Available Tests to take new quizzes, My Reports for detailed results, Study Notes for materials, and Homework assignments.',
    placement: 'bottom',
    icon: '📑',
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="dashboard-content"]',
    title: 'Your Content Area',
    description: 'This is where your tests, reports, notes, and homework appear based on the selected tab. Explore each tab to see everything!',
    placement: 'bottom',
    icon: '📚',
    spotlightPadding: 12,
  },
  {
    target: '[data-tour="dashboard-quick-actions"]',
    title: 'Quick Actions ⚡',
    description: 'Access frequently used features quickly — Homework, Practice Mode, Chat, and Help Center are just a click away.',
    placement: 'top',
    icon: '⚡',
    spotlightPadding: 10,
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
