/**
 * Order Interpretation Section — Wave 5 pre-decision context surface.
 * Stance Interpretation Section — Wave 6 stance-change preview.
 *
 * Fires even on clean (non-overriding) approvals when corps strain > 0.
 * The DirectInterventionSection owns the override-cost display; this section
 * owns the institutional context visible BEFORE the player commits.
 *
 * Silence = healthy: renders null when strain === 0 (ops) or pendingStance === currentStance (stance).
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Order Interpretation.
 */

import { deriveOrderInterpretation, deriveStanceInterpretation } from '../../data/command_strain';
import type { CommandStrainLabel } from '../../data/command_strain';

interface OrderInterpretationSectionProps {
    strain: number;
    commanderAssessment: 'launch' | 'postpone' | 'abort' | null | undefined;
}

export function OrderInterpretationSection({ strain, commanderAssessment }: OrderInterpretationSectionProps) {
    const { severity, cautionNotice, interventionStrength } = deriveOrderInterpretation(strain, commanderAssessment);

    // Silence = healthy
    if (severity === 'normal') return null;

    const isAlarm = severity === 'alarm';

    return (
        <div className={`mx-4 my-2 border ${isAlarm ? 'border-red-500/30 bg-red-900/10' : 'border-amber-500/30 bg-amber-900/10'}`}>
            <div className={`px-3 py-1.5 border-b ${isAlarm ? 'border-red-500/20' : 'border-amber-500/20'}`}>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isAlarm ? 'text-red-400' : 'text-amber-400'} opacity-80`}>
                    Army HQ Interpretation
                </span>
            </div>
            <div className="px-3 py-2 space-y-1.5">
                <p className={`text-[10px] leading-snug ${isAlarm ? 'text-red-300' : 'text-amber-300'}`}>
                    {cautionNotice}
                </p>
                {interventionStrength === 'direct_intervention' && (
                    <p className={`text-[10px] leading-snug font-semibold ${isAlarm ? 'text-red-200' : 'text-amber-200'}`}>
                        Approving this order would constitute Direct Intervention. Institutional damage will compound.
                    </p>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave 6 — Stance Interpretation Preview
// Pure display component. No buttons/actions — caller owns confirm/cancel flow.
// ─────────────────────────────────────────────────────────────────────────────

interface StanceInterpretationSectionProps {
    strain: number;
    strainLabel: CommandStrainLabel;
    pendingStance: string;
    currentStance: string;
}

/**
 * Renders an Army HQ interpretation notice when the player has selected a
 * pending stance change that warrants institutional commentary (caution or
 * constrained). Renders null for normal/silence cases and when there is no
 * pending change. Pure display — no confirm/cancel buttons.
 */
export function StanceInterpretationSection({
    strain, strainLabel, pendingStance, currentStance,
}: StanceInterpretationSectionProps) {
    // Only show when there is a pending change
    if (pendingStance === currentStance) return null;

    const { severity, notice } = deriveStanceInterpretation(strain, strainLabel, pendingStance);
    if (severity === 'normal') return null;

    const isConstrained = severity === 'constrained';

    return (
        <div className={`px-4 py-2 border-t ${isConstrained ? 'border-red-500/30 bg-red-900/10' : 'border-amber-500/30 bg-amber-900/10'}`}>
            <div className="flex items-start gap-1.5">
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isConstrained ? 'text-red-400' : 'text-amber-400'} opacity-80 shrink-0 mt-0.5`}>
                    Army HQ Interpretation
                </span>
            </div>
            <p className={`text-[10px] leading-snug mt-1 ${isConstrained ? 'text-red-300' : 'text-amber-300'}`}>
                {notice}
            </p>
        </div>
    );
}
