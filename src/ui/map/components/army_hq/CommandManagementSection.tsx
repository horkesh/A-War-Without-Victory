/**
 * Command Management Section — back face of ArmyHQCorpsCard (Wave 4).
 *
 * Canonical surface for presidential command-management actions when corps strain > 0.
 * Renders nothing when strain = 0 (silence = healthy).
 *
 * Actions:
 *   - Stabilize Command Relationship: resolve ALL unresolved friction events at once.
 *     Costs CA (10 if strained, 15 if compromised). 3-turn cooldown.
 *
 * Stance constraint notice:
 *   - When strain >= COMPROMISED_THRESHOLD (6), informs player that aggressive stance
 *     is unavailable until command relationship is stabilized.
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Level 2.
 */

import { CollapsibleSection } from './CollapsibleSection';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';

const COMPROMISED_THRESHOLD = 6;

interface CommandManagementSectionProps {
    corpsId: string;
    commandStrain: number;
    commandStrainLabel: 'healthy' | 'strained' | 'compromised';
    stabilizationAvailable: boolean;
    stabilizationCooldownUntil?: number;
    stabilizationCostCA?: number;
    currentTurn: number;
}

export function CommandManagementSection({
    corpsId,
    commandStrain,
    commandStrainLabel,
    stabilizationAvailable,
    stabilizationCooldownUntil,
    stabilizationCostCA,
    currentTurn,
}: CommandManagementSectionProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);

    // Silence = healthy: render nothing when strain is 0
    if (commandStrain === 0) return null;

    const isCompromised = commandStrain >= COMPROMISED_THRESHOLD;
    const hasCooldown = typeof stabilizationCooldownUntil === 'number' && currentTurn < stabilizationCooldownUntil;
    const costLabel = stabilizationCostCA != null && stabilizationCostCA > 0
        ? ` [−${stabilizationCostCA} CA]`
        : '';

    const handleStabilize = async () => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stabilizeCommandRelationship({ corpsId });
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to stabilize command relationship.');
        }
    };

    return (
        <CollapsibleSection
            sectionKey={`command-mgmt-${corpsId}`}
            title="Command Management"
            defaultOpen={isCompromised}
        >
            <div className="flex flex-col gap-2.5">
                {/* Stance constraint notice — only when compromised */}
                {isCompromised && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-red-900/20 border border-red-500/30">
                        <span className="text-red-400 text-[9px] mt-0.5 shrink-0">⚠</span>
                        <p className="text-[10px] text-red-300 leading-snug">
                            Aggressive stance unavailable while command is compromised.
                            Stabilize the command relationship first.
                        </p>
                    </div>
                )}

                {/* Stabilize button */}
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        disabled={!stabilizationAvailable || hasCooldown}
                        onClick={(e) => { e.stopPropagation(); void handleStabilize(); }}
                        className={`w-full text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border transition-colors text-left ${
                            stabilizationAvailable && !hasCooldown
                                ? 'border-amber-600/50 text-amber-400 bg-amber-900/20 hover:bg-amber-900/40 hover:border-amber-500/70 cursor-pointer'
                                : 'border-panel-border text-text-secondary/40 bg-panel-bg/40 cursor-not-allowed'
                        }`}
                        title={
                            hasCooldown
                                ? `Stabilization on cooldown — resumes turn ${stabilizationCooldownUntil ?? ''}`
                                : `Resolve all command friction at once. Costs ${stabilizationCostCA ?? 0} Command Authority.`
                        }
                    >
                        Stabilize Command Relationship{costLabel}
                    </button>

                    {hasCooldown && (
                        <p className="text-[9px] text-text-secondary/50 italic px-1">
                            Stabilization on cooldown — resumes turn {stabilizationCooldownUntil}.
                        </p>
                    )}
                    {!hasCooldown && !stabilizationAvailable && commandStrain === 0 && (
                        <p className="text-[9px] text-emerald-400/70 italic px-1">
                            Command relationship stable.
                        </p>
                    )}
                </div>

                {/* Footer explainer */}
                <p className="text-[9px] text-text-secondary/40 italic">
                    Stabilizing resolves accumulated command friction. Reducing direct interventions prevents recurrence.
                </p>
            </div>
        </CollapsibleSection>
    );
}
