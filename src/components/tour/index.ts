/**
 * Tour Components — Barrel export file
 * 
 * Clean re-export of all tour-related components and utilities.
 */

export { default as GuidedTour, RestartTourButton } from './GuidedTour';
export {
  landingPageSteps,
  studentDashboardSteps,
  isTourCompleted,
  resetTour,
} from './tourSteps';
export type { TourStep, GuidedTourProps } from './GuidedTour';
