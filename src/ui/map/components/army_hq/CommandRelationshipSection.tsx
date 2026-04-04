/**
 * Command Relationship Standing Section — Wave 10.
 *
 * Consolidated indicator for command strain status, recovery forecast,
 * and unresolved friction summary. Renders ONLY when strain > 0
 * (silence = healthy).
 *
 * Canonical owner of:
 *   - Strain status display (score + label)
 *   - Recovery forecast (from projectedStrainNextTurn / recoveryForecast)
 *   - Stance constraint notice (moved here from CommandManagementSection)
 *   - Unresolved friction count summary
 *
 * Does NOT own: friction event list or Acknowledge buttons (those stay
 * in the inline friction panel above).
 */

import { CollapsibleSection } from './CollapsibleSection';

const COMPROMISED_THRESHOLD = 6;

interface CommandRelationshipSectionProps {
    corpsId: string;
    commandStrain: number;
    commandStrainLabel: 'healthy' | 'strained' | 'compromised';
    recoveryForecast?: string | null;
    unresolvedFrictionCount: number;
}

export function CommandRelationshipSection({
    corpsId,
    commandStrain,
    commandStrainLabel,
    recoveryForecast,
    unresolvedFrictionCount,
}: CommandRelationshipSectionProps) {
    // Silence = healthy: render nothing when strain is 0
    if (commandStrain === 0) return null;

    const isCompromised = commandStrain >= COMPROMISED_THRESHOLD;
    const strainColor = isCompromised ? 'text-red-400' : 'text-amber-400';
    const strainBg = isCompromised ? 'bg-red-900/20 border-red-500/30' : 'bg-amber-900/20 border-amber-500/30';
    const labelText = isCompromised ? 'Compromised' : 'Strained';

    return (
        <CollapsibleSection
            sectionKey={`cmd-standing-${corpsId}`}
            title="Command Standing"
            defaultOpen={true}
        >
            <div className="flex flex-col gap-2">
                {/* Strain status row */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${strainColor}`}>
                        Command Strain: {labelText}
                    </span>
                    <span className={`text-[10px] font-bold tabular-nums font-mono px-1.5 py-0.5 border ${strainBg} ${strainColor}`}>
                        {commandStrain}
                    </span>
                </div>

                {/* Recovery forecast row */}
                {recoveryForecast && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider">Forecast:</span>
                        <span className="text-[10px] text-text-secondary font-mono">
                            {recoveryForecast}
                        </span>
                    </div>
                )}

                {/* Unresolved friction summary */}
                {unresolvedFrictionCount > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                        <span className="text-[10px] text-amber-400 font-mono">
                            {unresolvedFrictionCount} unresolved friction event{unresolvedFrictionCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Stance constraint notice — only when compromised */}
                {isCompromised && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-red-900/20 border border-red-500/30 mt-0.5">
                        <span className="text-red-400 text-[9px] mt-0.5 shrink-0">!</span>
                        <p className="text-[10px] text-red-300 leading-snug">
                            Offensive posture unavailable — stabilize the command relationship first.
                        </p>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
