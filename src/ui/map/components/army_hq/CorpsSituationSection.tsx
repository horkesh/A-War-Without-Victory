/**
 * CorpsSituationSection — Commander Explanation Surfaces Wave 1.
 *
 * Canonical surface for "why is this corps leaning this way?"
 * Derived from CommanderState on-read — no engine mutation.
 *
 * Silence = healthy: renders null when all fields are empty/null.
 * Presidential language: institutional explanation, not brigade-level diagnostics.
 */

import { CollapsibleSection } from './CollapsibleSection';

interface CorpsSituationSectionProps {
    assessment: {
        postureSummary: string | null;
        militaryFactors: string[];
        institutionalFactors: string[];
        planExplanation: string | null;
        threatContext: string | null;
    } | undefined;
}

export function CorpsSituationSection({ assessment }: CorpsSituationSectionProps) {
    if (!assessment) return null;

    const {
        postureSummary,
        militaryFactors,
        institutionalFactors,
        planExplanation,
        threatContext,
    } = assessment;

    // Silence = healthy: nothing to explain
    const hasContent =
        postureSummary !== null ||
        militaryFactors.length > 0 ||
        institutionalFactors.length > 0 ||
        planExplanation !== null ||
        threatContext !== null;

    if (!hasContent) return null;

    return (
        <CollapsibleSection sectionKey="situation-assessment" title="Situation Assessment" defaultOpen>
            <div className="px-3 py-2 space-y-2 text-xs">
                {/* Posture summary — one-line institutional explanation */}
                {postureSummary && (
                    <p className="text-neutral-200 font-medium">{postureSummary}</p>
                )}

                {/* Threat context */}
                {threatContext && (
                    <div className="flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0 mt-px">&#9650;</span>
                        <span className="text-red-300">{threatContext}</span>
                    </div>
                )}

                {/* Military factors */}
                {militaryFactors.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-neutral-500 uppercase tracking-wider text-[10px]">Military Conditions</p>
                        {militaryFactors.map((factor, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-500 shrink-0 mt-px">&bull;</span>
                                <span className="text-neutral-300">{factor}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Institutional factors */}
                {institutionalFactors.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-neutral-500 uppercase tracking-wider text-[10px]">Institutional Constraints</p>
                        {institutionalFactors.map((factor, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                                <span className="text-blue-400 shrink-0 mt-px">&bull;</span>
                                <span className="text-neutral-300">{factor}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Plan explanation */}
                {planExplanation && (
                    <div className="flex items-start gap-1.5 border-t border-neutral-700/50 pt-1.5">
                        <span className="text-neutral-400 shrink-0 mt-px">&#9654;</span>
                        <span className="text-neutral-300">{planExplanation}</span>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
