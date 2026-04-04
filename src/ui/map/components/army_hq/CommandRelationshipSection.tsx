/**
 * Command Relationship Section — Army HQ Command Relationship Surface Consolidation.
 *
 * Canonical owner of ALL command-relationship truth on the corps card back face:
 *   - Strain status + score (standing)
 *   - Recovery forecast (direction)
 *   - Stance constraint notice (when compromised)
 *   - Unresolved friction events with Acknowledge buttons (actionable)
 *   - Stabilize Command Relationship action (management)
 *
 * Consolidates what was previously split across:
 *   - Inline friction panel in ArmyHQCorpsCard
 *   - CommandManagementSection (deleted)
 *   - CommandRelationshipSection (expanded)
 *
 * Silence = healthy: renders null when strain = 0 AND no unresolved friction.
 *
 * Reading order (context-first, then action):
 *   1. Strain status headline
 *   2. Recovery forecast
 *   3. Stance constraint (compromised only)
 *   4. Friction events with Acknowledge buttons
 *   5. Stabilize button (big action at bottom)
 *
 * Does NOT own: CorpsSituationSection (military/strategic constraint from CommanderState).
 * Those are disjoint derivation paths and correctly remain separate.
 */

import { CollapsibleSection } from './CollapsibleSection';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { isExhaustionContributingToStrain } from '../../data/command_strain';
import type { CorpsDelegationSummary } from '../../data/command_strain';
import type { FrictionEventView } from '../../data/types';

const COMPROMISED_THRESHOLD = 6;

interface CommandRelationshipSectionProps {
    corpsId: string;
    commandStrain: number;
    commandStrainLabel: 'healthy' | 'strained' | 'compromised';
    recoveryForecast?: string | null;
    frictionEvents: FrictionEventView[];
    /** Corps exhaustion (0-100) — Wave 6: exhaustion above threshold contributes to strain. */
    corpsExhaustion: number;
    /** Delegation Visibility Wave 1: standing delegation summary for active operations. */
    delegationSummary?: CorpsDelegationSummary | null;
    // Stabilization fields
    stabilizationAvailable: boolean;
    stabilizationCooldownUntil?: number;
    stabilizationCostCA?: number;
    currentTurn: number;
}

