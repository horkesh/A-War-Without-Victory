/**
 * v0.9.2 tutorial onboarding skeleton — single step view.
 *
 * LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON.
 *
 * Stateless presentation component. Owns NO state; all interaction surfaced as
 * callbacks (`onAdvance`, `onSkip`). Parent (`OnboardingOverlay`) drives the
 * IPC bridge. Single-owner: this file owns the step card layout only.
 */

import type { OnboardingStepDef } from './onboardingSteps';
import { t } from '../../i18n';

export interface OnboardingStepProps {
    step: OnboardingStepDef;
    /** 1-based index for "Step N of M" caption. */
    indexOneBased: number;
    /** Total number of steps in the deck. */
    total: number;
    /** Disable buttons while an IPC call is in flight to avoid double-submits. */
    disabled?: boolean;
    /** Advance to next step (or finish if last). */
    onAdvance: () => void;
    /** Skip the entire tutorial — sets `dismissed=true`. */
    onSkip: () => void;
}

export function OnboardingStep(props: OnboardingStepProps): JSX.Element {
    const { step, indexOneBased, total, disabled, onAdvance, onSkip } = props;
    const isLast = indexOneBased >= total;

    return (
        <div
            data-testid="onboarding-step"
            data-step-id={step.id}
            style={{
                background: 'rgba(20, 20, 28, 0.92)',
                border: '1px solid rgba(255, 215, 130, 0.4)',
                borderRadius: 6,
                color: '#f3ead0',
                padding: '20px 24px',
                maxWidth: 520,
                fontFamily: 'inherit',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    opacity: 0.6,
                    marginBottom: 4,
                }}
            >
                {t('onboarding.stepCount', { index: indexOneBased, total })}
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 18 }}>{t(step.titleKey)}</h2>
            <p style={{ margin: '0 0 20px 0', lineHeight: 1.5, fontSize: 14 }}>{t(step.bodyKey)}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    data-testid="onboarding-skip"
                    onClick={onSkip}
                    disabled={disabled}
                    style={{
                        background: 'transparent',
                        color: '#cdb98c',
                        border: '1px solid rgba(205, 185, 140, 0.5)',
                        borderRadius: 3,
                        padding: '6px 14px',
                        cursor: disabled ? 'wait' : 'pointer',
                    }}
                >
                    {t('onboarding.skip')}
                </button>
                <button
                    type="button"
                    data-testid="onboarding-advance"
                    onClick={onAdvance}
                    disabled={disabled}
                    style={{
                        background: '#a07a2a',
                        color: '#1a1a22',
                        border: '1px solid #c79a3a',
                        borderRadius: 3,
                        padding: '6px 14px',
                        fontWeight: 600,
                        cursor: disabled ? 'wait' : 'pointer',
                    }}
                >
                    {isLast ? t('onboarding.finish') : t('onboarding.next')}
                </button>
            </div>
        </div>
    );
}
