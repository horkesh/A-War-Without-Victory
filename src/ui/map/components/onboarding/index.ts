/**
 * v0.9.2 tutorial onboarding — barrel export (LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1).
 *
 * Single-owner barrel for the `onboarding` UI module. App shell and tests
 * import from this index; do not deep-import the implementation files.
 */

export {
    OnboardingOverlay,
    OnboardingRestartButton,
    shouldShowOnboarding,
    applyRestart,
    applyDismissPure,
} from './OnboardingOverlay';
export type {
    OnboardingIpcBridge,
    OnboardingOverlayProps,
    OnboardingRestartButtonProps,
    TutorialStateShape,
} from './OnboardingOverlay';
export { OnboardingStep } from './OnboardingStep';
export type { OnboardingStepProps } from './OnboardingStep';
export {
    ONBOARDING_STEPS,
    TUTORIAL_SPOTLIGHT_TARGETS,
    compareStepsById,
    resolveNextStep,
} from './onboardingSteps';
export type { OnboardingStepDef } from './onboardingSteps';