export function CommandRelationshipSection({
    corpsId,
    commandStrain,
    commandStrainLabel,
    recoveryForecast,
    frictionEvents,
    corpsExhaustion,
    delegationSummary,
    stabilizationAvailable,
    stabilizationCooldownUntil,
    stabilizationCostCA,
    currentTurn,
}: CommandRelationshipSectionProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);

    const unresolvedEvents = frictionEvents.filter(e => !e.resolved);
    const unresolvedCount = unresolvedEvents.length;
    const exhaustionContributing = isExhaustionContributingToStrain(corpsExhaustion);

    const hasDelegationNotice = delegationSummary?.summaryLabel != null;

    // Silence = healthy: nothing to show when strain is 0, no unresolved friction, and no delegation notice
    if (commandStrain === 0 && unresolvedCount === 0 && !hasDelegationNotice) return null;

    const isCompromised = commandStrain >= COMPROMISED_THRESHOLD;
    const strainColor = isCompromised ? 'text-red-400' : 'text-amber-400';
    const strainBg = isCompromised ? 'bg-red-900/20 border-red-500/30' : 'bg-amber-900/20 border-amber-500/30';
    const labelText = isCompromised ? 'Compromised' : commandStrain > 0 ? 'Strained' : 'Healthy';

    const hasCooldown = typeof stabilizationCooldownUntil === 'number' && currentTurn < stabilizationCooldownUntil;
    const costLabel = stabilizationCostCA != null && stabilizationCostCA > 0
        ? ` [−${stabilizationCostCA} CA]`
        : '';
    const stanceConstraintText =
        unresolvedCount > 0 && exhaustionContributing
            ? 'Offensive posture unavailable — stabilize the command relationship and reduce operational tempo first.'
            : unresolvedCount > 0
                ? 'Offensive posture unavailable — stabilize the command relationship first.'
                : exhaustionContributing
                    ? 'Offensive posture unavailable — reduce operational tempo and let the corps recover first.'
                    : 'Offensive posture unavailable — command conditions are not yet stable enough.';

    // ── IPC handlers ────────────────────────────────────────────────────
    const handleAcknowledgeFriction = async (event: FrictionEventView) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.acknowledgeFrictionEvent({
            corpsId,
            officerId: event.officerId,
            eventTurn: event.turn,
            eventType: event.compositeKey.split(':')[2] ?? '',
        });
        if (!result.ok) setLoadError(result.error ?? 'Failed to acknowledge friction event.');
    };

    const handleStabilize = async () => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stabilizeCommandRelationship({ corpsId });
        if (!result.ok) setLoadError(result.error ?? 'Failed to stabilize command relationship.');
    };

    // ── Title with inline strain indicator ───────────────────────────────
    const sectionTitle = commandStrain > 0
        ? `Command Relationship — ${labelText}`
        : 'Command Relationship';

    return (
        <CollapsibleSection
            sectionKey={`cmd-relationship-${corpsId}`}
            title={sectionTitle}
            defaultOpen={true}
        >
            <div className="flex flex-col gap-2">
                {/* 1. Strain status row — only when strain > 0 */}
                {commandStrain > 0 && (
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold tracking-wider uppercase ${strainColor}`}>
                            Strain: {labelText}
                        </span>
                        <span className={`text-[10px] font-bold tabular-nums font-mono px-1.5 py-0.5 border ${strainBg} ${strainColor}`}>
                            {commandStrain}
                        </span>
                    </div>
                )}

                {/* 1b. Delegation summary — Delegation Visibility Wave 1: standing delegation health.
                    Silence = healthy: hidden when all active ops are ordinary compliance. */}
                {hasDelegationNotice && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-blue-400/70 shrink-0">◆</span>
                        <span className="text-[10px] text-text-secondary font-mono">
                            Active operations: {delegationSummary!.summaryLabel}
                        </span>
                    </div>
                )}

                {/* 2. Recovery forecast — only when strain > 0 and forecast available */}
                {commandStrain > 0 && recoveryForecast && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider shrink-0">Recovery:</span>
                        <span className="text-[10px] text-text-secondary font-mono">
                            {recoveryForecast}
                        </span>
                    </div>
                )}

                {/* 2b. Exhaustion pressure note — Wave 6: when corps exhaustion contributes to strain */}
                {commandStrain > 0 && exhaustionContributing && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-amber-500/70 shrink-0">▲</span>
                        <span className="text-[10px] text-text-secondary font-mono">
                            Corps exhaustion ({Math.round(corpsExhaustion)}%) is straining the command relationship
                        </span>
                    </div>
                )}

                {/* 3. Stance constraint — only when compromised */}
                {isCompromised && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-red-900/20 border border-red-500/30">
                        <span className="text-red-400 text-[9px] mt-0.5 shrink-0">!</span>
                        <p className="text-[10px] text-red-300 leading-snug">
                            {stanceConstraintText}
                        </p>
                    </div>
                )}

                {/* 4. Friction events — each with Acknowledge button */}
                {unresolvedCount > 0 && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-panel-border/50">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider">
                            Unresolved Friction
                        </span>
                        {unresolvedEvents.map(event => (
                            <div
                                key={event.compositeKey}
                                className="flex items-center justify-between gap-2 py-0.5"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-amber-500 text-[9px]">·</span>
                                    <span className="text-[10px] text-amber-400 font-mono truncate">
                                        {event.typeLabel}
                                    </span>
                                    <span className="text-[9px] text-text-secondary/60 font-mono shrink-0">
                                        Wk {event.turn}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void handleAcknowledgeFriction(event); }}
                                    className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-amber-600/40 text-amber-500 bg-amber-900/20 hover:bg-amber-900/40 hover:border-amber-500/60 transition-colors"
                                    title="Acknowledge this friction event to reduce command strain over time."
                                >
                                    Acknowledge
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 5. Stabilize button — only when friction events exist (stabilization resolves friction, not exhaustion) */}
                {commandStrain > 0 && unresolvedCount > 0 && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-panel-border/50">
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
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
