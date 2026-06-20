/**
 * Order Interpretation Section — Wave 5 pre-decision context surface.
 * Wave 2: Replaces prose cautionNotice with structured dragFactors bullet list.
 * Stance Interpretation Section — Wave 6 stance-change preview.
 *
 * Fires on clean approvals when corps strain > 0, and on reluctant assessments
 * even when strain is 0 if the institutional drag is caution/feasibility/tempo.
 * The DirectInterventionSection owns the override-cost display; this section
 * owns the institutional context visible BEFORE the player commits.
 *
 * Silence = healthy: renders null when interpretation severity === 'normal'
 * (ops) or pendingStance === currentStance (stance).
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Order Interpretation.
 */

import { deriveOrderInterpretation, deriveStanceInterpretation } from '../../data/command_strain';
import type { CommandStrainLabel, DragFactor } from '../../data/command_strain';
import { t } from '../../i18n';

interface OrderInterpretationSectionProps {
    strain: number;
    commanderAssessment: 'launch' | 'postpone' | 'abort' | null | undefined;
    primaryConstraint?: string | null;
    trendDirection?: string | null;
    postponementCount?: number;
}

export function OrderInterpretationSection({ strain, commanderAssessment, primaryConstraint, trendDirection, postponementCount }: OrderInterpretationSectionProps) {
    const { severity, cautionNotice, cautionNoticeToken, interventionStrength, categoryLabel, categoryLabelKey, dragFactors } = deriveOrderInterpretation(strain, commanderAssessment, primaryConstraint, trendDirection, postponementCount);

    // Silence = healthy
    if (severity === 'normal') return null;

    const isAlarm = severity === 'alarm';

    return (
        <div className={`mx-4 my-2 border ${isAlarm ? 'border-red-500/30 bg-red-900/10' : 'border-amber-500/30 bg-amber-900/10'}`}>
            <div className={`px-3 py-1.5 border-b ${isAlarm ? 'border-red-500/20' : 'border-amber-500/20'} flex items-center justify-between`}>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isAlarm ? 'text-red-400' : 'text-amber-400'} opacity-80`}>
                    Army HQ Interpretation
                </span>
                {categoryLabel && (
                    <span className={`text-[8px] font-mono font-bold tracking-widest ${isAlarm ? 'text-red-400' : 'text-amber-400'} opacity-60`}>
                        {categoryLabelKey ? t(categoryLabelKey) : categoryLabel}
                    </span>
                )}
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {dragFactors.length > 0 ? (
                    <div className="space-y-1">
                        {dragFactors.map((factor, i) => (
                            <div key={factor.source + i} className="flex items-start gap-1.5">
                                <span className={`shrink-0 text-[10px] font-bold mt-px ${isAlarm ? 'text-red-400' : 'text-amber-400'} ${factor.isPrimary ? '' : 'opacity-60'}`}>
                                    {factor.isPrimary ? '●' : '○'}
                                </span>
                                <span className={`text-[10px] leading-snug ${isAlarm ? 'text-red-300' : 'text-amber-300'} ${factor.isPrimary ? '' : 'opacity-80'}`}>
                                    {factor.labelToken ? t(factor.labelToken.key, factor.labelToken.params) : factor.label}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={`text-[10px] leading-snug ${isAlarm ? 'text-red-300' : 'text-amber-300'}`}>
                        {cautionNoticeToken ? t(cautionNoticeToken.key, cautionNoticeToken.params) : cautionNotice}
                    </p>
                )}
                {interventionStrength === 'direct_intervention' && (
                    <p className={`text-[10px] leading-snug font-semibold ${isAlarm ? 'text-red-200' : 'text-amber-200'}`}>
                        {t('commandStrain.order.directInterventionWarning')}
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

    const { severity, notice, noticeToken } = deriveStanceInterpretation(strain, strainLabel, pendingStance);
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
                {noticeToken ? t(noticeToken.key, noticeToken.params) : notice}
            </p>
        </div>
    );
}
