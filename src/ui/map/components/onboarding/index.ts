/**
 * v0.9.2 tutorial onboarding skeleton — barrel export.
 *
 * LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON.
 *
 * Single-owner barrel for the `onboarding` UI module. App shell and tests
 * import from this index; do not deep-import the implementation files.
 */

export { OnboardingOverlay, shouldShowOnboarding } from './OnboardingOverlay';
export type { OnboardingIpcBridge, OnboardingOverlayProps, TutorialStateShape } from './OnboardingOverlay';
export { OnboardingStep } from './OnboardingStep';
export type { OnboardingStepProps } from './OnboardingStep';
export { ONBOARDING_STEPS, resolveNextStep } from './onboardingSteps';
export type { OnboardingStepDef } from './onboardingSteps';
