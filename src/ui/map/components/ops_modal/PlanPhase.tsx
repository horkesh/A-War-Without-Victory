/**
 * Phase 2 — Plan orchestrator.
 * Renders ObjectiveList (top-right), BrigadeTray (bottom), and manages auto-propose.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import { ObjectiveList } from './ObjectiveList';
import { BrigadeTray } from './BrigadeTray';
import { autoProposeBrigades, estimateMarchTurns } from './autoPropose';
import type { ProposedBrigade } from './autoPropose';
import { getOsidDisplayName } from '../../utils/osidDisplayName';

interface PlanPhaseProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
    corpsId: string;
    onAdvance: () => void;
    centroidLookup: Map<string, [number, number]>;
    availableObjectiveOsids?: string[];
    canSuggestPlan?: boolean;
    canAdvanceToG2?: boolean;
}

import { FACTION_HEX_COLORS } from '../plan_ui/opsConstants';

export function PlanPhase({
    plan,
    onUpdate,
    corpsId,
    onAdvance,
    centroidLookup,
    availableObjectiveOsids = [],
    canSuggestPlan = true,
    canAdvanceToG2 = false,
}: PlanPhaseProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const [autoProposed, setAutoProposed] = useState<ProposedBrigade[]>([]);
    const hasAutoProposedRef = useRef(false);

    const faction = useMemo(() => {
        return loadedGameState?.formations.find((f) => f.id === corpsId)?.faction ?? '';
    }, [loadedGameState, corpsId]);

    const factionColor = FACTION_HEX_COLORS[faction] ?? '#888';

    const corpsBrigades = useMemo(() => {
        if (!loadedGameState) return [];
        return loadedGameState.formations.filter(
            (f) => f.corps_id === corpsId && f.kind === 'brigade'
        );
    }, [loadedGameState, corpsId]);

    // Auto-propose brigades when first objective is added
    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    const objectives = activeAxis?.objectives ?? [];

    // Use refs for plan data inside effects to avoid unstable deps
    const planRef = useRef(plan);
    planRef.current = plan;
    const activeAxisRef = useRef(activeAxis);
    activeAxisRef.current = activeAxis;

    useEffect(() => {
        if (objectives.length > 0 && !hasAutoProposedRef.current && corpsBrigades.length > 0) {
            hasAutoProposedRef.current = true;
            const currentPlan = planRef.current;
            const currentAxis = activeAxisRef.current;
            const staging = currentAxis?.stagingOsid ?? currentPlan.defaultStagingOsid;
            const proposed = autoProposeBrigades(corpsBrigades, objectives, centroidLookup, 12, staging);
            setAutoProposed(proposed);

            // Auto-assign proposed brigades to active axis
            if (currentAxis && currentAxis.brigadeIds.length === 0) {
                onUpdate({
                    axes: currentPlan.axes.map((a) =>
                        a.id === currentAxis.id
                            ? { ...a, brigadeIds: proposed.map((p) => p.brigadeId) }
                            : a
                    ),
                });
            }
        }
    }, [objectives.length, corpsBrigades, centroidLookup, onUpdate]);

    // Recompute march times when staging changes
    const stagingOsid = activeAxis?.stagingOsid ?? plan.defaultStagingOsid;
    useEffect(() => {
        if (!stagingOsid || corpsBrigades.length === 0) return;

        setAutoProposed((prev) => prev.map((p) => {
            const brigade = corpsBrigades.find((b) => b.id === p.brigadeId);
            if (!brigade?.location_osid) return p;
            const mt = estimateMarchTurns(brigade.location_osid, stagingOsid, centroidLookup);
            return { ...p, marchTurns: mt };
        }));
    }, [stagingOsid, corpsBrigades, centroidLookup]);

    const allObjectives = plan.axes.flatMap((a) => a.objectives);
    const selectedAxis = activeAxis;
    const selectedStaging = selectedAxis?.stagingOsid ?? plan.defaultStagingOsid;
    const selectedAxisName = selectedAxis?.name ?? 'Main Axis';
    const selectedAxisObjectives = selectedAxis?.objectives.length ?? 0;
    const selectedAxisBrigades = selectedAxis?.brigadeIds.length ?? 0;
    const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

    const suggestPlan = useCallback(() => {
        if (!selectedAxis) return;
        const objective = [...availableObjectiveOsids, ...selectedAxis.objectives].sort()[0];
        if (!objective) {
            setSuggestionMessage('No viable objective in range from this staging area.');
            return;
        }
        const objectiveNames = selectedAxis.objectives.includes(objective)
            ? selectedAxis.objectives
            : [objective, ...selectedAxis.objectives];
        const proposed = autoProposeBrigades(
            corpsBrigades,
            objectiveNames,
            centroidLookup,
            12,
            selectedStaging,
        );
        if (proposed.length === 0) {
            setSuggestionMessage('No viable brigades are ready for this plan.');
            return;
        }

        onUpdate({
            schwerpunktOsid: plan.schwerpunktOsid || objective,
                    axes: plan.axes.map((axis) =>
                axis.id === selectedAxis.id
                    ? {
                        ...axis,
                        objectives: objectiveNames,
                        brigadeIds: proposed.map((p) => p.brigadeId),
                    }
                    : axis
            ),
        });
        setAutoProposed(proposed);
        const label = getOsidDisplayName(objective, osidDisplayNames);
        setSuggestionMessage(`Suggested ${label} with ${proposed.length} brigade${proposed.length === 1 ? '' : 's'}.`);
    }, [
        availableObjectiveOsids,
        centroidLookup,
        corpsBrigades,
        onUpdate,
        osidDisplayNames,
        plan.axes,
        plan.schwerpunktOsid,
        selectedAxis,
        selectedStaging,
    ]);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Planning status panel — top left */}
            <div className="absolute top-16 left-4 w-[340px] pointer-events-auto">
                <div className="rounded-lg border border-[rgba(180,160,130,0.16)] bg-[rgba(20,18,15,0.9)] backdrop-blur-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                            Plan Status
                        </div>
                        <button
                            type="button"
                            onClick={suggestPlan}
                            disabled={!canSuggestPlan}
                            className="rounded border border-accent-gold/30 bg-accent-gold/12 px-2 py-1
                                       text-[8px] font-bold uppercase tracking-[0.14em] text-accent-gold
                                       transition-colors hover:bg-accent-gold/22 disabled:cursor-not-allowed
                                       disabled:border-[rgba(180,160,130,0.14)] disabled:bg-[rgba(180,160,130,0.05)]
                                       disabled:text-text-secondary/35"
                            title={canSuggestPlan ? 'Suggest a deterministic first axis' : 'Select a commander first'}
                        >
                            Suggest Plan
                        </button>
                    </div>
                    {suggestionMessage && (
                        <div className="mb-2 rounded border border-accent-gold/20 bg-accent-gold/10 px-2 py-1 text-[10px] text-accent-gold">
                            {suggestionMessage}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                            <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">Axis</div>
                            <div className="text-[10px] font-bold text-white truncate">{selectedAxisName}</div>
                        </div>
                        <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                            <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">Staging</div>
                            <div className="text-[10px] font-bold text-white truncate">
                                {selectedStaging ? selectedStaging : 'Select on map'}
                            </div>
                        </div>
                        <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                            <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">Objectives</div>
                            <div className="text-[10px] font-bold text-white">{selectedAxisObjectives}</div>
                        </div>
                        <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                            <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">Brigades</div>
                            <div className="text-[10px] font-bold text-white">{selectedAxisBrigades}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Objective list — top right */}
            <ObjectiveList
                plan={plan}
                onUpdate={onUpdate}
                osidDisplayNames={osidDisplayNames}
                onAdvance={onAdvance}
                availableObjectiveCount={availableObjectiveOsids.length}
                canAdvanceToG2={canAdvanceToG2}
            />

            {/* Brigade tray — bottom */}
            <BrigadeTray
                plan={plan}
                onUpdate={onUpdate}
                corpsBrigades={corpsBrigades}
                autoProposed={autoProposed}
                factionColor={factionColor}
            />

            {/* Advance button — fixed right side, vertically centered */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={!canAdvanceToG2}
                    className="px-5 py-3 rounded-lg font-bold text-sm uppercase tracking-wider
                               transition-all border disabled:opacity-20 disabled:cursor-not-allowed
                               bg-accent-gold/15 text-accent-gold border-accent-gold/25
                               hover:bg-accent-gold/25 hover:shadow-[0_0_20px_rgba(196,163,90,0.2)]
                               shadow-lg backdrop-blur-sm"
                >
                    G2 Assessment →
                </button>
            </div>
        </div>
    );
}
