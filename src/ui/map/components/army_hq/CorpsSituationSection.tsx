/**
 * CorpsSituationSection — Commander Explanation Surfaces Wave 1 + 2 + 3.
 *
 * Canonical surface for "why is this corps leaning this way?"
 * Derived from CommanderState on-read — no engine mutation.
 *
 * Wave 1: descriptive factors (military, institutional, threat, plan)
 * Wave 2: dominant reason banner with constraint-type badge
 * Wave 3: relief path — what would need to change for the constraint to ease
 *
 * Hierarchy: badge+reason → relief path → detail factors
 *
 * Silence = healthy: renders null when all fields are empty/null.
 * Presidential language: institutional explanation, not brigade-level diagnostics.
 */

import { CollapsibleSection } from './CollapsibleSection';
import { t, type MessageKey } from '../../i18n';

type PrimaryConstraint = 'siege' | 'threat_pressure' | 'defensive_duty' | 'force_condition' | 'institutional_strain' | 'plan_lifecycle' | 'none';

interface CorpsSituationSectionProps {
    assessment: {
        postureSummary: string | null;
        militaryFactors: string[];
        institutionalFactors: string[];
        planExplanation: string | null;
        threatContext: string | null;
        dominantReason: string | null;
        primaryConstraint: PrimaryConstraint;
        reliefPath: string | null;
    } | undefined;
}

const CONSTRAINT_BADGE: Record<PrimaryConstraint, { labelKey: MessageKey; color: string } | null> = {
    siege: { labelKey: 'corpsSituation.constraint.siege', color: 'text-red-400 bg-red-900/30 border-red-500/40' },
    threat_pressure: { labelKey: 'corpsSituation.constraint.threat', color: 'text-red-300 bg-red-900/20 border-red-500/30' },
    defensive_duty: { labelKey: 'corpsSituation.constraint.garrison', color: 'text-amber-400 bg-amber-900/20 border-amber-500/30' },
    force_condition: { labelKey: 'corpsSituation.constraint.readiness', color: 'text-amber-300 bg-amber-900/20 border-amber-500/30' },
    institutional_strain: { labelKey: 'corpsSituation.constraint.institutional', color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' },
    plan_lifecycle: { labelKey: 'corpsSituation.constraint.planning', color: 'text-neutral-300 bg-neutral-800/40 border-neutral-600/30' },
    none: null,
};

export function CorpsSituationSection({ assessment }: CorpsSituationSectionProps) {
    if (!assessment) return null;

    const {
        dominantReason,
        primaryConstraint,
        reliefPath,
        militaryFactors,
        institutionalFactors,
        planExplanation,
        threatContext,
    } = assessment;

    // Silence = healthy: nothing to explain
    const hasContent =
        dominantReason !== null ||
        militaryFactors.length > 0 ||
        institutionalFactors.length > 0 ||
        planExplanation !== null ||
        threatContext !== null;

    if (!hasContent) return null;

    const badge = CONSTRAINT_BADGE[primaryConstraint];

    // Count detail factors for the collapsible detail section
    const detailCount = militaryFactors.length + institutionalFactors.length
        + (threatContext ? 1 : 0) + (planExplanation ? 1 : 0);
    // Only show detail section if there are factors beyond the dominant reason
    const showDetail = detailCount > 0 && (detailCount > 1 || dominantReason === null);

    return (
        <CollapsibleSection sectionKey="situation-assessment" title={t('corpsSituation.title')} defaultOpen>
            <div className="px-3 py-2 space-y-1.5 text-xs">
                {/* Wave 2: Dominant reason banner with constraint badge */}
                {dominantReason && (
                    <div className="flex items-start gap-2">
                        {badge && (
                            <span className={`shrink-0 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 border ${badge.color}`}>
                                {t(badge.labelKey)}
                            </span>
                        )}
                        <span className="text-neutral-200 font-medium leading-snug">{dominantReason}</span>
                    </div>
                )}

                {/* Wave 3: Relief path — what would need to change */}
                {reliefPath && (
                    <div className="flex items-start gap-1.5 pl-0.5">
                        <span className="text-neutral-500 shrink-0 mt-px">&rarr;</span>
                        <span className="text-neutral-400 leading-snug">{reliefPath}</span>
                    </div>
                )}

                {/* Detail factors — secondary to the dominant reason + relief path */}
                {showDetail && (
                    <div className="space-y-1 border-t border-neutral-700/50 pt-1.5">
                        {/* Threat context */}
                        {threatContext && primaryConstraint !== 'threat_pressure' && primaryConstraint !== 'siege' && (
                            <div className="flex items-start gap-1.5">
                                <span className="text-red-400/70 shrink-0 mt-px">&#9650;</span>
                                <span className="text-neutral-400">{threatContext}</span>
                            </div>
                        )}

                        {/* Military factors */}
                        {militaryFactors.length > 0 && militaryFactors.map((factor, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-500/60 shrink-0 mt-px">&bull;</span>
                                <span className="text-neutral-500">{factor}</span>
                            </div>
                        ))}

                        {/* Institutional factors */}
                        {institutionalFactors.length > 0 && institutionalFactors.map((factor, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                                <span className="text-blue-400/60 shrink-0 mt-px">&bull;</span>
                                <span className="text-neutral-500">{factor}</span>
                            </div>
                        ))}

                        {/* Plan explanation */}
                        {planExplanation && (
                            <div className="flex items-start gap-1.5">
                                <span className="text-neutral-600 shrink-0 mt-px">&#9654;</span>
                                <span className="text-neutral-500">{planExplanation}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
